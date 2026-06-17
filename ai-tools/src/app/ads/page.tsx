'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ToolLayout } from '@/components/Layout/ToolLayout';

// ─── Types ────────────────────────────────────────────────────────────────────

type Platform = 'xiaohongshu' | 'douyin' | 'wechat' | 'weibo';
type Goal = '品牌曝光' | '获客转化' | '促销活动';
type Engagement = 'high' | 'medium' | 'low';

interface AdVariant {
  headline: string;
  body: string;
  cta: string;
  engagement: Engagement;
  reasoning: string;
  trigger: string;
}

interface AdsResult {
  platforms: Partial<Record<Platform, { variants: AdVariant[] }>>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PLATFORM_CONFIG: Record<Platform, {
  label: string;
  icon: string;
  color: string;
  bgActive: string;
  borderActive: string;
  accent: string;
  description: string;
}> = {
  xiaohongshu: {
    label: '小红书',
    icon: '📕',
    color: 'text-rose-400',
    bgActive: 'bg-rose-500/20',
    borderActive: 'border-rose-500/50',
    accent: '#ff2442',
    description: '图文种草 · 情感驱动',
  },
  douyin: {
    label: '抖音',
    icon: '🎵',
    color: 'text-sky-400',
    bgActive: 'bg-sky-500/20',
    borderActive: 'border-sky-500/50',
    accent: '#010101',
    description: '短视频 · 娱乐转化',
  },
  wechat: {
    label: '微信朋友圈',
    icon: '💬',
    color: 'text-green-400',
    bgActive: 'bg-green-500/20',
    borderActive: 'border-green-500/50',
    accent: '#07c160',
    description: '熟人社交 · 信任背书',
  },
  weibo: {
    label: '微博',
    icon: '🌐',
    color: 'text-orange-400',
    bgActive: 'bg-orange-500/20',
    borderActive: 'border-orange-500/50',
    accent: '#e6162d',
    description: '热点话题 · 扩散传播',
  },
};

const ENGAGEMENT_CONFIG: Record<Engagement, {
  label: string;
  bg: string;
  text: string;
  border: string;
  bar: string;
  width: string;
}> = {
  high: {
    label: '高互动',
    bg: 'bg-emerald-500/15',
    text: 'text-emerald-400',
    border: 'border-emerald-500/40',
    bar: 'bg-emerald-500',
    width: 'w-full',
  },
  medium: {
    label: '中等互动',
    bg: 'bg-amber-500/15',
    text: 'text-amber-400',
    border: 'border-amber-500/40',
    bar: 'bg-amber-500',
    width: 'w-2/3',
  },
  low: {
    label: '较低互动',
    bg: 'bg-slate-500/15',
    text: 'text-slate-400',
    border: 'border-slate-500/40',
    bar: 'bg-slate-500',
    width: 'w-1/3',
  },
};

const GOALS: Goal[] = ['品牌曝光', '获客转化', '促销活动'];
const ALL_PLATFORMS: Platform[] = ['xiaohongshu', 'douyin', 'wechat', 'weibo'];

const TRIGGER_ICONS: Record<string, string> = {
  fear: '😰',
  desire: '✨',
  curiosity: '🤔',
  'social proof': '👥',
  authority: '🏆',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function VariantCard({ variant, index, platformColor }: {
  variant: AdVariant;
  index: number;
  platformColor: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const eng = ENGAGEMENT_CONFIG[variant.engagement];
  const triggerIcon = TRIGGER_ICONS[variant.trigger.toLowerCase()] ?? '💡';

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      className="rounded-xl border border-white/10 bg-white/3 overflow-hidden"
    >
      {/* Card header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-white/40">方案 {index + 1}</span>
          <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-0.5 rounded-full border ${eng.border} ${eng.bg} ${eng.text}`}>
            <span className={`inline-block h-1.5 w-6 rounded-full ${eng.bar} opacity-70`} />
            {eng.label}
          </span>
        </div>
        <span className="text-xs text-white/35 flex items-center gap-1">
          {triggerIcon} {variant.trigger}
        </span>
      </div>

      {/* Ad copy */}
      <div className="px-5 py-4 space-y-3">
        <div>
          <p className="text-xs text-white/35 uppercase tracking-wider mb-1">标题</p>
          <p className={`text-base font-bold ${platformColor} leading-snug`}>{variant.headline}</p>
        </div>
        <div>
          <p className="text-xs text-white/35 uppercase tracking-wider mb-1">正文</p>
          <p className="text-sm text-white/75 leading-relaxed">{variant.body}</p>
        </div>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs text-white/35 uppercase tracking-wider mb-1">CTA</p>
            <span className="inline-flex text-xs font-semibold px-3 py-1.5 rounded-lg bg-rose-500/20 border border-rose-500/30 text-rose-300">
              {variant.cta}
            </span>
          </div>

          <button
            onClick={() => setExpanded(v => !v)}
            className="text-xs text-white/35 hover:text-white/60 transition-colors shrink-0"
          >
            {expanded ? '收起分析 ▲' : '查看分析 ▼'}
          </button>
        </div>
      </div>

      {/* Reasoning */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-4 pt-2 border-t border-white/5">
              <p className="text-xs text-white/35 uppercase tracking-wider mb-2">互动预测依据</p>
              <p className="text-xs text-white/60 leading-relaxed">{variant.reasoning}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdsPage() {
  const [productName, setProductName] = useState('');
  const [productDesc, setProductDesc] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [usp, setUsp] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>(['xiaohongshu']);
  const [goal, setGoal] = useState<Goal>('获客转化');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AdsResult | null>(null);
  const [error, setError] = useState('');
  const [activePlatform, setActivePlatform] = useState<Platform>('xiaohongshu');

  const togglePlatform = useCallback((p: Platform) => {
    setSelectedPlatforms(prev =>
      prev.includes(p)
        ? prev.length > 1 ? prev.filter(x => x !== p) : prev
        : [...prev, p]
    );
  }, []);

  const generate = useCallback(async () => {
    if (!productName.trim()) { setError('请填写产品名称。'); return; }
    if (!targetAudience.trim()) { setError('请填写目标受众。'); return; }
    if (!usp.trim()) { setError('请填写核心卖点。'); return; }

    setError('');
    setLoading(true);
    setResult(null);

    const platformNames: Record<Platform, string> = {
      xiaohongshu: '小红书',
      douyin: '抖音',
      wechat: '微信朋友圈',
      weibo: '微博',
    };

    const platformsText = selectedPlatforms.map(p => platformNames[p]).join('、');

    const systemPrompt = `你是一位顶级中国数字营销专家，擅长为不同平台创作高转化率广告文案。
请为以下产品创作广告文案，严格按照JSON格式输出，不要输出任何其他内容。

产品：${productName}
产品描述：${productDesc}
目标受众：${targetAudience}
核心卖点/USP：${usp}
推广目标：${goal}
投放平台：${platformsText}

JSON格式要求：
{
  "platforms": {
    ${selectedPlatforms.includes('xiaohongshu') ? `"xiaohongshu": {
      "variants": [
        {
          "headline": "标题（适合小红书风格，可以带emoji，25字以内）",
          "body": "正文（小红书种草风格，100-150字，带换行，可带emoji）",
          "cta": "行动号召按钮文案（5-10字）",
          "engagement": "high|medium|low",
          "reasoning": "为什么这个方案能带来该互动率的分析（50字以内）",
          "trigger": "fear|desire|curiosity|social proof|authority"
        }
      ]
    }` : ''}
    ${selectedPlatforms.includes('douyin') ? `"douyin": {
      "variants": [
        {
          "headline": "视频标题/开头钩子（适合抖音，吸引停留，20字以内）",
          "body": "视频文案/描述（抖音风格，节奏感强，80-120字）",
          "cta": "行动号召（5-10字）",
          "engagement": "high|medium|low",
          "reasoning": "互动预测分析（50字以内）",
          "trigger": "fear|desire|curiosity|social proof|authority"
        }
      ]
    }` : ''}
    ${selectedPlatforms.includes('wechat') ? `"wechat": {
      "variants": [
        {
          "headline": "朋友圈广告标题（简洁有力，20字以内）",
          "body": "正文（朋友圈风格，信任感强，80-120字）",
          "cta": "行动号召（5-10字）",
          "engagement": "high|medium|low",
          "reasoning": "互动预测分析（50字以内）",
          "trigger": "fear|desire|curiosity|social proof|authority"
        }
      ]
    }` : ''}
    ${selectedPlatforms.includes('weibo') ? `"weibo": {
      "variants": [
        {
          "headline": "微博话题/标题（带热点感，25字以内）",
          "body": "微博正文（话题感强，易于转发，100-150字）",
          "cta": "行动号召（5-10字）",
          "engagement": "high|medium|low",
          "reasoning": "互动预测分析（50字以内）",
          "trigger": "fear|desire|curiosity|social proof|authority"
        }
      ]
    }` : ''}
  }
}

每个平台必须提供3个不同风格的方案（variants数组），每个方案使用不同的情绪触发策略。
trigger字段必须是以下之一：fear, desire, curiosity, social proof, authority`;

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system: systemPrompt,
          messages: [{ role: 'user', content: `请为${productName}生成${platformsText}广告文案。` }],
          maxTokens: 4000,
        }),
      });

      if (!res.ok) throw new Error(`请求失败 (${res.status})`);
      const data = await res.json();
      const raw: string = data.content?.[0]?.text ?? data.text ?? data.result ?? '';
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('AI 未返回有效的 JSON 格式。');
      const parsed: AdsResult = JSON.parse(jsonMatch[0]);
      setResult(parsed);
      setActivePlatform(selectedPlatforms[0]);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '生成失败，请稍后重试。');
    } finally {
      setLoading(false);
    }
  }, [productName, productDesc, targetAudience, usp, selectedPlatforms, goal]);

  return (
    <ToolLayout title="广告创意工厂" subtitle="多平台广告文案一键生成，覆盖小红书、抖音、微信、微博">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* ── Left: Form ── */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-2 space-y-4"
        >
          <div className="rounded-2xl border border-[#1e1e3a] bg-[#0d0d1f]/80 backdrop-blur p-5 space-y-5">
            <div className="flex items-center gap-2">
              <span className="text-xl">📢</span>
              <div>
                <h2 className="text-base font-bold text-white">产品信息</h2>
                <p className="text-xs text-white/40">描述你的产品和受众</p>
              </div>
            </div>

            {/* Product name */}
            <div>
              <label className="block text-xs text-white/50 mb-1.5 uppercase tracking-wider">产品名称</label>
              <input
                type="text"
                value={productName}
                onChange={e => { setProductName(e.target.value); setError(''); }}
                placeholder="例：星野防晒霜 SPF50+"
                className="w-full bg-[#0a0a18] border border-[#1e1e3a] rounded-xl px-4 py-2.5 text-sm text-white/80 placeholder:text-white/20 focus:outline-none focus:border-rose-500/50 transition-colors"
              />
            </div>

            {/* Product description */}
            <div>
              <label className="block text-xs text-white/50 mb-1.5 uppercase tracking-wider">一句话描述</label>
              <input
                type="text"
                value={productDesc}
                onChange={e => setProductDesc(e.target.value)}
                placeholder="例：轻薄不油腻的防晒霜，户外运动专用"
                className="w-full bg-[#0a0a18] border border-[#1e1e3a] rounded-xl px-4 py-2.5 text-sm text-white/80 placeholder:text-white/20 focus:outline-none focus:border-rose-500/50 transition-colors"
              />
            </div>

            {/* Target audience */}
            <div>
              <label className="block text-xs text-white/50 mb-1.5 uppercase tracking-wider">目标受众</label>
              <input
                type="text"
                value={targetAudience}
                onChange={e => { setTargetAudience(e.target.value); setError(''); }}
                placeholder="例：18-28岁爱好户外运动的女性，注重护肤"
                className="w-full bg-[#0a0a18] border border-[#1e1e3a] rounded-xl px-4 py-2.5 text-sm text-white/80 placeholder:text-white/20 focus:outline-none focus:border-rose-500/50 transition-colors"
              />
            </div>

            {/* USP */}
            <div>
              <label className="block text-xs text-white/50 mb-1.5 uppercase tracking-wider">核心卖点 / USP</label>
              <textarea
                value={usp}
                onChange={e => { setUsp(e.target.value); setError(''); }}
                placeholder="例：防水防汗8小时，含玻尿酸保湿成分，日本皮肤科认证，比竞品轻薄30%"
                rows={3}
                className="w-full bg-[#0a0a18] border border-[#1e1e3a] rounded-xl px-4 py-3 text-sm text-white/80 placeholder:text-white/20 resize-none focus:outline-none focus:border-rose-500/50 transition-colors leading-relaxed"
              />
            </div>

            {/* Platforms */}
            <div>
              <label className="block text-xs text-white/50 mb-2 uppercase tracking-wider">投放平台（可多选）</label>
              <div className="grid grid-cols-2 gap-2">
                {ALL_PLATFORMS.map(p => {
                  const cfg = PLATFORM_CONFIG[p];
                  const selected = selectedPlatforms.includes(p);
                  return (
                    <button
                      key={p}
                      onClick={() => togglePlatform(p)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        selected
                          ? `${cfg.borderActive} ${cfg.bgActive}`
                          : 'border-white/10 bg-white/3 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span>{cfg.icon}</span>
                        <div>
                          <p className={`text-xs font-semibold ${selected ? cfg.color : 'text-white/70'}`}>{cfg.label}</p>
                          <p className="text-xs text-white/30">{cfg.description}</p>
                        </div>
                        {selected && <span className={`ml-auto text-xs ${cfg.color}`}>✓</span>}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Goal */}
            <div>
              <label className="block text-xs text-white/50 mb-2 uppercase tracking-wider">推广目标</label>
              <div className="flex gap-2">
                {GOALS.map(g => (
                  <button
                    key={g}
                    onClick={() => setGoal(g)}
                    className={`flex-1 py-2 px-2 rounded-lg text-xs font-medium border transition-all ${
                      goal === g
                        ? 'border-rose-500/60 bg-rose-500/20 text-rose-300'
                        : 'border-white/10 bg-white/3 text-white/45 hover:text-white/70 hover:border-white/20'
                    }`}
                  >
                    {g}
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
              disabled={loading || !productName.trim() || !targetAudience.trim() || !usp.trim()}
              className="w-full py-3 rounded-xl font-semibold text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white shadow-lg shadow-rose-900/30 active:scale-[0.98]"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                    className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                  />
                  正在创作广告文案…
                </span>
              ) : (
                '🚀 生成广告文案'
              )}
            </button>
          </div>
        </motion.div>

        {/* ── Right: Results ── */}
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
                <span className="text-5xl mb-4">📢</span>
                <p className="text-white/40 text-sm">填写产品信息并选择平台</p>
                <p className="text-white/25 text-xs mt-1">每个平台将生成 3 套广告文案方案</p>
              </motion.div>
            )}

            {loading && (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full rounded-2xl border border-rose-500/20 bg-rose-500/5 flex flex-col items-center justify-center py-24 gap-5"
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
                  className="w-12 h-12 border-2 border-rose-500/30 border-t-rose-400 rounded-full"
                />
                <div className="text-center space-y-2">
                  <p className="text-rose-400 text-sm font-medium">正在为各平台创作文案...</p>
                  <div className="flex items-center justify-center gap-3">
                    {selectedPlatforms.map(p => (
                      <motion.span
                        key={p}
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ repeat: Infinity, duration: 1.5, delay: ALL_PLATFORMS.indexOf(p) * 0.3 }}
                        className="text-lg"
                      >
                        {PLATFORM_CONFIG[p].icon}
                      </motion.span>
                    ))}
                  </div>
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
                {/* Summary badges */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-white/40">已生成：</span>
                  {selectedPlatforms.filter(p => result.platforms[p]).map(p => {
                    const cfg = PLATFORM_CONFIG[p];
                    const count = result.platforms[p]?.variants.length ?? 0;
                    return (
                      <span key={p} className={`text-xs px-2.5 py-1 rounded-full border ${cfg.borderActive} ${cfg.bgActive} ${cfg.color}`}>
                        {cfg.icon} {cfg.label} × {count}
                      </span>
                    );
                  })}
                </div>

                {/* Platform tabs */}
                <div className="flex gap-1 bg-white/5 rounded-xl p-1 overflow-x-auto">
                  {selectedPlatforms.filter(p => result.platforms[p]).map(p => {
                    const cfg = PLATFORM_CONFIG[p];
                    const isActive = activePlatform === p;
                    return (
                      <button
                        key={p}
                        onClick={() => setActivePlatform(p)}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                          isActive
                            ? `${cfg.bgActive} ${cfg.color} border ${cfg.borderActive}`
                            : 'text-white/40 hover:text-white/70'
                        }`}
                      >
                        <span>{cfg.icon}</span>
                        <span>{cfg.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Variants */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activePlatform}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.18 }}
                    className="space-y-4"
                  >
                    {/* Platform header */}
                    <div className="flex items-center gap-3 px-1">
                      <span className="text-2xl">{PLATFORM_CONFIG[activePlatform].icon}</span>
                      <div>
                        <p className={`text-sm font-bold ${PLATFORM_CONFIG[activePlatform].color}`}>
                          {PLATFORM_CONFIG[activePlatform].label}
                        </p>
                        <p className="text-xs text-white/35">{PLATFORM_CONFIG[activePlatform].description}</p>
                      </div>
                    </div>

                    {result.platforms[activePlatform]?.variants.map((variant, i) => (
                      <VariantCard
                        key={i}
                        variant={variant}
                        index={i}
                        platformColor={PLATFORM_CONFIG[activePlatform].color}
                      />
                    ))}
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
