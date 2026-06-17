'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ToolLayout } from '@/components/Layout/ToolLayout';

// ─── Types ───────────────────────────────────────────────────────────────────

type Tone = '专业' | '活泼' | '感性' | '幽默' | '干货';
type Audience = '年轻人' | '职场人' | '创业者' | '学生' | '宝妈';

type PlatformKey = 'xiaohongshu' | 'douyin' | 'wechat' | 'weibo' | 'linkedin';

interface XiaohongshuContent {
  title: string;
  body: string;
  tags: string[];
}

interface DouyinContent {
  hook: string;
  body: string;
  cta: string;
}

interface WechatContent {
  titles: string[];
  summary: string;
  body: string;
}

interface WeiboContent {
  text: string;
  topics: string[];
  interaction: string;
}

interface LinkedInContent {
  post: string;
  hashtags: string[];
}

interface AllContent {
  xiaohongshu: XiaohongshuContent;
  douyin: DouyinContent;
  wechat: WechatContent;
  weibo: WeiboContent;
  linkedin: LinkedInContent;
}

type HookType = '好奇心' | '恐惧' | '渴望' | '社会认同' | '权威';

interface PlatformAnalysis {
  hook: HookType;
  reasons: string[];
  improvement: string;
}

interface ViralData {
  xiaohongshu: number;
  douyin: number;
  wechat: number;
  weibo: number;
  linkedin: number;
  analysis: {
    xiaohongshu: PlatformAnalysis;
    douyin: PlatformAnalysis;
    wechat: PlatformAnalysis;
    weibo: PlatformAnalysis;
    linkedin: PlatformAnalysis;
  };
}

// ─── Platform config ──────────────────────────────────────────────────────────

const PLATFORMS: {
  key: PlatformKey;
  label: string;
  icon: string;
  accent: string;
  accentBg: string;
  accentBorder: string;
  accentText: string;
}[] = [
  {
    key: 'xiaohongshu',
    label: '小红书',
    icon: '📕',
    accent: 'from-rose-500 to-pink-600',
    accentBg: 'bg-rose-500/10',
    accentBorder: 'border-rose-500/30',
    accentText: 'text-rose-400',
  },
  {
    key: 'douyin',
    label: '抖音文案',
    icon: '🎵',
    accent: 'from-slate-900 to-slate-700',
    accentBg: 'bg-cyan-500/10',
    accentBorder: 'border-cyan-500/30',
    accentText: 'text-cyan-400',
  },
  {
    key: 'wechat',
    label: '公众号',
    icon: '📱',
    accent: 'from-green-600 to-emerald-700',
    accentBg: 'bg-green-500/10',
    accentBorder: 'border-green-500/30',
    accentText: 'text-green-400',
  },
  {
    key: 'weibo',
    label: '微博',
    icon: '🐦',
    accent: 'from-orange-500 to-amber-600',
    accentBg: 'bg-orange-500/10',
    accentBorder: 'border-orange-500/30',
    accentText: 'text-orange-400',
  },
  {
    key: 'linkedin',
    label: 'LinkedIn',
    icon: '💼',
    accent: 'from-blue-600 to-sky-700',
    accentBg: 'bg-blue-500/10',
    accentBorder: 'border-blue-500/30',
    accentText: 'text-blue-400',
  },
];

// ─── Tone & Audience ─────────────────────────────────────────────────────────

const TONES: Tone[] = ['专业', '活泼', '感性', '幽默', '干货'];
const AUDIENCES: Audience[] = ['年轻人', '职场人', '创业者', '学生', '宝妈'];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function countChars(text: string): number {
  return text.replace(/\s/g, '').length;
}

function platformText(key: PlatformKey, content: AllContent): string {
  switch (key) {
    case 'xiaohongshu': {
      const c = content.xiaohongshu;
      return `${c.title}\n\n${c.body}\n\n${c.tags.map((t) => `#${t}`).join(' ')}`;
    }
    case 'douyin': {
      const c = content.douyin;
      return `【前3秒钩子】\n${c.hook}\n\n【正文】\n${c.body}\n\n【行动号召】\n${c.cta}`;
    }
    case 'wechat': {
      const c = content.wechat;
      return `【备选标题】\n${c.titles.map((t, i) => `${i + 1}. ${t}`).join('\n')}\n\n【摘要】\n${c.summary}\n\n【正文】\n${c.body}`;
    }
    case 'weibo': {
      const c = content.weibo;
      return `${c.text}\n\n${c.topics.map((t) => `#${t}#`).join(' ')}\n\n${c.interaction}`;
    }
    case 'linkedin': {
      const c = content.linkedin;
      return `${c.post}\n\n${c.hashtags.map((h) => `#${h}`).join(' ')}`;
    }
  }
}

function viralScoreColor(score: number): string {
  if (score >= 70) return 'text-green-400';
  if (score >= 40) return 'text-yellow-400';
  return 'text-red-400';
}

function viralScoreBg(score: number): string {
  if (score >= 70) return 'bg-green-500/10 border-green-500/30';
  if (score >= 40) return 'bg-yellow-500/10 border-yellow-500/30';
  return 'bg-red-500/10 border-red-500/30';
}

function viralLabel(score: number): string {
  if (score >= 70) return '爆款潜力高';
  if (score >= 40) return '中等潜力';
  return '需要优化';
}

const HOOK_COLORS: Record<HookType, string> = {
  好奇心: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
  恐惧: 'bg-red-500/15 text-red-300 border-red-500/30',
  渴望: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
  社会认同: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  权威: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
};

// ─── Shimmer skeleton ─────────────────────────────────────────────────────────

function ShimmerLine({ w = 'w-full', h = 'h-4' }: { w?: string; h?: string }) {
  return (
    <div
      className={`${w} ${h} rounded bg-gradient-to-r from-white/5 via-white/10 to-white/5 bg-[length:400%_100%] animate-shimmer`}
    />
  );
}

function PlatformSkeleton() {
  return (
    <div className="space-y-3 p-4">
      <ShimmerLine w="w-3/4" h="h-5" />
      <ShimmerLine />
      <ShimmerLine />
      <ShimmerLine w="w-5/6" />
      <ShimmerLine w="w-2/3" />
      <div className="pt-2 space-y-2">
        <ShimmerLine w="w-1/2" h="h-3" />
        <ShimmerLine w="w-1/3" h="h-3" />
      </div>
    </div>
  );
}

// ─── Viral Score Badge ────────────────────────────────────────────────────────

function ViralScoreBadge({ score, loading }: { score?: number; loading?: boolean }) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 animate-pulse">
        <span className="text-xs text-slate-400">病毒指数计算中...</span>
      </div>
    );
  }
  if (score === undefined) return null;
  const colorClass = viralScoreColor(score);
  const bgClass = viralScoreBg(score);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${bgClass}`}
    >
      <span className="text-xs font-medium text-slate-400">病毒指数</span>
      <span className={`text-sm font-black ${colorClass}`}>{score}</span>
      <span className="text-xs font-medium text-slate-500">/100</span>
      <span className={`text-xs ${colorClass}`}>· {viralLabel(score)}</span>
    </motion.div>
  );
}

// ─── Viral Analysis Panel ─────────────────────────────────────────────────────

function ViralAnalysisPanel({
  analysis,
  loading,
}: {
  analysis?: PlatformAnalysis;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <div className="mt-4 rounded-xl border border-pink-500/20 bg-pink-500/5 p-4 space-y-2">
        <ShimmerLine w="w-1/3" h="h-3" />
        <ShimmerLine w="w-2/3" />
        <ShimmerLine w="w-3/4" />
      </div>
    );
  }
  if (!analysis) return null;

  const hookClass = HOOK_COLORS[analysis.hook] ?? 'bg-slate-500/15 text-slate-300 border-slate-500/30';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-4 rounded-xl border border-pink-500/20 bg-pink-500/5 p-4 space-y-3"
    >
      <p className="text-xs font-semibold text-pink-400 uppercase tracking-wider">爆款元素分析</p>
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-400">钩子技巧：</span>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${hookClass}`}>
          {analysis.hook}
        </span>
      </div>
      <div>
        <p className="text-xs text-slate-400 mb-1.5">传播优势：</p>
        <ul className="space-y-1">
          {analysis.reasons.map((r, i) => (
            <li key={i} className="flex items-start gap-1.5 text-xs text-slate-300">
              <span className="text-pink-400 mt-0.5 flex-shrink-0">▸</span>
              {r}
            </li>
          ))}
        </ul>
      </div>
      <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-2">
        <p className="text-xs text-amber-400 font-medium mb-0.5">优化建议</p>
        <p className="text-xs text-slate-300 leading-relaxed">{analysis.improvement}</p>
      </div>
    </motion.div>
  );
}

// ─── Platform content renderers ───────────────────────────────────────────────

function XiaohongshuCard({ data }: { data: XiaohongshuContent }) {
  return (
    <div className="space-y-3">
      <h3 className="text-rose-300 font-bold text-lg leading-snug">{data.title}</h3>
      <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">{data.body}</p>
      <div className="flex flex-wrap gap-2 pt-1">
        {data.tags.map((tag) => (
          <span
            key={tag}
            className="text-xs bg-rose-500/15 text-rose-300 border border-rose-500/25 rounded-full px-2.5 py-0.5"
          >
            #{tag}
          </span>
        ))}
      </div>
    </div>
  );
}

function DouyinCard({ data }: { data: DouyinContent }) {
  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-cyan-500/10 border border-cyan-500/25 p-3">
        <div className="text-xs font-semibold text-cyan-400 mb-1.5 uppercase tracking-wider">
          ⚡ 前3秒钩子
        </div>
        <p className="text-slate-200 text-sm leading-relaxed font-medium">{data.hook}</p>
      </div>
      <div>
        <div className="text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">正文</div>
        <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">{data.body}</p>
      </div>
      <div className="rounded-lg bg-cyan-900/20 border border-cyan-700/30 p-3">
        <div className="text-xs font-semibold text-cyan-400 mb-1.5 uppercase tracking-wider">
          🎯 Call to Action
        </div>
        <p className="text-slate-200 text-sm leading-relaxed">{data.cta}</p>
      </div>
    </div>
  );
}

function WechatCard({ data }: { data: WechatContent }) {
  return (
    <div className="space-y-4">
      <div>
        <div className="text-xs font-semibold text-green-400 mb-2 uppercase tracking-wider">
          📝 备选标题（5个）
        </div>
        <ol className="space-y-1.5">
          {data.titles.map((title, i) => (
            <li key={i} className="text-sm text-slate-300 flex gap-2">
              <span className="text-green-500 font-bold shrink-0">{i + 1}.</span>
              <span>{title}</span>
            </li>
          ))}
        </ol>
      </div>
      <div className="rounded-lg bg-green-500/10 border border-green-500/25 p-3">
        <div className="text-xs font-semibold text-green-400 mb-1.5 uppercase tracking-wider">摘要</div>
        <p className="text-slate-300 text-sm leading-relaxed">{data.summary}</p>
      </div>
      <div>
        <div className="text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">正文</div>
        <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">{data.body}</p>
      </div>
    </div>
  );
}

function WeiboCard({ data }: { data: WeiboContent }) {
  const charCount = data.text.replace(/\s/g, '').length;
  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <p className="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap flex-1">{data.text}</p>
        <span
          className={`shrink-0 text-xs font-mono px-2 py-0.5 rounded-full border ${
            charCount > 140
              ? 'text-red-400 bg-red-500/10 border-red-500/30'
              : 'text-orange-400 bg-orange-500/10 border-orange-500/30'
          }`}
        >
          {charCount}/140
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {data.topics.map((t) => (
          <span
            key={t}
            className="text-xs bg-orange-500/15 text-orange-300 border border-orange-500/25 rounded-full px-2.5 py-0.5"
          >
            #{t}#
          </span>
        ))}
      </div>
      <div className="rounded-lg bg-orange-900/20 border border-orange-700/30 p-3">
        <div className="text-xs font-semibold text-orange-400 mb-1 uppercase tracking-wider">互动引导</div>
        <p className="text-slate-300 text-sm">{data.interaction}</p>
      </div>
    </div>
  );
}

function LinkedInCard({ data }: { data: LinkedInContent }) {
  return (
    <div className="space-y-3">
      <p className="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">{data.post}</p>
      <div className="flex flex-wrap gap-2 pt-1">
        {data.hashtags.map((h) => (
          <span
            key={h}
            className="text-xs bg-blue-500/15 text-blue-300 border border-blue-500/25 rounded-full px-2.5 py-0.5"
          >
            #{h}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Trend Inject Modal ───────────────────────────────────────────────────────

interface TrendModalProps {
  platform: PlatformKey;
  onConfirm: (trends: string[]) => void;
  onClose: () => void;
  loading: boolean;
}

function TrendModal({ platform, onConfirm, onClose, loading }: TrendModalProps) {
  const [inputs, setInputs] = useState(['', '', '']);
  const platformLabel = PLATFORMS.find((p) => p.key === platform)?.label ?? platform;

  const handleConfirm = () => {
    const trends = inputs.map((s) => s.trim()).filter(Boolean);
    if (!trends.length) return;
    onConfirm(trends);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="w-full max-w-md rounded-2xl border border-pink-500/30 bg-[#0d0d18] p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <h3 className="text-base font-bold text-white">趋势注入 · {platformLabel}</h3>
          <p className="text-xs text-slate-400 mt-1">输入1-3个当前热门话题，AI将重新生成融入这些趋势的内容</p>
        </div>
        {inputs.map((val, i) => (
          <input
            key={i}
            value={val}
            onChange={(e) => {
              const next = [...inputs];
              next[i] = e.target.value;
              setInputs(next);
            }}
            placeholder={`热门话题 ${i + 1}（选填）`}
            className="w-full rounded-lg bg-[#13131f] border border-[#1e1e3a] text-slate-200 text-sm placeholder-slate-600 px-3 py-2 focus:outline-none focus:border-pink-500/50 focus:ring-1 focus:ring-pink-500/20 transition-all"
          />
        ))}
        <div className="flex gap-3 pt-1">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium border border-white/10 text-slate-400 hover:border-white/25 hover:text-slate-200 transition-all"
          >
            取消
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading || inputs.every((s) => !s.trim())}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-pink-600 to-rose-500 hover:from-pink-500 hover:to-rose-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            {loading ? '生成中...' : '注入趋势'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ContentPage() {
  const [topic, setTopic] = useState('');
  const [tone, setTone] = useState<Tone>('活泼');
  const [audience, setAudience] = useState<Audience>('年轻人');
  const [activeTab, setActiveTab] = useState<PlatformKey>('xiaohongshu');
  const [content, setContent] = useState<AllContent | null>(null);
  const [loading, setLoading] = useState(false);
  const [regenLoading, setRegenLoading] = useState<PlatformKey | null>(null);
  const [copied, setCopied] = useState<PlatformKey | null>(null);
  const [error, setError] = useState('');

  // New state for viral features
  const [viralData, setViralData] = useState<ViralData | null>(null);
  const [viralLoading, setViralLoading] = useState(false);
  const [showTrendModal, setShowTrendModal] = useState(false);
  const [trendLoading, setTrendLoading] = useState(false);

  const buildSystemPrompt = () => `你是一位资深跨平台内容运营专家，精通小红书、抖音、微信公众号、微博和LinkedIn各平台的内容创作规律。
你需要根据用户提供的核心话题，生成适配各平台调性的高质量内容。
严格按照指定的JSON格式输出，不要有任何多余文字。`;

  const buildUserPrompt = (topicText: string, toneVal: Tone, audienceVal: Audience, platform?: PlatformKey, trends?: string[]) => {
    const scope = platform ? `只生成${platform}平台的内容` : '同时生成所有5个平台的内容';
    const trendNote = trends && trends.length > 0
      ? `\n\n【趋势注入】请将以下热门趋势融入内容：${trends.join('、')}`
      : '';
    return `核心话题：${topicText}
语气风格：${toneVal}
目标受众：${audienceVal}
${scope}${trendNote}

请严格按以下JSON结构输出（${platform ? '只输出对应平台的key，其余平台保持空结构' : '所有平台都要填写'}）：

{
  "xiaohongshu": {
    "title": "吸引眼球的标题（含emoji，30字以内）",
    "body": "正文内容（多用emoji，自然段落，500字以内）",
    "tags": ["标签1", "标签2", "标签3", "标签4", "标签5"]
  },
  "douyin": {
    "hook": "前3秒钩子文案（15字以内，必须抓眼球）",
    "body": "正文文案（口语化，200字以内）",
    "cta": "行动号召文案（20字以内）"
  },
  "wechat": {
    "titles": ["标题1", "标题2", "标题3", "标题4", "标题5"],
    "summary": "文章摘要（80字以内）",
    "body": "正文（专业深度，分段落，600字以内）"
  },
  "weibo": {
    "text": "微博正文（严格140字以内，含话题感）",
    "topics": ["话题1", "话题2", "话题3"],
    "interaction": "@互动引导语（30字以内）"
  },
  "linkedin": {
    "post": "English professional post (200 words max, storytelling structure)",
    "hashtags": ["hashtag1", "hashtag2", "hashtag3", "hashtag4", "hashtag5"]
  }
}

只输出JSON，不要有\`\`\`json标记或其他文字。`;
  };

  const buildViralPrompt = (topicText: string, toneVal: Tone, audienceVal: Audience, contentData: AllContent) => {
    return `分析以下为话题"${topicText}"（语气：${toneVal}，受众：${audienceVal}）生成的5平台内容的病毒传播潜力。

内容摘要：
小红书标题：${contentData.xiaohongshu.title}
抖音钩子：${contentData.douyin.hook}
公众号标题1：${contentData.wechat.titles[0]}
微博：${contentData.weibo.text.slice(0, 50)}
LinkedIn：${contentData.linkedin.post.slice(0, 80)}

请评估各平台内容的病毒传播指数（0-100），并分析爆款基因。严格输出以下JSON：

{
  "xiaohongshu": 数字,
  "douyin": 数字,
  "wechat": 数字,
  "weibo": 数字,
  "linkedin": 数字,
  "analysis": {
    "xiaohongshu": {"hook": "好奇心|恐惧|渴望|社会认同|权威", "reasons": ["原因1", "原因2"], "improvement": "一句话建议"},
    "douyin": {"hook": "好奇心|恐惧|渴望|社会认同|权威", "reasons": ["原因1", "原因2"], "improvement": "一句话建议"},
    "wechat": {"hook": "好奇心|恐惧|渴望|社会认同|权威", "reasons": ["原因1", "原因2"], "improvement": "一句话建议"},
    "weibo": {"hook": "好奇心|恐惧|渴望|社会认同|权威", "reasons": ["原因1", "原因2"], "improvement": "一句话建议"},
    "linkedin": {"hook": "好奇心|恐惧|渴望|社会认同|权威", "reasons": ["原因1", "原因2"], "improvement": "一句话建议"}
  }
}

只输出JSON。`;
  };

  const parseContent = (text: string): AllContent | null => {
    try {
      const cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
      return JSON.parse(cleaned) as AllContent;
    } catch {
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          return JSON.parse(match[0]) as AllContent;
        } catch {
          return null;
        }
      }
      return null;
    }
  };

  const parseViralData = (text: string): ViralData | null => {
    try {
      const cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
      return JSON.parse(cleaned) as ViralData;
    } catch {
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          return JSON.parse(match[0]) as ViralData;
        } catch {
          return null;
        }
      }
      return null;
    }
  };

  const fetchViralData = async (topicText: string, toneVal: Tone, audienceVal: Audience, contentData: AllContent) => {
    setViralLoading(true);
    setViralData(null);
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system: '你是一位内容传播学专家，专精病毒式内容分析。严格按JSON格式输出，不含额外文字。',
          messages: [{ role: 'user', content: buildViralPrompt(topicText, toneVal, audienceVal, contentData) }],
          maxTokens: 1500,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const parsed = parseViralData(data.text);
      if (parsed) setViralData(parsed);
    } catch {
      // Silent fail - viral data is secondary
    } finally {
      setViralLoading(false);
    }
  };

  const handleGenerate = useCallback(async () => {
    if (!topic.trim()) {
      setError('请输入核心话题或观点');
      return;
    }
    setError('');
    setLoading(true);
    setContent(null);
    setViralData(null);
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system: buildSystemPrompt(),
          messages: [{ role: 'user', content: buildUserPrompt(topic, tone, audience) }],
          maxTokens: 3500,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const parsed = parseContent(data.text);
      if (!parsed) throw new Error('AI返回格式异常，请重试');
      setContent(parsed);
      // Kick off viral analysis second call
      fetchViralData(topic, tone, audience, parsed);
    } catch (e) {
      setError(e instanceof Error ? e.message : '生成失败，请重试');
    } finally {
      setLoading(false);
    }
  }, [topic, tone, audience]);

  const handleRegen = useCallback(
    async (platform: PlatformKey) => {
      if (!topic.trim() || !content) return;
      setRegenLoading(platform);
      try {
        const res = await fetch('/api/ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system: buildSystemPrompt(),
            messages: [{ role: 'user', content: buildUserPrompt(topic, tone, audience, platform) }],
            maxTokens: 1200,
          }),
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        const parsed = parseContent(data.text);
        if (!parsed) throw new Error('解析失败');
        setContent((prev) => {
          if (!prev) return prev;
          return { ...prev, [platform]: parsed[platform] };
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : '重新生成失败');
      } finally {
        setRegenLoading(null);
      }
    },
    [topic, tone, audience, content]
  );

  const handleTrendInject = useCallback(
    async (trends: string[]) => {
      if (!topic.trim() || !content) return;
      setTrendLoading(true);
      try {
        const res = await fetch('/api/ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system: buildSystemPrompt(),
            messages: [{ role: 'user', content: buildUserPrompt(topic, tone, audience, activeTab, trends) }],
            maxTokens: 1200,
          }),
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        const parsed = parseContent(data.text);
        if (!parsed) throw new Error('解析失败');
        setContent((prev) => {
          if (!prev) return prev;
          return { ...prev, [activeTab]: parsed[activeTab] };
        });
        setShowTrendModal(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : '趋势注入失败');
      } finally {
        setTrendLoading(false);
      }
    },
    [topic, tone, audience, activeTab, content]
  );

  const handleCopy = useCallback(
    async (platform: PlatformKey) => {
      if (!content) return;
      const text = platformText(platform, content);
      await navigator.clipboard.writeText(text);
      setCopied(platform);
      setTimeout(() => setCopied(null), 2000);
    },
    [content]
  );

  const activePlatform = PLATFORMS.find((p) => p.key === activeTab)!;
  const currentText = content ? platformText(activeTab, content) : '';
  const charCount = countChars(currentText);
  const currentViralScore = viralData ? viralData[activeTab] : undefined;
  const currentAnalysis = viralData ? viralData.analysis[activeTab] : undefined;

  return (
    <ToolLayout
      title="🧬 爆款基因解码器"
      subtitle="解码病毒传播基因，一键生成五大平台爆款内容，附赠传播指数分析"
    >
      <div className="grid lg:grid-cols-[1fr_1.4fr] gap-6">
        {/* ── Left: Input panel ── */}
        <div className="space-y-4">
          <div className="rounded-xl border border-[#1e1e3a] bg-[#0d0d18] p-5 space-y-5">
            {/* Topic */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                💡 话题 / 核心观点
              </label>
              <textarea
                rows={4}
                className="w-full rounded-lg bg-[#13131f] border border-[#1e1e3a] text-slate-200 text-sm placeholder-slate-600 p-3 resize-none focus:outline-none focus:border-pink-500/50 focus:ring-1 focus:ring-pink-500/20 transition-all"
                placeholder="例如：30岁转行做产品经理的真实经历……"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
              />
            </div>

            {/* Tone */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">🎨 语气风格</label>
              <div className="flex flex-wrap gap-2">
                {TONES.map((t) => (
                  <button
                    key={t}
                    onClick={() => setTone(t)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                      tone === t
                        ? 'bg-pink-500/20 border-pink-500/50 text-pink-300'
                        : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/25 hover:text-slate-300'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Audience */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">👥 目标受众</label>
              <div className="flex flex-wrap gap-2">
                {AUDIENCES.map((a) => (
                  <button
                    key={a}
                    onClick={() => setAudience(a)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                      audience === a
                        ? 'bg-purple-500/20 border-purple-500/50 text-purple-300'
                        : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/25 hover:text-slate-300'
                    }`}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>

            {/* Generate button */}
            <button
              onClick={handleGenerate}
              disabled={loading || !topic.trim()}
              className="w-full py-3 rounded-xl font-bold text-white bg-gradient-to-r from-pink-600 to-rose-500 hover:from-pink-500 hover:to-rose-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-pink-900/30 active:scale-[0.98]"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  AI 生成中…
                </span>
              ) : (
                '⚡ 一键解码爆款基因'
              )}
            </button>

            {error && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2"
              >
                {error}
              </motion.p>
            )}
          </div>

          {/* Platform summary badges */}
          {content && !loading && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-[#1e1e3a] bg-[#0d0d18] p-4"
            >
              <p className="text-xs text-slate-500 mb-3 font-medium uppercase tracking-wider">平台概览</p>
              <div className="space-y-2">
                {PLATFORMS.map((p) => {
                  const txt = platformText(p.key, content);
                  const cnt = countChars(txt);
                  const score = viralData ? viralData[p.key] : undefined;
                  return (
                    <button
                      key={p.key}
                      onClick={() => setActiveTab(p.key)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all ${
                        activeTab === p.key ? `${p.accentBg} ${p.accentBorder} border` : 'hover:bg-white/5 border border-transparent'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span>{p.icon}</span>
                        <span className={activeTab === p.key ? p.accentText : 'text-slate-400'}>{p.label}</span>
                      </span>
                      <span className="flex items-center gap-2">
                        {score !== undefined && !viralLoading && (
                          <span className={`text-xs font-bold ${viralScoreColor(score)}`}>
                            {score}分
                          </span>
                        )}
                        {viralLoading && (
                          <span className="text-xs text-slate-600 animate-pulse">...</span>
                        )}
                        <span className={`text-xs font-mono px-2 py-0.5 rounded-full ${p.accentBg} ${p.accentText}`}>
                          {cnt} 字
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </div>

        {/* ── Right: Output panel ── */}
        <div className="rounded-xl border border-[#1e1e3a] bg-[#0d0d18] flex flex-col min-h-[520px]">
          {/* Tab bar */}
          <div className="flex border-b border-[#1e1e3a] overflow-x-auto scrollbar-hide">
            {PLATFORMS.map((p) => (
              <button
                key={p.key}
                onClick={() => setActiveTab(p.key)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
                  activeTab === p.key
                    ? `${p.accentText} border-current`
                    : 'text-slate-500 border-transparent hover:text-slate-300 hover:border-slate-600'
                }`}
              >
                <span>{p.icon}</span>
                <span className="hidden sm:block">{p.label}</span>
              </button>
            ))}
          </div>

          {/* Content area */}
          <div className="flex-1 p-5 overflow-y-auto">
            {/* Empty state */}
            {!loading && !content && (
              <div className="h-full flex flex-col items-center justify-center text-center py-16">
                <div className="text-5xl mb-4">🧬</div>
                <p className="text-slate-500 text-sm max-w-xs leading-relaxed">
                  输入你的核心话题，点击生成按钮，AI 将同时为 5 个平台量身定制内容并分析爆款基因
                </p>
              </div>
            )}

            {/* Skeleton */}
            {loading && <PlatformSkeleton />}

            {/* Real content */}
            {!loading && content && (
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.18 }}
                  className="space-y-0"
                >
                  {/* Viral Score */}
                  <div className="mb-3">
                    <ViralScoreBadge score={currentViralScore} loading={viralLoading} />
                  </div>

                  {/* Platform content */}
                  {activeTab === 'xiaohongshu' && <XiaohongshuCard data={content.xiaohongshu} />}
                  {activeTab === 'douyin' && <DouyinCard data={content.douyin} />}
                  {activeTab === 'wechat' && <WechatCard data={content.wechat} />}
                  {activeTab === 'weibo' && <WeiboCard data={content.weibo} />}
                  {activeTab === 'linkedin' && <LinkedInCard data={content.linkedin} />}

                  {/* Viral analysis */}
                  <ViralAnalysisPanel analysis={currentAnalysis} loading={viralLoading} />
                </motion.div>
              </AnimatePresence>
            )}
          </div>

          {/* Footer toolbar */}
          {content && !loading && (
            <div className="border-t border-[#1e1e3a] px-5 py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                {/* Char count badge */}
                <span
                  className={`text-xs font-mono px-2.5 py-1 rounded-full border ${activePlatform.accentBg} ${activePlatform.accentBorder} ${activePlatform.accentText}`}
                >
                  {charCount} 字
                </span>
              </div>
              <div className="flex items-center gap-2">
                {/* Trend inject button */}
                <button
                  onClick={() => setShowTrendModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-pink-500/30 text-pink-400 hover:bg-pink-500/10 transition-all"
                >
                  🔥 趋势注入
                </button>

                {/* Regen single platform */}
                <button
                  onClick={() => handleRegen(activeTab)}
                  disabled={regenLoading === activeTab}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-white/10 text-slate-400 hover:border-white/25 hover:text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  {regenLoading === activeTab ? (
                    <>
                      <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      重新生成中…
                    </>
                  ) : (
                    <>
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 4v6h6M23 20v-6h-6" />
                        <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4-4.64 4.36A9 9 0 0 1 3.51 15" />
                      </svg>
                      重新生成
                    </>
                  )}
                </button>

                {/* Copy button */}
                <button
                  onClick={() => handleCopy(activeTab)}
                  className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                    copied === activeTab
                      ? 'bg-green-500/20 border-green-500/40 text-green-300'
                      : `${activePlatform.accentBg} ${activePlatform.accentBorder} ${activePlatform.accentText} hover:brightness-125`
                  }`}
                >
                  {copied === activeTab ? (
                    <>
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      已复制
                    </>
                  ) : (
                    <>
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                      复制内容
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Trend Inject Modal */}
      <AnimatePresence>
        {showTrendModal && (
          <TrendModal
            platform={activeTab}
            onConfirm={handleTrendInject}
            onClose={() => !trendLoading && setShowTrendModal(false)}
            loading={trendLoading}
          />
        )}
      </AnimatePresence>

      {/* Shimmer keyframe — injected via style tag */}
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
