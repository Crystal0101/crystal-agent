'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ToolLayout } from '@/components/Layout/ToolLayout';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Platform = '小红书' | '微博' | '抖音' | '公众号';
type Goal = '涨粉变现' | '职场影响力' | '商业推广' | '创业宣传';
type Style = '犀利专业' | '温暖陪伴' | '幽默搞笑' | '知识干货' | '争议性观点';
type OutputTab = 'positioning' | 'calendar' | 'articles' | 'growth';

interface Positioning {
  statement: string;
  differentiation: string;
  pillars: string[];
}

interface CalendarPost {
  platform: string;
  format: string;
  idea: string;
}

interface CalendarWeek {
  week: number;
  theme: string;
  posts: CalendarPost[];
}

interface Article {
  title: string;
  content: string;
  platform: string;
}

interface GrowthMonth {
  month: string;
  focus: string;
  actions: string[];
  target: string;
}

interface BrandResult {
  positioning: Positioning;
  calendar: CalendarWeek[];
  articles: Article[];
  growthPath: GrowthMonth[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PLATFORMS: Platform[] = ['小红书', '微博', '抖音', '公众号'];
const GOALS: Goal[] = ['涨粉变现', '职场影响力', '商业推广', '创业宣传'];
const STYLES: Style[] = ['犀利专业', '温暖陪伴', '幽默搞笑', '知识干货', '争议性观点'];

const OUTPUT_TABS: { key: OutputTab; label: string; icon: string }[] = [
  { key: 'positioning', label: '品牌定位', icon: '🎯' },
  { key: 'calendar', label: '90天日历', icon: '📅' },
  { key: 'articles', label: '首批文章', icon: '✍️' },
  { key: 'growth', label: '涨粉路径', icon: '📈' },
];

const GOAL_ICONS: Record<Goal, string> = {
  涨粉变现: '💰',
  职场影响力: '🏆',
  商业推广: '📣',
  创业宣传: '🚀',
};

const STYLE_ICONS: Record<Style, string> = {
  犀利专业: '⚡',
  温暖陪伴: '🤗',
  幽默搞笑: '😄',
  知识干货: '📚',
  争议性观点: '🔥',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseBrandResult(raw: string): BrandResult | null {
  try {
    const cleaned = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) return null;
    const parsed = JSON.parse(match[0]) as BrandResult;
    if (!parsed.positioning || !parsed.calendar || !parsed.articles || !parsed.growthPath) return null;
    return parsed;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function SkeletonBar({ w = 'w-full', h = 'h-4' }: { w?: string; h?: string }) {
  return (
    <div className={`${w} ${h} rounded-lg overflow-hidden relative bg-[#1e1e3a]`}>
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.4s_infinite] bg-gradient-to-r from-transparent via-white/5 to-transparent" />
    </div>
  );
}

function BrandSkeleton() {
  return (
    <div className="space-y-4 mt-6">
      <div className="card p-6 space-y-4">
        <SkeletonBar h="h-6" w="w-1/2" />
        <SkeletonBar h="h-4" />
        <SkeletonBar h="h-4" w="w-5/6" />
        <div className="flex gap-3 pt-2">
          <SkeletonBar h="h-8" w="w-1/3" />
          <SkeletonBar h="h-8" w="w-1/3" />
          <SkeletonBar h="h-8" w="w-1/3" />
        </div>
      </div>
      {[0, 1].map(i => (
        <div key={i} className="card p-5 space-y-3">
          <SkeletonBar h="h-4" w="w-2/5" />
          <SkeletonBar />
          <SkeletonBar w="w-4/5" />
          <SkeletonBar w="w-3/4" />
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Output Panels
// ---------------------------------------------------------------------------

function PositioningPanel({ data }: { data: Positioning }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-5"
    >
      {/* Statement */}
      <div className="card p-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 to-transparent pointer-events-none" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-purple-400 text-lg">✦</span>
            <span className="text-xs font-semibold text-purple-400 uppercase tracking-widest">品牌定位宣言</span>
          </div>
          <p className="text-xl font-bold text-white leading-relaxed">{data.statement}</p>
        </div>
      </div>

      {/* Differentiation */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg">💎</span>
          <span className="text-sm font-semibold text-slate-200">核心差异化</span>
        </div>
        <p className="text-sm text-slate-300 leading-relaxed border-l-2 border-purple-600/50 pl-4">
          {data.differentiation}
        </p>
      </div>

      {/* Pillars */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-lg">🏛️</span>
          <span className="text-sm font-semibold text-slate-200">三大品牌支柱</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {data.pillars.map((pillar, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1 }}
              className="bg-purple-900/20 border border-purple-700/30 rounded-xl p-4 text-center"
            >
              <div className="text-2xl mb-2">{'✦✧★'[i]}</div>
              <p className="text-sm text-slate-200 font-medium leading-snug">{pillar}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function CalendarPanel({ data }: { data: CalendarWeek[] }) {
  const [expandedWeek, setExpandedWeek] = useState<number | null>(1);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3"
    >
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-slate-500">共 {data.length} 周 · {data.reduce((acc, w) => acc + w.posts.length, 0)} 篇内容</p>
        <button
          onClick={() => setExpandedWeek(expandedWeek === null ? 1 : null)}
          className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
        >
          {expandedWeek === null ? '全部展开' : '全部折叠'}
        </button>
      </div>
      {data.map((week) => (
        <div key={week.week} className="card overflow-hidden">
          <button
            onClick={() => setExpandedWeek(expandedWeek === week.week ? null : week.week)}
            className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-purple-900/50 border border-purple-700/40 flex items-center justify-center text-xs font-bold text-purple-300 shrink-0">
                {week.week}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-200">第 {week.week} 周</p>
                <p className="text-xs text-purple-400">{week.theme}</p>
              </div>
            </div>
            <span className={`text-slate-500 transition-transform duration-200 ${expandedWeek === week.week ? 'rotate-180' : ''}`}>▾</span>
          </button>

          <AnimatePresence>
            {expandedWeek === week.week && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="px-4 pb-4 space-y-2 border-t border-[#1e1e3a] pt-3">
                  {week.posts.map((post, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 bg-[#1a1a2e] rounded-xl">
                      <div className="w-5 h-5 rounded-full bg-purple-800/50 flex items-center justify-center text-xs text-purple-300 shrink-0 mt-0.5 font-bold">
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-xs px-2 py-0.5 rounded-full bg-purple-900/50 text-purple-300 border border-purple-700/30">
                            {post.platform}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-[#2d2d50] text-slate-400 border border-[#3d3d60]">
                            {post.format}
                          </span>
                        </div>
                        <p className="text-sm text-slate-300 leading-snug">{post.idea}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </motion.div>
  );
}

function ArticlesPanel({ data }: { data: Article[] }) {
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [activeArticle, setActiveArticle] = useState(0);

  async function handleCopy(idx: number) {
    const a = data[idx];
    await navigator.clipboard.writeText(`${a.title}\n\n${a.content}`);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Tab selector */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {data.map((a, i) => (
          <button
            key={i}
            onClick={() => setActiveArticle(i)}
            className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${
              activeArticle === i
                ? 'bg-purple-600/20 border-purple-500/50 text-purple-300'
                : 'bg-[#1a1a2e] border-[#2d2d50] text-slate-500 hover:text-slate-300 hover:border-[#3d3d60]'
            }`}
          >
            文章 {i + 1}
          </button>
        ))}
      </div>

      {/* Article content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeArticle}
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          transition={{ duration: 0.15 }}
          className="card p-5"
        >
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <h3 className="text-base font-bold text-white leading-snug">
                {data[activeArticle].title}
              </h3>
              <span className="text-xs text-purple-400 mt-1 inline-block">
                {data[activeArticle].platform}
              </span>
            </div>
            <button
              onClick={() => handleCopy(activeArticle)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all shrink-0 ${
                copiedIdx === activeArticle
                  ? 'bg-green-500/20 border-green-500/40 text-green-300'
                  : 'bg-purple-900/20 border-purple-700/40 text-purple-300 hover:bg-purple-900/40'
              }`}
            >
              {copiedIdx === activeArticle ? '✓ 已复制' : '📋 复制'}
            </button>
          </div>
          <div className="bg-[#1a1a2e] rounded-xl p-4">
            <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
              {data[activeArticle].content}
            </p>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-xs text-slate-600">
              {data[activeArticle].content.length} 字符
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setActiveArticle(Math.max(0, activeArticle - 1))}
                disabled={activeArticle === 0}
                className="text-xs px-3 py-1.5 rounded-lg border border-[#2d2d50] text-slate-500 hover:text-slate-300 disabled:opacity-30 transition-all"
              >
                ← 上一篇
              </button>
              <button
                onClick={() => setActiveArticle(Math.min(data.length - 1, activeArticle + 1))}
                disabled={activeArticle === data.length - 1}
                className="text-xs px-3 py-1.5 rounded-lg border border-[#2d2d50] text-slate-500 hover:text-slate-300 disabled:opacity-30 transition-all"
              >
                下一篇 →
              </button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}

function GrowthPanel({ data }: { data: GrowthMonth[] }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {data.map((month, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.1 }}
          className="card p-5 relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 bottom-0 w-1 bg-gradient-to-b from-purple-600 to-purple-900" />
          <div className="pl-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-purple-300">{month.month}</span>
              <span className="text-xs px-2.5 py-1 rounded-full bg-purple-900/40 border border-purple-700/30 text-purple-300 font-medium">
                目标：{month.target}
              </span>
            </div>
            <p className="text-sm font-semibold text-slate-200 mb-3">{month.focus}</p>
            <div className="space-y-2">
              {month.actions.map((action, j) => (
                <div key={j} className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-purple-900/50 border border-purple-700/30 flex items-center justify-center text-xs text-purple-400 shrink-0 mt-0.5">
                    {j + 1}
                  </div>
                  <p className="text-sm text-slate-400 leading-snug">{action}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function BrandPage() {
  const [name, setName] = useState('');
  const [expertise, setExpertise] = useState('');
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [goal, setGoal] = useState<Goal>('涨粉变现');
  const [audience, setAudience] = useState('');
  const [style, setStyle] = useState<Style>('知识干货');
  const [samples, setSamples] = useState('');

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BrandResult | null>(null);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<OutputTab>('positioning');

  const resultsRef = useRef<HTMLDivElement>(null);

  const togglePlatform = (p: Platform) => {
    setPlatforms(prev =>
      prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]
    );
  };

  const canGenerate = name.trim().length > 0 && expertise.trim().length > 10 && samples.trim().length > 20;

  async function handleGenerate() {
    if (!canGenerate) return;
    setLoading(true);
    setResult(null);
    setError('');

    const systemPrompt = `你是世界顶级的个人品牌策略师，擅长帮助普通人打造有辨识度的个人IP。
你的任务是根据用户提供的信息，制定完整的个人品牌打造方案。
严格输出JSON格式，不要有任何多余文字或代码块标记。`;

    const userPrompt = `请为以下用户制定个人IP打造方案：

姓名/昵称：${name}
专业背景：${expertise}
现有平台：${platforms.length > 0 ? platforms.join('、') : '尚未开始'}
目标：${goal}
目标受众：${audience || '未指定'}
内容风格：${style}

用户的真实表达样本（从这里学习他的说话风格）：
${samples}

请按以下JSON格式输出完整方案：
{
  "positioning": {
    "statement": "一句话定位宣言（有力量感，能让人记住，20字以内）",
    "differentiation": "核心差异化描述（100字以内，说清楚为什么只有你能提供这个价值）",
    "pillars": ["支柱1（8字以内）", "支柱2（8字以内）", "支柱3（8字以内）"]
  },
  "calendar": [
    {
      "week": 1,
      "theme": "本周主题",
      "posts": [
        {"platform": "平台名", "format": "内容形式", "idea": "具体内容创意（30字以内）"},
        {"platform": "平台名", "format": "内容形式", "idea": "具体内容创意（30字以内）"},
        {"platform": "平台名", "format": "内容形式", "idea": "具体内容创意（30字以内）"}
      ]
    }
  ],
  "articles": [
    {
      "title": "文章标题",
      "content": "完整正文（300-400字，完全模仿用户的说话风格和语气）",
      "platform": "适合发布的平台"
    }
  ],
  "growthPath": [
    {
      "month": "第1个月",
      "focus": "本月核心聚焦",
      "actions": ["具体行动1", "具体行动2", "具体行动3", "具体行动4"],
      "target": "量化目标"
    }
  ]
}

要求：
- calendar 必须包含12周，每周3篇内容
- articles 必须包含5篇完整文章，内容风格要完全模仿用户的表达样本
- growthPath 必须包含3个月的路径
- 所有内容必须高度个性化，不能泛泛而谈
- 只输出JSON，不要有其他文字`;

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system: systemPrompt,
          messages: [{ role: 'user', content: userPrompt }],
          maxTokens: 8000,
        }),
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const parsed = parseBrandResult(data.text);
      if (!parsed) {
        setError('AI返回格式异常，请重试。原始内容：' + data.text.slice(0, 200));
      } else {
        setResult(parsed);
        setActiveTab('positioning');
        setTimeout(() => {
          resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '请求失败，请检查网络或API配置。');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ToolLayout
      title="⭐ 个人IP打造器"
      subtitle="输入你的背景与风格，AI为你生成完整的个人品牌战略、90天内容日历和首批文章"
    >
      {/* ── Input Form ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left column */}
        <div className="space-y-4">
          {/* Name */}
          <div className="card p-5">
            <label className="block text-sm font-semibold text-slate-200 mb-2">
              ✨ 你的名字 / 昵称
            </label>
            <input
              type="text"
              className="input"
              placeholder="例如：产品人老王、设计师小林..."
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>

          {/* Expertise */}
          <div className="card p-5">
            <label className="block text-sm font-semibold text-slate-200 mb-2">
              🧠 你的专业背景 / 深度认知领域
            </label>
            <textarea
              className="textarea min-h-[100px] text-sm"
              placeholder="例如：做了8年B端产品，主导过3个从0到1的项目，擅长用户研究和需求拆解，踩过很多坑..."
              value={expertise}
              onChange={e => setExpertise(e.target.value)}
            />
          </div>

          {/* Platforms */}
          <div className="card p-5">
            <label className="block text-sm font-semibold text-slate-200 mb-3">
              📱 你现在在哪里发内容（可多选）
            </label>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map(p => (
                <button
                  key={p}
                  onClick={() => togglePlatform(p)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
                    platforms.includes(p)
                      ? 'bg-purple-600/20 border-purple-500/50 text-purple-300'
                      : 'bg-[#1a1a2e] border-[#2d2d50] text-slate-400 hover:border-[#3d3d60] hover:text-slate-300'
                  }`}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => setPlatforms([])}
                className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
                  platforms.length === 0
                    ? 'bg-purple-600/20 border-purple-500/50 text-purple-300'
                    : 'bg-[#1a1a2e] border-[#2d2d50] text-slate-400 hover:border-[#3d3d60] hover:text-slate-300'
                }`}
              >
                还没开始
              </button>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Goal */}
          <div className="card p-5">
            <label className="block text-sm font-semibold text-slate-200 mb-3">
              🎯 你的核心目标
            </label>
            <div className="grid grid-cols-2 gap-2">
              {GOALS.map(g => (
                <button
                  key={g}
                  onClick={() => setGoal(g)}
                  className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium border transition-all ${
                    goal === g
                      ? 'bg-purple-600/20 border-purple-500/50 text-purple-300'
                      : 'bg-[#1a1a2e] border-[#2d2d50] text-slate-400 hover:border-[#3d3d60] hover:text-slate-300'
                  }`}
                >
                  <span>{GOAL_ICONS[g]}</span>
                  <span>{g}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Audience */}
          <div className="card p-5">
            <label className="block text-sm font-semibold text-slate-200 mb-2">
              👥 你想影响谁（目标受众）
            </label>
            <input
              type="text"
              className="input"
              placeholder="例如：3-8年工龄的互联网产品经理..."
              value={audience}
              onChange={e => setAudience(e.target.value)}
            />
          </div>

          {/* Style */}
          <div className="card p-5">
            <label className="block text-sm font-semibold text-slate-200 mb-3">
              🎨 你的内容风格
            </label>
            <div className="flex flex-wrap gap-2">
              {STYLES.map(s => (
                <button
                  key={s}
                  onClick={() => setStyle(s)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border transition-all ${
                    style === s
                      ? 'bg-purple-600/20 border-purple-500/50 text-purple-300'
                      : 'bg-[#1a1a2e] border-[#2d2d50] text-slate-400 hover:border-[#3d3d60] hover:text-slate-300'
                  }`}
                >
                  <span>{STYLE_ICONS[s]}</span>
                  <span>{s}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Sample sentences - full width */}
      <div className="mt-4 card p-5">
        <label className="block text-sm font-semibold text-slate-200 mb-1">
          💬 用你自己的话说3件你想分享的事
        </label>
        <p className="text-xs text-slate-500 mb-3">
          AI会从这里学习你的说话方式，让生成的文章听起来像你本人写的
        </p>
        <textarea
          className="textarea min-h-[140px] text-sm leading-relaxed"
          placeholder={`用你最自然的方式写，别刻意文艺或正式，就是平时说话的感觉：

1. 上周开会被老板在全员面前质疑，当场懵了，后来复盘发现...
2. 我花了3年才搞明白B端产品和C端产品的本质区别，就是...
3. 最近一个用户发消息说我的文章救了她，但其实我当时写那篇...`}
          value={samples}
          onChange={e => setSamples(e.target.value)}
        />
        <p className="text-xs text-slate-600 mt-2">{samples.length} 字符</p>
      </div>

      {/* Generate button */}
      <div className="mt-5 flex justify-center">
        <button
          className="btn-primary px-12 py-3.5 text-base relative overflow-hidden group"
          disabled={!canGenerate || loading}
          onClick={handleGenerate}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-pink-500/20 opacity-0 group-hover:opacity-100 transition-opacity" />
          {loading ? (
            <span className="flex items-center gap-2 relative">
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              AI正在打造你的个人IP...
            </span>
          ) : (
            <span className="relative">✦ 生成我的个人IP方案</span>
          )}
        </button>
      </div>

      {!canGenerate && !loading && (name.length > 0 || expertise.length > 0) && (
        <p className="text-xs text-center text-slate-600 mt-2">
          请填写姓名、专业背景（10字以上）和分享样本（20字以上）后生成
        </p>
      )}

      {/* Loading skeleton */}
      <AnimatePresence>
        {loading && (
          <motion.div
            key="skeleton"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <BrandSkeleton />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error */}
      <AnimatePresence>
        {error && !loading && (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-6 card p-4 border-red-800/40 bg-red-950/20"
          >
            <p className="text-sm text-red-400 font-medium mb-1">⚠️ 生成失败</p>
            <p className="text-xs text-slate-500 break-all">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results */}
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
            {/* Tab navigation */}
            <div className="flex gap-1 p-1 bg-[#13131f] border border-[#1e1e3a] rounded-2xl mb-5 overflow-x-auto scrollbar-hide">
              {OUTPUT_TABS.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex-1 min-w-[100px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    activeTab === tab.key
                      ? 'bg-purple-600/30 text-purple-300 border border-purple-600/40'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Tab content */}
            <AnimatePresence mode="wait">
              {activeTab === 'positioning' && (
                <PositioningPanel key="positioning" data={result.positioning} />
              )}
              {activeTab === 'calendar' && (
                <CalendarPanel key="calendar" data={result.calendar} />
              )}
              {activeTab === 'articles' && (
                <ArticlesPanel key="articles" data={result.articles} />
              )}
              {activeTab === 'growth' && (
                <GrowthPanel key="growth" data={result.growthPath} />
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty state */}
      {!result && !loading && !error && (
        <div className="mt-14 flex flex-col items-center gap-4 text-center text-slate-600">
          <div className="flex items-center gap-2 text-4xl opacity-20">
            <span>✦</span>
            <span>✧</span>
            <span>★</span>
            <span>✧</span>
            <span>✦</span>
          </div>
          <p className="text-sm max-w-sm leading-relaxed">
            填写你的背景和风格，AI会帮你打造有辨识度的个人品牌
          </p>
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
