'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ToolLayout } from '@/components/Layout/ToolLayout';

// ─── Types ────────────────────────────────────────────────────────────────────

interface RiskItem {
  level: '高' | '中' | '低';
  clause: string;
  quote: string;
  issue: string;
  suggestion: string;
}

interface Report {
  overall: '高' | '中' | '低';
  risks: RiskItem[];
  missing: string[];
  summary: string;
}

interface CounterClause {
  clauseIndex: number;
  replacement: string;
  protection: string;
}

interface NegotiationScript {
  theirStatement: string;
  gentle: string;
  standard: string;
  firm: string;
}

interface OpponentPerspective {
  reason: string;
  concern: string;
  likelyCompromise: string;
}

interface OpponentAnalysis {
  clauseAnalyses: Array<{ clause: string } & OpponentPerspective>;
  batna: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CONTRACT_TYPES = [
  '劳动合同',
  '服务合同',
  '采购合同',
  '合作协议',
  '租赁合同',
  '其他',
];

function levelColor(level: '高' | '中' | '低') {
  if (level === '高') return { bg: 'bg-red-500/20', border: 'border-red-500/40', text: 'text-red-400', dot: 'bg-red-400' };
  if (level === '中') return { bg: 'bg-yellow-500/20', border: 'border-yellow-500/40', text: 'text-yellow-400', dot: 'bg-yellow-400' };
  return { bg: 'bg-emerald-500/20', border: 'border-emerald-500/40', text: 'text-emerald-400', dot: 'bg-emerald-400' };
}

function levelLabel(level: '高' | '中' | '低') {
  if (level === '高') return '高风险';
  if (level === '中') return '中风险';
  return '低风险';
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function OverallBadge({ level }: { level: '高' | '中' | '低' }) {
  const c = levelColor(level);
  const rings =
    level === '高'
      ? 'shadow-[0_0_40px_rgba(239,68,68,0.35)]'
      : level === '中'
      ? 'shadow-[0_0_40px_rgba(234,179,8,0.35)]'
      : 'shadow-[0_0_40px_rgba(52,211,153,0.35)]';

  return (
    <motion.div
      initial={{ scale: 0.6, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 18 }}
      className={`mx-auto flex flex-col items-center justify-center w-36 h-36 rounded-full border-2 ${c.border} ${c.bg} ${rings}`}
    >
      <span className={`text-4xl font-black ${c.text}`}>{level}</span>
      <span className={`text-sm mt-1 ${c.text}`}>风险</span>
    </motion.div>
  );
}

function CounterClausePanel({
  item,
  index,
  contractType,
}: {
  item: RiskItem;
  index: number;
  contractType: string;
}) {
  const [counterData, setCounterData] = useState<CounterClause | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const generate = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system: '你是资深中国合同律师，专门起草反制条款。严格输出JSON，不含其他文字。',
          messages: [
            {
              role: 'user',
              content: `合同类型：${contractType}
高风险条款：${item.clause}
原文：${item.quote}
问题：${item.issue}

请生成一段替换用的反制条款，以及说明这段文字保护了什么权益。严格输出JSON：
{
  "clauseIndex": ${index},
  "replacement": "替换条款原文（专业法律语言，可直接使用）",
  "protection": "这段条款保护你免受（50字以内）"
}`,
            },
          ],
          maxTokens: 600,
        }),
      });
      const data = await res.json();
      const match = (data.text ?? '').match(/\{[\s\S]*\}/);
      if (match) {
        setCounterData(JSON.parse(match[0]));
        setExpanded(true);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-3 border-t border-white/5 pt-3 space-y-3">
      {!counterData && (
        <button
          onClick={generate}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-50"
        >
          {loading ? (
            <span className="flex items-center gap-1">
              <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              生成中...
            </span>
          ) : (
            '⚔️ 生成反制条款'
          )}
        </button>
      )}
      {counterData && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2"
        >
          <button
            onClick={() => setExpanded(v => !v)}
            className="flex items-center gap-1.5 text-xs font-medium text-red-400 hover:text-red-300 transition-colors"
          >
            <span>⚔️ 反制条款已生成</span>
            <motion.span animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
              ▾
            </motion.span>
          </button>
          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="space-y-2">
                  <div className="rounded-lg bg-red-950/20 border border-red-700/30 px-4 py-3">
                    <p className="text-xs text-red-400 font-medium mb-1.5 uppercase tracking-wider">替换成这段文字</p>
                    <p className="text-sm text-slate-200 leading-relaxed">{counterData.replacement}</p>
                  </div>
                  <div className="rounded-lg bg-emerald-950/20 border border-emerald-700/30 px-4 py-3">
                    <p className="text-xs text-emerald-400 font-medium mb-1 uppercase tracking-wider">保护你免受</p>
                    <p className="text-sm text-slate-300 leading-relaxed">{counterData.protection}</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}

function RiskCard({
  item,
  index,
  contractType,
}: {
  item: RiskItem;
  index: number;
  contractType: string;
}) {
  const [open, setOpen] = useState(false);
  const c = levelColor(item.level);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07 }}
      className={`rounded-xl border ${c.border} ${c.bg} overflow-hidden`}
    >
      <button
        className="w-full flex items-center gap-3 px-5 py-4 text-left"
        onClick={() => setOpen(v => !v)}
      >
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${c.border} ${c.text} shrink-0`}>
          <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
          {levelLabel(item.level)}
        </span>
        <span className="flex-1 font-medium text-white/90 truncate">{item.clause}</span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-white/40 shrink-0"
        >
          ▾
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 space-y-3 border-t border-white/5 pt-4">
              {/* Quote */}
              <div className="bg-white/5 rounded-lg px-4 py-3 border-l-4 border-white/20">
                <p className="text-xs text-white/40 mb-1 uppercase tracking-wider">原文引用</p>
                <p className="text-sm text-white/70 italic leading-relaxed line-clamp-5">
                  "{item.quote}"
                </p>
              </div>
              {/* Issue */}
              <div>
                <p className="text-xs text-white/40 uppercase tracking-wider mb-1">问题说明</p>
                <p className="text-sm text-white/80 leading-relaxed">{item.issue}</p>
              </div>
              {/* Suggestion */}
              <div className="bg-white/5 rounded-lg px-4 py-3">
                <p className="text-xs text-white/40 uppercase tracking-wider mb-1">建议修改方向</p>
                <p className="text-sm text-emerald-300/80 leading-relaxed">{item.suggestion}</p>
              </div>
              {/* Counter clause — only for high risk */}
              {item.level === '高' && (
                <CounterClausePanel item={item} index={index} contractType={contractType} />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Negotiation Scripts Panel ────────────────────────────────────────────────

function NegotiationScriptsPanel({
  report,
  contractType,
}: {
  report: Report;
  contractType: string;
}) {
  const [scripts, setScripts] = useState<NegotiationScript[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);

  const generate = async () => {
    setLoading(true);
    try {
      const riskyItems = report.risks.filter(r => r.level === '高' || r.level === '中');
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system: '你是顶级商业谈判顾问，擅长合同谈判话术。严格输出JSON数组，不含其他文字。',
          messages: [
            {
              role: 'user',
              content: `合同类型：${contractType}
风险条款列表：
${riskyItems.map((r, i) => `${i + 1}. ${r.clause}：${r.issue}`).join('\n')}

为每个风险条款生成三级谈判话术。输出JSON数组：
[
  {
    "theirStatement": "对方可能说的话（20字以内）",
    "gentle": "温和版：你可以说的话（50字以内）",
    "standard": "标准版：你可以说的话（50字以内）",
    "firm": "强硬版：你可以说的话（50字以内）"
  }
]

只输出JSON数组。`,
            },
          ],
          maxTokens: 2000,
        }),
      });
      const data = await res.json();
      const match = (data.text ?? '').match(/\[[\s\S]*\]/);
      if (match) {
        setScripts(JSON.parse(match[0]));
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  const LEVEL_STYLES = {
    gentle: { label: '温和版', cls: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' },
    standard: { label: '标准版', cls: 'bg-blue-500/10 border-blue-500/30 text-blue-300' },
    firm: { label: '强硬版', cls: 'bg-red-500/10 border-red-500/30 text-red-300' },
  };

  return (
    <div className="rounded-2xl border border-[#1e1e3a] bg-[#0d0d1f]/80 p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <span>🗣️</span> 谈判话术库
          </h3>
          <p className="text-xs text-white/40 mt-0.5">三级话术，从温和到强硬</p>
        </div>
        {!scripts && (
          <button
            onClick={generate}
            disabled={loading}
            className="px-4 py-2 rounded-xl text-sm font-semibold border border-indigo-500/40 text-indigo-300 hover:bg-indigo-500/10 transition-all disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center gap-1.5">
                <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                生成中...
              </span>
            ) : (
              '获取谈判话术'
            )}
          </button>
        )}
      </div>

      {scripts && (
        <div className="space-y-3">
          {scripts.map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className="rounded-xl border border-[#1e1e3a] bg-[#0a0a18] overflow-hidden"
            >
              <button
                className="w-full flex items-center justify-between px-4 py-3 text-left"
                onClick={() => setExpanded(expanded === i ? null : i)}
              >
                <div>
                  <p className="text-xs text-white/40 uppercase tracking-wider mb-0.5">条款 {i + 1}</p>
                  <p className="text-sm text-white/80 font-medium">当对方说："{s.theirStatement}"</p>
                </div>
                <motion.span animate={{ rotate: expanded === i ? 180 : 0 }} className="text-white/30">▾</motion.span>
              </button>
              <AnimatePresence>
                {expanded === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 space-y-2 border-t border-white/5 pt-3">
                      {(['gentle', 'standard', 'firm'] as const).map((level) => (
                        <div key={level} className={`rounded-lg border px-3 py-2.5 ${LEVEL_STYLES[level].cls}`}>
                          <p className="text-xs font-semibold uppercase tracking-wider mb-1 opacity-70">
                            {LEVEL_STYLES[level].label}
                          </p>
                          <p className="text-sm leading-relaxed">你可以说："{s[level]}"</p>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Opponent Analysis Tab ────────────────────────────────────────────────────

function OpponentAnalysisPanel({
  report,
  contractType,
}: {
  report: Report;
  contractType: string;
}) {
  const [analysis, setAnalysis] = useState<OpponentAnalysis | null>(null);
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setLoading(true);
    try {
      const riskyItems = report.risks.filter(r => r.level === '高' || r.level === '中');
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system: '你是资深谈判策略顾问，擅长对方利益分析。严格输出JSON，不含其他文字。',
          messages: [
            {
              role: 'user',
              content: `合同类型：${contractType}
我方视角的风险条款：
${riskyItems.map((r, i) => `${i + 1}. ${r.clause}：${r.issue}`).join('\n')}

请从对方立场分析：他们为何要加入这些条款？他们最在意什么？哪里可能让步？
同时给出我方BATNA（最佳替代方案）。

严格输出JSON：
{
  "clauseAnalyses": [
    {
      "clause": "条款名称",
      "reason": "对方加入此条款的真实原因（30字）",
      "concern": "对方最担心的事（30字）",
      "likelyCompromise": "对方可能接受的妥协方向（40字）"
    }
  ],
  "batna": "我方BATNA：如果谈不成，我们可以（50字）"
}`,
            },
          ],
          maxTokens: 1500,
        }),
      });
      const data = await res.json();
      const match = (data.text ?? '').match(/\{[\s\S]*\}/);
      if (match) {
        setAnalysis(JSON.parse(match[0]));
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  if (!analysis && !loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4">
        <div className="text-4xl">🔭</div>
        <p className="text-slate-400 text-sm text-center max-w-xs">
          分析对方真实意图，找到可能的妥协空间，并制定你的BATNA
        </p>
        <button
          onClick={generate}
          className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white transition-all"
        >
          分析对方视角
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
          className="w-8 h-8 border-2 border-indigo-600/30 border-t-indigo-400 rounded-full"
        />
        <p className="text-slate-400 text-sm">正在分析对方利益...</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {analysis!.clauseAnalyses.map((ca, i) => (
        <div key={i} className="rounded-xl border border-[#1e1e3a] bg-[#0a0a18] p-4 space-y-3">
          <p className="text-sm font-semibold text-white/80">{ca.clause}</p>
          <div className="grid sm:grid-cols-3 gap-2">
            <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-2.5">
              <p className="text-xs text-amber-400 font-medium mb-1">他们的动机</p>
              <p className="text-xs text-slate-300 leading-relaxed">{ca.reason}</p>
            </div>
            <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2.5">
              <p className="text-xs text-red-400 font-medium mb-1">他们最担心</p>
              <p className="text-xs text-slate-300 leading-relaxed">{ca.concern}</p>
            </div>
            <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-2.5">
              <p className="text-xs text-emerald-400 font-medium mb-1">可能的妥协</p>
              <p className="text-xs text-slate-300 leading-relaxed">{ca.likelyCompromise}</p>
            </div>
          </div>
        </div>
      ))}
      <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/5 p-4">
        <p className="text-sm font-semibold text-indigo-300 mb-2">🎯 你的BATNA</p>
        <p className="text-sm text-slate-300 leading-relaxed">{analysis!.batna}</p>
      </div>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type ReportTab = 'analysis' | 'scripts' | 'opponent';

export default function ContractPage() {
  const [contractText, setContractText] = useState('');
  const [contractType, setContractType] = useState('劳动合同');
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<ReportTab>('analysis');

  const charCount = contractText.length;
  const MAX_CHARS = 10000;

  const analyze = useCallback(async () => {
    if (!contractText.trim()) {
      setError('请粘贴合同文本后再开始分析。');
      return;
    }
    if (charCount > MAX_CHARS) {
      setError(`合同文本过长，请控制在 ${MAX_CHARS.toLocaleString()} 字以内。`);
      return;
    }

    setError('');
    setLoading(true);
    setReport(null);
    setActiveTab('analysis');

    const systemPrompt = `你是一名资深中国合同律师，专注于合同风险审查。
用户会提供一份合同文本，请仔细分析其中的风险条款、不公平条款、法律漏洞及缺失条款。
合同类型：${contractType}

请严格按照以下JSON格式输出，不要输出任何其他内容：
{
  "overall": "高|中|低",
  "risks": [
    {
      "level": "高|中|低",
      "clause": "条款名称",
      "quote": "原文片段（不超过100字）",
      "issue": "问题说明",
      "suggestion": "建议修改方向"
    }
  ],
  "missing": ["缺失条款1", "缺失条款2"],
  "summary": "综合建议（2-3句话）"
}

风险评级标准：
- 高风险：可能导致重大经济损失或法律责任的条款
- 中风险：存在争议或潜在不公平的条款
- 低风险：措辞不严谨或有改进空间的条款

overall字段根据最高风险等级及整体情况综合判断。`;

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system: systemPrompt,
          messages: [{ role: 'user', content: contractText }],
          maxTokens: 3000,
        }),
      });

      if (!res.ok) throw new Error(`请求失败 (${res.status})`);

      const data = await res.json();
      const raw: string =
        data.content?.[0]?.text ?? data.text ?? data.result ?? '';

      // Extract JSON from the response
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('AI 未返回有效的 JSON 格式。');

      const parsed: Report = JSON.parse(jsonMatch[0]);
      setReport(parsed);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '分析失败，请稍后重试。');
    } finally {
      setLoading(false);
    }
  }, [contractText, contractType, charCount]);

  const exportReport = useCallback(() => {
    if (!report) return;
    const lines: string[] = [
      `合同谈判筹码报告`,
      `合同类型：${contractType}`,
      `整体风险等级：${report.overall}风险`,
      '',
      '=== 风险条款 ===',
    ];
    report.risks.forEach((r, i) => {
      lines.push(`\n[${i + 1}] ${r.level}风险 · ${r.clause}`);
      lines.push(`原文：${r.quote}`);
      lines.push(`问题：${r.issue}`);
      lines.push(`建议：${r.suggestion}`);
    });
    if (report.missing.length) {
      lines.push('\n=== 缺失条款 ===');
      report.missing.forEach(m => lines.push(`· ${m}`));
    }
    lines.push('\n=== 综合建议 ===');
    lines.push(report.summary);

    const text = lines.join('\n');
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [report, contractType]);

  const riskStats = report
    ? {
        high: report.risks.filter(r => r.level === '高').length,
        mid: report.risks.filter(r => r.level === '中').length,
        low: report.risks.filter(r => r.level === '低').length,
      }
    : null;

  const REPORT_TABS: { key: ReportTab; label: string; icon: string }[] = [
    { key: 'analysis', label: '风险分析', icon: '🩺' },
    { key: 'scripts', label: '谈判话术', icon: '🗣️' },
    { key: 'opponent', label: '对方视角', icon: '🔭' },
  ];

  return (
    <ToolLayout
      title="⚔️ 合同谈判筹码"
      subtitle="AI深度解析合同风险，生成反制条款和三级谈判话术，掌握谈判主动权"
    >
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">

        {/* ── Input Card ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-[#1e1e3a] bg-[#0d0d1f]/80 backdrop-blur p-6 space-y-4"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">📋</span>
            <div>
              <h2 className="text-lg font-bold text-white">合同文本</h2>
              <p className="text-xs text-white/40">粘贴合同全文，支持最多 10,000 字</p>
            </div>
          </div>

          {/* Contract type selector */}
          <div className="flex flex-wrap gap-2">
            {CONTRACT_TYPES.map(type => (
              <button
                key={type}
                onClick={() => setContractType(type)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all duration-150 ${
                  contractType === type
                    ? 'bg-indigo-600/30 border-indigo-500/60 text-indigo-300'
                    : 'bg-white/5 border-white/10 text-white/50 hover:border-white/25 hover:text-white/75'
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          {/* Textarea */}
          <div className="relative">
            <textarea
              value={contractText}
              onChange={e => {
                setContractText(e.target.value);
                setError('');
              }}
              placeholder="将合同文本粘贴至此处……"
              maxLength={MAX_CHARS}
              rows={14}
              className="w-full bg-[#0a0a18] border border-[#1e1e3a] rounded-xl px-4 py-3 text-sm text-white/80 placeholder:text-white/20 resize-y focus:outline-none focus:border-indigo-500/60 transition-colors leading-relaxed"
            />
            <span
              className={`absolute bottom-3 right-4 text-xs ${
                charCount > MAX_CHARS * 0.9 ? 'text-red-400' : 'text-white/25'
              }`}
            >
              {charCount.toLocaleString()} / {MAX_CHARS.toLocaleString()}
            </span>
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

          {/* Button */}
          <button
            onClick={analyze}
            disabled={loading || !contractText.trim()}
            className="w-full py-3 rounded-xl font-semibold text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-lg shadow-indigo-900/30 hover:shadow-indigo-800/40 active:scale-[0.98]"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <motion.span
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                  className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                />
                正在分析合同…
              </span>
            ) : (
              '⚔️ 开始分析，获取谈判筹码'
            )}
          </button>
        </motion.div>

        {/* ── Report ── */}
        <AnimatePresence>
          {report && (
            <motion.div
              key="report"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <span>⚔️</span> 谈判筹码报告
                </h2>
                <button
                  onClick={exportReport}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm border border-white/10 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-all"
                >
                  {copied ? '✅ 已复制' : '📋 复制报告'}
                </button>
              </div>

              {/* Overall risk + stats */}
              <div className="rounded-2xl border border-[#1e1e3a] bg-[#0d0d1f]/80 p-6 flex flex-col sm:flex-row items-center gap-6">
                <div className="flex flex-col items-center gap-2">
                  <p className="text-xs text-white/40 uppercase tracking-wider">整体风险等级</p>
                  <OverallBadge level={report.overall} />
                </div>
                {riskStats && (
                  <div className="flex-1 grid grid-cols-3 gap-3 w-full">
                    {[
                      { label: '高风险条款', count: riskStats.high, c: levelColor('高') },
                      { label: '中风险条款', count: riskStats.mid, c: levelColor('中') },
                      { label: '低风险条款', count: riskStats.low, c: levelColor('低') },
                    ].map(({ label, count, c }) => (
                      <div
                        key={label}
                        className={`rounded-xl border ${c.border} ${c.bg} flex flex-col items-center justify-center py-4`}
                      >
                        <span className={`text-3xl font-black ${c.text}`}>{count}</span>
                        <span className="text-xs text-white/40 mt-1">{label}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Tab bar */}
              <div className="flex gap-1 p-1 bg-[#0a0a18] rounded-xl border border-[#1e1e3a]">
                {REPORT_TABS.map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all ${
                      activeTab === tab.key
                        ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                        : 'text-white/40 hover:text-white/70'
                    }`}
                  >
                    <span>{tab.icon}</span>
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>

              {/* Tab content */}
              <AnimatePresence mode="wait">
                {activeTab === 'analysis' && (
                  <motion.div
                    key="analysis"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="space-y-6"
                  >
                    {/* Risk items */}
                    {report.risks.length > 0 && (
                      <div className="space-y-3">
                        <h3 className="text-sm font-semibold text-white/50 uppercase tracking-wider px-1">
                          风险条款详情（高风险可生成反制条款）
                        </h3>
                        {report.risks.map((item, i) => (
                          <RiskCard key={i} item={item} index={i} contractType={contractType} />
                        ))}
                      </div>
                    )}

                    {/* Missing clauses */}
                    {report.missing.length > 0 && (
                      <div className="rounded-2xl border border-[#1e1e3a] bg-[#0d0d1f]/80 p-6 space-y-3">
                        <h3 className="text-sm font-semibold text-white/50 uppercase tracking-wider">
                          缺失条款
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {report.missing.map((m, i) => (
                            <motion.span
                              key={i}
                              initial={{ opacity: 0, scale: 0.85 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: i * 0.05 }}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border border-orange-500/30 bg-orange-500/10 text-orange-300"
                            >
                              <span className="text-orange-400">⚠</span>
                              {m}
                            </motion.span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Summary */}
                    <motion.div
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-6"
                    >
                      <h3 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-3">
                        综合建议
                      </h3>
                      <p className="text-sm text-white/75 leading-relaxed">{report.summary}</p>
                    </motion.div>
                  </motion.div>
                )}

                {activeTab === 'scripts' && (
                  <motion.div
                    key="scripts"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                  >
                    <NegotiationScriptsPanel report={report} contractType={contractType} />
                  </motion.div>
                )}

                {activeTab === 'opponent' && (
                  <motion.div
                    key="opponent"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="rounded-2xl border border-[#1e1e3a] bg-[#0d0d1f]/80 p-6"
                  >
                    <div className="mb-4">
                      <h3 className="text-base font-bold text-white flex items-center gap-2">
                        <span>🔭</span> 对方视角
                      </h3>
                      <p className="text-xs text-white/40 mt-0.5">理解对方动机，找到谈判突破口</p>
                    </div>
                    <OpponentAnalysisPanel report={report} contractType={contractType} />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ToolLayout>
  );
}
