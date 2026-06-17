'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ToolLayout } from '@/components/Layout/ToolLayout';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PainPoint {
  theme: string;
  frequency: number;
  description: string;
  quote: string;
  severity: 'high' | 'medium' | 'low';
}

interface Persona {
  name: string;
  role: string;
  goal: string;
  painPoints: string[];
  behaviors: string[];
  quote: string;
}

interface FeatureItem {
  feature: string;
  impact: 'high' | 'medium' | 'low';
  frequency: 'high' | 'medium' | 'low';
  priority: number;
  rationale: string;
}

interface KeyQuote {
  quote: string;
  theme: string;
  insight: string;
}

interface AnalysisResult {
  painPoints: PainPoint[];
  personas: Persona[];
  featurePriority: FeatureItem[];
  keyQuotes: KeyQuote[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const LOADING_STEPS = [
  '正在识别用户痛点...',
  '正在构建用户画像...',
  '正在生成优先级矩阵...',
  '正在整理金句集锦...',
];

const SEVERITY_CONFIG = {
  high: { label: '高频', bg: 'bg-red-500/20', border: 'border-red-500/40', text: 'text-red-400', dot: 'bg-red-400' },
  medium: { label: '中频', bg: 'bg-amber-500/20', border: 'border-amber-500/40', text: 'text-amber-400', dot: 'bg-amber-400' },
  low: { label: '低频', bg: 'bg-green-500/20', border: 'border-green-500/40', text: 'text-green-400', dot: 'bg-green-400' },
};

const IMPACT_CONFIG = {
  high: { label: '高', bg: 'bg-rose-500/20', text: 'text-rose-400', border: 'border-rose-500/40' },
  medium: { label: '中', bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/40' },
  low: { label: '低', bg: 'bg-slate-500/20', text: 'text-slate-400', border: 'border-slate-500/40' },
};

const TABS = ['核心痛点矩阵', '用户画像速写', '功能优先级矩阵', '金句集锦'] as const;
type Tab = typeof TABS[number];

// ─── Sub-components ───────────────────────────────────────────────────────────

function PainPointCard({ item, index }: { item: PainPoint; index: number }) {
  const cfg = SEVERITY_CONFIG[item.severity];
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className={`rounded-xl border ${cfg.border} ${cfg.bg} p-5 space-y-3`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
          <span className="font-semibold text-white/90">{item.theme}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-xs px-2 py-0.5 rounded-full border ${cfg.border} ${cfg.text}`}>
            {cfg.label}
          </span>
          <span className="text-xs bg-white/10 text-white/60 px-2 py-0.5 rounded-full">
            提及 {item.frequency} 次
          </span>
        </div>
      </div>
      <p className="text-sm text-white/70 leading-relaxed">{item.description}</p>
      <div className="bg-black/20 rounded-lg px-4 py-3 border-l-4 border-amber-500/40">
        <p className="text-xs text-amber-400/60 mb-1 uppercase tracking-wider">代表原话</p>
        <p className="text-sm text-white/65 italic leading-relaxed">"{item.quote}"</p>
      </div>
    </motion.div>
  );
}

function PersonaCard({ persona, index }: { persona: Persona; index: number }) {
  const avatarColors = ['from-amber-600/40 to-orange-700/40', 'from-violet-600/40 to-purple-700/40', 'from-cyan-600/40 to-blue-700/40'];
  const borderColors = ['border-amber-500/30', 'border-violet-500/30', 'border-cyan-500/30'];
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className={`rounded-2xl border ${borderColors[index % 3]} bg-white/3 p-6 space-y-4`}
    >
      <div className="flex items-center gap-4">
        <div className={`w-14 h-14 rounded-full bg-gradient-to-br ${avatarColors[index % 3]} border ${borderColors[index % 3]} flex items-center justify-center text-xl font-bold text-white/80`}>
          {persona.name.charAt(0)}
        </div>
        <div>
          <p className="text-lg font-bold text-white">{persona.name}</p>
          <p className="text-sm text-amber-400/80">{persona.role}</p>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <p className="text-xs text-white/40 uppercase tracking-wider mb-1">核心目标</p>
          <p className="text-sm text-white/75">{persona.goal}</p>
        </div>
        <div>
          <p className="text-xs text-white/40 uppercase tracking-wider mb-2">主要痛点</p>
          <div className="flex flex-wrap gap-2">
            {persona.painPoints.map((p, i) => (
              <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-red-500/15 border border-red-500/30 text-red-300">
                {p}
              </span>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs text-white/40 uppercase tracking-wider mb-2">行为模式</p>
          <div className="flex flex-wrap gap-2">
            {persona.behaviors.map((b, i) => (
              <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-300/80">
                {b}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-amber-500/8 rounded-xl px-4 py-3 border border-amber-500/20">
        <p className="text-xs text-amber-400/60 mb-1">一句代表话</p>
        <p className="text-sm text-white/70 italic">"{persona.quote}"</p>
      </div>
    </motion.div>
  );
}

function FeatureTable({ items }: { items: FeatureItem[] }) {
  const sorted = [...items].sort((a, b) => b.priority - a.priority);
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/10">
            <th className="text-left py-3 px-4 text-white/40 font-medium text-xs uppercase tracking-wider">功能</th>
            <th className="text-center py-3 px-3 text-white/40 font-medium text-xs uppercase tracking-wider">影响力</th>
            <th className="text-center py-3 px-3 text-white/40 font-medium text-xs uppercase tracking-wider">频率</th>
            <th className="text-center py-3 px-3 text-white/40 font-medium text-xs uppercase tracking-wider">优先级</th>
            <th className="text-left py-3 px-4 text-white/40 font-medium text-xs uppercase tracking-wider">依据</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {sorted.map((item, i) => {
            const impactCfg = IMPACT_CONFIG[item.impact];
            const freqCfg = IMPACT_CONFIG[item.frequency];
            const priorityPct = Math.min(100, item.priority * 10);
            return (
              <motion.tr
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="hover:bg-white/3 transition-colors"
              >
                <td className="py-4 px-4 font-medium text-white/85">{item.feature}</td>
                <td className="py-4 px-3 text-center">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs border ${impactCfg.border} ${impactCfg.bg} ${impactCfg.text}`}>
                    {impactCfg.label}
                  </span>
                </td>
                <td className="py-4 px-3 text-center">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs border ${freqCfg.border} ${freqCfg.bg} ${freqCfg.text}`}>
                    {freqCfg.label}
                  </span>
                </td>
                <td className="py-4 px-3">
                  <div className="flex items-center gap-2 justify-center">
                    <div className="w-16 h-1.5 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500"
                        style={{ width: `${priorityPct}%` }}
                      />
                    </div>
                    <span className="text-amber-400 font-bold text-xs">{item.priority}</span>
                  </div>
                </td>
                <td className="py-4 px-4 text-white/55 text-xs leading-relaxed">{item.rationale}</td>
              </motion.tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function QuoteCard({ item, index }: { item: KeyQuote; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5 space-y-3"
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl text-amber-400/60 font-serif leading-none mt-0.5">"</span>
        <p className="text-white/80 italic leading-relaxed text-sm flex-1">{item.quote}</p>
      </div>
      <div className="flex items-center gap-3 pt-1">
        <span className="text-xs px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300">
          {item.theme}
        </span>
        <p className="text-xs text-white/45 flex-1">{item.insight}</p>
      </div>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function UXResearchPage() {
  const [transcript, setTranscript] = useState('');
  const [objective, setObjective] = useState('');
  const [interviewCount, setInterviewCount] = useState(5);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('核心痛点矩阵');

  const analyze = useCallback(async () => {
    if (!transcript.trim()) {
      setError('请粘贴用户访谈记录后再开始分析。');
      return;
    }
    if (!objective.trim()) {
      setError('请填写研究目标。');
      return;
    }

    setError('');
    setLoading(true);
    setResult(null);
    setLoadingStep(0);

    const stepInterval = setInterval(() => {
      setLoadingStep(s => (s < LOADING_STEPS.length - 1 ? s + 1 : s));
    }, 2000);

    const systemPrompt = `你是一位资深用户研究专家，擅长从访谈记录中提炼洞察、识别用户痛点、构建用户画像。
研究目标：${objective}
访谈数量：${interviewCount} 份

请分析以下访谈记录，严格按照JSON格式输出，不要输出任何其他内容：
{
  "painPoints": [
    {
      "theme": "痛点主题",
      "frequency": 提及次数（整数）,
      "description": "痛点详细描述（2-3句）",
      "quote": "最有代表性的原话（直接引用）",
      "severity": "high|medium|low"
    }
  ],
  "personas": [
    {
      "name": "起一个有代表性的中文名字",
      "role": "职业/角色",
      "goal": "核心目标",
      "painPoints": ["痛点1", "痛点2", "痛点3"],
      "behaviors": ["行为特征1", "行为特征2", "行为特征3"],
      "quote": "一句最能代表这类用户的话"
    }
  ],
  "featurePriority": [
    {
      "feature": "功能名称",
      "impact": "high|medium|low",
      "frequency": "high|medium|low",
      "priority": 优先级评分（1-10整数）,
      "rationale": "推荐理由（1-2句）"
    }
  ],
  "keyQuotes": [
    {
      "quote": "原文金句",
      "theme": "所属主题",
      "insight": "这句话揭示了什么洞察"
    }
  ]
}

要求：
- painPoints 至少3条，按频率高低排序
- personas 2-3个，代表不同用户类型
- featurePriority 至少5条功能建议
- keyQuotes 至少5条最有价值的金句
- severity high=高频且严重的痛点，medium=中等，low=偶发轻微`;

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system: systemPrompt,
          messages: [{ role: 'user', content: `访谈记录如下：\n\n${transcript}` }],
          maxTokens: 4000,
        }),
      });

      if (!res.ok) throw new Error(`请求失败 (${res.status})`);

      const data = await res.json();
      const raw: string = data.content?.[0]?.text ?? data.text ?? data.result ?? '';

      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('AI 未返回有效的 JSON 格式。');

      const parsed: AnalysisResult = JSON.parse(jsonMatch[0]);
      setResult(parsed);
      setActiveTab('核心痛点矩阵');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '分析失败，请稍后重试。');
    } finally {
      clearInterval(stepInterval);
      setLoading(false);
    }
  }, [transcript, objective, interviewCount]);

  return (
    <ToolLayout title="用研分析台" subtitle="从访谈记录中提炼洞察、构建用户画像、生成功能优先级矩阵">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* ── Left: Input Panel ── */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-2 space-y-4"
        >
          <div className="rounded-2xl border border-[#1e1e3a] bg-[#0d0d1f]/80 backdrop-blur p-5 space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-xl">🔬</span>
              <div>
                <h2 className="text-base font-bold text-white">输入访谈数据</h2>
                <p className="text-xs text-white/40">支持多份访谈拼接粘贴</p>
              </div>
            </div>

            {/* Research objective */}
            <div>
              <label className="block text-xs text-white/50 mb-1.5 uppercase tracking-wider">研究目标</label>
              <textarea
                value={objective}
                onChange={e => { setObjective(e.target.value); setError(''); }}
                placeholder="例：了解用户在求职过程中的核心痛点和信息需求"
                rows={3}
                className="w-full bg-[#0a0a18] border border-[#1e1e3a] rounded-xl px-4 py-3 text-sm text-white/80 placeholder:text-white/20 resize-none focus:outline-none focus:border-amber-500/50 transition-colors leading-relaxed"
              />
            </div>

            {/* Interview count */}
            <div>
              <label className="block text-xs text-white/50 mb-2 uppercase tracking-wider">
                访谈份数：<span className="text-amber-400 font-bold">{interviewCount}</span>
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={1}
                  max={20}
                  value={interviewCount}
                  onChange={e => setInterviewCount(Number(e.target.value))}
                  className="flex-1 accent-amber-500"
                />
                <div className="flex gap-1">
                  {[1, 5, 10, 20].map(n => (
                    <button
                      key={n}
                      onClick={() => setInterviewCount(n)}
                      className={`text-xs px-2 py-1 rounded-lg border transition-all ${
                        interviewCount === n
                          ? 'border-amber-500/60 bg-amber-500/20 text-amber-300'
                          : 'border-white/10 bg-white/5 text-white/40 hover:text-white/70'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Transcript */}
            <div>
              <label className="block text-xs text-white/50 mb-1.5 uppercase tracking-wider">访谈记录</label>
              <textarea
                value={transcript}
                onChange={e => { setTranscript(e.target.value); setError(''); }}
                placeholder={`将用户访谈记录粘贴至此处……\n\n可以是逐字稿、访谈摘要或笔记，多份访谈之间用 --- 分隔。\n\n例：\n--- 访谈 1 ---\n用户A（25岁，应届生）：\n「我每天要刷好多个招聘软件，感觉信息太分散了……」\n\n--- 访谈 2 ---\n用户B（28岁，职场3年）：\n……`}
                rows={14}
                className="w-full bg-[#0a0a18] border border-[#1e1e3a] rounded-xl px-4 py-3 text-sm text-white/80 placeholder:text-white/20 resize-y focus:outline-none focus:border-amber-500/50 transition-colors leading-relaxed"
                style={{ minHeight: '300px' }}
              />
              <p className="text-right text-xs text-white/25 mt-1">{transcript.length.toLocaleString()} 字</p>
            </div>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2"
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            {/* Analyze button */}
            <button
              onClick={analyze}
              disabled={loading || !transcript.trim() || !objective.trim()}
              className="w-full py-3 rounded-xl font-semibold text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white shadow-lg shadow-amber-900/30 active:scale-[0.98]"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                    className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                  />
                  {LOADING_STEPS[loadingStep]}
                </span>
              ) : (
                '🔍 开始用研分析'
              )}
            </button>
          </div>
        </motion.div>

        {/* ── Right: Results Panel ── */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-3"
        >
          <AnimatePresence mode="wait">
            {!result && !loading && (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full rounded-2xl border border-dashed border-white/10 flex flex-col items-center justify-center py-24 text-center"
              >
                <span className="text-5xl mb-4">📊</span>
                <p className="text-white/40 text-sm">填写研究目标和访谈记录</p>
                <p className="text-white/25 text-xs mt-1">分析结果将在右侧展示</p>
              </motion.div>
            )}

            {loading && (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full rounded-2xl border border-amber-500/20 bg-amber-500/5 flex flex-col items-center justify-center py-24 gap-6"
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
                  className="w-12 h-12 border-2 border-amber-500/30 border-t-amber-400 rounded-full"
                />
                <div className="text-center space-y-2">
                  {LOADING_STEPS.map((step, i) => (
                    <motion.p
                      key={step}
                      animate={{ opacity: i <= loadingStep ? 1 : 0.2 }}
                      className={`text-sm transition-all ${i === loadingStep ? 'text-amber-400 font-medium' : 'text-white/30'}`}
                    >
                      {i < loadingStep ? '✓ ' : i === loadingStep ? '▶ ' : '○ '}{step}
                    </motion.p>
                  ))}
                </div>
              </motion.div>
            )}

            {result && (
              <motion.div
                key="result"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                {/* Tabs */}
                <div className="flex gap-1 bg-white/5 rounded-xl p-1">
                  {TABS.map(tab => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`flex-1 py-2 px-2 rounded-lg text-xs font-medium transition-all ${
                        activeTab === tab
                          ? 'bg-amber-500/25 text-amber-300 border border-amber-500/40'
                          : 'text-white/40 hover:text-white/70'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                {/* Tab Content */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.18 }}
                  >
                    {activeTab === '核心痛点矩阵' && (
                      <div className="space-y-3">
                        <p className="text-xs text-white/35 px-1">共识别 {result.painPoints.length} 个痛点主题</p>
                        {result.painPoints.map((item, i) => (
                          <PainPointCard key={i} item={item} index={i} />
                        ))}
                      </div>
                    )}

                    {activeTab === '用户画像速写' && (
                      <div className="grid grid-cols-1 gap-4">
                        {result.personas.map((p, i) => (
                          <PersonaCard key={i} persona={p} index={i} />
                        ))}
                      </div>
                    )}

                    {activeTab === '功能优先级矩阵' && (
                      <div className="rounded-2xl border border-[#1e1e3a] bg-[#0d0d1f]/80 overflow-hidden">
                        <div className="px-5 py-4 border-b border-white/5">
                          <p className="text-xs text-white/40">按优先级从高到低排序 · 优先级分值 = 影响力 × 频率综合评估</p>
                        </div>
                        <FeatureTable items={result.featurePriority} />
                      </div>
                    )}

                    {activeTab === '金句集锦' && (
                      <div className="space-y-3">
                        <p className="text-xs text-white/35 px-1">精选 {result.keyQuotes.length} 条最具洞察力的用户原话</p>
                        {result.keyQuotes.map((q, i) => (
                          <QuoteCard key={i} item={q} index={i} />
                        ))}
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </ToolLayout>
  );
}
