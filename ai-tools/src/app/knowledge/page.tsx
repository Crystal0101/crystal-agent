'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ToolLayout } from '@/components/Layout/ToolLayout';

// ─── Types ────────────────────────────────────────────────────────────────────

type Stage = '天使轮' | 'Pre-A' | 'A轮' | 'B轮' | '其他';
type OutputTab = 'elevator' | 'narrative' | 'metrics' | 'qa' | 'redflags';

interface Metric {
  name: string;
  value: string;
}

interface MetricsFramingItem {
  original: string;
  reframed: string;
  rationale: string;
}

interface ToughQA {
  question: string;
  answer: string;
}

interface RedFlag {
  flag: string;
  mitigation: string;
}

interface PitchOutput {
  elevator: string;
  narrative: string;
  metricsFraming: MetricsFramingItem[];
  toughQA: ToughQA[];
  redFlags: RedFlag[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STAGES: Stage[] = ['天使轮', 'Pre-A', 'A轮', 'B轮', '其他'];

const OUTPUT_TABS: { key: OutputTab; label: string; icon: string; desc: string }[] = [
  { key: 'elevator', label: '30秒电梯稿', icon: '⚡', desc: '一击即中的核心pitch' },
  { key: 'narrative', label: '投资人叙事', icon: '📖', desc: '完整融资故事线' },
  { key: 'metrics', label: '数据包装', icon: '📊', desc: '让数据更有说服力' },
  { key: 'qa', label: '常见问题预测', icon: '🎯', desc: '8个投资人必问' },
  { key: 'redflags', label: '红旗规避', icon: '🚩', desc: '提前消除顾虑' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseOutput(text: string): PitchOutput | null {
  try {
    const cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    return JSON.parse(cleaned) as PitchOutput;
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]) as PitchOutput;
      } catch {
        return null;
      }
    }
    return null;
  }
}

// ─── Shimmer ──────────────────────────────────────────────────────────────────

function ShimmerLine({ w = 'w-full', h = 'h-4' }: { w?: string; h?: string }) {
  return (
    <div className={`${w} ${h} rounded bg-gradient-to-r from-white/5 via-white/10 to-white/5 bg-[length:400%_100%] animate-shimmer`} />
  );
}

function OutputSkeleton() {
  return (
    <div className="space-y-4 p-2">
      <ShimmerLine h="h-6" w="w-2/3" />
      <ShimmerLine />
      <ShimmerLine />
      <ShimmerLine w="w-5/6" />
      <ShimmerLine w="w-3/4" />
      <ShimmerLine w="w-4/5" />
    </div>
  );
}

// ─── Output Sections ─────────────────────────────────────────────────────────

function ElevatorSection({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-violet-500/30 bg-violet-500/5 p-5">
        <p className="text-slate-200 text-base leading-relaxed whitespace-pre-wrap font-medium">{text}</p>
      </div>
      <div className="rounded-xl border border-[#1e1e3a] bg-[#0a0a18] p-4 space-y-2">
        <p className="text-xs font-semibold text-violet-400 uppercase tracking-wider">演讲技巧</p>
        <ul className="space-y-1.5">
          {[
            '前5秒说痛点，让投资人产生共鸣',
            '用一个具体数字或场景让故事立体',
            '结尾说清楚"我需要什么"，别让对方猜',
            '说完留2秒沉默，不要自己接话',
          ].map((tip, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-slate-400">
              <span className="text-violet-400 mt-0.5 flex-shrink-0">•</span>
              {tip}
            </li>
          ))}
        </ul>
      </div>
      <button
        onClick={copy}
        className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold border transition-all ${
          copied ? 'bg-green-500/20 border-green-500/40 text-green-300' : 'bg-violet-500/10 border-violet-500/30 text-violet-300 hover:brightness-125'
        }`}
      >
        {copied ? '✓ 已复制' : '复制电梯稿'}
      </button>
    </div>
  );
}

function NarrativeSection({ text }: { text: string }) {
  return (
    <div className="prose prose-invert prose-sm max-w-none">
      <div className="rounded-xl border border-[#1e1e3a] bg-[#0a0a18] p-5">
        <p className="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">{text}</p>
      </div>
    </div>
  );
}

function MetricsSection({ items }: { items: MetricsFramingItem[] }) {
  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.07 }}
          className="rounded-xl border border-[#1e1e3a] bg-[#0a0a18] p-4 space-y-2"
        >
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">原始表述</p>
              <p className="text-sm text-slate-400 line-through">{item.original}</p>
            </div>
            <span className="text-violet-400 text-lg">→</span>
            <div className="flex-1">
              <p className="text-xs text-violet-400 uppercase tracking-wider mb-1">重新包装</p>
              <p className="text-sm text-violet-200 font-semibold">{item.reframed}</p>
            </div>
          </div>
          <div className="rounded-lg bg-violet-500/5 border border-violet-500/15 px-3 py-2">
            <p className="text-xs text-slate-400 leading-relaxed">{item.rationale}</p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function QASection({ items }: { items: ToughQA[] }) {
  const [expanded, setExpanded] = useState<number | null>(0);
  return (
    <div className="space-y-2">
      {items.map((qa, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          className="rounded-xl border border-[#1e1e3a] bg-[#0a0a18] overflow-hidden"
        >
          <button
            className="w-full flex items-start gap-3 px-4 py-3.5 text-left"
            onClick={() => setExpanded(expanded === i ? null : i)}
          >
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-violet-500/20 border border-violet-500/30 text-violet-400 text-xs font-bold flex items-center justify-center mt-0.5">
              {i + 1}
            </span>
            <span className="flex-1 text-sm text-white/80 font-medium leading-snug">{qa.question}</span>
            <motion.span
              animate={{ rotate: expanded === i ? 180 : 0 }}
              transition={{ duration: 0.2 }}
              className="text-white/30 flex-shrink-0 mt-0.5"
            >
              ▾
            </motion.span>
          </button>
          <AnimatePresence>
            {expanded === i && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="px-4 pb-4 pt-2 border-t border-white/5">
                  <div className="rounded-lg bg-violet-500/10 border border-violet-500/20 px-3 py-3">
                    <p className="text-xs text-violet-400 font-medium mb-1.5">理想回答</p>
                    <p className="text-sm text-slate-300 leading-relaxed">{qa.answer}</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      ))}
    </div>
  );
}

function RedFlagsSection({ items }: { items: RedFlag[] }) {
  return (
    <div className="space-y-3">
      {items.map((rf, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.07 }}
          className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 space-y-2"
        >
          <div className="flex items-start gap-2">
            <span className="text-red-400 mt-0.5 flex-shrink-0">🚩</span>
            <p className="text-sm text-red-200 font-medium leading-snug">{rf.flag}</p>
          </div>
          <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-2.5 ml-6">
            <p className="text-xs text-emerald-400 font-medium mb-1">化解策略</p>
            <p className="text-sm text-slate-300 leading-relaxed">{rf.mitigation}</p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function KnowledgePage() {
  // Form state
  const [company, setCompany] = useState('');
  const [stage, setStage] = useState<Stage>('天使轮');
  const [metrics, setMetrics] = useState<Metric[]>([
    { name: '', value: '' },
    { name: '', value: '' },
    { name: '', value: '' },
  ]);
  const [problem, setProblem] = useState('');
  const [moat, setMoat] = useState('');
  const [team, setTeam] = useState('');
  const [ask, setAsk] = useState('');

  // Output state
  const [output, setOutput] = useState<PitchOutput | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<OutputTab>('elevator');

  const addMetric = () => {
    if (metrics.length < 5) {
      setMetrics(prev => [...prev, { name: '', value: '' }]);
    }
  };

  const updateMetric = (index: number, field: 'name' | 'value', val: string) => {
    setMetrics(prev => prev.map((m, i) => i === index ? { ...m, [field]: val } : m));
  };

  const removeMetric = (index: number) => {
    if (metrics.length > 1) {
      setMetrics(prev => prev.filter((_, i) => i !== index));
    }
  };

  const buildPrompt = () => {
    const validMetrics = metrics.filter(m => m.name.trim() && m.value.trim());
    const metricsStr = validMetrics.map(m => `${m.name}: ${m.value}`).join('\n');
    return `你是顶级融资顾问，帮助创业公司打磨投资人叙事。

公司/产品名：${company}
融资阶段：${stage}
核心数据指标：
${metricsStr || '暂无数据'}
解决的问题：${problem}
核心竞争优势：${moat}
团队亮点：${team}
融资需求：${ask}

请生成完整的融资故事工坊内容。严格输出以下JSON：

{
  "elevator": "30秒电梯稿全文（约150字，节奏感强，可朗读）",
  "narrative": "完整投资人叙事（约500字，按问题→解决方案→市场规模→牵引力→团队→融资需求结构）",
  "metricsFraming": [
    {
      "original": "原始指标表述",
      "reframed": "更有说服力的包装方式",
      "rationale": "为什么这样说更有效（30字）"
    }
  ],
  "toughQA": [
    {
      "question": "投资人会问的刁钻问题",
      "answer": "理想的回答框架（80-120字）"
    }
  ],
  "redFlags": [
    {
      "flag": "你故事中的潜在红旗",
      "mitigation": "如何主动化解这个顾虑（60字）"
    }
  ]
}

要求：metricsFraming至少3条，toughQA恰好8条，redFlags恰好5条。只输出JSON。`;
  };

  const generate = useCallback(async () => {
    if (!company.trim()) {
      setError('请填写公司/产品名称');
      return;
    }
    if (!problem.trim()) {
      setError('请描述你解决的问题');
      return;
    }
    setError('');
    setLoading(true);
    setOutput(null);
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system: '你是资深融资顾问，曾帮助多家独角兽完成A/B轮融资。你擅长将创业故事包装成让投资人心动的叙事。严格按JSON格式输出。',
          messages: [{ role: 'user', content: buildPrompt() }],
          maxTokens: 4000,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const parsed = parseOutput(data.text);
      if (!parsed) throw new Error('AI返回格式异常，请重试');
      setOutput(parsed);
      setActiveTab('elevator');
    } catch (e) {
      setError(e instanceof Error ? e.message : '生成失败，请重试');
    } finally {
      setLoading(false);
    }
  }, [company, stage, metrics, problem, moat, team, ask]);

  return (
    <ToolLayout
      title="💜 融资故事工坊"
      subtitle="把你的创业项目打磨成让投资人心动的融资叙事，从电梯稿到红旗规避"
    >
      <div className="grid lg:grid-cols-[1fr_1.5fr] gap-6">
        {/* ── Left: Input Form ── */}
        <div className="space-y-4">
          <div className="rounded-xl border border-[#1e1e3a] bg-[#0d0d18] p-5 space-y-5">
            <p className="text-xs font-semibold text-violet-400 uppercase tracking-wider">项目信息</p>

            {/* Company */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                公司/产品名称 <span className="text-red-400">*</span>
              </label>
              <input
                value={company}
                onChange={e => setCompany(e.target.value)}
                placeholder="例如：Notion、飞书、美团外卖"
                className="w-full rounded-lg bg-[#13131f] border border-[#1e1e3a] text-slate-200 text-sm placeholder-slate-600 px-3 py-2.5 focus:outline-none focus:border-violet-500/50 transition-all"
              />
            </div>

            {/* Stage */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">融资阶段</label>
              <div className="flex flex-wrap gap-2">
                {STAGES.map(s => (
                  <button
                    key={s}
                    onClick={() => setStage(s)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                      stage === s
                        ? 'bg-violet-500/20 border-violet-500/50 text-violet-300'
                        : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/25 hover:text-slate-300'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Metrics */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium text-slate-300">核心数据指标</label>
                {metrics.length < 5 && (
                  <button
                    onClick={addMetric}
                    className="text-xs text-violet-400 hover:text-violet-300 transition-colors"
                  >
                    + 添加指标
                  </button>
                )}
              </div>
              <div className="space-y-2">
                {metrics.map((m, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      value={m.name}
                      onChange={e => updateMetric(i, 'name', e.target.value)}
                      placeholder="指标名（如：月活用户）"
                      className="flex-1 rounded-lg bg-[#13131f] border border-[#1e1e3a] text-slate-200 text-xs placeholder-slate-600 px-3 py-2 focus:outline-none focus:border-violet-500/50 transition-all"
                    />
                    <input
                      value={m.value}
                      onChange={e => updateMetric(i, 'value', e.target.value)}
                      placeholder="数值（如：50万）"
                      className="flex-1 rounded-lg bg-[#13131f] border border-[#1e1e3a] text-slate-200 text-xs placeholder-slate-600 px-3 py-2 focus:outline-none focus:border-violet-500/50 transition-all"
                    />
                    {metrics.length > 1 && (
                      <button
                        onClick={() => removeMetric(i)}
                        className="text-slate-600 hover:text-red-400 transition-colors px-1"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Problem */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                解决的问题 <span className="text-red-400">*</span>
              </label>
              <textarea
                rows={3}
                value={problem}
                onChange={e => setProblem(e.target.value)}
                placeholder="你在解决什么痛点？为什么现有方案不够好？"
                className="w-full rounded-lg bg-[#13131f] border border-[#1e1e3a] text-slate-200 text-sm placeholder-slate-600 p-3 resize-none focus:outline-none focus:border-violet-500/50 transition-all"
              />
            </div>

            {/* Moat */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">核心竞争优势</label>
              <textarea
                rows={2}
                value={moat}
                onChange={e => setMoat(e.target.value)}
                placeholder="你的护城河是什么？为什么别人做不了你能做到的？"
                className="w-full rounded-lg bg-[#13131f] border border-[#1e1e3a] text-slate-200 text-sm placeholder-slate-600 p-3 resize-none focus:outline-none focus:border-violet-500/50 transition-all"
              />
            </div>

            {/* Team */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">团队亮点</label>
              <input
                value={team}
                onChange={e => setTeam(e.target.value)}
                placeholder="1-2句话说明团队为什么能做成这件事"
                className="w-full rounded-lg bg-[#13131f] border border-[#1e1e3a] text-slate-200 text-sm placeholder-slate-600 px-3 py-2.5 focus:outline-none focus:border-violet-500/50 transition-all"
              />
            </div>

            {/* Ask */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">融资需求和用途</label>
              <input
                value={ask}
                onChange={e => setAsk(e.target.value)}
                placeholder="例如：融资500万，用于产品研发和市场拓展"
                className="w-full rounded-lg bg-[#13131f] border border-[#1e1e3a] text-slate-200 text-sm placeholder-slate-600 px-3 py-2.5 focus:outline-none focus:border-violet-500/50 transition-all"
              />
            </div>

            {/* Error */}
            {error && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2"
              >
                {error}
              </motion.p>
            )}

            {/* Generate */}
            <button
              onClick={generate}
              disabled={loading || !company.trim() || !problem.trim()}
              className="w-full py-3 rounded-xl font-bold text-white bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-violet-900/30 active:scale-[0.98]"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  融资故事生成中…
                </span>
              ) : (
                '💜 生成融资故事'
              )}
            </button>
          </div>
        </div>

        {/* ── Right: Output ── */}
        <div className="rounded-xl border border-[#1e1e3a] bg-[#0d0d18] flex flex-col min-h-[600px]">
          {/* Tab bar */}
          <div className="flex border-b border-[#1e1e3a] overflow-x-auto scrollbar-hide">
            {OUTPUT_TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => output && setActiveTab(tab.key)}
                disabled={!output && !loading}
                className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
                  activeTab === tab.key && output
                    ? 'text-violet-400 border-violet-400'
                    : 'text-slate-500 border-transparent hover:text-slate-300 hover:border-slate-600 disabled:cursor-not-allowed'
                }`}
              >
                <span>{tab.icon}</span>
                <span className="hidden sm:block">{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 p-5 overflow-y-auto">
            {!loading && !output && (
              <div className="h-full flex flex-col items-center justify-center text-center py-16">
                <div className="text-5xl mb-4">💜</div>
                <p className="text-slate-500 text-sm max-w-xs leading-relaxed">
                  填写项目信息，AI 将为你生成完整的融资叙事包，包含电梯稿、数据包装、问题预测等
                </p>
              </div>
            )}

            {loading && <OutputSkeleton />}

            {!loading && output && (
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.18 }}
                >
                  <div className="mb-4">
                    <p className="text-xs text-violet-400 font-semibold uppercase tracking-wider">
                      {OUTPUT_TABS.find(t => t.key === activeTab)?.icon}{' '}
                      {OUTPUT_TABS.find(t => t.key === activeTab)?.label}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {OUTPUT_TABS.find(t => t.key === activeTab)?.desc}
                    </p>
                  </div>

                  {activeTab === 'elevator' && <ElevatorSection text={output.elevator} />}
                  {activeTab === 'narrative' && <NarrativeSection text={output.narrative} />}
                  {activeTab === 'metrics' && <MetricsSection items={output.metricsFraming} />}
                  {activeTab === 'qa' && <QASection items={output.toughQA} />}
                  {activeTab === 'redflags' && <RedFlagsSection items={output.redFlags} />}
                </motion.div>
              </AnimatePresence>
            )}
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes shimmer {
          0% { background-position: 200% center; }
          100% { background-position: -200% center; }
        }
        .animate-shimmer {
          animation: shimmer 1.8s linear infinite;
        }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </ToolLayout>
  );
}
