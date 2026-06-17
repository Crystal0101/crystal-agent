'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ToolLayout } from '@/components/Layout/ToolLayout';

// ─── Types ────────────────────────────────────────────────────────────────────

type FeatureStatus = true | false | 'partial';

interface FeatureRow {
  feature: string;
  yours: FeatureStatus;
  comp1: FeatureStatus;
  comp2: FeatureStatus;
  comp3: FeatureStatus;
}

interface PositioningGap {
  gap: string;
  severity: 'high' | 'medium' | 'low';
  description: string;
}

interface PricingEntry {
  brand: string;
  tier: string;
  price: string;
  notes: string;
}

interface Opportunity {
  title: string;
  rationale: string;
  difficulty: 'easy' | 'medium' | 'hard';
  impact: 'high' | 'medium' | 'low';
}

interface IntelReport {
  featureMatrix: FeatureRow[];
  positioningGaps: PositioningGap[];
  pricingAnalysis: PricingEntry[];
  opportunities: Opportunity[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statusIcon(v: FeatureStatus) {
  if (v === true) return <span className="text-emerald-400 font-bold">✅</span>;
  if (v === false) return <span className="text-red-400 font-bold">❌</span>;
  return <span className="text-yellow-400 font-bold">⚠️</span>;
}

function severityBadge(s: 'high' | 'medium' | 'low') {
  if (s === 'high')
    return (
      <span className="px-2 py-0.5 rounded-full text-xs bg-red-500/20 border border-red-500/40 text-red-400">
        高
      </span>
    );
  if (s === 'medium')
    return (
      <span className="px-2 py-0.5 rounded-full text-xs bg-yellow-500/20 border border-yellow-500/40 text-yellow-400">
        中
      </span>
    );
  return (
    <span className="px-2 py-0.5 rounded-full text-xs bg-emerald-500/20 border border-emerald-500/40 text-emerald-400">
      低
    </span>
  );
}

function difficultyBadge(d: 'easy' | 'medium' | 'hard') {
  const map = {
    easy: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400',
    medium: 'bg-yellow-500/20 border-yellow-500/40 text-yellow-400',
    hard: 'bg-red-500/20 border-red-500/40 text-red-400',
  };
  const label = { easy: '容易', medium: '中等', hard: '困难' };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs border ${map[d]}`}>
      难度·{label[d]}
    </span>
  );
}

function impactBadge(i: 'high' | 'medium' | 'low') {
  const map = {
    high: 'bg-cyan-500/20 border-cyan-500/40 text-cyan-400',
    medium: 'bg-blue-500/20 border-blue-500/40 text-blue-400',
    low: 'bg-white/10 border-white/20 text-white/50',
  };
  const label = { high: '高影响', medium: '中影响', low: '低影响' };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs border ${map[i]}`}>
      {label[i]}
    </span>
  );
}

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

function SectionHeader({
  icon,
  title,
  copyText,
}: {
  icon: string;
  title: string;
  copyText: string;
}) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h3 className="flex items-center gap-2 text-base font-bold text-white">
        <span>{icon}</span>
        {title}
      </h3>
      <CopyButton text={copyText} />
    </div>
  );
}

// ─── Loading Skeleton ─────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {[1, 2, 3, 4].map(i => (
        <div
          key={i}
          className="rounded-2xl border border-[#1e1e3a] bg-[#0d0d1f]/80 p-6 space-y-3"
        >
          <div className="h-4 bg-white/10 rounded w-1/3" />
          <div className="h-3 bg-white/5 rounded w-full" />
          <div className="h-3 bg-white/5 rounded w-4/5" />
          <div className="h-3 bg-white/5 rounded w-3/5" />
        </div>
      ))}
    </div>
  );
}

// ─── Report Sections ──────────────────────────────────────────────────────────

function FeatureMatrixSection({
  data,
  competitors,
  productName,
}: {
  data: FeatureRow[];
  competitors: string[];
  productName: string;
}) {
  const copyText = [
    ['功能', productName, ...competitors].join('\t'),
    ...data.map(r => [
      r.feature,
      r.yours === true ? '✅' : r.yours === false ? '❌' : '⚠️',
      r.comp1 === true ? '✅' : r.comp1 === false ? '❌' : '⚠️',
      r.comp2 === true ? '✅' : r.comp2 === false ? '❌' : '⚠️',
      r.comp3 === true ? '✅' : r.comp3 === false ? '❌' : '⚠️',
    ].join('\t')),
  ].join('\n');

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 }}
      className="rounded-2xl border border-[#1e1e3a] bg-[#0d0d1f]/80 p-6"
    >
      <SectionHeader icon="🗂️" title="功能对比矩阵" copyText={copyText} />
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left py-2 pr-4 text-white/50 font-medium">功能</th>
              <th className="text-center py-2 px-3 text-cyan-400 font-semibold">
                {productName || '你的产品'}
              </th>
              {competitors.map((c, i) => (
                <th key={i} className="text-center py-2 px-3 text-white/60 font-medium">
                  {c || `竞品${i + 1}`}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <motion.tr
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className="border-b border-white/5 hover:bg-white/3 transition-colors"
              >
                <td className="py-2.5 pr-4 text-white/80">{row.feature}</td>
                <td className="text-center py-2.5 px-3">{statusIcon(row.yours)}</td>
                <td className="text-center py-2.5 px-3">{statusIcon(row.comp1)}</td>
                <td className="text-center py-2.5 px-3">{statusIcon(row.comp2)}</td>
                <td className="text-center py-2.5 px-3">{statusIcon(row.comp3)}</td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center gap-4 mt-4 text-xs text-white/40">
        <span className="flex items-center gap-1.5"><span className="text-emerald-400">✅</span> 完整支持</span>
        <span className="flex items-center gap-1.5"><span className="text-yellow-400">⚠️</span> 部分支持</span>
        <span className="flex items-center gap-1.5"><span className="text-red-400">❌</span> 不支持</span>
      </div>
    </motion.div>
  );
}

function PositioningGapsSection({ data }: { data: PositioningGap[] }) {
  const copyText = data
    .map(g => `[${g.severity === 'high' ? '高' : g.severity === 'medium' ? '中' : '低'}] ${g.gap}\n${g.description}`)
    .join('\n\n');

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="rounded-2xl border border-[#1e1e3a] bg-[#0d0d1f]/80 p-6"
    >
      <SectionHeader icon="🎯" title="定位差距图" copyText={copyText} />
      <div className="space-y-3">
        {data.map((gap, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.06 }}
            className="rounded-xl border border-[#1e1e3a] bg-white/3 p-4"
          >
            <div className="flex items-center gap-2 mb-2">
              {severityBadge(gap.severity)}
              <span className="text-white/90 font-medium text-sm">{gap.gap}</span>
            </div>
            <p className="text-xs text-white/55 leading-relaxed">{gap.description}</p>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

function PricingSection({ data }: { data: PricingEntry[] }) {
  const copyText = data
    .map(p => `${p.brand} | ${p.tier} | ${p.price}\n备注：${p.notes}`)
    .join('\n\n');

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="rounded-2xl border border-[#1e1e3a] bg-[#0d0d1f]/80 p-6"
    >
      <SectionHeader icon="💰" title="定价对比分析" copyText={copyText} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {data.map((entry, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15 + i * 0.06 }}
            className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4 space-y-1.5"
          >
            <div className="flex items-center justify-between">
              <span className="text-white/90 font-semibold text-sm">{entry.brand}</span>
              <span className="text-cyan-400 font-bold text-base">{entry.price}</span>
            </div>
            <div className="text-xs text-white/50">{entry.tier}</div>
            <p className="text-xs text-white/60 leading-relaxed border-t border-white/5 pt-1.5">
              {entry.notes}
            </p>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

function OpportunitiesSection({ data }: { data: Opportunity[] }) {
  const copyText = data
    .map(
      (o, i) =>
        `${i + 1}. ${o.title}\n理由：${o.rationale}\n难度：${o.difficulty} | 影响：${o.impact}`
    )
    .join('\n\n');

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="rounded-2xl border border-[#1e1e3a] bg-[#0d0d1f]/80 p-6"
    >
      <SectionHeader icon="🚀" title="战略机会清单" copyText={copyText} />
      <div className="space-y-3">
        {data.map((opp, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 + i * 0.07 }}
            className="flex gap-4 rounded-xl border border-[#1e1e3a] bg-white/3 p-4"
          >
            <div className="flex-shrink-0 w-7 h-7 rounded-full bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 font-bold text-sm">
              {i + 1}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <span className="text-white/90 font-semibold text-sm">{opp.title}</span>
                {difficultyBadge(opp.difficulty)}
                {impactBadge(opp.impact)}
              </div>
              <p className="text-xs text-white/60 leading-relaxed">{opp.rationale}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CompetitorPage() {
  const [productName, setProductName] = useState('');
  const [productDesc, setProductDesc] = useState('');
  const [competitors, setCompetitors] = useState(['', '', '']);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<IntelReport | null>(null);
  const [error, setError] = useState('');

  const setCompetitor = useCallback(
    (index: number, value: string) => {
      setCompetitors(prev => {
        const next = [...prev];
        next[index] = value;
        return next;
      });
    },
    []
  );

  const canSubmit =
    productName.trim() !== '' &&
    productDesc.trim() !== '' &&
    competitors.filter(c => c.trim()).length >= 1;

  const generate = useCallback(async () => {
    if (!canSubmit) return;
    setError('');
    setLoading(true);
    setReport(null);

    const comp1 = competitors[0] || '竞品1';
    const comp2 = competitors[1] || '竞品2';
    const comp3 = competitors[2] || '竞品3';

    const systemPrompt = `你是一位专业的商业竞品分析师，擅长市场情报分析和战略机会识别。
请基于用户提供的产品和竞品信息，生成深度竞品情报报告。

请严格按照以下JSON格式输出，不要输出任何其他内容：
{
  "featureMatrix": [
    {"feature": "功能名称", "yours": true, "comp1": false, "comp2": "partial", "comp3": true}
  ],
  "positioningGaps": [
    {"gap": "差距标题", "severity": "high|medium|low", "description": "详细描述"}
  ],
  "pricingAnalysis": [
    {"brand": "品牌名", "tier": "定价档次", "price": "价格区间", "notes": "说明"}
  ],
  "opportunities": [
    {"title": "机会标题", "rationale": "原因分析", "difficulty": "easy|medium|hard", "impact": "high|medium|low"}
  ]
}

要求：
- featureMatrix 列出 8-12 个核心功能维度，true=支持，false=不支持，"partial"=部分支持
- positioningGaps 找出 4-6 个市场空白或竞品弱项
- pricingAnalysis 包含你的产品和所有竞品的定价估算（含建议）
- opportunities 给出 5 个具体可执行的战略机会
- 所有分析要基于实际市场逻辑，有据可查`;

    const userContent = `我的产品名称：${productName}
我的产品描述：${productDesc}

竞品1：${comp1}
竞品2：${comp2}
竞品3：${comp3}

请生成完整的竞品情报报告。`;

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

      const parsed: IntelReport = JSON.parse(jsonMatch[0]);
      setReport(parsed);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '生成失败，请稍后重试。');
    } finally {
      setLoading(false);
    }
  }, [productName, productDesc, competitors, canSubmit]);

  return (
    <ToolLayout title="竞品情报雷达" subtitle="AI 驱动的竞品分析，发现市场机会与战略盲区">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">

        {/* ── Input Card ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-[#1e1e3a] bg-[#0d0d1f]/80 backdrop-blur p-6 space-y-5"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">📡</span>
            <div>
              <h2 className="text-lg font-bold text-white">情报输入</h2>
              <p className="text-xs text-white/40">填写你的产品信息与竞品名称，AI 将生成完整情报报告</p>
            </div>
          </div>

          {/* Product info */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-white/50 mb-1.5 uppercase tracking-wider">
                你的产品名称
              </label>
              <input
                type="text"
                value={productName}
                onChange={e => setProductName(e.target.value)}
                placeholder="例如：Notion、飞书文档…"
                className="w-full bg-[#0a0a18] border border-[#1e1e3a] rounded-xl px-4 py-2.5 text-sm text-white/80 placeholder:text-white/20 focus:outline-none focus:border-cyan-500/60 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs text-white/50 mb-1.5 uppercase tracking-wider">
                产品描述
              </label>
              <textarea
                value={productDesc}
                onChange={e => setProductDesc(e.target.value)}
                placeholder="简要描述你的产品定位、核心功能和目标用户…"
                rows={3}
                className="w-full bg-[#0a0a18] border border-[#1e1e3a] rounded-xl px-4 py-3 text-sm text-white/80 placeholder:text-white/20 resize-none focus:outline-none focus:border-cyan-500/60 transition-colors leading-relaxed"
              />
            </div>
          </div>

          {/* Competitors */}
          <div className="space-y-2">
            <label className="block text-xs text-white/50 mb-1.5 uppercase tracking-wider">
              竞品名称（最多 3 个）
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[0, 1, 2].map(i => (
                <div key={i} className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-cyan-500/60 font-semibold">
                    C{i + 1}
                  </span>
                  <input
                    type="text"
                    value={competitors[i]}
                    onChange={e => setCompetitor(i, e.target.value)}
                    placeholder={`竞品 ${i + 1}`}
                    className="w-full bg-[#0a0a18] border border-[#1e1e3a] rounded-xl pl-9 pr-4 py-2.5 text-sm text-white/80 placeholder:text-white/20 focus:outline-none focus:border-cyan-500/60 transition-colors"
                  />
                </div>
              ))}
            </div>
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
            className="w-full py-3 rounded-xl font-semibold text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-lg shadow-cyan-900/30 hover:shadow-cyan-800/40 active:scale-[0.98]"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <motion.span
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                  className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                />
                正在生成情报报告…
              </span>
            ) : (
              '📡 生成情报报告'
            )}
          </button>
        </motion.div>

        {/* ── Loading ── */}
        <AnimatePresence>
          {loading && (
            <motion.div
              key="skeleton"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Skeleton />
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Report ── */}
        <AnimatePresence>
          {report && !loading && (
            <motion.div
              key="report"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <span>📊</span> 情报报告
                </h2>
                <span className="text-xs text-white/30 bg-white/5 px-3 py-1 rounded-full border border-white/10">
                  {productName} vs {competitors.filter(Boolean).join(' / ')}
                </span>
              </div>

              <FeatureMatrixSection
                data={report.featureMatrix}
                competitors={competitors.map((c, i) => c || `竞品${i + 1}`)}
                productName={productName}
              />
              <PositioningGapsSection data={report.positioningGaps} />
              <PricingSection data={report.pricingAnalysis} />
              <OpportunitiesSection data={report.opportunities} />
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </ToolLayout>
  );
}
