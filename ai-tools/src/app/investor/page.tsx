'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ToolLayout } from '@/components/Layout/ToolLayout';

// ─── Types ────────────────────────────────────────────────────────────────────

interface KPI {
  id: string;
  name: string;
  value: string;
  change: string;
}

interface InvestorResult {
  subject: string;
  body: string;
  kpiSummary: { name: string; value: string; change: string; trend: 'up' | 'down' | 'flat' }[];
  tips: string[];
  readabilityScore: number;
  readTime: number;
  sentiment: { label: string; detail: string; level: 'balanced' | 'optimistic' | 'pessimistic' };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MONTHS = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];
const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'];
const TONES = [
  { value: 'professional', label: '专业严谨', desc: '正式商务语气' },
  { value: 'candid', label: '坦诚透明', desc: '如实展示挑战与进展' },
  { value: 'optimistic', label: '积极向上', desc: '强调机会与成果' },
] as const;

const SENTIMENT_CONFIG = {
  balanced: { label: '情绪平衡', bg: 'bg-emerald-500/15', border: 'border-emerald-500/30', text: 'text-emerald-400' },
  optimistic: { label: '偏向乐观', bg: 'bg-amber-500/15', border: 'border-amber-500/30', text: 'text-amber-400' },
  pessimistic: { label: '偏向悲观', bg: 'bg-blue-500/15', border: 'border-blue-500/30', text: 'text-blue-400' },
};

function generateId() {
  return Math.random().toString(36).slice(2, 9);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function KPIInput({ kpi, onChange, onRemove, canRemove }: {
  kpi: KPI;
  onChange: (id: string, field: keyof KPI, val: string) => void;
  onRemove: (id: string) => void;
  canRemove: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="flex gap-2 items-start"
    >
      <div className="flex-1 grid grid-cols-3 gap-2">
        <input
          type="text"
          value={kpi.name}
          onChange={e => onChange(kpi.id, 'name', e.target.value)}
          placeholder="指标名称"
          className="bg-[#0a0a18] border border-[#1e1e3a] rounded-lg px-3 py-2 text-sm text-white/80 placeholder:text-white/20 focus:outline-none focus:border-emerald-500/50 transition-colors"
        />
        <input
          type="text"
          value={kpi.value}
          onChange={e => onChange(kpi.id, 'value', e.target.value)}
          placeholder="数值（如：¥120万）"
          className="bg-[#0a0a18] border border-[#1e1e3a] rounded-lg px-3 py-2 text-sm text-white/80 placeholder:text-white/20 focus:outline-none focus:border-emerald-500/50 transition-colors"
        />
        <input
          type="text"
          value={kpi.change}
          onChange={e => onChange(kpi.id, 'change', e.target.value)}
          placeholder="变化（如：+23%）"
          className="bg-[#0a0a18] border border-[#1e1e3a] rounded-lg px-3 py-2 text-sm text-white/80 placeholder:text-white/20 focus:outline-none focus:border-emerald-500/50 transition-colors"
        />
      </div>
      {canRemove && (
        <button
          onClick={() => onRemove(kpi.id)}
          className="shrink-0 mt-1 text-white/25 hover:text-red-400 transition-colors p-1.5"
        >
          ✕
        </button>
      )}
    </motion.div>
  );
}

function KPITable({ items }: { items: InvestorResult['kpiSummary'] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/10">
            <th className="text-left py-3 px-4 text-white/40 text-xs uppercase tracking-wider font-medium">指标</th>
            <th className="text-right py-3 px-4 text-white/40 text-xs uppercase tracking-wider font-medium">数值</th>
            <th className="text-right py-3 px-4 text-white/40 text-xs uppercase tracking-wider font-medium">变化</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {items.map((item, i) => {
            const isUp = item.trend === 'up';
            const isDown = item.trend === 'down';
            return (
              <motion.tr
                key={i}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.06 }}
                className="hover:bg-white/3 transition-colors"
              >
                <td className="py-3 px-4 font-medium text-white/80">{item.name}</td>
                <td className="py-3 px-4 text-right text-white/90 font-mono">{item.value}</td>
                <td className="py-3 px-4 text-right">
                  <span className={`font-mono font-bold ${isUp ? 'text-emerald-400' : isDown ? 'text-red-400' : 'text-white/50'}`}>
                    {isUp ? '↑ ' : isDown ? '↓ ' : '— '}{item.change}
                  </span>
                </td>
              </motion.tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function InvestorPage() {
  const [companyName, setCompanyName] = useState('');
  const [periodType, setPeriodType] = useState<'month' | 'quarter'>('month');
  const [periodValue, setPeriodValue] = useState('一月');
  const [periodYear, setPeriodYear] = useState(new Date().getFullYear().toString());
  const [kpis, setKpis] = useState<KPI[]>([
    { id: generateId(), name: '', value: '', change: '' },
    { id: generateId(), name: '', value: '', change: '' },
  ]);
  const [milestones, setMilestones] = useState('');
  const [challenges, setChallenges] = useState('');
  const [nextFocus, setNextFocus] = useState('');
  const [tone, setTone] = useState<'professional' | 'candid' | 'optimistic'>('candid');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<InvestorResult | null>(null);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'body' | 'kpi' | 'tips'>('body');
  const [copied, setCopied] = useState(false);

  const updateKPI = useCallback((id: string, field: keyof KPI, val: string) => {
    setKpis(prev => prev.map(k => k.id === id ? { ...k, [field]: val } : k));
  }, []);

  const removeKPI = useCallback((id: string) => {
    setKpis(prev => prev.filter(k => k.id !== id));
  }, []);

  const addKPI = useCallback(() => {
    if (kpis.length >= 5) return;
    setKpis(prev => [...prev, { id: generateId(), name: '', value: '', change: '' }]);
  }, [kpis.length]);

  const generate = useCallback(async () => {
    if (!companyName.trim()) { setError('请填写公司名称。'); return; }
    if (!milestones.trim()) { setError('请填写本期关键里程碑。'); return; }

    setError('');
    setLoading(true);
    setResult(null);

    const kpiText = kpis
      .filter(k => k.name.trim())
      .map(k => `- ${k.name}: ${k.value} (${k.change})`)
      .join('\n');

    const period = `${periodYear}年 ${periodValue}`;

    const systemPrompt = `你是一位创业公司的首席执行官，同时也是一位出色的写作者，擅长撰写投资人更新邮件。
请根据以下信息生成一封专业的股东信，语气：${tone === 'professional' ? '专业严谨' : tone === 'candid' ? '坦诚透明' : '积极向上'}。

严格按照以下JSON格式输出，不要输出任何其他内容：
{
  "subject": "邮件主题行（含日期）",
  "body": "完整邮件正文（中文，专业叙事风格，500-800字，包含开头称呼和结尾签名，使用段落分隔，不要用markdown标记）",
  "kpiSummary": [
    {
      "name": "指标名称",
      "value": "数值",
      "change": "变化量",
      "trend": "up|down|flat"
    }
  ],
  "tips": ["个性化建议1", "发送建议2", "注意事项3"],
  "readabilityScore": 可读性评分（1-100整数）,
  "readTime": 预计阅读时间（分钟，整数）,
  "sentiment": {
    "label": "情绪评估（1句话）",
    "detail": "详细说明（1-2句）",
    "level": "balanced|optimistic|pessimistic"
  }
}`;

    const userContent = `公司名称：${companyName}
报告期间：${period}

关键指标：
${kpiText || '（未提供）'}

本期里程碑：
${milestones}

挑战与挫折：
${challenges || '（未提供）'}

下期重点：
${nextFocus || '（未提供）'}`;

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system: systemPrompt,
          messages: [{ role: 'user', content: userContent }],
          maxTokens: 3500,
        }),
      });

      if (!res.ok) throw new Error(`请求失败 (${res.status})`);
      const data = await res.json();
      const raw: string = data.content?.[0]?.text ?? data.text ?? data.result ?? '';
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('AI 未返回有效的 JSON 格式。');
      const parsed: InvestorResult = JSON.parse(jsonMatch[0]);
      setResult(parsed);
      setActiveTab('body');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '生成失败，请稍后重试。');
    } finally {
      setLoading(false);
    }
  }, [companyName, periodValue, periodYear, kpis, milestones, challenges, nextFocus, tone]);

  const copyEmail = useCallback(() => {
    if (!result) return;
    const text = `主题：${result.subject}\n\n${result.body}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [result]);

  const years = Array.from({ length: 5 }, (_, i) => (new Date().getFullYear() - 1 + i).toString());

  return (
    <ToolLayout title="股东信生成器" subtitle="一键生成专业投资人更新邮件，透明沟通建立信任">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* ── Left: Form ── */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-2 space-y-4"
        >
          <div className="rounded-2xl border border-[#1e1e3a] bg-[#0d0d1f]/80 backdrop-blur p-5 space-y-5">
            <div className="flex items-center gap-2">
              <span className="text-xl">📬</span>
              <div>
                <h2 className="text-base font-bold text-white">基本信息</h2>
                <p className="text-xs text-white/40">填写更新邮件所需数据</p>
              </div>
            </div>

            {/* Company name */}
            <div>
              <label className="block text-xs text-white/50 mb-1.5 uppercase tracking-wider">公司名称</label>
              <input
                type="text"
                value={companyName}
                onChange={e => { setCompanyName(e.target.value); setError(''); }}
                placeholder="例：未来出行科技有限公司"
                className="w-full bg-[#0a0a18] border border-[#1e1e3a] rounded-xl px-4 py-2.5 text-sm text-white/80 placeholder:text-white/20 focus:outline-none focus:border-emerald-500/50 transition-colors"
              />
            </div>

            {/* Period */}
            <div>
              <label className="block text-xs text-white/50 mb-2 uppercase tracking-wider">报告期间</label>
              <div className="flex gap-2">
                <div className="flex rounded-lg overflow-hidden border border-[#1e1e3a]">
                  {(['month', 'quarter'] as const).map(t => (
                    <button
                      key={t}
                      onClick={() => {
                        setPeriodType(t);
                        setPeriodValue(t === 'month' ? '一月' : 'Q1');
                      }}
                      className={`px-3 py-2 text-xs font-medium transition-colors ${
                        periodType === t
                          ? 'bg-emerald-600/30 text-emerald-300'
                          : 'text-white/40 hover:text-white/70 bg-transparent'
                      }`}
                    >
                      {t === 'month' ? '月报' : '季报'}
                    </button>
                  ))}
                </div>
                <select
                  value={periodValue}
                  onChange={e => setPeriodValue(e.target.value)}
                  className="flex-1 bg-[#0a0a18] border border-[#1e1e3a] rounded-lg px-3 py-2 text-sm text-white/80 focus:outline-none focus:border-emerald-500/50"
                >
                  {(periodType === 'month' ? MONTHS : QUARTERS).map(v => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
                <select
                  value={periodYear}
                  onChange={e => setPeriodYear(e.target.value)}
                  className="bg-[#0a0a18] border border-[#1e1e3a] rounded-lg px-3 py-2 text-sm text-white/80 focus:outline-none focus:border-emerald-500/50"
                >
                  {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>

            {/* KPIs */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs text-white/50 uppercase tracking-wider">关键指标 KPIs</label>
                {kpis.length < 5 && (
                  <button
                    onClick={addKPI}
                    className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1"
                  >
                    + 添加指标
                  </button>
                )}
              </div>
              <div className="space-y-2">
                <AnimatePresence>
                  {kpis.map(kpi => (
                    <KPIInput
                      key={kpi.id}
                      kpi={kpi}
                      onChange={updateKPI}
                      onRemove={removeKPI}
                      canRemove={kpis.length > 1}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </div>

            {/* Milestones */}
            <div>
              <label className="block text-xs text-white/50 mb-1.5 uppercase tracking-wider">关键里程碑</label>
              <textarea
                value={milestones}
                onChange={e => { setMilestones(e.target.value); setError(''); }}
                placeholder="本期完成了哪些重要事项？例：完成Pre-A轮融资、签约首批企业客户、产品正式上线……"
                rows={4}
                className="w-full bg-[#0a0a18] border border-[#1e1e3a] rounded-xl px-4 py-3 text-sm text-white/80 placeholder:text-white/20 resize-none focus:outline-none focus:border-emerald-500/50 transition-colors leading-relaxed"
              />
            </div>

            {/* Challenges */}
            <div>
              <label className="block text-xs text-white/50 mb-1.5 uppercase tracking-wider">挑战与挫折</label>
              <textarea
                value={challenges}
                onChange={e => setChallenges(e.target.value)}
                placeholder="遇到了哪些挑战？如何应对？（透明沟通有助于建立信任）"
                rows={3}
                className="w-full bg-[#0a0a18] border border-[#1e1e3a] rounded-xl px-4 py-3 text-sm text-white/80 placeholder:text-white/20 resize-none focus:outline-none focus:border-emerald-500/50 transition-colors leading-relaxed"
              />
            </div>

            {/* Next period focus */}
            <div>
              <label className="block text-xs text-white/50 mb-1.5 uppercase tracking-wider">下期重点</label>
              <textarea
                value={nextFocus}
                onChange={e => setNextFocus(e.target.value)}
                placeholder="下个月/季度的核心目标是什么？"
                rows={3}
                className="w-full bg-[#0a0a18] border border-[#1e1e3a] rounded-xl px-4 py-3 text-sm text-white/80 placeholder:text-white/20 resize-none focus:outline-none focus:border-emerald-500/50 transition-colors leading-relaxed"
              />
            </div>

            {/* Tone */}
            <div>
              <label className="block text-xs text-white/50 mb-2 uppercase tracking-wider">邮件语气</label>
              <div className="grid grid-cols-3 gap-2">
                {TONES.map(t => (
                  <button
                    key={t.value}
                    onClick={() => setTone(t.value)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      tone === t.value
                        ? 'border-emerald-500/60 bg-emerald-500/15'
                        : 'border-white/10 bg-white/3 hover:border-white/20'
                    }`}
                  >
                    <p className={`text-xs font-semibold ${tone === t.value ? 'text-emerald-300' : 'text-white/70'}`}>
                      {t.label}
                    </p>
                    <p className="text-xs text-white/35 mt-0.5">{t.desc}</p>
                  </button>
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

            {/* Generate button */}
            <button
              onClick={generate}
              disabled={loading || !companyName.trim() || !milestones.trim()}
              className="w-full py-3 rounded-xl font-semibold text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-900/30 active:scale-[0.98]"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                    className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                  />
                  正在撰写股东信…
                </span>
              ) : (
                '✉️ 生成股东信'
              )}
            </button>
          </div>
        </motion.div>

        {/* ── Right: Result ── */}
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
                <span className="text-5xl mb-4">📬</span>
                <p className="text-white/40 text-sm">填写公司信息和数据</p>
                <p className="text-white/25 text-xs mt-1">AI 将生成专业股东更新邮件</p>
              </motion.div>
            )}

            {loading && (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full rounded-2xl border border-emerald-500/20 bg-emerald-500/5 flex flex-col items-center justify-center py-24 gap-4"
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
                  className="w-12 h-12 border-2 border-emerald-500/30 border-t-emerald-400 rounded-full"
                />
                <p className="text-emerald-400 text-sm">正在撰写投资人更新邮件...</p>
              </motion.div>
            )}

            {result && (
              <motion.div
                key="result"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                {/* Meta stats */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-xl border border-[#1e1e3a] bg-[#0d0d1f]/80 p-4 text-center">
                    <p className="text-2xl font-bold text-emerald-400">{result.readabilityScore}</p>
                    <p className="text-xs text-white/40 mt-1">可读性评分</p>
                  </div>
                  <div className="rounded-xl border border-[#1e1e3a] bg-[#0d0d1f]/80 p-4 text-center">
                    <p className="text-2xl font-bold text-white/80">{result.readTime}<span className="text-sm font-normal text-white/40 ml-0.5">分钟</span></p>
                    <p className="text-xs text-white/40 mt-1">预计阅读时长</p>
                  </div>
                  <div className={`rounded-xl border ${SENTIMENT_CONFIG[result.sentiment.level].border} ${SENTIMENT_CONFIG[result.sentiment.level].bg} p-4 text-center`}>
                    <p className={`text-sm font-bold ${SENTIMENT_CONFIG[result.sentiment.level].text}`}>{SENTIMENT_CONFIG[result.sentiment.level].label}</p>
                    <p className="text-xs text-white/40 mt-1 line-clamp-2">{result.sentiment.label}</p>
                  </div>
                </div>

                {/* Subject line */}
                <div className="rounded-xl border border-[#1e1e3a] bg-[#0d0d1f]/80 px-5 py-4">
                  <p className="text-xs text-white/40 uppercase tracking-wider mb-1">邮件主题</p>
                  <p className="text-sm font-medium text-white/90">{result.subject}</p>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 bg-white/5 rounded-xl p-1">
                  {([['body', '邮件正文'], ['kpi', '数据摘要'], ['tips', '发送建议']] as const).map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => setActiveTab(key)}
                      className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
                        activeTab === key
                          ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/40'
                          : 'text-white/40 hover:text-white/70'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.18 }}
                  >
                    {activeTab === 'body' && (
                      <div className="rounded-2xl border border-[#1e1e3a] bg-[#0d0d1f]/80 overflow-hidden">
                        <div className="flex items-center justify-between px-5 py-3 border-b border-white/5">
                          <p className="text-xs text-white/40">完整邮件正文</p>
                          <button
                            onClick={copyEmail}
                            className="flex items-center gap-1.5 text-xs text-white/50 hover:text-emerald-400 transition-colors"
                          >
                            {copied ? '✅ 已复制' : '📋 复制邮件'}
                          </button>
                        </div>
                        <div className="px-5 py-5">
                          <p className="text-sm text-white/75 leading-relaxed whitespace-pre-wrap">{result.body}</p>
                        </div>
                      </div>
                    )}

                    {activeTab === 'kpi' && (
                      <div className="rounded-2xl border border-[#1e1e3a] bg-[#0d0d1f]/80 overflow-hidden">
                        <div className="px-5 py-3 border-b border-white/5">
                          <p className="text-xs text-white/40">关键指标可视化摘要</p>
                        </div>
                        <KPITable items={result.kpiSummary} />
                      </div>
                    )}

                    {activeTab === 'tips' && (
                      <div className="space-y-3">
                        <div className={`rounded-xl border ${SENTIMENT_CONFIG[result.sentiment.level].border} ${SENTIMENT_CONFIG[result.sentiment.level].bg} px-5 py-4`}>
                          <p className="text-xs text-white/40 uppercase tracking-wider mb-1">情绪分析</p>
                          <p className={`text-sm font-medium ${SENTIMENT_CONFIG[result.sentiment.level].text} mb-1`}>
                            {SENTIMENT_CONFIG[result.sentiment.level].label}
                          </p>
                          <p className="text-sm text-white/65">{result.sentiment.detail}</p>
                        </div>
                        <div className="rounded-2xl border border-[#1e1e3a] bg-[#0d0d1f]/80 p-5 space-y-3">
                          <p className="text-xs text-white/40 uppercase tracking-wider">发送与个性化建议</p>
                          {result.tips.map((tip, i) => (
                            <motion.div
                              key={i}
                              initial={{ opacity: 0, x: -8 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.07 }}
                              className="flex items-start gap-3"
                            >
                              <span className="shrink-0 w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs flex items-center justify-center font-bold mt-0.5">
                                {i + 1}
                              </span>
                              <p className="text-sm text-white/70 leading-relaxed">{tip}</p>
                            </motion.div>
                          ))}
                        </div>
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
