'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ToolLayout } from '@/components/Layout/ToolLayout';

// ---------------------------------------------------------------------------
// Types — Original
// ---------------------------------------------------------------------------

type StatusType = 'match' | 'gap' | 'suggest';

interface AnalysisItem {
  item: string;
  status: StatusType;
  note: string;
}

interface AnalysisResult {
  score: number;
  skills: AnalysisItem[];
  experience: AnalysisItem[];
  highlights: AnalysisItem[];
  summary: string;
}

// ---------------------------------------------------------------------------
// Types — New features
// ---------------------------------------------------------------------------

type OfferStage = 'initial' | 'final' | 'counter';

interface NegotiationLine {
  you: string;
  hrResponse: string;
  yourStrategy: string;
}

interface NegotiationResult {
  openingLines: NegotiationLine[];
  pushbackHandlers: NegotiationLine[];
  walkAwaySignals: string[];
}

interface CareerTrajectory {
  name: string;
  description: string;
  milestones: string[];
  skills: string[];
  titles: string[];
}

interface CareerPathResult {
  specialist: CareerTrajectory;
  crossover: CareerTrajectory;
  entrepreneur: CareerTrajectory;
}

interface InterviewQuestion {
  question: string;
  whyAsked: string;
  starAnswer: string;
}

interface InterviewResult {
  questions: InterviewQuestion[];
}

type MainTab = 'analysis' | 'negotiation' | 'career' | 'interview';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const OFFER_STAGE_LABELS: Record<OfferStage, string> = {
  initial: '初次报价',
  final: '最终阶段',
  counter: '反要约中',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STATUS_CONFIG: Record<StatusType, { label: string; emoji: string; bg: string; text: string; border: string }> = {
  match:   { label: '匹配',  emoji: '✅', bg: 'bg-emerald-950/60', text: 'text-emerald-300', border: 'border-emerald-700/40' },
  gap:     { label: '差距',  emoji: '⚠️', bg: 'bg-amber-950/60',   text: 'text-amber-300',   border: 'border-amber-700/40'  },
  suggest: { label: '建议',  emoji: '💡', bg: 'bg-blue-950/60',    text: 'text-blue-300',    border: 'border-blue-700/40'   },
};

function parseAnalysis(raw: string): AnalysisResult | null {
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    const parsed = JSON.parse(jsonMatch[0]) as AnalysisResult;
    if (typeof parsed.score !== 'number') return null;
    return parsed;
  } catch {
    return null;
  }
}

function parseJSON<T>(raw: string): T | null {
  try {
    const cleaned = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) return null;
    return JSON.parse(match[0]) as T;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Circular Progress
// ---------------------------------------------------------------------------

function CircularScore({ score, animate }: { score: number; animate: boolean }) {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const [displayed, setDisplayed] = useState(0);

  useEffect(() => {
    if (!animate) return;
    let frame: number;
    const start = performance.now();
    const duration = 1200;
    const step = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayed(Math.round(eased * score));
      if (progress < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [score, animate]);

  const strokeDashoffset = circumference - (displayed / 100) * circumference;
  const color =
    displayed >= 80 ? '#34d399' :
    displayed >= 60 ? '#a78bfa' :
    displayed >= 40 ? '#fbbf24' :
    '#f87171';

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-32 h-32">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r={radius} fill="none" stroke="#1e1e3a" strokeWidth="10" />
          <circle
            cx="60" cy="60" r={radius}
            fill="none"
            stroke={color}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{ transition: 'stroke-dashoffset 0.05s linear, stroke 0.3s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold text-white">{displayed}</span>
          <span className="text-xs text-slate-400">/ 100</span>
        </div>
      </div>
      <span className="text-sm font-medium text-slate-300">综合匹配度</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Status Badge
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: StatusType }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.text} ${cfg.border} shrink-0`}>
      <span>{cfg.emoji}</span>
      <span>{cfg.label}</span>
    </span>
  );
}

function AnalysisRow({ item, index }: { item: AnalysisItem; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.06 }}
      className="flex items-start gap-3 py-3 border-b border-[#1e1e3a] last:border-0"
    >
      <StatusBadge status={item.status} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-slate-200 leading-snug">{item.item}</p>
        {item.note && <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{item.note}</p>}
      </div>
    </motion.div>
  );
}

function SectionCard({ title, icon, items }: { title: string; icon: string; items: AnalysisItem[] }) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">{icon}</span>
        <h3 className="text-sm font-semibold text-slate-200">{title}</h3>
        <span className="ml-auto text-xs text-slate-500 bg-[#1a1a2e] px-2 py-0.5 rounded-full border border-[#2d2d50]">
          {items.length} 项
        </span>
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-slate-600 py-4 text-center">暂无数据</p>
      ) : (
        <div>{items.map((it, i) => <AnalysisRow key={i} item={it} index={i} />)}</div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Skeleton Shimmer
// ---------------------------------------------------------------------------

function SkeletonBar({ w = 'w-full', h = 'h-4' }: { w?: string; h?: string }) {
  return (
    <div className={`${w} ${h} bg-[#1e1e3a] rounded-lg overflow-hidden relative`}>
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.4s_infinite] bg-gradient-to-r from-transparent via-white/5 to-transparent" />
    </div>
  );
}

function AnalysisSkeleton() {
  return (
    <div className="space-y-4 mt-6">
      <div className="card p-6 flex flex-col sm:flex-row items-center gap-6">
        <div className="w-32 h-32 rounded-full bg-[#1e1e3a] overflow-hidden relative shrink-0">
          <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.4s_infinite] bg-gradient-to-r from-transparent via-white/5 to-transparent" />
        </div>
        <div className="flex-1 space-y-3 w-full">
          <SkeletonBar h="h-3" w="w-3/4" />
          <SkeletonBar h="h-3" w="w-full" />
          <SkeletonBar h="h-3" w="w-2/3" />
        </div>
      </div>
      {[0, 1, 2].map(i => (
        <div key={i} className="card p-5 space-y-3">
          <SkeletonBar h="h-4" w="w-1/3" />
          <SkeletonBar h="h-3" />
          <SkeletonBar h="h-3" w="w-5/6" />
          <SkeletonBar h="h-3" w="w-4/5" />
        </div>
      ))}
    </div>
  );
}

function GenericSkeleton() {
  return (
    <div className="space-y-4 mt-4">
      {[0, 1, 2].map(i => (
        <div key={i} className="card p-5 space-y-3">
          <SkeletonBar h="h-4" w="w-2/5" />
          <SkeletonBar />
          <SkeletonBar w="w-5/6" />
          <SkeletonBar w="w-3/4" />
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Negotiation Panel
// ---------------------------------------------------------------------------

function DialogueCard({ line, index }: { line: NegotiationLine; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      className="card p-5 space-y-3"
    >
      <div className="p-3 bg-blue-900/20 border border-blue-700/30 rounded-xl">
        <p className="text-xs font-semibold text-blue-400 mb-1.5">🗣 你说：</p>
        <p className="text-sm text-slate-200 leading-relaxed">{line.you}</p>
      </div>
      <div className="p-3 bg-amber-900/20 border border-amber-700/30 rounded-xl">
        <p className="text-xs font-semibold text-amber-400 mb-1.5">💼 HR可能回应：</p>
        <p className="text-sm text-slate-300 leading-relaxed">{line.hrResponse}</p>
      </div>
      <div className="p-3 bg-emerald-900/20 border border-emerald-700/30 rounded-xl">
        <p className="text-xs font-semibold text-emerald-400 mb-1.5">✅ 你的应对策略：</p>
        <p className="text-sm text-slate-300 leading-relaxed">{line.yourStrategy}</p>
      </div>
    </motion.div>
  );
}

function NegotiationPanel({
  resume,
  result,
}: {
  resume: string;
  result: AnalysisResult;
}) {
  const [currentSalary, setCurrentSalary] = useState('');
  const [desiredSalary, setDesiredSalary] = useState('');
  const [offerStage, setOfferStage] = useState<OfferStage>('initial');
  const [loading, setLoading] = useState(false);
  const [negResult, setNegResult] = useState<NegotiationResult | null>(null);
  const [error, setError] = useState('');
  const [activeSection, setActiveSection] = useState<'opening' | 'pushback' | 'walkaway'>('opening');

  const canGenerate = desiredSalary.trim().length > 0;

  async function handleGenerate() {
    if (!canGenerate) return;
    setLoading(true);
    setNegResult(null);
    setError('');

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system: `你是一位专业的薪资谈判教练，熟悉HR博弈心理和谈判策略。根据候选人的简历分析结果，生成针对性的薪资谈判剧本。只输出JSON格式，不要有其他文字。`,
          messages: [{
            role: 'user',
            content: `候选人简历摘要：${resume.slice(0, 500)}
简历分析得分：${result.score}分
简历总结：${result.summary}
${currentSalary ? `当前薪资：${currentSalary}` : ''}
期望薪资：${desiredSalary}
谈判阶段：${OFFER_STAGE_LABELS[offerStage]}

请生成薪资谈判剧本，格式如下：
{
  "openingLines": [
    {"you": "开场白", "hrResponse": "HR可能的回应", "yourStrategy": "你的应对策略"},
    {"you": "第二种开场方式", "hrResponse": "HR可能的回应", "yourStrategy": "你的应对策略"},
    {"you": "第三种开场方式", "hrResponse": "HR可能的回应", "yourStrategy": "你的应对策略"}
  ],
  "pushbackHandlers": [
    {"you": "当HR说预算有限时你说", "hrResponse": "HR会继续说", "yourStrategy": "接下来怎么做"},
    {"you": "当HR拿其他候选人比较时你说", "hrResponse": "HR会继续说", "yourStrategy": "接下来怎么做"},
    {"you": "当HR让你降低期望时你说", "hrResponse": "HR会继续说", "yourStrategy": "接下来怎么做"}
  ],
  "walkAwaySignals": [
    "信号1：描述一个需要考虑离开谈判的信号",
    "信号2：另一个危险信号",
    "信号3：第三个危险信号",
    "信号4：第四个危险信号"
  ]
}
只输出JSON，不要有其他文字。`,
          }],
          maxTokens: 3000,
        }),
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const parsed = parseJSON<NegotiationResult>(data.text);
      if (!parsed) {
        setError('解析失败，请重试。');
      } else {
        setNegResult(parsed);
        setActiveSection('opening');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '请求失败');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Input */}
      <div className="card p-5 space-y-4">
        <h3 className="text-sm font-semibold text-slate-200">🎯 谈判参数</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">当前薪资（选填）</label>
            <input
              type="text"
              className="input text-sm"
              placeholder="例如：25k × 13薪"
              value={currentSalary}
              onChange={e => setCurrentSalary(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">期望薪资 *</label>
            <input
              type="text"
              className="input text-sm"
              placeholder="例如：35k × 15薪"
              value={desiredSalary}
              onChange={e => setDesiredSalary(e.target.value)}
            />
          </div>
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-2">当前所处阶段</label>
          <div className="flex gap-2">
            {(Object.entries(OFFER_STAGE_LABELS) as [OfferStage, string][]).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setOfferStage(key)}
                className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
                  offerStage === key
                    ? 'bg-blue-600/20 border-blue-500/50 text-blue-300'
                    : 'bg-[#1a1a2e] border-[#2d2d50] text-slate-400 hover:text-slate-300'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <button
          className="w-full py-3 rounded-xl font-bold text-white bg-gradient-to-r from-blue-700 to-blue-500 hover:opacity-90 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          disabled={!canGenerate || loading}
          onClick={handleGenerate}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              生成谈判剧本中...
            </span>
          ) : (
            '💬 生成薪资谈判剧本'
          )}
        </button>
      </div>

      {loading && <GenericSkeleton />}

      {error && !loading && (
        <div className="card p-4 border-red-800/40 bg-red-950/20">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {negResult && !loading && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          {/* Section tabs */}
          <div className="flex gap-2 p-1 bg-[#13131f] border border-[#1e1e3a] rounded-xl">
            <button
              onClick={() => setActiveSection('opening')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${activeSection === 'opening' ? 'bg-blue-600/20 text-blue-300 border border-blue-600/30' : 'text-slate-500 hover:text-slate-300'}`}
            >
              开场白 ({negResult.openingLines.length})
            </button>
            <button
              onClick={() => setActiveSection('pushback')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${activeSection === 'pushback' ? 'bg-blue-600/20 text-blue-300 border border-blue-600/30' : 'text-slate-500 hover:text-slate-300'}`}
            >
              反驳应对 ({negResult.pushbackHandlers.length})
            </button>
            <button
              onClick={() => setActiveSection('walkaway')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${activeSection === 'walkaway' ? 'bg-blue-600/20 text-blue-300 border border-blue-600/30' : 'text-slate-500 hover:text-slate-300'}`}
            >
              离场信号
            </button>
          </div>

          <AnimatePresence mode="wait">
            {activeSection === 'opening' && (
              <motion.div key="opening" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                {negResult.openingLines.map((line, i) => <DialogueCard key={i} line={line} index={i} />)}
              </motion.div>
            )}
            {activeSection === 'pushback' && (
              <motion.div key="pushback" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                {negResult.pushbackHandlers.map((line, i) => <DialogueCard key={i} line={line} index={i} />)}
              </motion.div>
            )}
            {activeSection === 'walkaway' && (
              <motion.div key="walkaway" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="card p-5">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-lg">🚨</span>
                  <h3 className="text-sm font-semibold text-slate-200">出现这些信号时，考虑离开谈判</h3>
                </div>
                <div className="space-y-3">
                  {negResult.walkAwaySignals.map((signal, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.08 }}
                      className="flex items-start gap-3 p-3 bg-red-950/20 border border-red-800/30 rounded-xl"
                    >
                      <span className="text-red-400 font-bold text-sm shrink-0">{i + 1}</span>
                      <p className="text-sm text-slate-300 leading-relaxed">{signal}</p>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {!negResult && !loading && !error && (
        <div className="mt-8 flex flex-col items-center gap-3 text-center text-slate-600">
          <span className="text-4xl opacity-20">💬</span>
          <p className="text-sm">填写薪资信息，生成专属谈判剧本</p>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Career Path Panel
// ---------------------------------------------------------------------------

function TrajectoryCard({ traj, color }: { traj: CareerTrajectory; color: string }) {
  return (
    <div className={`card p-5 border-t-2 ${color}`}>
      <h3 className="text-sm font-bold text-slate-200 mb-1">{traj.name}</h3>
      <p className="text-xs text-slate-400 mb-4 leading-relaxed">{traj.description}</p>

      <div className="space-y-4">
        {/* Milestones */}
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">季度里程碑</p>
          <div className="space-y-2">
            {traj.milestones.map((m, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-[#1e1e3a] border border-[#2d2d50] flex items-center justify-center text-xs text-slate-400 shrink-0 mt-0.5 font-mono">
                  Q{i + 1}
                </div>
                <p className="text-xs text-slate-300 leading-snug">{m}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Skills */}
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">需要获取的技能</p>
          <div className="flex flex-wrap gap-1.5">
            {traj.skills.map((s, i) => (
              <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-[#1a1a2e] border border-[#2d2d50] text-slate-400">
                {s}
              </span>
            ))}
          </div>
        </div>

        {/* Titles */}
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">潜在职位</p>
          <div className="flex flex-wrap gap-1.5">
            {traj.titles.map((t, i) => (
              <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-blue-900/30 border border-blue-700/30 text-blue-300">
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function CareerPanel({ resume, result }: { resume: string; result: AnalysisResult }) {
  const [loading, setLoading] = useState(false);
  const [careerResult, setCareerResult] = useState<CareerPathResult | null>(null);
  const [error, setError] = useState('');

  async function handleGenerate() {
    setLoading(true);
    setCareerResult(null);
    setError('');

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system: `你是顶级职业规划顾问，擅长为职场人设计差异化的职业发展路径。只输出JSON格式，不要有其他文字。`,
          messages: [{
            role: 'user',
            content: `根据以下简历信息，设计三条截然不同的2年职业发展路径：

简历内容（节选）：${resume.slice(0, 600)}
AI分析得分：${result.score}分
分析摘要：${result.summary}
技能亮点：${result.highlights.filter(h => h.status === 'match').map(h => h.item).join('、')}
能力差距：${result.skills.filter(s => s.status === 'gap').map(s => s.item).join('、')}

请输出以下JSON格式：
{
  "specialist": {
    "name": "专精路线",
    "description": "路线描述（50字以内）",
    "milestones": ["Q1目标", "Q2目标", "Q3目标", "Q4目标、第2年Q1-Q4可以合并描述一下"],
    "skills": ["技能1", "技能2", "技能3", "技能4", "技能5"],
    "titles": ["职位1", "职位2", "职位3"]
  },
  "crossover": {
    "name": "跨界路线",
    "description": "路线描述（50字以内）",
    "milestones": ["Q1目标", "Q2目标", "Q3目标", "Q4目标"],
    "skills": ["技能1", "技能2", "技能3", "技能4", "技能5"],
    "titles": ["职位1", "职位2", "职位3"]
  },
  "entrepreneur": {
    "name": "创业路线",
    "description": "路线描述（50字以内）",
    "milestones": ["Q1目标", "Q2目标", "Q3目标", "Q4目标"],
    "skills": ["技能1", "技能2", "技能3", "技能4", "技能5"],
    "titles": ["职位1", "职位2", "职位3"]
  }
}
只输出JSON，不要有其他文字。`,
          }],
          maxTokens: 2500,
        }),
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const parsed = parseJSON<CareerPathResult>(data.text);
      if (!parsed) {
        setError('解析失败，请重试。');
      } else {
        setCareerResult(parsed);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '请求失败');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      {!careerResult && !loading && (
        <div className="card p-5 text-center">
          <p className="text-sm text-slate-400 mb-4 leading-relaxed">
            基于你的简历分析，AI将为你规划三条截然不同的2年职业发展轨迹：<br />
            深度专精路线 · 跨界破局路线 · 创业变现路线
          </p>
          <button
            className="btn-primary px-8 py-3"
            onClick={handleGenerate}
          >
            🗺️ 规划我的职业路径
          </button>
        </div>
      )}

      {loading && <GenericSkeleton />}

      {error && !loading && (
        <div className="card p-4 border-red-800/40 bg-red-950/20">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {careerResult && !loading && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">三条路径各有侧重，选择最符合你当下心境的一条</p>
            <button
              onClick={handleGenerate}
              className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
            >
              重新规划
            </button>
          </div>
          <TrajectoryCard traj={careerResult.specialist} color="border-blue-500/60" />
          <TrajectoryCard traj={careerResult.crossover} color="border-emerald-500/60" />
          <TrajectoryCard traj={careerResult.entrepreneur} color="border-amber-500/60" />
        </motion.div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Interview Panel
// ---------------------------------------------------------------------------

function InterviewPanel({ resume, jd, result }: { resume: string; jd: string; result: AnalysisResult }) {
  const [loading, setLoading] = useState(false);
  const [interviewResult, setInterviewResult] = useState<InterviewResult | null>(null);
  const [error, setError] = useState('');
  const [expandedIdx, setExpandedIdx] = useState<number | null>(0);

  async function handleGenerate() {
    setLoading(true);
    setInterviewResult(null);
    setError('');

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system: `你是资深面试官和职业教练，擅长预测面试问题并帮助候选人用STAR法则作答。只输出JSON格式，不要有其他文字。`,
          messages: [{
            role: 'user',
            content: `请基于以下简历与JD的差距，预测8个最可能被问到的面试问题：

简历（节选）：${resume.slice(0, 500)}
JD（节选）：${jd.slice(0, 400)}
AI分析的差距：${result.skills.filter(s => s.status === 'gap').map(s => `${s.item}（${s.note}）`).join('；')}
综合得分：${result.score}分

请输出以下JSON格式：
{
  "questions": [
    {
      "question": "面试问题原文",
      "whyAsked": "面试官为什么问这个问题（30字以内）",
      "starAnswer": "用STAR法则的回答框架（150字以内，包含情境S、任务T、行动A、结果R的引导框架，但要个性化到这份简历）"
    }
  ]
}
必须包含8个问题，覆盖技能差距、行为面试、情景问题、动机问题等不同类型。只输出JSON，不要有其他文字。`,
          }],
          maxTokens: 3000,
        }),
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const parsed = parseJSON<InterviewResult>(data.text);
      if (!parsed) {
        setError('解析失败，请重试。');
      } else {
        setInterviewResult(parsed);
        setExpandedIdx(0);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '请求失败');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      {!interviewResult && !loading && (
        <div className="card p-5 text-center">
          <p className="text-sm text-slate-400 mb-4 leading-relaxed">
            基于简历与JD的差距分析，AI将预测面试官最可能追问的8个问题<br />
            每题附带STAR回答框架，帮你临场不慌
          </p>
          <button className="btn-primary px-8 py-3" onClick={handleGenerate}>
            🔮 预测面试问题
          </button>
        </div>
      )}

      {loading && <GenericSkeleton />}

      {error && !loading && (
        <div className="card p-4 border-red-800/40 bg-red-950/20">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {interviewResult && !loading && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">共 {interviewResult.questions.length} 个预测问题 · 点击展开查看回答框架</p>
            <button onClick={handleGenerate} className="text-xs text-blue-400 hover:text-blue-300 transition-colors">
              重新预测
            </button>
          </div>
          {interviewResult.questions.map((q, i) => (
            <div key={i} className="card overflow-hidden">
              <button
                onClick={() => setExpandedIdx(expandedIdx === i ? null : i)}
                className="w-full flex items-start gap-3 p-4 hover:bg-white/5 transition-colors text-left"
              >
                <div className="w-6 h-6 rounded-full bg-blue-900/50 border border-blue-700/40 flex items-center justify-center text-xs font-bold text-blue-300 shrink-0 mt-0.5">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-200 leading-snug">{q.question}</p>
                  <p className="text-xs text-slate-500 mt-1">{q.whyAsked}</p>
                </div>
                <span className={`text-slate-500 transition-transform duration-200 shrink-0 ${expandedIdx === i ? 'rotate-180' : ''}`}>▾</span>
              </button>

              <AnimatePresence>
                {expandedIdx === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 border-t border-[#1e1e3a] pt-3">
                      <p className="text-xs font-semibold text-blue-400 mb-2 uppercase tracking-wider">STAR 回答框架</p>
                      <div className="bg-[#1a1a2e] rounded-xl p-3.5">
                        <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{q.starAnswer}</p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </motion.div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

const MAIN_TABS: { key: MainTab; label: string; icon: string }[] = [
  { key: 'analysis',    label: '分析报告', icon: '📊' },
  { key: 'negotiation', label: '薪资谈判', icon: '💬' },
  { key: 'career',      label: '职业路径', icon: '🗺️' },
  { key: 'interview',   label: '面试预测', icon: '🔮' },
];

export default function ResumePage() {
  const [resume, setResume] = useState('');
  const [jd, setJd] = useState('');
  const [loading, setLoading] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [parseError, setParseError] = useState('');
  const [optimizedText, setOptimizedText] = useState('');
  const [scoreAnimated, setScoreAnimated] = useState(false);
  const [activeMainTab, setActiveMainTab] = useState<MainTab>('analysis');
  const resultsRef = useRef<HTMLDivElement>(null);

  const canAnalyze = resume.trim().length > 50 && jd.trim().length > 30;
  const canOptimize = !!result && resume.trim().length > 50;

  async function handleAnalyze() {
    if (!canAnalyze) return;
    setLoading(true);
    setResult(null);
    setParseError('');
    setOptimizedText('');
    setScoreAnimated(false);
    setActiveMainTab('analysis');

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system: `你是一位资深HR和职业顾问，专注于简历优化。请分析候选人简历与目标JD的匹配度，输出严格的JSON格式：
{
  "score": 75,
  "skills": [{"item": "Python", "status": "match|gap|suggest", "note": "说明"}],
  "experience": [{"item": "...", "status": "...", "note": "..."}],
  "highlights": [{"item": "...", "status": "...", "note": "..."}],
  "summary": "总体评价（2-3句话）"
}
status只能是match、gap、suggest三者之一。只返回JSON，不要有其他文字。`,
          messages: [
            {
              role: 'user',
              content: `【候选人简历】\n${resume}\n\n【目标岗位JD】\n${jd}`,
            },
          ],
          maxTokens: 2000,
        }),
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const parsed = parseAnalysis(data.text);
      if (!parsed) {
        setParseError('AI返回格式异常，请重试。原始内容：' + data.text.slice(0, 200));
      } else {
        setResult(parsed);
        setTimeout(() => {
          setScoreAnimated(true);
          resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      }
    } catch (e) {
      setParseError(e instanceof Error ? e.message : '请求失败，请检查网络或API配置。');
    } finally {
      setLoading(false);
    }
  }

  async function handleOptimize() {
    if (!canOptimize) return;
    setOptimizing(true);
    setOptimizedText('');

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system: '你是资深简历优化专家。根据候选人原始简历和目标JD，重写一版更具竞争力的简历内容。保持真实，突出匹配点，用STAR法则描述经历，语言精炼专业。直接输出优化后的简历内容，不要加多余说明。',
          messages: [
            {
              role: 'user',
              content: `【原始简历】\n${resume}\n\n【目标JD】\n${jd}\n\n【分析结果摘要】得分${result?.score}，${result?.summary}`,
            },
          ],
          maxTokens: 3000,
        }),
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setOptimizedText(data.text);
    } catch (e) {
      setOptimizedText('优化失败：' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setOptimizing(false);
    }
  }

  return (
    <ToolLayout
      title="🚀 职场跃迁系统"
      subtitle="简历分析 · 薪资谈判剧本 · 职业路径规划 · 面试问题预测，全方位助力职场跃迁"
    >
      {/* Input panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Resume */}
        <div className="card p-5 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span className="text-base">📄</span>
            <span className="text-sm font-semibold text-slate-200">我的简历</span>
            <span className="text-xs text-slate-600 ml-1">（粘贴纯文本）</span>
          </div>
          <textarea
            className="textarea flex-1 min-h-[240px] text-sm leading-relaxed"
            placeholder={`粘贴你的简历内容...

例如：
姓名：张三
教育背景：XX大学 计算机科学 本科
工作经历：
  XX公司 后端工程师 2022-至今
  · 负责xx系统开发，使用Python/Django...
技能：Python, Go, MySQL, Redis, Docker`}
            value={resume}
            onChange={e => setResume(e.target.value)}
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-600">{resume.length} 字符</span>
            {resume.length > 0 && (
              <button onClick={() => setResume('')} className="text-xs text-slate-600 hover:text-slate-400 transition-colors">
                清空
              </button>
            )}
          </div>
        </div>

        {/* JD */}
        <div className="card p-5 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span className="text-base">🎯</span>
            <span className="text-sm font-semibold text-slate-200">目标岗位JD</span>
            <span className="text-xs text-slate-600 ml-1">（职位描述）</span>
          </div>
          <textarea
            className="textarea flex-1 min-h-[240px] text-sm leading-relaxed"
            placeholder={`粘贴目标岗位的职位描述...

例如：
职位：高级后端工程师
职责：
  · 负责核心业务系统的架构设计与开发
  · 主导微服务改造，提升系统稳定性
要求：
  · 5年以上后端开发经验
  · 熟练掌握Go/Python，有高并发经验
  · 熟悉Kubernetes、Kafka等中间件`}
            value={jd}
            onChange={e => setJd(e.target.value)}
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-600">{jd.length} 字符</span>
            {jd.length > 0 && (
              <button onClick={() => setJd('')} className="text-xs text-slate-600 hover:text-slate-400 transition-colors">
                清空
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Analyze button */}
      <div className="mt-4 flex justify-center">
        <button
          className="btn-primary px-10 py-3 text-base"
          disabled={!canAnalyze || loading}
          onClick={handleAnalyze}
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              分析中...
            </span>
          ) : (
            '🔍 开始分析'
          )}
        </button>
      </div>

      {!canAnalyze && !loading && (resume.length > 0 || jd.length > 0) && (
        <p className="text-xs text-center text-slate-600 mt-2">
          请确保简历不少于50字、JD不少于30字后再分析
        </p>
      )}

      {/* Loading skeleton */}
      <AnimatePresence>
        {loading && (
          <motion.div key="skeleton" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <AnalysisSkeleton />
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
            <p className="text-sm text-red-400 font-medium mb-1">⚠️ 解析失败</p>
            <p className="text-xs text-slate-500 break-all">{parseError}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main result area with tabs ── */}
      <AnimatePresence>
        {result && !loading && (
          <motion.div
            key="results"
            ref={resultsRef}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-6"
          >
            {/* Main tab navigation */}
            <div className="flex gap-1 p-1 bg-[#13131f] border border-[#1e1e3a] rounded-2xl mb-5 overflow-x-auto scrollbar-hide">
              {MAIN_TABS.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveMainTab(tab.key)}
                  className={`flex-1 min-w-[90px] flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${
                    activeMainTab === tab.key
                      ? 'bg-blue-600/20 text-blue-300 border border-blue-600/30'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span className="hidden sm:block">{tab.label}</span>
                  <span className="sm:hidden">{tab.label.slice(0, 2)}</span>
                </button>
              ))}
            </div>

            {/* Tab contents */}
            <AnimatePresence mode="wait">
              {activeMainTab === 'analysis' && (
                <motion.div
                  key="analysis"
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-4"
                >
                  {/* Score + summary */}
                  <div className="card p-6 flex flex-col sm:flex-row items-center gap-6">
                    <CircularScore score={result.score} animate={scoreAnimated} />
                    <div className="flex-1 space-y-3">
                      <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                        {(
                          [
                            { label: '技能匹配', items: result.skills },
                            { label: '经验分析', items: result.experience },
                            { label: '亮点提炼', items: result.highlights },
                          ] as const
                        ).map(({ label, items }) => {
                          const matchCount = items.filter(i => i.status === 'match').length;
                          const gapCount = items.filter(i => i.status === 'gap').length;
                          return (
                            <span key={label} className="bg-[#1a1a2e] border border-[#2d2d50] px-2.5 py-1 rounded-lg">
                              {label}：✅{matchCount} ⚠️{gapCount}
                            </span>
                          );
                        })}
                      </div>
                      {result.summary && (
                        <p className="text-sm text-slate-300 leading-relaxed border-l-2 border-blue-600/50 pl-3">
                          {result.summary}
                        </p>
                      )}
                      <button
                        className="btn-primary text-sm py-2 px-6"
                        disabled={!canOptimize || optimizing}
                        onClick={handleOptimize}
                      >
                        {optimizing ? (
                          <span className="flex items-center gap-2">
                            <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                            </svg>
                            优化中...
                          </span>
                        ) : (
                          '✨ 一键优化简历'
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Three analysis sections */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <SectionCard title="技能匹配" icon="🛠️" items={result.skills} />
                    <SectionCard title="经验差距" icon="📊" items={result.experience} />
                    <SectionCard title="亮点提炼" icon="⭐" items={result.highlights} />
                  </div>

                  {/* Optimized resume */}
                  <AnimatePresence>
                    {(optimizedText || optimizing) && (
                      <motion.div
                        key="optimized"
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                      >
                        <div className="card p-5">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                              <span className="text-base">✨</span>
                              <span className="text-sm font-semibold text-slate-200">AI优化后简历</span>
                            </div>
                            {optimizedText && (
                              <button
                                onClick={() => navigator.clipboard.writeText(optimizedText)}
                                className="text-xs btn-ghost py-1.5 px-3"
                              >
                                📋 复制
                              </button>
                            )}
                          </div>
                          {optimizing && !optimizedText ? (
                            <div className="space-y-2">
                              {[...Array(6)].map((_, i) => (
                                <SkeletonBar key={i} w={i % 3 === 2 ? 'w-3/4' : 'w-full'} />
                              ))}
                            </div>
                          ) : (
                            <pre className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed font-sans">
                              {optimizedText}
                            </pre>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}

              {activeMainTab === 'negotiation' && (
                <motion.div
                  key="negotiation"
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={{ duration: 0.15 }}
                >
                  <NegotiationPanel resume={resume} result={result} />
                </motion.div>
              )}

              {activeMainTab === 'career' && (
                <motion.div
                  key="career"
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={{ duration: 0.15 }}
                >
                  <CareerPanel resume={resume} result={result} />
                </motion.div>
              )}

              {activeMainTab === 'interview' && (
                <motion.div
                  key="interview"
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={{ duration: 0.15 }}
                >
                  <InterviewPanel resume={resume} jd={jd} result={result} />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty state */}
      {!result && !loading && !parseError && (
        <div className="mt-12 flex flex-col items-center gap-3 text-center text-slate-600">
          <span className="text-5xl opacity-30">🚀</span>
          <p className="text-sm">粘贴简历和JD，点击分析，开启完整的职场跃迁流程</p>
        </div>
      )}

      <style jsx global>{`
        @keyframes shimmer {
          100% { transform: translateX(200%); }
        }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </ToolLayout>
  );
}
