'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ToolLayout } from '@/components/Layout/ToolLayout';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Answer {
  question: string;
  answer: string;
}

interface Risk {
  risk: string;
  mitigation: string;
}

interface BizPlanResult {
  executiveSummary: string;
  marketAnalysis: { tam: string; sam: string; som: string; narrative: string };
  competitive: string;
  product: string;
  businessModel: string;
  gtm: string;
  team: string;
  financials: string;
  risks: Risk[];
  fundingNeeds: string;
}

interface Section {
  key: keyof BizPlanResult;
  title: string;
  icon: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const QUESTIONS = [
  '你的产品/服务是什么？解决什么核心问题？',
  '目标用户是谁？他们现在如何解决这个问题？',
  '你的核心竞争优势是什么？为什么你能赢？',
  '商业模式是什么？如何赚钱？',
  '目标市场规模大概多大？（可以估算）',
  '现在进展到哪一步了？有哪些已验证的数据？',
  '团队是怎么组成的？核心成员背景？',
  '未来12个月最重要的3个里程碑是什么？',
];

const SECTIONS: Section[] = [
  { key: 'executiveSummary', title: '执行摘要', icon: '📋' },
  { key: 'marketAnalysis', title: '市场分析', icon: '📊' },
  { key: 'competitive', title: '竞争格局', icon: '⚔️' },
  { key: 'product', title: '产品与服务', icon: '🛠️' },
  { key: 'businessModel', title: '商业模式', icon: '💰' },
  { key: 'gtm', title: '营销策略', icon: '🚀' },
  { key: 'team', title: '团队介绍', icon: '👥' },
  { key: 'financials', title: '财务预测', icon: '📈' },
  { key: 'risks', title: '风险分析', icon: '🛡️' },
  { key: 'fundingNeeds', title: '融资需求', icon: '💎' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseResult(raw: string): BizPlanResult | null {
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    const parsed = JSON.parse(jsonMatch[0]) as BizPlanResult;
    if (!parsed.executiveSummary) return null;
    return parsed;
  } catch {
    return null;
  }
}

function renderSectionContent(key: keyof BizPlanResult, value: BizPlanResult[keyof BizPlanResult]): React.ReactNode {
  if (key === 'marketAnalysis') {
    const m = value as BizPlanResult['marketAnalysis'];
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { label: 'TAM 总市场', val: m.tam, color: 'border-indigo-700/40 bg-indigo-950/40 text-indigo-300' },
            { label: 'SAM 可服务市场', val: m.sam, color: 'border-violet-700/40 bg-violet-950/40 text-violet-300' },
            { label: 'SOM 可获取市场', val: m.som, color: 'border-purple-700/40 bg-purple-950/40 text-purple-300' },
          ].map(item => (
            <div key={item.label} className={`rounded-xl border p-3 ${item.color}`}>
              <p className="text-xs opacity-70 mb-1">{item.label}</p>
              <p className="text-sm font-semibold">{item.val}</p>
            </div>
          ))}
        </div>
        <p className="text-sm text-slate-300 leading-relaxed">{m.narrative}</p>
      </div>
    );
  }

  if (key === 'risks') {
    const risks = value as Risk[];
    return (
      <div className="space-y-2">
        {risks.map((r, i) => (
          <div key={i} className="rounded-xl border border-[#2d2d50] bg-[#0d0d1c] p-3">
            <p className="text-sm font-medium text-red-300 mb-1">{r.risk}</p>
            <p className="text-sm text-slate-400 leading-relaxed">
              <span className="text-emerald-400 font-medium">应对：</span>
              {r.mitigation}
            </p>
          </div>
        ))}
      </div>
    );
  }

  return (
    <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
      {value as string}
    </p>
  );
}

// ---------------------------------------------------------------------------
// Progress Bar
// ---------------------------------------------------------------------------

function ProgressBar({ current, total }: { current: number; total: number }) {
  const pct = Math.round(((current) / total) * 100);
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>问题 {current} / {total}</span>
        <span>{pct}%</span>
      </div>
      <div className="h-1.5 bg-[#1e1e3a] rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Q&A Step
// ---------------------------------------------------------------------------

function QuestionStep({
  question,
  index,
  total,
  value,
  onChange,
  onNext,
  onBack,
  isLast,
}: {
  question: string;
  index: number;
  total: number;
  value: string;
  onChange: (v: string) => void;
  onNext: () => void;
  onBack: () => void;
  isLast: boolean;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, [index]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && value.trim().length >= 5) {
      onNext();
    }
  }

  return (
    <motion.div
      key={index}
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="space-y-4"
    >
      {/* Question number + text */}
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-xl bg-indigo-900/60 border border-indigo-700/40 flex items-center justify-center shrink-0 mt-0.5">
          <span className="text-xs font-bold text-indigo-300">{index + 1}</span>
        </div>
        <h2 className="text-base font-semibold text-white leading-snug pt-1">{question}</h2>
      </div>

      {/* Textarea */}
      <textarea
        ref={textareaRef}
        className="textarea w-full min-h-[140px] text-sm leading-relaxed"
        placeholder="在这里输入你的回答... （Cmd/Ctrl+Enter 快速下一步）"
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
      />

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className={`btn-ghost text-sm py-2 px-4 ${index === 0 ? 'invisible' : ''}`}
        >
          上一步
        </button>

        <button
          className="btn-primary text-sm py-2 px-6"
          disabled={value.trim().length < 5}
          onClick={onNext}
        >
          {isLast ? '生成商业计划书' : '下一步'}
        </button>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Answers Review
// ---------------------------------------------------------------------------

function AnswerPill({ q, a, onClick }: { q: string; a: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left px-3.5 py-2.5 rounded-xl border border-[#2d2d50] bg-[#0d0d1c] hover:border-indigo-700/50 hover:bg-indigo-950/20 transition-colors group"
    >
      <p className="text-xs text-indigo-400 mb-0.5 truncate">{q}</p>
      <p className="text-sm text-slate-300 line-clamp-2 leading-relaxed">{a}</p>
      <p className="text-xs text-slate-600 mt-1 group-hover:text-indigo-500 transition-colors">点击修改</p>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Section Card
// ---------------------------------------------------------------------------

function SectionCard({
  section,
  value,
  defaultOpen,
}: {
  section: Section;
  value: BizPlanResult[keyof BizPlanResult];
  defaultOpen: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultOpen);

  return (
    <div className="card overflow-hidden">
      <button
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-white/[0.02] transition-colors"
        onClick={() => setExpanded(v => !v)}
      >
        <span className="text-lg shrink-0">{section.icon}</span>
        <span className="text-sm font-semibold text-white flex-1">{section.title}</span>
        <motion.span
          className="text-slate-600 text-xs"
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          ▾
        </motion.span>
      </button>

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
            <div className="px-4 pb-4 border-t border-[#1e1e3a] pt-4">
              {renderSectionContent(section.key, value)}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
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

function GeneratingSkeleton() {
  return (
    <div className="mt-6 space-y-3">
      {SECTIONS.map((s, i) => (
        <div key={i} className="card p-4 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-lg">{s.icon}</span>
            <SkeletonBar w="w-1/4" h="h-4" />
          </div>
          <SkeletonBar w="w-full" h="h-3" />
          <SkeletonBar w="w-5/6" h="h-3" />
          {i < 3 && <SkeletonBar w="w-4/5" h="h-3" />}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function BizPlanPage() {
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<string[]>(Array(QUESTIONS.length).fill(''));
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BizPlanResult | null>(null);
  const [parseError, setParseError] = useState('');
  const [allExpanded, setAllExpanded] = useState(false);
  const [expandKey, setExpandKey] = useState(0); // forces SectionCard remount on toggle
  const [phase, setPhase] = useState<'questions' | 'review' | 'result'>('questions');
  const resultsRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  const allAnswered = answers.every(a => a.trim().length >= 5);

  function handleNext() {
    if (currentQ < QUESTIONS.length - 1) {
      setCurrentQ(q => q + 1);
    } else {
      setPhase('review');
    }
  }

  function handleBack() {
    if (currentQ > 0) setCurrentQ(q => q - 1);
  }

  function handleEditAnswer(index: number) {
    setCurrentQ(index);
    setPhase('questions');
  }

  async function handleGenerate() {
    setLoading(true);
    setPhase('result');
    setResult(null);
    setParseError('');

    const qa: Answer[] = QUESTIONS.map((q, i) => ({ question: q, answer: answers[i] }));

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system: `你是一位顶级商业顾问和投资人，拥有20年撰写商业计划书的经验。
根据创始人提供的问答信息，撰写一份专业、有说服力的商业计划书。
内容要基于创始人提供的真实信息，避免空洞，做到具体有力。

请严格输出以下JSON格式，不要有任何多余文字：
{
  "executiveSummary": "执行摘要（3-4段，涵盖产品、市场、商业模式、团队亮点）",
  "marketAnalysis": {
    "tam": "总市场规模（带数字）",
    "sam": "可服务市场规模（带数字）",
    "som": "可获取市场规模（带数字）",
    "narrative": "市场分析叙述（2-3段，包含市场趋势和机会）"
  },
  "competitive": "竞争格局分析（列出主要竞争对手，说明差异化优势，2-3段）",
  "product": "产品与服务详述（核心功能、技术特点、产品路线图，2-3段）",
  "businessModel": "商业模式说明（收入来源、定价策略、单位经济模型，2-3段）",
  "gtm": "上市策略（目标客户获取、渠道策略、关键合作，2-3段）",
  "team": "团队介绍（核心成员背景、为什么这个团队能成功，2-3段）",
  "financials": "财务预测（未来3年收入预测和关键假设，叙述形式，2-3段）",
  "risks": [
    {"risk": "风险描述", "mitigation": "应对措施"},
    {"risk": "风险描述", "mitigation": "应对措施"},
    {"risk": "风险描述", "mitigation": "应对措施"},
    {"risk": "风险描述", "mitigation": "应对措施"},
    {"risk": "风险描述", "mitigation": "应对措施"}
  ],
  "fundingNeeds": "融资需求与资金用途（融资金额、用途分配、预期里程碑，2-3段）"
}`,
          messages: [
            {
              role: 'user',
              content:
                '以下是创始人的问答信息：\n\n' +
                qa.map((item, i) => `Q${i + 1}. ${item.question}\nA: ${item.answer}`).join('\n\n'),
            },
          ],
          maxTokens: 5000,
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

  function handleToggleAll() {
    setAllExpanded(v => !v);
    setExpandKey(k => k + 1);
  }

  function handleCopyAll() {
    if (!result) return;
    const lines: string[] = [];
    for (const s of SECTIONS) {
      lines.push(`\n## ${s.title}\n`);
      const val = result[s.key];
      if (s.key === 'marketAnalysis') {
        const m = val as BizPlanResult['marketAnalysis'];
        lines.push(`TAM: ${m.tam}`, `SAM: ${m.sam}`, `SOM: ${m.som}`, '', m.narrative);
      } else if (s.key === 'risks') {
        const risks = val as Risk[];
        risks.forEach(r => lines.push(`风险: ${r.risk}\n应对: ${r.mitigation}`));
      } else {
        lines.push(val as string);
      }
    }
    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleRestart() {
    setAnswers(Array(QUESTIONS.length).fill(''));
    setCurrentQ(0);
    setPhase('questions');
    setResult(null);
    setParseError('');
  }

  return (
    <ToolLayout
      title="BP一键生成"
      subtitle="逐步回答8个问题，AI为你生成完整的商业计划书"
    >
      {/* ---- Phase: Questions ---- */}
      {phase === 'questions' && (
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Progress */}
          <ProgressBar current={currentQ + 1} total={QUESTIONS.length} />

          {/* Question card */}
          <div className="card p-6">
            <AnimatePresence mode="wait">
              <QuestionStep
                key={currentQ}
                question={QUESTIONS[currentQ]}
                index={currentQ}
                total={QUESTIONS.length}
                value={answers[currentQ]}
                onChange={v => {
                  const next = [...answers];
                  next[currentQ] = v;
                  setAnswers(next);
                }}
                onNext={handleNext}
                onBack={handleBack}
                isLast={currentQ === QUESTIONS.length - 1}
              />
            </AnimatePresence>
          </div>

          {/* Previous answers quick-view */}
          {currentQ > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-slate-600 uppercase tracking-wide font-semibold">已填写的回答</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {answers.slice(0, currentQ).map((a, i) => (
                  <AnswerPill
                    key={i}
                    q={`Q${i + 1}. ${QUESTIONS[i]}`}
                    a={a}
                    onClick={() => handleEditAnswer(i)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ---- Phase: Review ---- */}
      {phase === 'review' && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-2xl mx-auto space-y-5"
        >
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-lg">📝</span>
              <h2 className="text-base font-semibold text-white">确认你的回答</h2>
              <span className="ml-auto text-xs text-slate-500">确认无误后生成计划书</span>
            </div>
            <ProgressBar current={QUESTIONS.length} total={QUESTIONS.length} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {answers.map((a, i) => (
              <AnswerPill
                key={i}
                q={`Q${i + 1}. ${QUESTIONS[i]}`}
                a={a}
                onClick={() => handleEditAnswer(i)}
              />
            ))}
          </div>

          <div className="flex gap-3 justify-center pt-2">
            <button className="btn-ghost py-2 px-5 text-sm" onClick={() => setPhase('questions')}>
              返回修改
            </button>
            <button
              className="btn-primary py-3 px-10 text-base"
              disabled={!allAnswered}
              onClick={handleGenerate}
            >
              AI正式生成商业计划书
            </button>
          </div>
        </motion.div>
      )}

      {/* ---- Phase: Result ---- */}
      {phase === 'result' && (
        <div ref={resultsRef}>
          {/* Loading */}
          {loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="max-w-2xl mx-auto"
            >
              <div className="card p-6 mb-4 flex flex-col items-center gap-4">
                <svg className="animate-spin w-8 h-8 text-indigo-400" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <div className="text-center">
                  <p className="text-base font-semibold text-white">AI正在撰写商业计划书...</p>
                  <p className="text-sm text-slate-500 mt-1">正在分析你的信息，生成完整报告，预计需要30-60秒</p>
                </div>
              </div>
              <GeneratingSkeleton />
            </motion.div>
          )}

          {/* Error */}
          {parseError && !loading && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-2xl mx-auto card p-4 border-red-800/40 bg-red-950/20"
            >
              <p className="text-sm text-red-400 font-medium mb-1">生成失败</p>
              <p className="text-xs text-slate-500 break-all">{parseError}</p>
              <button
                className="btn-ghost text-sm py-1.5 px-4 mt-3"
                onClick={handleGenerate}
              >
                重新生成
              </button>
            </motion.div>
          )}

          {/* Results */}
          {result && !loading && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              {/* Control bar */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">📄</span>
                  <h2 className="text-base font-semibold text-white">商业计划书</h2>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="text-xs btn-ghost py-1.5 px-3"
                    onClick={handleToggleAll}
                  >
                    {allExpanded ? '全部折叠' : '全部展开'}
                  </button>
                  <button
                    className="text-xs px-3 py-1.5 rounded-lg border border-indigo-700/40 bg-indigo-950/40 text-indigo-300 hover:bg-indigo-900/50 transition-colors"
                    onClick={handleCopyAll}
                  >
                    {copied ? '已复制' : '复制全文'}
                  </button>
                  <button
                    className="text-xs btn-ghost py-1.5 px-3"
                    onClick={handleRestart}
                  >
                    重新填写
                  </button>
                </div>
              </div>

              {/* Section cards */}
              <div key={expandKey} className="space-y-3">
                {SECTIONS.map((s, i) => (
                  <SectionCard
                    key={`${s.key}-${expandKey}`}
                    section={s}
                    value={result[s.key]}
                    defaultOpen={allExpanded || i === 0}
                  />
                ))}
              </div>
            </motion.div>
          )}
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
