'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ToolLayout } from '@/components/Layout/ToolLayout';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Stage = 'pre-launch' | 'just-launched' | 'has-users';
type Budget = 'zero' | 'low' | 'medium' | 'high';
type Difficulty = '易' | '中' | '难';

interface Channel {
  name: string;
  platform: string;
  rationale: string;
  steps: string[];
  outreachScript: string;
  estimatedReach: string;
  difficulty: Difficulty;
  weeklyTime: string;
}

interface ColdStartResult {
  channels: Channel[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STAGES: { value: Stage; label: string; desc: string }[] = [
  { value: 'pre-launch', label: '预发布', desc: '产品还未上线' },
  { value: 'just-launched', label: '刚上线', desc: '上线不足1个月' },
  { value: 'has-users', label: '有种子用户', desc: '已有10-100个用户' },
];

const BUDGETS: { value: Budget; label: string }[] = [
  { value: 'zero', label: '零预算' },
  { value: 'low', label: '1K-5K/月' },
  { value: 'medium', label: '5K-2W/月' },
  { value: 'high', label: '2W+/月' },
];

const DIFFICULTY_CONFIG: Record<Difficulty, { bg: string; text: string; border: string }> = {
  易: { bg: 'bg-emerald-950/60', text: 'text-emerald-300', border: 'border-emerald-700/40' },
  中: { bg: 'bg-amber-950/60', text: 'text-amber-300', border: 'border-amber-700/40' },
  难: { bg: 'bg-red-950/60', text: 'text-red-300', border: 'border-red-700/40' },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseResult(raw: string): ColdStartResult | null {
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    const parsed = JSON.parse(jsonMatch[0]) as ColdStartResult;
    if (!Array.isArray(parsed.channels) || parsed.channels.length === 0) return null;
    return parsed;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Difficulty Badge
// ---------------------------------------------------------------------------

function DifficultyBadge({ difficulty }: { difficulty: Difficulty }) {
  const cfg = DIFFICULTY_CONFIG[difficulty];
  return (
    <span
      className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full border shrink-0 ${cfg.bg} ${cfg.text} ${cfg.border}`}
    >
      {difficulty}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Copy Button
// ---------------------------------------------------------------------------

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <button
      onClick={handleCopy}
      className="text-xs px-2.5 py-1 rounded-lg border border-sky-700/40 bg-sky-950/40 text-sky-300 hover:bg-sky-900/50 transition-colors shrink-0"
    >
      {copied ? '已复制' : '复制脚本'}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Channel Card
// ---------------------------------------------------------------------------

function ChannelCard({ channel, index }: { channel: Channel; index: number }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, duration: 0.35 }}
      className="card overflow-hidden"
    >
      {/* Header row — always visible */}
      <button
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-white/[0.02] transition-colors"
        onClick={() => setExpanded(v => !v)}
      >
        {/* Number */}
        <div className="w-7 h-7 rounded-full bg-sky-900/50 border border-sky-700/40 flex items-center justify-center shrink-0">
          <span className="text-xs font-bold text-sky-300">{index + 1}</span>
        </div>

        {/* Name + platform */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-white">{channel.name}</span>
            <span className="text-xs text-slate-500 bg-[#1a1a2e] border border-[#2d2d50] px-2 py-0.5 rounded-full">
              {channel.platform}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5 truncate">{channel.rationale}</p>
        </div>

        {/* Meta */}
        <div className="hidden sm:flex items-center gap-2 shrink-0">
          <DifficultyBadge difficulty={channel.difficulty as Difficulty} />
          <span className="text-xs text-sky-400 font-medium whitespace-nowrap">{channel.estimatedReach}</span>
        </div>

        {/* Chevron */}
        <motion.span
          className="text-slate-600 text-xs ml-1 shrink-0"
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          ▾
        </motion.span>
      </button>

      {/* Mobile meta */}
      <div className="sm:hidden flex items-center gap-2 px-4 pb-2">
        <DifficultyBadge difficulty={channel.difficulty as Difficulty} />
        <span className="text-xs text-sky-400 font-medium">{channel.estimatedReach}</span>
        <span className="text-xs text-slate-600">{channel.weeklyTime}/周</span>
      </div>

      {/* Expanded body */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-4 border-t border-[#1e1e3a]">
              {/* Why it works */}
              <div className="pt-4">
                <p className="text-xs font-semibold text-sky-400 mb-1.5 uppercase tracking-wide">为什么适合你的产品</p>
                <p className="text-sm text-slate-300 leading-relaxed">{channel.rationale}</p>
              </div>

              {/* Meta row */}
              <div className="flex flex-wrap gap-3 text-xs text-slate-400">
                <span className="flex items-center gap-1">
                  <span className="text-slate-600">预计触达：</span>
                  <span className="text-sky-300 font-medium">{channel.estimatedReach}</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="text-slate-600">每周投入：</span>
                  <span className="text-slate-300">{channel.weeklyTime}</span>
                </span>
              </div>

              {/* Action steps */}
              <div>
                <p className="text-xs font-semibold text-sky-400 mb-2 uppercase tracking-wide">行动步骤</p>
                <div className="space-y-2">
                  {channel.steps.map((step, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-sky-900/50 border border-sky-700/40 flex items-center justify-center shrink-0 mt-0.5">
                        <span className="text-xs font-bold text-sky-300">{i + 1}</span>
                      </div>
                      <p className="text-sm text-slate-300 leading-relaxed">{step}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Outreach script */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-sky-400 uppercase tracking-wide">外联话术模板</p>
                  <CopyButton text={channel.outreachScript} />
                </div>
                <pre className="text-sm text-slate-300 bg-[#0d0d1c] border border-[#1e1e3a] rounded-xl p-3.5 whitespace-pre-wrap leading-relaxed font-sans">
                  {channel.outreachScript}
                </pre>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function SkeletonBar({ w = 'w-full', h = 'h-4' }: { w?: string; h?: string }) {
  return (
    <div className={`${w} ${h} bg-[#1e1e3a] rounded-lg overflow-hidden relative`}>
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.4s_infinite] bg-gradient-to-r from-transparent via-white/5 to-transparent" />
    </div>
  );
}

function ResultSkeleton() {
  return (
    <div className="space-y-3 mt-6">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="card p-4 space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-full bg-[#1e1e3a]" />
            <SkeletonBar w="w-1/3" h="h-4" />
            <SkeletonBar w="w-1/5" h="h-3" />
          </div>
          <SkeletonBar w="w-2/3" h="h-3" />
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function ColdStartPage() {
  const [product, setProduct] = useState('');
  const [targetUser, setTargetUser] = useState('');
  const [stage, setStage] = useState<Stage>('pre-launch');
  const [budget, setBudget] = useState<Budget>('zero');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ColdStartResult | null>(null);
  const [parseError, setParseError] = useState('');
  const resultsRef = useRef<HTMLDivElement>(null);

  const canSubmit = product.trim().length > 20 && targetUser.trim().length > 10;

  async function handleGenerate() {
    if (!canSubmit || loading) return;
    setLoading(true);
    setResult(null);
    setParseError('');

    const stageLabel = STAGES.find(s => s.value === stage)?.label ?? stage;
    const budgetLabel = BUDGETS.find(b => b.value === budget)?.label ?? budget;

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system: `你是一位专注于早期产品增长的冷启动专家，曾帮助多个产品从0到1000用户。
你的任务是根据产品信息，输出10个具体、可执行的用户获取渠道方案。
每个渠道都必须针对该特定产品做出具体分析，不能给出泛泛的建议。

请严格输出以下JSON格式，不要有任何多余文字：
{
  "channels": [
    {
      "name": "渠道名称",
      "platform": "具体平台/场所",
      "rationale": "为什么这个渠道适合该产品（具体说明，结合产品特性）",
      "steps": ["步骤1", "步骤2", "步骤3", "步骤4", "步骤5"],
      "outreachScript": "可以直接复制使用的外联话术或内容模板",
      "estimatedReach": "2周内预计触达用户数",
      "difficulty": "易|中|难",
      "weeklyTime": "每周需投入时间"
    }
  ]
}
difficulty只能是"易"、"中"、"难"三者之一。`,
          messages: [
            {
              role: 'user',
              content: `【产品描述】\n${product}\n\n【目标用户】\n${targetUser}\n\n【当前阶段】${stageLabel}\n\n【可用预算】${budgetLabel}`,
            },
          ],
          maxTokens: 4000,
        }),
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const parsed = parseResult(data.text);
      if (!parsed) {
        setParseError('AI返回格式异常，请重试。原始内容：' + data.text.slice(0, 300));
      } else {
        setResult(parsed);
        setTimeout(() => {
          resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      }
    } catch (e) {
      setParseError(e instanceof Error ? e.message : '请求失败，请检查网络或API配置。');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ToolLayout
      title="冷启动引擎"
      subtitle="输入产品信息，AI为你生成10个定制化用户获取渠道，附带外联话术和行动步骤"
    >
      {/* Input form */}
      <div className="space-y-4">
        {/* Product + Target user */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="card p-5 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className="text-base">🚀</span>
              <span className="text-sm font-semibold text-slate-200">产品描述</span>
            </div>
            <textarea
              className="textarea flex-1 min-h-[140px] text-sm leading-relaxed"
              placeholder={`详细描述你的产品，例如：\n\n一个帮助独立开发者管理客户反馈的SaaS工具。用户可以通过一个链接收集来自不同渠道的反馈，AI自动分类和优先级排序，并同步到GitHub Issues。`}
              value={product}
              onChange={e => setProduct(e.target.value)}
            />
            <span className="text-xs text-slate-600">{product.length} 字符</span>
          </div>

          <div className="card p-5 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className="text-base">👥</span>
              <span className="text-sm font-semibold text-slate-200">目标用户描述</span>
            </div>
            <textarea
              className="textarea flex-1 min-h-[140px] text-sm leading-relaxed"
              placeholder={`描述你的理想用户，例如：\n\n有1-3个付费产品的独立开发者，月收入$500-$5000，活跃在Twitter、Indie Hackers、Product Hunt，痛点是不知道该优先做哪些功能。`}
              value={targetUser}
              onChange={e => setTargetUser(e.target.value)}
            />
            <span className="text-xs text-slate-600">{targetUser.length} 字符</span>
          </div>
        </div>

        {/* Stage + Budget */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Stage */}
          <div className="card p-5">
            <p className="text-sm font-semibold text-slate-200 mb-3">当前阶段</p>
            <div className="flex flex-col gap-2">
              {STAGES.map(s => (
                <button
                  key={s.value}
                  onClick={() => setStage(s.value)}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl border text-left transition-all ${
                    stage === s.value
                      ? 'border-sky-600/60 bg-sky-900/30 text-white'
                      : 'border-[#2d2d50] text-slate-400 hover:border-[#3d3d60] hover:text-slate-300'
                  }`}
                >
                  <div
                    className={`w-3.5 h-3.5 rounded-full border-2 shrink-0 transition-all ${
                      stage === s.value ? 'border-sky-400 bg-sky-400' : 'border-[#3d3d60]'
                    }`}
                  />
                  <div>
                    <span className="text-sm font-medium">{s.label}</span>
                    <span className="text-xs text-slate-600 ml-2">{s.desc}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Budget */}
          <div className="card p-5">
            <p className="text-sm font-semibold text-slate-200 mb-3">可用月预算</p>
            <div className="grid grid-cols-2 gap-2">
              {BUDGETS.map(b => (
                <button
                  key={b.value}
                  onClick={() => setBudget(b.value)}
                  className={`px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                    budget === b.value
                      ? 'border-sky-600/60 bg-sky-900/30 text-sky-300'
                      : 'border-[#2d2d50] text-slate-400 hover:border-[#3d3d60] hover:text-slate-300'
                  }`}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-center">
          <button
            className="btn-primary px-12 py-3 text-base"
            disabled={!canSubmit || loading}
            onClick={handleGenerate}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                生成中...
              </span>
            ) : (
              '❄️ 生成冷启动方案'
            )}
          </button>
        </div>

        {!canSubmit && !loading && (product.length > 0 || targetUser.length > 0) && (
          <p className="text-xs text-center text-slate-600">
            请确保产品描述不少于20字、目标用户不少于10字后再生成
          </p>
        )}
      </div>

      {/* Loading skeleton */}
      <AnimatePresence>
        {loading && (
          <motion.div key="skeleton" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <ResultSkeleton />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Parse error */}
      <AnimatePresence>
        {parseError && !loading && (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-6 card p-4 border-red-800/40 bg-red-950/20"
          >
            <p className="text-sm text-red-400 font-medium mb-1">解析失败</p>
            <p className="text-xs text-slate-500 break-all">{parseError}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results */}
      <AnimatePresence>
        {result && !loading && (
          <motion.div
            key="results"
            ref={resultsRef}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mt-6"
          >
            {/* Summary bar */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-white">
                  找到 {result.channels.length} 个获客渠道
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                易
                <span className="w-2 h-2 rounded-full bg-amber-400 inline-block ml-1" />
                中
                <span className="w-2 h-2 rounded-full bg-red-400 inline-block ml-1" />
                难
              </div>
            </div>

            <div className="space-y-3">
              {result.channels.map((ch, i) => (
                <ChannelCard key={i} channel={ch} index={i} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty state */}
      {!result && !loading && !parseError && (
        <div className="mt-14 flex flex-col items-center gap-3 text-center text-slate-600">
          <span className="text-5xl opacity-30">❄️</span>
          <p className="text-sm">填写产品信息，AI帮你找到最适合冷启动的10个渠道</p>
          <p className="text-xs text-slate-700">每个渠道都包含专属话术脚本和可操作步骤</p>
        </div>
      )}

      <style jsx global>{`
        @keyframes shimmer {
          100% { transform: translateX(200%); }
        }
      `}</style>
    </ToolLayout>
  );
}
