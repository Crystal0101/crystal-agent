'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ToolLayout } from '@/components/Layout/ToolLayout';

const TABS = [
  { id: 'decode', label: '消息解码', icon: '🔍', desc: '对方到底在说什么' },
  { id: 'reply', label: '回复生成', icon: '💬', desc: '这条消息怎么回' },
  { id: 'profile', label: '心理画像', icon: '🧠', desc: '他/她是什么类型的人' },
  { id: 'script', label: '撩人话术', icon: '🔥', desc: '主动出击的剧本' },
  { id: 'breakup', label: '复合攻略', icon: '💔', desc: '分手后如何挽回' },
];

const RELATIONSHIP_STAGES = ['暗恋/追求期', '刚开始聊', '热恋期', '稳定期', '冷淡期', '分手后'];
const GENDER_OPTIONS = ['对方是男生', '对方是女生', '不想说'];
const REPLY_STYLES = ['若即若离', '热情主动', '幽默调皮', '温柔体贴', '高冷神秘'];

export default function LoveCoachPage() {
  const [activeTab, setActiveTab] = useState('decode');

  return (
    <ToolLayout>
      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="text-5xl mb-3">💘</div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-pink-400 to-rose-500 bg-clip-text text-transparent mb-2">
            恋爱军师
          </h1>
          <p className="text-slate-400 text-sm">读懂对方 · 精准回应 · 掌握节奏</p>
        </motion.div>

        {/* Tab nav */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-lg shadow-pink-900/30'
                  : 'bg-slate-800/60 text-slate-400 hover:text-white hover:bg-slate-700/60 border border-slate-700/50'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'decode' && <DecodeTab />}
            {activeTab === 'reply' && <ReplyTab />}
            {activeTab === 'profile' && <ProfileTab />}
            {activeTab === 'script' && <ScriptTab />}
            {activeTab === 'breakup' && <BreakupTab />}
          </motion.div>
        </AnimatePresence>
      </div>
    </ToolLayout>
  );
}

// ─── 消息解码 ─────────────────────────────────────────────────────────────────
function DecodeTab() {
  const [msg, setMsg] = useState('');
  const [context, setContext] = useState('');
  const [stage, setStage] = useState(RELATIONSHIP_STAGES[0]);
  const [gender, setGender] = useState(GENDER_OPTIONS[0]);
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const analyze = async () => {
    if (!msg.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system: `你是一个极其擅长解读恋爱消息的心理分析师。你能从字里行间、回复速度、用词方式读出对方真实的心态和意图。
你的分析要直接、犀利、有具体依据，不要说废话，不要给"可能""也许"这种模糊答案。
要分析：
1. 对方说这句话的真实意图（确定性结论）
2. 对方目前对你的情感温度（0-10分，并解释为什么）
3. 需要警惕的信号（如果有）
4. 你现在的机会点（如果有）`,
          messages: [{
            role: 'user',
            content: `关系阶段：${stage}
对方性别：${gender}
背景情况：${context || '无补充背景'}
对方发来的消息：
"${msg}"

请帮我解码这条消息的真实含义。`
          }],
          maxTokens: 600,
        }),
      });
      const data = await res.json();
      setResult(data.text || data.error || '请求失败，请重试');
    } catch (e) {
      setResult('网络错误：' + (e instanceof Error ? e.message : String(e)));
    }
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      <div className="bg-slate-800/40 rounded-2xl p-5 border border-slate-700/40 space-y-4">
        <div>
          <label className="text-sm text-slate-400 mb-2 block">对方发来的消息 *</label>
          <textarea
            className="w-full bg-slate-900/60 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm resize-none focus:outline-none focus:border-pink-500/50 transition-colors"
            rows={3}
            placeholder='把对方发给你的消息粘贴到这里，比如："哦"、"在呢"、"最近挺忙的"...'
            value={msg}
            onChange={e => setMsg(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-slate-500 mb-1.5 block">目前关系阶段</label>
            <select
              className="w-full bg-slate-900/60 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-pink-500/50"
              value={stage}
              onChange={e => setStage(e.target.value)}
            >
              {RELATIONSHIP_STAGES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1.5 block">对方性别</label>
            <select
              className="w-full bg-slate-900/60 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-pink-500/50"
              value={gender}
              onChange={e => setGender(e.target.value)}
            >
              {GENDER_OPTIONS.map(g => <option key={g}>{g}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs text-slate-500 mb-1.5 block">补充背景（选填，越详细越准）</label>
          <input
            className="w-full bg-slate-900/60 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-pink-500/50"
            placeholder="例：我们上周见面后他突然冷淡了，这条是他三天后发的..."
            value={context}
            onChange={e => setContext(e.target.value)}
          />
        </div>

        <button
          onClick={analyze}
          disabled={loading || !msg.trim()}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 text-white font-medium text-sm hover:from-pink-500 hover:to-rose-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          {loading ? '解码中...' : '🔍 解码这条消息'}
        </button>
      </div>

      {result && <ResultCard result={result} title="解码结果" emoji="🔍" />}
    </div>
  );
}

// ─── 回复生成 ─────────────────────────────────────────────────────────────────
function ReplyTab() {
  const [theirMsg, setTheirMsg] = useState('');
  const [myGoal, setMyGoal] = useState('');
  const [style, setStyle] = useState(REPLY_STYLES[0]);
  const [stage, setStage] = useState(RELATIONSHIP_STAGES[0]);
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    if (!theirMsg.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system: `你是一个顶级的恋爱文案顾问，擅长生成精准、有效、有个性的回复。
你要生成3条不同风格的回复选项，每条都要：
- 符合指定的回复风格
- 自然口语，不做作
- 有具体的战略意图（推进关系/制造张力/展示价值等）
- 给出使用建议（什么时候用这条最好）
格式：
【选项1 - 风格名】
[回复内容]
💡 策略：[这条回复的战略意图，20字以内]
⏰ 适合：[什么情境下发这条]

【选项2 - 风格名】...`,
          messages: [{
            role: 'user',
            content: `关系阶段：${stage}
回复风格偏好：${style}
我的目标：${myGoal || '维持/推进关系'}
对方发来的消息：
"${theirMsg}"

给我3条回复选项。`
          }],
          maxTokens: 700,
        }),
      });
      const data = await res.json();
      setResult(data.text || data.error || '请求失败，请重试');
    } catch (e) {
      setResult('网络错误：' + (e instanceof Error ? e.message : String(e)));
    }
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      <div className="bg-slate-800/40 rounded-2xl p-5 border border-slate-700/40 space-y-4">
        <div>
          <label className="text-sm text-slate-400 mb-2 block">对方说的话 *</label>
          <textarea
            className="w-full bg-slate-900/60 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm resize-none focus:outline-none focus:border-pink-500/50"
            rows={3}
            placeholder="把对方的消息粘贴到这里..."
            value={theirMsg}
            onChange={e => setTheirMsg(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-slate-500 mb-1.5 block">关系阶段</label>
            <select
              className="w-full bg-slate-900/60 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-pink-500/50"
              value={stage}
              onChange={e => setStage(e.target.value)}
            >
              {RELATIONSHIP_STAGES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1.5 block">回复风格</label>
            <select
              className="w-full bg-slate-900/60 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-pink-500/50"
              value={style}
              onChange={e => setStyle(e.target.value)}
            >
              {REPLY_STYLES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs text-slate-500 mb-1.5 block">我现在的目标（选填）</label>
          <input
            className="w-full bg-slate-900/60 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-pink-500/50"
            placeholder="例：想约他下周见面、想让他更主动追我..."
            value={myGoal}
            onChange={e => setMyGoal(e.target.value)}
          />
        </div>

        <button
          onClick={generate}
          disabled={loading || !theirMsg.trim()}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 text-white font-medium text-sm hover:from-pink-500 hover:to-rose-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          {loading ? '生成中...' : '💬 生成回复方案'}
        </button>
      </div>

      {result && <ResultCard result={result} title="回复方案" emoji="💬" />}
    </div>
  );
}

// ─── 心理画像 ─────────────────────────────────────────────────────────────────
function ProfileTab() {
  const [msgs, setMsgs] = useState('');
  const [context, setContext] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const analyze = async () => {
    if (!msgs.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system: `你是一个恋爱心理学专家，能从聊天记录中分析出一个人的恋爱性格、需求和弱点。
你的分析要具体、精准、有操作性，绝不模糊。
分析维度：
1. 依恋类型（安全型/焦虑型/回避型/混乱型）及判断依据
2. 恋爱驱动力（他/她最在乎什么）
3. 情感节奏（喜欢快进还是慢热）
4. 核心需求（他/她需要的是什么）
5. 攻略建议（针对这种人格，最有效的相处方式和禁忌）`,
          messages: [{
            role: 'user',
            content: `背景：${context || '无'}

对方发过的消息（多条，越多越准）：
${msgs}

请给我详细的心理画像分析。`
          }],
          maxTokens: 700,
        }),
      });
      const data = await res.json();
      setResult(data.text || data.error || '请求失败，请重试');
    } catch (e) {
      setResult('网络错误：' + (e instanceof Error ? e.message : String(e)));
    }
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      <div className="bg-slate-800/40 rounded-2xl p-5 border border-slate-700/40 space-y-4">
        <div>
          <label className="text-sm text-slate-400 mb-2 block">对方发过的消息（多条，一行一条）*</label>
          <textarea
            className="w-full bg-slate-900/60 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm resize-none focus:outline-none focus:border-pink-500/50"
            rows={6}
            placeholder={`把你们的聊天记录粘贴进来，越多越准。比如：
"还好吧，就那样"
"不是很想出门"
"你干嘛这么认真"
"随便你"`}
            value={msgs}
            onChange={e => setMsgs(e.target.value)}
          />
        </div>

        <div>
          <label className="text-xs text-slate-500 mb-1.5 block">背景信息（选填）</label>
          <input
            className="w-full bg-slate-900/60 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-pink-500/50"
            placeholder="例：男生，26岁，程序员，上一段感情是他主动分的..."
            value={context}
            onChange={e => setContext(e.target.value)}
          />
        </div>

        <button
          onClick={analyze}
          disabled={loading || !msgs.trim()}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 text-white font-medium text-sm hover:from-pink-500 hover:to-rose-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          {loading ? '分析中...' : '🧠 生成心理画像'}
        </button>
      </div>

      {result && <ResultCard result={result} title="心理画像" emoji="🧠" />}
    </div>
  );
}

// ─── 撩人话术 ─────────────────────────────────────────────────────────────────
function ScriptTab() {
  const [scenario, setScenario] = useState('');
  const [stage, setStage] = useState(RELATIONSHIP_STAGES[0]);
  const [vibe, setVibe] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const SCENARIOS = [
    '第一次主动开口聊天',
    '重新联系冷淡了的TA',
    '约TA线下见面',
    '表达好感但不失控',
    '让TA更加主动',
    '挽回分手后的距离',
  ];

  const generate = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system: `你是顶级的恋爱话术设计师，专门设计让人心动的对话开场和推进策略。
你的话术要：
1. 自然不刻意，不像教科书
2. 能引发对方的好奇心或情绪共鸣
3. 留有余地，不把话说死
4. 给出3套不同策略，每套附上话术示例和使用节奏
格式：
【策略1 - 策略名】
话术：[具体说的话]
节奏：[怎么一步步推进]
关键点：[为什么这样说有效]`,
          messages: [{
            role: 'user',
            content: `场景：${scenario || '主动搭话'}
关系阶段：${stage}
对方性格/氛围：${vibe || '未知'}

给我3套撩人方案。`
          }],
          maxTokens: 700,
        }),
      });
      const data = await res.json();
      setResult(data.text || data.error || '请求失败，请重试');
    } catch (e) {
      setResult('网络错误：' + (e instanceof Error ? e.message : String(e)));
    }
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      <div className="bg-slate-800/40 rounded-2xl p-5 border border-slate-700/40 space-y-4">
        <div>
          <label className="text-sm text-slate-400 mb-2 block">选择场景</label>
          <div className="flex flex-wrap gap-2">
            {SCENARIOS.map(s => (
              <button
                key={s}
                onClick={() => setScenario(s)}
                className={`px-3 py-1.5 rounded-lg text-xs transition-all ${
                  scenario === s
                    ? 'bg-pink-600 text-white'
                    : 'bg-slate-700/50 text-slate-400 hover:text-white border border-slate-600/50'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-slate-500 mb-1.5 block">关系阶段</label>
            <select
              className="w-full bg-slate-900/60 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-pink-500/50"
              value={stage}
              onChange={e => setStage(e.target.value)}
            >
              {RELATIONSHIP_STAGES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1.5 block">对方氛围/性格</label>
            <input
              className="w-full bg-slate-900/60 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-pink-500/50"
              placeholder="例：i人、比较冷淡..."
              value={vibe}
              onChange={e => setVibe(e.target.value)}
            />
          </div>
        </div>

        <button
          onClick={generate}
          disabled={loading}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 text-white font-medium text-sm hover:from-pink-500 hover:to-rose-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          {loading ? '生成中...' : '🔥 生成撩人剧本'}
        </button>
      </div>

      {result && <ResultCard result={result} title="撩人剧本" emoji="🔥" />}
    </div>
  );
}

// ─── 复合攻略 ─────────────────────────────────────────────────────────────────
function BreakupTab() {
  const [situation, setSituation] = useState('');
  const [daysSince, setDaysSince] = useState('');
  const [whoLeft, setWhoLeft] = useState('对方提的');
  const [reason, setReason] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const analyze = async () => {
    if (!situation.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system: `你是专业的复合策略师，有深厚的情感心理学背景。
你要基于具体情况给出精准的复合策略，而不是模糊的鸡汤。
分析框架：
1. 现在的局势判断（复合可能性评估，0-100%，并说明依据）
2. 当前最忌讳的行为（立刻停止做什么）
3. 冷静期建议（需要多久，做什么）
4. 重新联系的时机和方式（具体到什么时间、用什么借口、发什么第一条消息）
5. 长期策略（如何让对方重新对你产生吸引力）
不要给没用的废话，每条建议要具体可执行。`,
          messages: [{
            role: 'user',
            content: `分手后多少天了：${daysSince || '不清楚'}
谁提的分手：${whoLeft}
分手原因：${reason || '未说明'}
现在的情况：
${situation}

给我详细的复合攻略。`
          }],
          maxTokens: 800,
        }),
      });
      const data = await res.json();
      setResult(data.text || data.error || '请求失败，请重试');
    } catch (e) {
      setResult('网络错误：' + (e instanceof Error ? e.message : String(e)));
    }
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      <div className="bg-slate-800/40 rounded-2xl p-5 border border-slate-700/40 space-y-4">
        <div>
          <label className="text-sm text-slate-400 mb-2 block">现在的具体情况 *</label>
          <textarea
            className="w-full bg-slate-900/60 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm resize-none focus:outline-none focus:border-pink-500/50"
            rows={4}
            placeholder="尽量详细描述：分手经过、现在有没有联系、对方态度、你自己的状态..."
            value={situation}
            onChange={e => setSituation(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-slate-500 mb-1.5 block">分手多久了</label>
            <input
              className="w-full bg-slate-900/60 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-pink-500/50"
              placeholder="例：3周"
              value={daysSince}
              onChange={e => setDaysSince(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1.5 block">谁提的分手</label>
            <select
              className="w-full bg-slate-900/60 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-pink-500/50"
              value={whoLeft}
              onChange={e => setWhoLeft(e.target.value)}
            >
              <option>对方提的</option>
              <option>我提的</option>
              <option>互相都想分</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1.5 block">分手原因</label>
            <input
              className="w-full bg-slate-900/60 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-pink-500/50"
              placeholder="简短说明"
              value={reason}
              onChange={e => setReason(e.target.value)}
            />
          </div>
        </div>

        <button
          onClick={analyze}
          disabled={loading || !situation.trim()}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 text-white font-medium text-sm hover:from-pink-500 hover:to-rose-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          {loading ? '分析中...' : '💔 生成复合攻略'}
        </button>
      </div>

      {result && <ResultCard result={result} title="复合攻略" emoji="💔" />}
    </div>
  );
}

// ─── 结果卡片 ─────────────────────────────────────────────────────────────────
function ResultCard({ result, title, emoji }: { result: string; title: string; emoji: string }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard?.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-slate-800/40 rounded-2xl border border-pink-800/30 overflow-hidden"
    >
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-700/40 bg-pink-950/20">
        <div className="flex items-center gap-2 text-sm font-medium text-pink-300">
          <span>{emoji}</span>
          <span>{title}</span>
        </div>
        <button
          onClick={copy}
          className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
        >
          {copied ? '✓ 已复制' : '复制'}
        </button>
      </div>
      <div className="p-5 text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">
        {result}
      </div>
    </motion.div>
  );
}
