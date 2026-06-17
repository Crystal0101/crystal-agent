'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ToolLayout } from '@/components/Layout/ToolLayout';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PricingTier {
  name: string;
  price: string;
  rationale: string;
  features: string[];
  targetUser: string;
}

interface PsychologyTactic {
  tactic: string;
  description: string;
  example: string;
}

interface CompetitorBenchmark {
  positioning: string;
  analysis: string;
  recommendation: string;
}

interface PageCopyTier {
  name: string;
  tagline: string;
  cta: string;
}

interface PageCopy {
  headline: string;
  subheadline: string;
  tiers: PageCopyTier[];
}

interface PricingStrategy {
  tiers: PricingTier[];
  psychologyTactics: PsychologyTactic[];
  competitorBenchmark: CompetitorBenchmark;
  pageCopy: PageCopy;
}

type TabKey = 'tiers' | 'psychology' | 'benchmark' | 'copy';

const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: 'tiers', label: '推荐方案', icon: '💎' },
  { key: 'psychology', label: '心理策略', icon: '🧠' },
  { key: 'benchmark', label: '竞对对标', icon: '📊' },
  { key: 'copy', label: '页面文案', icon: '✍️' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function CopyButton({ text, label = '复制' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        });
      }}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border border-white/10 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-all shrink-0"
    >
      {copied ? '✅ 已复制' : `📋 ${label}`}
    </button>
  );
}

// ─── Tab Content Components ───────────────────────────────────────────────────

function TiersTab({ tiers }: { tiers: PricingTier[] }) {
  const copyText = tiers
    .map(
      t =>
        `【${t.name}】${t.price}\n目标用户：${t.targetUser}\n功能：${t.features.join('、')}\n定价理由：${t.rationale}`
    )
    .join('\n\n');

  const tierStyles = [
    {
      border: 'border-white/15',
      accent: 'text-white/70',
      badge: 'bg-white/10 text-white/60',
      glow: '',
    },
    {
      border: 'border-green-500/50',
      accent: 'text-green-400',
      badge: 'bg-green-500/20 text-green-400 border border-green-500/40',
      glow: 'shadow-[0_0_30px_rgba(34,197,94,0.12)]',
    },
    {
      border: 'border-white/15',
      accent: 'text-white/70',
      badge: 'bg-white/10 text-white/60',
      glow: '',
    },
  ];

  return (
    <motion.div
      key="tiers"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="space-y-4"
    >
      <div className="flex items-center justify-between">
        <p className="text-xs text-white/40">AI 为你生成了 {tiers.length} 个定价档次</p>
        <CopyButton text={copyText} />
      </div>
      <div className="grid grid-cols-1 gap-4">
        {tiers.map((tier, i) => {
          const style = tierStyles[i % tierStyles.length];
          const isRecommended = i === 1;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.07 }}
              className={`relative rounded-2xl border ${style.border} bg-[#0d0d1f]/80 p-5 ${style.glow}`}
            >
              {isRecommended && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-500 text-white shadow-lg shadow-green-900/40">
                    推荐
                  </span>
                </div>
              )}
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className={`text-lg font-bold ${style.accent}`}>{tier.name}</h4>
                  <p className="text-xs text-white/40 mt-0.5">目标用户：{tier.targetUser}</p>
                </div>
                <div className="text-right">
                  <div className={`text-2xl font-black ${style.accent}`}>{tier.price}</div>
                </div>
              </div>
              <div className="mb-3">
                <ul className="space-y-1.5">
                  {tier.features.map((f, fi) => (
                    <li key={fi} className="flex items-start gap-2 text-sm text-white/65">
                      <span className="text-green-400 mt-0.5 shrink-0">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="border-t border-white/5 pt-3">
                <p className="text-xs text-white/45 leading-relaxed">
                  <span className="text-white/30 uppercase tracking-wider text-[10px]">定价理由 · </span>
                  {tier.rationale}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}

function PsychologyTab({ tactics }: { tactics: PsychologyTactic[] }) {
  const copyText = tactics
    .map(t => `【${t.tactic}】\n${t.description}\n示例：${t.example}`)
    .join('\n\n');

  return (
    <motion.div
      key="psychology"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="space-y-4"
    >
      <div className="flex items-center justify-between">
        <p className="text-xs text-white/40">基于行为经济学的定价心理学策略</p>
        <CopyButton text={copyText} />
      </div>
      <div className="space-y-3">
        {tactics.map((tactic, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.07 }}
            className="rounded-xl border border-[#1e1e3a] bg-white/3 p-4 space-y-2"
          >
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-green-500/20 border border-green-500/40 flex items-center justify-center text-xs text-green-400 font-bold shrink-0">
                {i + 1}
              </span>
              <span className="text-white/90 font-semibold text-sm">{tactic.tactic}</span>
            </div>
            <p className="text-xs text-white/60 leading-relaxed pl-8">{tactic.description}</p>
            <div className="ml-8 bg-green-500/5 border border-green-500/20 rounded-lg px-3 py-2">
              <span className="text-[10px] text-green-500/60 uppercase tracking-wider">示例 · </span>
              <span className="text-xs text-green-300/70">{tactic.example}</span>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

function BenchmarkTab({ benchmark }: { benchmark: CompetitorBenchmark }) {
  const copyText = `定位策略：${benchmark.positioning}\n\n竞对分析：${benchmark.analysis}\n\n建议：${benchmark.recommendation}`;

  return (
    <motion.div
      key="benchmark"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="space-y-4"
    >
      <div className="flex items-center justify-between">
        <p className="text-xs text-white/40">相对竞品的定价定位建议</p>
        <CopyButton text={copyText} />
      </div>
      <div className="space-y-3">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-green-500/30 bg-green-500/5 p-5"
        >
          <p className="text-xs text-green-500/60 uppercase tracking-wider mb-2">定位策略</p>
          <p className="text-white/85 font-semibold text-sm leading-relaxed">{benchmark.positioning}</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.07 }}
          className="rounded-xl border border-[#1e1e3a] bg-white/3 p-5"
        >
          <p className="text-xs text-white/40 uppercase tracking-wider mb-2">竞对分析</p>
          <p className="text-white/70 text-sm leading-relaxed">{benchmark.analysis}</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.14 }}
          className="rounded-xl border border-[#1e1e3a] bg-white/3 p-5"
        >
          <p className="text-xs text-white/40 uppercase tracking-wider mb-2">最终建议</p>
          <p className="text-white/70 text-sm leading-relaxed">{benchmark.recommendation}</p>
        </motion.div>
      </div>
    </motion.div>
  );
}

function PageCopyTab({ pageCopy }: { pageCopy: PageCopy }) {
  const copyText = [
    `标题：${pageCopy.headline}`,
    `副标题：${pageCopy.subheadline}`,
    '',
    ...pageCopy.tiers.map(t => `【${t.name}】\n标语：${t.tagline}\nCTA：${t.cta}`),
  ].join('\n');

  return (
    <motion.div
      key="copy"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="space-y-4"
    >
      <div className="flex items-center justify-between">
        <p className="text-xs text-white/40">可直接用于定价页的文案</p>
        <CopyButton text={copyText} />
      </div>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-[#1e1e3a] bg-white/3 p-5 space-y-2"
      >
        <p className="text-xs text-white/35 uppercase tracking-wider mb-3">页面主标题</p>
        <p className="text-white font-bold text-xl leading-snug">{pageCopy.headline}</p>
        <p className="text-white/55 text-sm leading-relaxed">{pageCopy.subheadline}</p>
      </motion.div>
      {pageCopy.tiers && pageCopy.tiers.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs text-white/35 uppercase tracking-wider">各档次文案</p>
          {pageCopy.tiers.map((t, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.07 + i * 0.07 }}
              className="rounded-xl border border-[#1e1e3a] bg-white/3 p-4 space-y-1.5"
            >
              <div className="flex items-center gap-2">
                <span className="text-green-400 font-bold text-sm">{t.name}</span>
              </div>
              <p className="text-white/75 text-sm italic leading-relaxed">"{t.tagline}"</p>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-green-500/10 border border-green-500/25">
                <span className="text-xs text-green-400">CTA: {t.cta}</span>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

// ─── Loading Skeleton ─────────────────────────────────────────────────────────

function ResultSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="flex gap-2">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-8 bg-white/10 rounded-lg flex-1" />
        ))}
      </div>
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="rounded-2xl border border-[#1e1e3a] bg-[#0d0d1f]/80 p-5 space-y-3">
            <div className="h-4 bg-white/10 rounded w-1/4" />
            <div className="h-3 bg-white/5 rounded w-full" />
            <div className="h-3 bg-white/5 rounded w-3/4" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PricingPage() {
  const [productName, setProductName] = useState('');
  const [productDesc, setProductDesc] = useState('');
  const [targetMarket, setTargetMarket] = useState('');
  const [competitorInfo, setCompetitorInfo] = useState('');
  const [costInfo, setCostInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [strategy, setStrategy] = useState<PricingStrategy | null>(null);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<TabKey>('tiers');

  const canSubmit =
    productName.trim() !== '' &&
    productDesc.trim() !== '' &&
    targetMarket.trim() !== '';

  const generate = useCallback(async () => {
    if (!canSubmit) return;
    setError('');
    setLoading(true);
    setStrategy(null);

    const systemPrompt = `你是一位顶级 SaaS 定价策略专家，熟悉 B2B/B2C 定价心理学和竞争定价策略。
请基于用户提供的产品信息，生成完整的定价策略方案。

请严格按照以下JSON格式输出，不要输出任何其他内容：
{
  "tiers": [
    {
      "name": "档次名称",
      "price": "价格（如 ¥99/月）",
      "rationale": "定价心理学理由",
      "features": ["功能1", "功能2", "功能3"],
      "targetUser": "目标用户描述"
    }
  ],
  "psychologyTactics": [
    {
      "tactic": "策略名称（如：锚定效应）",
      "description": "策略说明",
      "example": "具体在本产品中的应用示例"
    }
  ],
  "competitorBenchmark": {
    "positioning": "定位策略（如：高于Notion 20%，低于飞书）",
    "analysis": "竞对定价分析",
    "recommendation": "具体建议"
  },
  "pageCopy": {
    "headline": "定价页大标题",
    "subheadline": "副标题",
    "tiers": [
      {"name": "档次名", "tagline": "档次标语", "cta": "按钮文字"}
    ]
  }
}

要求：
- tiers 给出 3 个定价档次（免费/轻量、专业、企业 或类似结构）
- psychologyTactics 列出 4-5 个适用的定价心理学策略
- competitorBenchmark 基于用户提供的竞品信息给出定位建议
- pageCopy 提供可以直接用在网站上的文案
- 定价要合理，结合成本、市场和竞品信息综合判断`;

    const userContent = `产品名称：${productName}
产品描述：${productDesc}
目标市场：${targetMarket}
${competitorInfo ? `竞品及其定价：${competitorInfo}` : ''}
${costInfo ? `我的成本情况：${costInfo}` : ''}

请生成完整的定价策略方案。`;

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system: systemPrompt,
          messages: [{ role: 'user', content: userContent }],
          maxTokens: 4000,
        }),
      });

      if (!res.ok) throw new Error(`请求失败 (${res.status})`);

      const data = await res.json();
      const raw: string = data.content?.[0]?.text ?? data.text ?? data.result ?? '';

      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('AI 未返回有效的 JSON 格式。');

      const parsed: PricingStrategy = JSON.parse(jsonMatch[0]);
      setStrategy(parsed);
      setActiveTab('tiers');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '生成失败，请稍后重试。');
    } finally {
      setLoading(false);
    }
  }, [productName, productDesc, targetMarket, competitorInfo, costInfo, canSubmit]);

  return (
    <ToolLayout title="定价实验室" subtitle="AI 定价策略，结合心理学与竞品分析">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* ── Left Panel: Inputs ── */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-2 space-y-5"
          >
            <div className="rounded-2xl border border-[#1e1e3a] bg-[#0d0d1f]/80 backdrop-blur p-6 space-y-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🧪</span>
                <div>
                  <h2 className="text-lg font-bold text-white">产品信息</h2>
                  <p className="text-xs text-white/40">填写信息越详细，定价方案越精准</p>
                </div>
              </div>

              {/* Product name */}
              <div>
                <label className="block text-xs text-white/50 mb-1.5 uppercase tracking-wider">
                  产品名称 <span className="text-green-400">*</span>
                </label>
                <input
                  type="text"
                  value={productName}
                  onChange={e => setProductName(e.target.value)}
                  placeholder="例如：Notion、Figma…"
                  className="w-full bg-[#0a0a18] border border-[#1e1e3a] rounded-xl px-4 py-2.5 text-sm text-white/80 placeholder:text-white/20 focus:outline-none focus:border-green-500/60 transition-colors"
                />
              </div>

              {/* Product description */}
              <div>
                <label className="block text-xs text-white/50 mb-1.5 uppercase tracking-wider">
                  产品描述 <span className="text-green-400">*</span>
                </label>
                <textarea
                  value={productDesc}
                  onChange={e => setProductDesc(e.target.value)}
                  placeholder="核心功能、价值主张、差异化优势…"
                  rows={3}
                  className="w-full bg-[#0a0a18] border border-[#1e1e3a] rounded-xl px-4 py-3 text-sm text-white/80 placeholder:text-white/20 resize-none focus:outline-none focus:border-green-500/60 transition-colors leading-relaxed"
                />
              </div>

              {/* Target market */}
              <div>
                <label className="block text-xs text-white/50 mb-1.5 uppercase tracking-wider">
                  目标市场 <span className="text-green-400">*</span>
                </label>
                <input
                  type="text"
                  value={targetMarket}
                  onChange={e => setTargetMarket(e.target.value)}
                  placeholder="例如：中小型 SaaS 团队、个人开发者…"
                  className="w-full bg-[#0a0a18] border border-[#1e1e3a] rounded-xl px-4 py-2.5 text-sm text-white/80 placeholder:text-white/20 focus:outline-none focus:border-green-500/60 transition-colors"
                />
              </div>

              {/* Competitor info */}
              <div>
                <label className="block text-xs text-white/50 mb-1.5 uppercase tracking-wider">
                  竞品及其大致定价 <span className="text-white/25">(可选)</span>
                </label>
                <textarea
                  value={competitorInfo}
                  onChange={e => setCompetitorInfo(e.target.value)}
                  placeholder="例如：Notion ¥128/月，飞书 ¥30/人/月…"
                  rows={2}
                  className="w-full bg-[#0a0a18] border border-[#1e1e3a] rounded-xl px-4 py-2.5 text-sm text-white/80 placeholder:text-white/20 resize-none focus:outline-none focus:border-green-500/60 transition-colors leading-relaxed"
                />
              </div>

              {/* Cost info */}
              <div>
                <label className="block text-xs text-white/50 mb-1.5 uppercase tracking-wider">
                  成本情况 <span className="text-white/25">(可选)</span>
                </label>
                <input
                  type="text"
                  value={costInfo}
                  onChange={e => setCostInfo(e.target.value)}
                  placeholder="例如：服务器成本约 ¥5/用户/月…"
                  className="w-full bg-[#0a0a18] border border-[#1e1e3a] rounded-xl px-4 py-2.5 text-sm text-white/80 placeholder:text-white/20 focus:outline-none focus:border-green-500/60 transition-colors"
                />
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

              {/* Submit */}
              <button
                onClick={generate}
                disabled={loading || !canSubmit}
                className="w-full py-3 rounded-xl font-semibold text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white shadow-lg shadow-green-900/30 hover:shadow-green-800/40 active:scale-[0.98]"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <motion.span
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                      className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                    />
                    正在生成定价方案…
                  </span>
                ) : (
                  '🧪 生成定价策略'
                )}
              </button>
            </div>

            {/* Tips */}
            {!strategy && !loading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="rounded-2xl border border-[#1e1e3a] bg-[#0d0d1f]/60 p-5 space-y-3"
              >
                <p className="text-xs text-white/40 uppercase tracking-wider">定价策略提示</p>
                {[
                  '好的定价应覆盖成本并体现价值，而非单纯对标竞品',
                  '3 档定价是最常见结构：锚定高价，推动中价，保留低价',
                  '订阅制比一次性付费更易预测收入，适合 SaaS 产品',
                ].map((tip, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-white/45">
                    <span className="text-green-500/60 shrink-0 mt-0.5">▸</span>
                    {tip}
                  </div>
                ))}
              </motion.div>
            )}
          </motion.div>

          {/* ── Right Panel: Results ── */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-3"
          >
            <AnimatePresence mode="wait">
              {loading && (
                <motion.div
                  key="skeleton"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="rounded-2xl border border-[#1e1e3a] bg-[#0d0d1f]/80 p-6"
                >
                  <ResultSkeleton />
                </motion.div>
              )}

              {!loading && !strategy && (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="rounded-2xl border border-dashed border-[#1e1e3a] bg-[#0d0d1f]/40 flex flex-col items-center justify-center py-20 px-6 text-center"
                >
                  <div className="text-5xl mb-4">💰</div>
                  <p className="text-white/40 text-sm">填写左侧信息并点击生成，</p>
                  <p className="text-white/40 text-sm">AI 将为你输出完整定价策略</p>
                </motion.div>
              )}

              {!loading && strategy && (
                <motion.div
                  key="results"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="rounded-2xl border border-[#1e1e3a] bg-[#0d0d1f]/80 p-6 space-y-5"
                >
                  {/* Tab bar */}
                  <div className="flex gap-1 bg-white/5 rounded-xl p-1">
                    {TABS.map(tab => (
                      <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                          activeTab === tab.key
                            ? 'bg-green-600/30 border border-green-500/40 text-green-300'
                            : 'text-white/45 hover:text-white/70'
                        }`}
                      >
                        <span>{tab.icon}</span>
                        <span className="hidden sm:inline">{tab.label}</span>
                      </button>
                    ))}
                  </div>

                  {/* Tab content */}
                  <AnimatePresence mode="wait">
                    {activeTab === 'tiers' && <TiersTab key="tiers" tiers={strategy.tiers} />}
                    {activeTab === 'psychology' && (
                      <PsychologyTab key="psychology" tactics={strategy.psychologyTactics} />
                    )}
                    {activeTab === 'benchmark' && (
                      <BenchmarkTab key="benchmark" benchmark={strategy.competitorBenchmark} />
                    )}
                    {activeTab === 'copy' && (
                      <PageCopyTab key="copy" pageCopy={strategy.pageCopy} />
                    )}
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

        </div>
      </div>
    </ToolLayout>
  );
}
