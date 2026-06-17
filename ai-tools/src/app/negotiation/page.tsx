'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ToolLayout } from '@/components/Layout/ToolLayout';

// ─── Types ────────────────────────────────────────────────────────────────────

type Scenario = '薪资谈判' | '商务合作谈判' | '合同条款谈判' | '供应商/采购谈判';
type OpponentStyle = '强硬派' | '稳重派' | '狡猾派';
type Phase = 'setup' | 'negotiation' | 'results';

interface Message {
  role: 'assistant' | 'user';
  content: string;
}

interface CoachingTip {
  messageIndex: number;
  tip: string;
}

interface NegotiationResult {
  score: number;
  wellDone: string[];
  mistakes: string[];
  optimalStrategy: string;
  keyMoments: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildOpponentSystemPrompt(
  scenario: Scenario,
  context: string,
  style: OpponentStyle
): string {
  const styleGuide: Record<OpponentStyle, string> = {
    强硬派: `你的谈判风格极其强硬：
- 第一轮立即抛出对你最有利的极端条件（锚定）
- 频繁使用压力战术："这是最终报价"、"我们还有其他选择"
- 对任何让步都表现出不满意和不耐烦
- 制造时间压力："今天必须决定"
- 绝对不主动让步，除非对方有强有力的理由
- 语气强硬、简短、带威胁性`,
    稳重派: `你的谈判风格稳重老练：
- 态度礼貌但立场坚定，以理服人
- 慢慢推进，不急于达成协议
- 强调长期合作价值，淡化短期利益
- 用数据和逻辑支撑你的立场
- 偶尔给出小幅度让步，但总体守住核心底线
- 语气专业、沉稳、不容置疑`,
    狡猾派: `你的谈判风格狡猾多变：
- 故意发布虚假信息："我们上周刚谈成了一个更好的条件"
- 玩"好警察/坏警察"，时而友善时而强硬
- 转移话题，模糊核心议题
- 假装已经有其他候选/竞争者
- 用情绪战术：时而示弱，时而愤怒
- 在谈判快结束时提出新的苛刻条件
- 表面上看起来很合理，但暗藏算计`,
  };

  return `你正在进行"${scenario}"谈判，扮演对方当事人。

背景信息：${context}

${styleGuide[style]}

核心规则：
1. 你代表对方利益，目标是让结果尽量有利于你
2. 每次只回应当前轮，不超过150字
3. 完全进入角色，不要破坏沉浸感
4. 根据对方的谈判策略适当调整回应
5. 如果对方策略很差，可以乘胜追击
6. 如果对方策略很好，可以稍作退让但保持核心立场
7. 直接开始谈判，不需要任何开场白或说明

现在开始，你先说第一句话进入谈判状态。`;
}

function buildCoachingSystemPrompt(scenario: Scenario, style: OpponentStyle): string {
  return `你是一位专业谈判教练，正在观摩一场"${scenario}"谈判（对方是${style}风格）。

你的任务：分析用户刚才那轮的谈判策略，给出简短精准的实战教练建议。

要求：
- 只分析刚才这一轮的用户发言
- 指出用户用了什么策略（或没有用策略）
- 指出这个策略是否有效
- 给出1-2个具体改进建议或进阶技巧
- 语气要像真实教练，直接、专业、鼓励
- 控制在80字以内，不需要标题或分点`;
}

function buildResultSystemPrompt(): string {
  return `你是一位资深谈判培训师，需要根据完整谈判记录给出专业评估报告。

你必须严格按照以下JSON格式输出，不要有任何额外文字：
{
  "score": 0-100的整数,
  "wellDone": ["做得好的点1", "做得好的点2"],
  "mistakes": ["失误1", "失误2", "失误3"],
  "optimalStrategy": "如果重新来过，最优谈判路径是什么（100-150字）",
  "keyMoments": "关键转折点分析（60-80字）"
}`;
}

async function callAI(
  system: string,
  messages: { role: string; content: string }[],
  maxTokens = 600
): Promise<string> {
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

function TypingDots({ color = 'yellow' }: { color?: 'yellow' | 'green' }) {
  const dotClass = color === 'yellow' ? 'bg-yellow-400' : 'bg-green-400';
  return (
    <div className="flex gap-1 items-center px-4 py-3">
      {[0, 1, 2].map(i => (
        <motion.span
          key={i}
          className={`w-2 h-2 rounded-full ${dotClass}`}
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
        />
      ))}
    </div>
  );
}

// ─── Setup Screen ─────────────────────────────────────────────────────────────

interface SetupProps {
  onStart: (scenario: Scenario, context: string, style: OpponentStyle) => void;
  loading: boolean;
}

function SetupScreen({ onStart, loading }: SetupProps) {
  const [scenario, setScenario] = useState<Scenario>('薪资谈判');
  const [context, setContext] = useState('');
  const [style, setStyle] = useState<OpponentStyle>('稳重派');

  const scenarios: Scenario[] = ['薪资谈判', '商务合作谈判', '合同条款谈判', '供应商/采购谈判'];
  const styles: OpponentStyle[] = ['强硬派', '稳重派', '狡猾派'];

  const styleDesc: Record<OpponentStyle, string> = {
    强硬派: '强压锚定，寸步不让',
    稳重派: '以理服人，坚守底线',
    狡猾派: '虚虚实实，暗藏算计',
  };

  const scenarioIcon: Record<Scenario, string> = {
    薪资谈判: '💰',
    商务合作谈判: '🤝',
    合同条款谈判: '📝',
    '供应商/采购谈判': '🏭',
  };

  const placeholders: Record<Scenario, string> = {
    薪资谈判: '例如：我目前月薪15k，工作了2年，希望涨到20k，对方公司规模中等',
    商务合作谈判: '例如：我方是初创公司，希望和对方建立分销合作，争取30%分成',
    合同条款谈判: '例如：对方合同中要求独家授权3年，我希望缩短到1年且保留转让权',
    '供应商/采购谈判': '例如：月采购量约50万，目前单价8元，希望压到6元并争取账期60天',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-xl mx-auto"
    >
      <div className="card p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="text-5xl mb-2">⚔️</div>
          <h2 className="text-2xl font-bold text-white">配置谈判沙盘</h2>
          <p className="text-slate-400 text-sm">AI扮演谈判对手，实时教练陪练，提升谈判实战能力</p>
        </div>

        {/* Scenario */}
        <div className="space-y-2">
          <label className="text-sm text-slate-300 font-medium">谈判场景</label>
          <div className="grid grid-cols-2 gap-2">
            {scenarios.map(s => (
              <button
                key={s}
                onClick={() => setScenario(s)}
                className={`py-3 px-3 rounded-xl text-sm font-medium transition-all border flex items-center gap-2 ${
                  scenario === s
                    ? 'bg-yellow-600/20 border-yellow-500/60 text-yellow-300'
                    : 'border-[#2d2d50] text-slate-400 hover:border-yellow-700/50 hover:text-slate-200'
                }`}
              >
                <span>{scenarioIcon[s]}</span>
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Context */}
        <div className="space-y-2">
          <label className="text-sm text-slate-300 font-medium">
            场景背景 <span className="text-red-400">*</span>
          </label>
          <textarea
            className="textarea w-full h-24 resize-none"
            placeholder={placeholders[scenario]}
            value={context}
            onChange={e => setContext(e.target.value)}
          />
          <p className="text-slate-600 text-xs">描述你的具体情况，AI会根据背景调整策略</p>
        </div>

        {/* Style */}
        <div className="space-y-2">
          <label className="text-sm text-slate-300 font-medium">对手风格</label>
          <div className="grid grid-cols-3 gap-2">
            {styles.map(st => (
              <button
                key={st}
                onClick={() => setStyle(st)}
                className={`py-3 rounded-xl text-sm font-medium transition-all border flex flex-col items-center gap-1 ${
                  style === st
                    ? 'bg-yellow-600/20 border-yellow-500/60 text-yellow-300'
                    : 'border-[#2d2d50] text-slate-400 hover:border-yellow-700/50 hover:text-slate-200'
                }`}
              >
                <span className="font-semibold">{st}</span>
                <span className="text-xs opacity-70">{styleDesc[st]}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tip */}
        <div className="flex items-start gap-3 bg-yellow-950/20 border border-yellow-900/30 rounded-xl px-4 py-3">
          <span className="text-yellow-400 text-base mt-0.5">💡</span>
          <p className="text-yellow-200/70 text-xs leading-relaxed">
            每轮你发言后，AI将扮演对手回复，同时系统会给你实时教练建议。随时可结束并查看复盘报告。
          </p>
        </div>

        <button
          onClick={() => onStart(scenario, context, style)}
          disabled={!context.trim() || loading}
          className="btn-primary w-full py-3.5 text-base"
          style={{ background: 'linear-gradient(135deg, #ca8a04, #b45309)' }}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <motion.span
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
              />
              对手就位中...
            </span>
          ) : '开始谈判 ⚔️'}
        </button>
      </div>
    </motion.div>
  );
}

// ─── Negotiation Screen ───────────────────────────────────────────────────────

interface NegotiationProps {
  messages: Message[];
  coachingTips: CoachingTip[];
  onSend: (text: string) => void;
  onEnd: () => void;
  aiTyping: boolean;
  coachTyping: boolean;
  scenario: Scenario;
  style: OpponentStyle;
}

function NegotiationScreen({
  messages,
  coachingTips,
  onSend,
  onEnd,
  aiTyping,
  coachTyping,
  scenario,
  style,
}: NegotiationProps) {
  const [input, setInput] = useState('');
  const [showCoach, setShowCoach] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, aiTyping, coachingTips]);

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

  const styleColor: Record<OpponentStyle, string> = {
    强硬派: 'bg-red-900/30 text-red-300 border-red-800/40',
    稳重派: 'bg-blue-900/30 text-blue-300 border-blue-800/40',
    狡猾派: 'bg-purple-900/30 text-purple-300 border-purple-800/40',
  };

  // Get coaching tip for a specific assistant message index
  const getCoachTip = (msgIdx: number): string | null => {
    const tip = coachingTips.find(t => t.messageIndex === msgIdx);
    return tip ? tip.tip : null;
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col h-[calc(100vh-10rem)]"
    >
      {/* Info bar */}
      <div className="flex items-center justify-between mb-3 flex-shrink-0 flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-slate-300 text-sm font-medium">{scenario}</span>
          <span className={`tag border text-xs px-2 py-0.5 ${styleColor[style]}`}>{style}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCoach(v => !v)}
            className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
              showCoach
                ? 'border-green-700/50 text-green-400 bg-green-950/20'
                : 'border-[#2d2d50] text-slate-500 hover:text-slate-300'
            }`}
          >
            🎓 教练 {showCoach ? 'ON' : 'OFF'}
          </button>
          <button
            onClick={onEnd}
            disabled={aiTyping || messages.length < 3}
            className="text-xs px-3 py-1.5 rounded-lg border border-yellow-900/50 text-yellow-400 hover:bg-yellow-950/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >
            结束谈判
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1 pb-2">
        <AnimatePresence initial={false}>
          {messages.map((msg, idx) => (
            <div key={idx}>
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-yellow-700 to-orange-600 flex items-center justify-center text-sm mr-2 mt-1">
                    💼
                  </div>
                )}
                <div
                  className={`max-w-[80%] sm:max-w-[70%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    msg.role === 'assistant'
                      ? 'bg-[#1a1a2e] border border-[#2d2d50] text-slate-200 rounded-tl-sm'
                      : 'bg-gradient-to-br from-yellow-700 to-yellow-600 text-white rounded-tr-sm'
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

              {/* Coaching tip after user message */}
              {msg.role === 'user' && showCoach && (() => {
                const tip = getCoachTip(idx);
                const isLastUser = idx === messages.length - 1;
                const showTyping = isLastUser && coachTyping;
                if (!tip && !showTyping) return null;
                return (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mx-12 mt-1"
                  >
                    <div className="bg-green-950/20 border border-green-800/30 rounded-xl px-3 py-2.5 flex items-start gap-2">
                      <span className="text-green-400 text-xs mt-0.5 flex-shrink-0">🎓</span>
                      {showTyping && !tip ? (
                        <TypingDots color="green" />
                      ) : (
                        <p className="text-green-200/80 text-xs leading-relaxed">{tip}</p>
                      )}
                    </div>
                  </motion.div>
                );
              })()}
            </div>
          ))}

          {/* AI typing */}
          {aiTyping && (
            <motion.div
              key="typing"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex justify-start"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-700 to-orange-600 flex items-center justify-center text-sm mr-2 mt-1 flex-shrink-0">
                💼
              </div>
              <div className="bg-[#1a1a2e] border border-[#2d2d50] rounded-2xl rounded-tl-sm">
                <TypingDots color="yellow" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 pt-3 border-t border-[#1e1e3a]">
        <div className="flex gap-2 items-end">
          <textarea
            className="textarea flex-1 min-h-[52px] max-h-32 resize-none"
            placeholder="输入你的谈判发言... (Enter 发送，Shift+Enter 换行)"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={aiTyping}
            rows={2}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || aiTyping}
            className="px-4 py-3 h-[52px] flex items-center gap-1.5 flex-shrink-0 rounded-xl font-medium text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: 'linear-gradient(135deg, #ca8a04, #b45309)', color: 'white' }}
          >
            <span className="hidden sm:inline">发言</span>
            <span>→</span>
          </button>
        </div>
        <p className="text-slate-600 text-xs mt-1.5 text-center">
          {messages.filter(m => m.role === 'user').length} 轮 · 谈判进行中
        </p>
      </div>
    </motion.div>
  );
}

// ─── Results Screen ───────────────────────────────────────────────────────────

interface ResultsProps {
  result: NegotiationResult;
  onRestart: () => void;
  scenario: Scenario;
}

function ResultsScreen({ result, onRestart, scenario }: ResultsProps) {
  const scoreColor = (s: number) =>
    s >= 80 ? 'text-green-400' : s >= 60 ? 'text-yellow-400' : s >= 40 ? 'text-orange-400' : 'text-red-400';

  const scoreLabel = (s: number) =>
    s >= 80 ? '谈判高手' : s >= 60 ? '表现不错' : s >= 40 ? '需要练习' : '还需努力';

  const scoreBg = (s: number) =>
    s >= 80
      ? 'from-green-900/40 to-green-800/20 border-green-700/40'
      : s >= 60
      ? 'from-yellow-900/40 to-yellow-800/20 border-yellow-700/40'
      : s >= 40
      ? 'from-orange-900/40 to-orange-800/20 border-orange-700/40'
      : 'from-red-900/40 to-red-800/20 border-red-700/40';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-5 max-w-2xl mx-auto"
    >
      {/* Score */}
      <div className={`card p-6 text-center bg-gradient-to-br ${scoreBg(result.score)} border`}>
        <p className="text-slate-400 text-sm mb-2">谈判综合评分</p>
        <div className={`text-6xl font-black ${scoreColor(result.score)}`}>{result.score}</div>
        <div className={`text-sm font-semibold mt-1 ${scoreColor(result.score)}`}>
          {scoreLabel(result.score)}
        </div>
        <p className="text-slate-500 text-xs mt-2">{scenario}</p>
      </div>

      {/* Well done & Mistakes */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="card p-5 space-y-3">
          <h3 className="text-sm font-semibold text-green-400 flex items-center gap-2">
            <span>✓</span> 做得好的地方
          </h3>
          <ul className="space-y-2">
            {result.wellDone.map((s, i) => (
              <li key={i} className="text-slate-300 text-sm flex items-start gap-2">
                <span className="text-green-500 mt-0.5 flex-shrink-0">•</span>
                {s}
              </li>
            ))}
          </ul>
        </div>
        <div className="card p-5 space-y-3">
          <h3 className="text-sm font-semibold text-red-400 flex items-center gap-2">
            <span>✗</span> 失误与不足
          </h3>
          <ul className="space-y-2">
            {result.mistakes.map((s, i) => (
              <li key={i} className="text-slate-300 text-sm flex items-start gap-2">
                <span className="text-red-500 mt-0.5 flex-shrink-0">•</span>
                {s}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Key moments */}
      <div className="card p-5 space-y-3">
        <h3 className="text-sm font-semibold text-yellow-400 flex items-center gap-2">
          ⚡ 关键时刻分析
        </h3>
        <p className="text-slate-300 text-sm leading-relaxed">{result.keyMoments}</p>
      </div>

      {/* Optimal strategy */}
      <div className="card p-5 space-y-3">
        <h3 className="text-sm font-semibold text-blue-400 flex items-center gap-2">
          🔮 最优策略复盘
        </h3>
        <p className="text-slate-300 text-sm leading-relaxed">{result.optimalStrategy}</p>
      </div>

      {/* Restart */}
      <div className="text-center pb-8">
        <button
          onClick={onRestart}
          className="px-8 py-3 rounded-xl font-medium text-sm transition-all"
          style={{ background: 'linear-gradient(135deg, #ca8a04, #b45309)', color: 'white' }}
        >
          再战一局
        </button>
        <p className="text-slate-600 text-xs mt-3">每次练习都会让你进步</p>
      </div>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function NegotiationPage() {
  const [phase, setPhase] = useState<Phase>('setup');
  const [messages, setMessages] = useState<Message[]>([]);
  const [coachingTips, setCoachingTips] = useState<CoachingTip[]>([]);
  const [aiTyping, setAiTyping] = useState(false);
  const [coachTyping, setCoachTyping] = useState(false);
  const [startLoading, setStartLoading] = useState(false);
  const [result, setResult] = useState<NegotiationResult | null>(null);

  const [scenario, setScenario] = useState<Scenario>('薪资谈判');
  const [context, setContext] = useState('');
  const [style, setStyle] = useState<OpponentStyle>('稳重派');

  const opponentSystemRef = useRef('');
  const coachSystemRef = useRef('');

  const handleStart = async (sc: Scenario, ctx: string, st: OpponentStyle) => {
    setStartLoading(true);
    setScenario(sc);
    setContext(ctx);
    setStyle(st);

    const opponentSystem = buildOpponentSystemPrompt(sc, ctx, st);
    opponentSystemRef.current = opponentSystem;
    coachSystemRef.current = buildCoachingSystemPrompt(sc, st);

    try {
      const firstMsg = await callAI(opponentSystem, [{ role: 'user', content: '开始谈判' }], 300);
      setMessages([{ role: 'assistant', content: firstMsg }]);
      setPhase('negotiation');
    } catch (e) {
      console.error(e);
      alert('启动失败，请检查API配置');
    } finally {
      setStartLoading(false);
    }
  };

  const handleSend = async (text: string) => {
    const userMsgIndex = messages.length; // index of the upcoming user message
    const newMessages: Message[] = [...messages, { role: 'user', content: text }];
    setMessages(newMessages);
    setAiTyping(true);

    // The AI response to this user turn, and concurrently fetch coaching
    try {
      // Start opponent response
      const [opponentReply] = await Promise.all([
        callAI(
          opponentSystemRef.current,
          newMessages.map(m => ({ role: m.role, content: m.content })),
          300
        ),
      ]);

      const finalMessages: Message[] = [...newMessages, { role: 'assistant', content: opponentReply }];
      setMessages(finalMessages);
      setAiTyping(false);

      // Fetch coaching tip for the user's message (userMsgIndex)
      setCoachTyping(true);
      try {
        const coachMessages = [
          {
            role: 'user',
            content: `对手刚才说："${messages[messages.length - 1]?.content ?? '（谈判开始）'}"\n\n用户回应："${text}"\n\n请给出教练反馈。`,
          },
        ];
        const tip = await callAI(coachSystemRef.current, coachMessages, 200);
        setCoachingTips(prev => [...prev, { messageIndex: userMsgIndex, tip }]);
      } catch {
        // coaching failure is non-fatal
      } finally {
        setCoachTyping(false);
      }
    } catch (e) {
      console.error(e);
      setMessages(prev => [...prev, { role: 'assistant', content: '系统错误，请重试。' }]);
      setAiTyping(false);
    }
  };

  const handleEnd = async () => {
    setPhase('results');
    const transcript = messages
      .map(m => `${m.role === 'assistant' ? '[对手]' : '[我方]'}: ${m.content}`)
      .join('\n\n');

    try {
      const raw = await callAI(
        buildResultSystemPrompt(),
        [{ role: 'user', content: `以下是完整谈判记录，请给出评估报告：\n\n${transcript}` }],
        1200
      );
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('Invalid format');
      const parsed: NegotiationResult = JSON.parse(jsonMatch[0]);
      setResult(parsed);
    } catch (e) {
      console.error(e);
      setResult({
        score: 60,
        wellDone: ['完成了谈判练习'],
        mistakes: ['报告生成失败，请重试'],
        optimalStrategy: '报告生成失败，请重新尝试。',
        keyMoments: '无法分析。',
      });
    }
  };

  const handleRestart = () => {
    setPhase('setup');
    setMessages([]);
    setCoachingTips([]);
    setResult(null);
    opponentSystemRef.current = '';
    coachSystemRef.current = '';
  };

  return (
    <ToolLayout
      title="谈判沙盘"
      subtitle="AI扮演谈判对手 · 实时教练提示 · 复盘最优策略"
    >
      <AnimatePresence mode="wait">
        {phase === 'setup' && (
          <motion.div key="setup" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <SetupScreen onStart={handleStart} loading={startLoading} />
          </motion.div>
        )}

        {phase === 'negotiation' && (
          <motion.div key="negotiation" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <NegotiationScreen
              messages={messages}
              coachingTips={coachingTips}
              onSend={handleSend}
              onEnd={handleEnd}
              aiTyping={aiTyping}
              coachTyping={coachTyping}
              scenario={scenario}
              style={style}
            />
          </motion.div>
        )}

        {phase === 'results' && (
          <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {result ? (
              <ResultsScreen result={result} onRestart={handleRestart} scenario={scenario} />
            ) : (
              <div className="flex flex-col items-center justify-center py-24 space-y-4">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
                  className="w-10 h-10 border-2 border-yellow-600/30 border-t-yellow-400 rounded-full"
                />
                <p className="text-slate-400">AI 正在生成复盘报告...</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </ToolLayout>
  );
}
