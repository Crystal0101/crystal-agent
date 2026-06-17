'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ToolLayout } from '@/components/Layout/ToolLayout';

// ─── Types ────────────────────────────────────────────────────────────────────

type Difficulty = '初级' | '中级' | '高级' | '大厂';
type InterviewType = '技术' | '行为' | '产品' | '综合';
type Phase = 'setup' | 'interview' | 'report';
type CompanyPreset = '字节跳动' | '腾讯' | '阿里巴巴' | '美团' | '快手' | '通用';
type FrameworkHint = 'STAR' | 'MECE' | '金字塔原理' | '数据驱动' | '第一性原理';

interface Message {
  role: 'assistant' | 'user';
  content: string;
  framework?: FrameworkHint;
}

interface QAItem {
  question: string;
  answer: string;
  score: number;       // 1-5
  feedback: string;
}

interface Report {
  qaPairs: QAItem[];
  totalScore: number;  // 0-100
  strengths: string[];
  improvements: string[];
  summary: string;
  counterQuestions?: string[];
}

// ─── Company Preset Config ────────────────────────────────────────────────────

const COMPANY_PRESETS: Record<CompanyPreset, { emoji: string; style: string; color: string }> = {
  字节跳动: {
    emoji: '🔥',
    color: 'text-blue-300 border-blue-500/40 bg-blue-500/10',
    style: `风格：字节跳动面试官。核心价值观：速度、impact、数据驱动。
- 必问："为什么不做10倍？""你的决策依据是什么数据？"
- 特别关注：项目impact量化（DAU、GMV、转化率）、迭代速度
- 会追问：如果时间翻倍、资源翻倍，你会怎么做不同的选择？
- 不喜欢：含糊的"感觉"、没有数据支撑的判断`,
  },
  腾讯: {
    emoji: '🐧',
    color: 'text-cyan-300 border-cyan-500/40 bg-cyan-500/10',
    style: `风格：腾讯面试官。核心价值观：产品体验、社交/病毒增长、用户留存。
- 必问：用户为什么会分享？你的产品如何实现社交裂变？
- 特别关注：用户增长路径、社交关系链利用、产品生态位
- 会追问：竞品分析、用户分层策略、留存曲线
- 不喜欢：只关注功能不关注用户关系的回答`,
  },
  阿里巴巴: {
    emoji: '🛒',
    color: 'text-orange-300 border-orange-500/40 bg-orange-500/10',
    style: `风格：阿里巴巴面试官。核心价值观：聪明+勤奋+价值观，文化契合度极高。
- 必问：给我讲一个你克服巨大困难的经历、你认为什么叫"客户第一"？
- 特别关注：价值观match（阿里六脉神剑）、长期主义、商业化思维
- 会追问：你是怎么影响没有权力关系的人的？你怎么处理与上级的分歧？
- 不喜欢：功利导向、短期思维`,
  },
  美团: {
    emoji: '🛵',
    color: 'text-yellow-300 border-yellow-500/40 bg-yellow-500/10',
    style: `风格：美团面试官。核心价值观：精细化运营、单位经济学、地推思维。
- 必问：这个业务的单位经济模型是什么？ROI怎么算？
- 特别关注：运营效率、履约成本、线下执行力、竞对策略
- 会追问：如果补贴停了用户会流失多少？怎么建立非补贴的用户粘性？
- 不喜欢：只讲愿景不讲执行细节`,
  },
  快手: {
    emoji: '⚡',
    color: 'text-purple-300 border-purple-500/40 bg-purple-500/10',
    style: `风格：快手面试官。核心价值观：创作者经济、下沉市场、内容分发效率。
- 必问：如何帮助普通创作者变现？你怎么理解"公平普惠"的算法价值观？
- 特别关注：内容生态健康度、创作者留存、算法与商业化平衡
- 会追问：直播电商的供给侧和需求侧怎么同时增长？
- 不喜欢：只关注头部创作者忽视长尾`,
  },
  通用: {
    emoji: '🎯',
    color: 'text-slate-300 border-slate-500/40 bg-slate-500/10',
    style: `风格：顶尖科技公司资深面试官。
- 严格、简短、压迫性
- 每轮深挖细节和漏洞
- 数据驱动，追问具体例子`,
  },
};

// Framework hints per question type
function detectFramework(question: string): FrameworkHint {
  if (/例子|经历|讲.*时候|给我说/.test(question)) return 'STAR';
  if (/分析|拆解|怎么看|维度/.test(question)) return 'MECE';
  if (/为什么|原因|本质|逻辑/.test(question)) return '金字塔原理';
  if (/数据|指标|量化|多少/.test(question)) return '数据驱动';
  return '第一性原理';
}

const FRAMEWORK_DESCRIPTIONS: Record<FrameworkHint, string> = {
  STAR: 'Situation（背景）→ Task（任务）→ Action（行动）→ Result（结果+数据）',
  MECE: '互斥穷举：把问题拆解成不重叠、不遗漏的维度',
  金字塔原理: '结论先行 → 关键论点 → 支撑事实',
  数据驱动: '先给数字，再解释背后的逻辑和原因',
  第一性原理: '拆解问题到最基本假设，从底层构建答案',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildSystemPrompt(position: string, company: string, difficulty: Difficulty, type: InterviewType, preset: CompanyPreset) {
  const presetStyle = COMPANY_PRESETS[preset].style;
  return `你是一名来自顶尖中国科技公司的资深面试官，正在面试候选人的"${position}${company ? `（${company}）` : ''}"岗位。

面试难度：${difficulty}
面试类型：${type}
${presetStyle}

你的行为准则：
1. 绝对严格，不友好，不给提示，不鼓励，不安慰
2. 每轮只问一个问题，但会根据候选人的回答追问，深挖细节和漏洞
3. 如果回答含糊，直接指出"你没有回答到点上"然后继续追问
4. 如果候选人说"不知道"，用更基础的问题来评估其真实水平
5. 问题要有梯度，从宽泛逐渐到具体
6. 语气简短、干练、带压迫感
7. 绝对不主动透露答案或暗示正确方向
8. 不做任何正面评价，只在面试结束时给出报告
9. 面试进行5-8轮问答后，输出"[面试结束]"并停止提问

当前对话是正式面试，直接开始第一个问题，不需要自我介绍，不需要寒暄。`;
}

function buildReportSystemPrompt() {
  return `你是一名专业的面试评估专家，需要根据面试记录给出客观、严格的评估报告。

评分标准：
- 5分：超出预期，回答精准完整，有深度
- 4分：符合预期，回答基本正确，有一定深度
- 3分：勉强及格，回答基本正确但缺乏深度
- 2分：低于预期，回答有明显错误或遗漏
- 1分：严重不足，基本没有回答到点上

你必须严格按照以下JSON格式输出，不要有任何额外文字：
{
  "qaPairs": [
    {
      "question": "问题原文",
      "answer": "候选人回答原文摘要（不超过50字）",
      "score": 1到5的整数,
      "feedback": "具体点评（30-60字，指出问题或亮点）"
    }
  ],
  "totalScore": 0到100的整数,
  "strengths": ["优势点1", "优势点2"],
  "improvements": ["改进点1", "改进点2", "改进点3"],
  "summary": "总体评价（50-80字）",
  "counterQuestions": ["候选人可以问面试官的问题1", "问题2", "问题3", "问题4", "问题5"]
}`;
}

async function callAI(system: string, messages: { role: string; content: string }[], maxTokens = 800): Promise<string> {
  const res = await fetch('/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ system, messages, maxTokens }),
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.text as string;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StarRating({ score }: { score: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <span key={i} className={`text-base ${i <= score ? 'text-yellow-400' : 'text-slate-700'}`}>★</span>
      ))}
    </div>
  );
}

function TypingDots() {
  return (
    <div className="flex gap-1 items-center px-4 py-3">
      {[0, 1, 2].map(i => (
        <motion.span
          key={i}
          className="w-2 h-2 rounded-full bg-orange-400"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
        />
      ))}
    </div>
  );
}

function FrameworkHintPanel({ framework }: { framework: FrameworkHint }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-orange-500/20 bg-orange-500/5 px-4 py-3 mb-3"
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs font-semibold text-orange-400 uppercase tracking-wider">答题框架提示</span>
        <span className="text-xs px-2 py-0.5 rounded-full bg-orange-500/15 border border-orange-500/25 text-orange-300 font-medium">
          {framework}
        </span>
      </div>
      <p className="text-xs text-slate-400 leading-relaxed">{FRAMEWORK_DESCRIPTIONS[framework]}</p>
    </motion.div>
  );
}

// ─── Setup Screen ─────────────────────────────────────────────────────────────

interface SetupProps {
  onStart: (position: string, company: string, difficulty: Difficulty, type: InterviewType, preset: CompanyPreset, showFramework: boolean) => void;
  loading: boolean;
}

function SetupScreen({ onStart, loading }: SetupProps) {
  const [position, setPosition] = useState('');
  const [company, setCompany] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>('中级');
  const [type, setType] = useState<InterviewType>('技术');
  const [preset, setPreset] = useState<CompanyPreset>('通用');
  const [showFramework, setShowFramework] = useState(true);

  const difficulties: Difficulty[] = ['初级', '中级', '高级', '大厂'];
  const types: InterviewType[] = ['技术', '行为', '产品', '综合'];
  const companies: CompanyPreset[] = ['字节跳动', '腾讯', '阿里巴巴', '美团', '快手', '通用'];

  // Auto-disable framework hints for 大厂 difficulty
  useEffect(() => {
    if (difficulty === '大厂') setShowFramework(false);
    else if (difficulty === '初级') setShowFramework(true);
  }, [difficulty]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-xl mx-auto"
    >
      <div className="card p-8 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="text-5xl mb-2">🎯</div>
          <h2 className="text-2xl font-bold text-white">配置面试场景</h2>
          <p className="text-slate-400 text-sm">选择公司风格，AI将还原真实面试氛围</p>
        </div>

        {/* Company Style Presets */}
        <div className="space-y-2">
          <label className="text-sm text-slate-300 font-medium">公司风格预设</label>
          <div className="grid grid-cols-3 gap-2">
            {companies.map(c => (
              <button
                key={c}
                onClick={() => {
                  setPreset(c);
                  if (c !== '通用') setCompany(c);
                  else setCompany('');
                }}
                className={`py-2.5 px-2 rounded-xl text-sm font-medium transition-all border flex items-center justify-center gap-1.5 ${
                  preset === c
                    ? COMPANY_PRESETS[c].color
                    : 'border-[#2d2d50] text-slate-400 hover:border-slate-600 hover:text-slate-200'
                }`}
              >
                <span>{COMPANY_PRESETS[c].emoji}</span>
                <span className="truncate">{c}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Position */}
        <div className="space-y-2">
          <label className="text-sm text-slate-300 font-medium">目标岗位 <span className="text-red-400">*</span></label>
          <input
            className="input"
            placeholder="例如：前端工程师 / 产品经理 / 数据分析师"
            value={position}
            onChange={e => setPosition(e.target.value)}
          />
        </div>

        {/* Company */}
        <div className="space-y-2">
          <label className="text-sm text-slate-300 font-medium">目标公司（可选）</label>
          <input
            className="input"
            placeholder="例如：字节跳动 / 腾讯 / 阿里巴巴"
            value={company}
            onChange={e => setCompany(e.target.value)}
          />
        </div>

        {/* Difficulty */}
        <div className="space-y-2">
          <label className="text-sm text-slate-300 font-medium">面试难度</label>
          <div className="grid grid-cols-4 gap-2">
            {difficulties.map(d => (
              <button
                key={d}
                onClick={() => setDifficulty(d)}
                className={`py-2.5 rounded-xl text-sm font-medium transition-all border ${
                  difficulty === d
                    ? 'bg-orange-600/20 border-orange-500 text-orange-300'
                    : 'border-[#2d2d50] text-slate-400 hover:border-orange-700 hover:text-slate-200'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        {/* Type */}
        <div className="space-y-2">
          <label className="text-sm text-slate-300 font-medium">面试类型</label>
          <div className="grid grid-cols-4 gap-2">
            {types.map(t => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={`py-2.5 rounded-xl text-sm font-medium transition-all border ${
                  type === t
                    ? 'bg-orange-600/20 border-orange-500 text-orange-300'
                    : 'border-[#2d2d50] text-slate-400 hover:border-orange-700 hover:text-slate-200'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Framework toggle */}
        <div className="flex items-center justify-between px-4 py-3 rounded-xl border border-[#2d2d50] bg-[#0a0a18]">
          <div>
            <p className="text-sm text-slate-300 font-medium">答题框架提示</p>
            <p className="text-xs text-slate-500 mt-0.5">
              {difficulty === '大厂' ? '大厂难度已自动关闭' : '面试时在对话下方显示相关框架'}
            </p>
          </div>
          <button
            onClick={() => setShowFramework(v => !v)}
            disabled={difficulty === '大厂'}
            className={`relative w-12 h-6 rounded-full transition-all disabled:opacity-50 ${
              showFramework ? 'bg-orange-500' : 'bg-[#2d2d50]'
            }`}
          >
            <motion.div
              animate={{ x: showFramework ? 24 : 2 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              className="absolute top-1 w-4 h-4 rounded-full bg-white"
            />
          </button>
        </div>

        {/* Warning */}
        <div className="flex items-start gap-3 bg-red-950/30 border border-red-900/40 rounded-xl px-4 py-3">
          <span className="text-red-400 text-lg mt-0.5">⚠️</span>
          <p className="text-red-300/80 text-xs leading-relaxed">
            面试官不会给提示、不会鼓励、不会妥协。准备好承受压力了吗？
          </p>
        </div>

        {/* Start button */}
        <button
          onClick={() => onStart(position, company, difficulty, type, preset, showFramework)}
          disabled={!position.trim() || loading}
          className="btn-primary w-full py-3.5 text-base"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <motion.span
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
              />
              面试官就位中...
            </span>
          ) : '开始面试 →'}
        </button>
      </div>
    </motion.div>
  );
}

// ─── Interview Screen ─────────────────────────────────────────────────────────

interface InterviewProps {
  messages: Message[];
  onSend: (text: string) => void;
  onEnd: () => void;
  aiTyping: boolean;
  position: string;
  company: string;
  difficulty: Difficulty;
  type: InterviewType;
  preset: CompanyPreset;
  showFramework: boolean;
}

function InterviewScreen({
  messages,
  onSend,
  onEnd,
  aiTyping,
  position,
  company,
  difficulty,
  type,
  preset,
  showFramework,
}: InterviewProps) {
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, aiTyping]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || aiTyping) return;
    setInput('');
    onSend(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const typeColor: Record<InterviewType, string> = {
    技术: 'bg-blue-900/40 text-blue-300 border-blue-800/40',
    行为: 'bg-green-900/40 text-green-300 border-green-800/40',
    产品: 'bg-orange-900/40 text-orange-300 border-orange-800/40',
    综合: 'bg-purple-900/40 text-purple-300 border-purple-800/40',
  };

  // Get the last assistant message for framework detection
  const lastAssistantMsg = [...messages].reverse().find(m => m.role === 'assistant');
  const currentFramework = lastAssistantMsg && lastAssistantMsg.content
    ? detectFramework(lastAssistantMsg.content)
    : null;

  const presetCfg = COMPANY_PRESETS[preset];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col h-[calc(100vh-10rem)]"
    >
      {/* Interview info bar */}
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-slate-300 text-sm font-medium">{position}{company && ` @ ${company}`}</span>
          <span className={`tag border text-xs px-2 py-0.5 ${typeColor[type]}`}>{type}面试</span>
          <span className="tag bg-slate-800/60 text-slate-400 border border-slate-700/40 text-xs px-2 py-0.5">{difficulty}</span>
          <span className={`tag border text-xs px-2 py-0.5 ${presetCfg.color}`}>
            {presetCfg.emoji} {preset}
          </span>
        </div>
        <button
          onClick={onEnd}
          disabled={aiTyping || messages.length < 2}
          className="text-xs px-3 py-1.5 rounded-lg border border-red-900/50 text-red-400 hover:bg-red-950/30 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
        >
          结束面试
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1 pb-2">
        <AnimatePresence initial={false}>
          {messages.map((msg, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-red-700 to-orange-600 flex items-center justify-center text-sm mr-2 mt-1">
                  {presetCfg.emoji}
                </div>
              )}
              <div
                className={`max-w-[80%] sm:max-w-[70%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === 'assistant'
                    ? 'bg-[#1a1a2e] border border-[#2d2d50] text-slate-200 rounded-tl-sm'
                    : 'bg-gradient-to-br from-orange-700 to-orange-600 text-white rounded-tr-sm'
                }`}
              >
                {msg.content}
              </div>
              {msg.role === 'user' && (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-sm ml-2 mt-1">
                  👤
                </div>
              )}
            </motion.div>
          ))}

          {/* Typing indicator */}
          {aiTyping && (
            <motion.div
              key="typing"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex justify-start"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-700 to-orange-600 flex items-center justify-center text-sm mr-2 mt-1 flex-shrink-0">
                {presetCfg.emoji}
              </div>
              <div className="bg-[#1a1a2e] border border-[#2d2d50] rounded-2xl rounded-tl-sm">
                <TypingDots />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>

      {/* Framework hint panel */}
      {showFramework && currentFramework && messages.length > 0 && !aiTyping && (
        <FrameworkHintPanel framework={currentFramework} />
      )}

      {/* Input area */}
      <div className="flex-shrink-0 pt-3 border-t border-[#1e1e3a]">
        <div className="flex gap-2 items-end">
          <textarea
            ref={textareaRef}
            className="textarea flex-1 min-h-[52px] max-h-32 resize-none"
            placeholder="输入你的回答... (Enter 发送，Shift+Enter 换行)"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={aiTyping}
            rows={2}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || aiTyping}
            className="btn-primary px-4 py-3 h-[52px] flex items-center gap-1.5 flex-shrink-0"
          >
            <span className="hidden sm:inline text-sm">发送</span>
            <span>→</span>
          </button>
        </div>
        <p className="text-slate-600 text-xs mt-1.5 text-center">
          {messages.filter(m => m.role === 'user').length} 轮已答 · 面试进行中
        </p>
      </div>
    </motion.div>
  );
}

// ─── Report Screen ────────────────────────────────────────────────────────────

interface ReportProps {
  report: Report;
  onRestart: () => void;
  position: string;
  company: string;
}

function ReportScreen({ report, onRestart, position, company }: ReportProps) {
  const [activeSection, setActiveSection] = useState<'scores' | 'counter'>('scores');

  const scoreColor = (s: number) =>
    s >= 80 ? 'text-green-400' : s >= 60 ? 'text-yellow-400' : s >= 40 ? 'text-orange-400' : 'text-red-400';

  const scoreLabel = (s: number) =>
    s >= 80 ? '优秀' : s >= 60 ? '良好' : s >= 40 ? '待提升' : '不及格';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 max-w-2xl mx-auto"
    >
      {/* Overall score */}
      <div className="card p-6 text-center space-y-3">
        <p className="text-slate-400 text-sm">面试综合评分</p>
        <div className={`text-6xl font-black ${scoreColor(report.totalScore)}`}>
          {report.totalScore}
        </div>
        <div className={`text-sm font-semibold ${scoreColor(report.totalScore)}`}>
          {scoreLabel(report.totalScore)}
        </div>
        <p className="text-slate-300 text-sm leading-relaxed max-w-md mx-auto">{report.summary}</p>
        <p className="text-slate-500 text-xs">{position}{company && ` @ ${company}`}</p>
      </div>

      {/* Section tabs */}
      <div className="flex gap-1 p-1 bg-[#0a0a18] rounded-xl border border-[#1e1e3a]">
        <button
          onClick={() => setActiveSection('scores')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
            activeSection === 'scores'
              ? 'bg-orange-600/20 text-orange-300 border border-orange-500/30'
              : 'text-white/40 hover:text-white/70'
          }`}
        >
          📊 评分详情
        </button>
        <button
          onClick={() => setActiveSection('counter')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
            activeSection === 'counter'
              ? 'bg-orange-600/20 text-orange-300 border border-orange-500/30'
              : 'text-white/40 hover:text-white/70'
          }`}
        >
          🗡️ 反杀面试官
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeSection === 'scores' && (
          <motion.div
            key="scores"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="space-y-6"
          >
            {/* Strengths & improvements */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="card p-5 space-y-3">
                <h3 className="text-sm font-semibold text-green-400 flex items-center gap-2">
                  <span>✓</span> 优势
                </h3>
                <ul className="space-y-2">
                  {report.strengths.map((s, i) => (
                    <li key={i} className="text-slate-300 text-sm flex items-start gap-2">
                      <span className="text-green-500 mt-0.5 flex-shrink-0">•</span>
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="card p-5 space-y-3">
                <h3 className="text-sm font-semibold text-red-400 flex items-center gap-2">
                  <span>✗</span> 改进点
                </h3>
                <ul className="space-y-2">
                  {report.improvements.map((s, i) => (
                    <li key={i} className="text-slate-300 text-sm flex items-start gap-2">
                      <span className="text-red-500 mt-0.5 flex-shrink-0">•</span>
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Q&A breakdown */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">逐题点评</h3>
              {report.qaPairs.map((qa, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.07 }}
                  className="card p-5 space-y-3"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1 flex-1">
                      <p className="text-xs text-slate-500 uppercase tracking-wide">问题 {i + 1}</p>
                      <p className="text-slate-200 text-sm font-medium leading-relaxed">{qa.question}</p>
                    </div>
                    <div className="flex-shrink-0 flex flex-col items-end gap-1">
                      <StarRating score={qa.score} />
                      <span className="text-xs text-slate-500">{qa.score}/5</span>
                    </div>
                  </div>
                  <div className="border-t border-[#1e1e3a] pt-3 space-y-2">
                    <div className="bg-orange-950/20 rounded-lg px-3 py-2">
                      <p className="text-xs text-slate-500 mb-1">你的回答</p>
                      <p className="text-slate-400 text-sm leading-relaxed">{qa.answer}</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-yellow-500 text-xs mt-0.5 flex-shrink-0">💬</span>
                      <p className="text-slate-300 text-xs leading-relaxed">{qa.feedback}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {activeSection === 'counter' && (
          <motion.div
            key="counter"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="space-y-4"
          >
            <div className="rounded-2xl border border-orange-500/20 bg-orange-500/5 p-5 space-y-2">
              <h3 className="text-base font-bold text-orange-300 flex items-center gap-2">
                <span>🗡️</span> 反杀面试官 — 你可以问的5个问题
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                在面试结尾问这些问题，能展现你的资深度和真实兴趣，让面试官印象深刻。
              </p>
            </div>
            {(report.counterQuestions ?? [
              '您认为这个岗位在未来半年最大的挑战是什么？',
              '团队目前技术债务的情况是怎样的，你们如何决策是否偿还？',
              '您觉得在这个岗位能发展成功的人，有什么共同特质？',
              '这个团队现在最需要补充的能力是什么？',
              '您自己在这家公司最有成就感的一个项目是什么？'
            ]).map((q, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className="rounded-xl border border-[#1e1e3a] bg-[#0a0a18] p-4"
              >
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-orange-500/20 border border-orange-500/30 text-orange-400 text-xs font-bold flex items-center justify-center mt-0.5">
                    {i + 1}
                  </span>
                  <p className="text-sm text-slate-200 leading-relaxed">{q}</p>
                </div>
              </motion.div>
            ))}
            <div className="rounded-xl border border-[#1e1e3a] bg-[#0a0a18] p-4">
              <p className="text-xs text-slate-400 leading-relaxed">
                <span className="text-orange-400 font-medium">为什么这些问题有效：</span>
                这类问题展示你在思考岗位的真实挑战而非只关心薪资；展示你有主见、有框架；让面试官觉得你是在"考察"他们，而不是一味求职。这是高级候选人的标志性行为。
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Restart */}
      <div className="text-center pb-8">
        <button onClick={onRestart} className="btn-primary px-8 py-3">
          再来一次
        </button>
        <p className="text-slate-600 text-xs mt-3">不服？重新来过</p>
      </div>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function InterviewPage() {
  const [phase, setPhase] = useState<Phase>('setup');
  const [messages, setMessages] = useState<Message[]>([]);
  const [aiTyping, setAiTyping] = useState(false);
  const [startLoading, setStartLoading] = useState(false);
  const [report, setReport] = useState<Report | null>(null);

  const [position, setPosition] = useState('');
  const [company, setCompany] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>('中级');
  const [type, setType] = useState<InterviewType>('技术');
  const [preset, setPreset] = useState<CompanyPreset>('通用');
  const [showFramework, setShowFramework] = useState(true);

  const systemPromptRef = useRef('');

  // Start interview: call AI to get first question
  const handleStart = async (
    pos: string,
    comp: string,
    diff: Difficulty,
    t: InterviewType,
    pre: CompanyPreset,
    framework: boolean
  ) => {
    setStartLoading(true);
    setPosition(pos);
    setCompany(comp);
    setDifficulty(diff);
    setType(t);
    setPreset(pre);
    setShowFramework(framework);

    const system = buildSystemPrompt(pos, comp, diff, t, pre);
    systemPromptRef.current = system;

    try {
      const firstQ = await callAI(system, [{ role: 'user', content: '开始面试' }], 400);
      setMessages([{ role: 'assistant', content: firstQ }]);
      setPhase('interview');
    } catch (e) {
      console.error(e);
      alert('启动失败，请检查API配置');
    } finally {
      setStartLoading(false);
    }
  };

  // User sends an answer
  const handleSend = async (text: string) => {
    const newMessages: Message[] = [...messages, { role: 'user', content: text }];
    setMessages(newMessages);
    setAiTyping(true);

    try {
      const aiReply = await callAI(
        systemPromptRef.current,
        newMessages.map(m => ({ role: m.role, content: m.content })),
        600
      );

      const isEnd = aiReply.includes('[面试结束]');
      const cleanReply = aiReply.replace('[面试结束]', '').trim();
      const finalMessages: Message[] = [...newMessages, { role: 'assistant', content: cleanReply }];
      setMessages(finalMessages);

      if (isEnd) {
        setAiTyping(false);
        await generateReport(finalMessages);
      }
    } catch (e) {
      console.error(e);
      setMessages(prev => [...prev, { role: 'assistant', content: '系统错误，请重试。' }]);
    } finally {
      setAiTyping(false);
    }
  };

  // End interview manually
  const handleEnd = async () => {
    setAiTyping(true);
    await generateReport(messages);
    setAiTyping(false);
  };

  const generateReport = async (finalMessages: Message[]) => {
    setPhase('report');

    // Build Q&A transcript for the report prompt
    const transcript = finalMessages
      .map(m => `${m.role === 'assistant' ? '[面试官]' : '[候选人]'}: ${m.content}`)
      .join('\n\n');

    const reportSystem = buildReportSystemPrompt();
    const reportPrompt = `以下是完整面试记录，请给出严格的评估报告，并生成5个候选人可以反问面试官的高质量问题：\n\n${transcript}`;

    try {
      const raw = await callAI(reportSystem, [{ role: 'user', content: reportPrompt }], 2500);

      // Extract JSON from response
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('Invalid report format');
      const parsed: Report = JSON.parse(jsonMatch[0]);
      setReport(parsed);
    } catch (e) {
      console.error('Report generation failed:', e);
      // Fallback report
      const qas = finalMessages.reduce<QAItem[]>((acc, msg, i) => {
        if (msg.role === 'assistant' && finalMessages[i + 1]?.role === 'user') {
          acc.push({
            question: msg.content,
            answer: finalMessages[i + 1].content,
            score: 3,
            feedback: '报告生成出错，无法提供详细反馈。',
          });
        }
        return acc;
      }, []);
      setReport({
        qaPairs: qas,
        totalScore: 60,
        strengths: ['完成了面试'],
        improvements: ['报告生成失败，请重新尝试'],
        summary: '面试已完成，但评估报告生成失败，请重试。',
        counterQuestions: [],
      });
    }
  };

  const handleRestart = () => {
    setPhase('setup');
    setMessages([]);
    setReport(null);
    systemPromptRef.current = '';
  };

  return (
    <ToolLayout
      title="大厂面试复现器"
      subtitle="AI 严苛面试官 · 字节/腾讯/阿里/美团/快手公司风格 · 答题框架提示 · 反杀话术"
    >
      <AnimatePresence mode="wait">
        {phase === 'setup' && (
          <motion.div key="setup" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <SetupScreen onStart={handleStart} loading={startLoading} />
          </motion.div>
        )}

        {phase === 'interview' && (
          <motion.div key="interview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <InterviewScreen
              messages={messages}
              onSend={handleSend}
              onEnd={handleEnd}
              aiTyping={aiTyping}
              position={position}
              company={company}
              difficulty={difficulty}
              type={type}
              preset={preset}
              showFramework={showFramework}
            />
          </motion.div>
        )}

        {phase === 'report' && (
          <motion.div key="report" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {report ? (
              <ReportScreen report={report} onRestart={handleRestart} position={position} company={company} />
            ) : (
              <div className="flex flex-col items-center justify-center py-24 space-y-4">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
                  className="w-10 h-10 border-2 border-orange-600/30 border-t-orange-400 rounded-full"
                />
                <p className="text-slate-400">AI 正在生成面试报告...</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </ToolLayout>
  );
}
