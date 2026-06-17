'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

const CATEGORIES = [
  {
    label: '职场发展',
    icon: '💼',
    color: 'text-blue-400 border-blue-700/50 bg-blue-900/20',
    tools: [
      { href: '/resume',      icon: '🚀', name: '职场跃迁系统', short: '跃迁' },
      { href: '/interview',   icon: '🎯', name: '大厂面试复现', short: '面试' },
      { href: '/negotiation', icon: '🤝', name: '谈判沙盘',     short: '谈判' },
    ],
  },
  {
    label: '内容引爆',
    icon: '🔥',
    color: 'text-pink-400 border-pink-700/50 bg-pink-900/20',
    tools: [
      { href: '/content',    icon: '🧬', name: '爆款基因解码器', short: '爆款' },
      { href: '/ads',        icon: '📢', name: '广告创意工厂',   short: '广告' },
      { href: '/brand',      icon: '⭐', name: '个人IP打造器',   short: 'IP' },
      { href: '/lovecoach',  icon: '💘', name: '恋爱军师',       short: '恋爱' },
    ],
  },
  {
    label: '商业战略',
    icon: '♟️',
    color: 'text-emerald-400 border-emerald-700/50 bg-emerald-900/20',
    tools: [
      { href: '/contract',   icon: '⚖️', name: '合同谈判筹码', short: '合同' },
      { href: '/competitor', icon: '🔭', name: '竞品情报雷达', short: '竞品' },
      { href: '/pricing',    icon: '💰', name: '定价实验室',   short: '定价' },
      { href: '/gtm',        icon: '🚢', name: 'GTM发布台',    short: 'GTM' },
    ],
  },
  {
    label: '创业加速',
    icon: '🛸',
    color: 'text-violet-400 border-violet-700/50 bg-violet-900/20',
    tools: [
      { href: '/knowledge',  icon: '💡', name: '融资故事工坊', short: '融资' },
      { href: '/coldstart',  icon: '❄️', name: '冷启动引擎',   short: '冷启' },
      { href: '/bizplan',    icon: '📊', name: 'BP一键生成',   short: 'BP' },
      { href: '/uxresearch', icon: '🔬', name: '用研分析台',   short: '用研' },
      { href: '/investor',   icon: '📬', name: '股东信生成器', short: '股东' },
    ],
  },
];

export function ToolLayout({ children, title, subtitle }: {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}) {
  const path = usePathname();
  const [openCat, setOpenCat] = useState<string | null>(null);

  const activeCategory = CATEGORIES.find(c => c.tools.some(t => t.href === path));

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-[#1e1e3a] bg-[#0d0d14]/90 backdrop-blur sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-2">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <span className="text-xl">⚡</span>
            <span className="font-bold gradient-text hidden sm:block text-sm">AI工具箱</span>
          </Link>

          {/* Desktop category nav */}
          <nav className="hidden md:flex items-center gap-1">
            {CATEGORIES.map(cat => {
              const isActive = cat === activeCategory;
              const isOpen = openCat === cat.label;
              return (
                <div key={cat.label} className="relative">
                  <button
                    onClick={() => setOpenCat(isOpen ? null : cat.label)}
                    onBlur={() => setTimeout(() => setOpenCat(null), 150)}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                      isActive
                        ? cat.color
                        : 'border-transparent text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <span>{cat.icon}</span>
                    <span>{cat.label}</span>
                    <span className="text-slate-600">▾</span>
                  </button>
                  {isOpen && (
                    <div className="absolute top-full left-0 mt-1 w-44 rounded-xl border border-[#2d2d50] bg-[#0d0d1c] shadow-2xl z-50 overflow-hidden">
                      {cat.tools.map(t => (
                        <Link
                          key={t.href}
                          href={t.href}
                          className={`flex items-center gap-2 px-3 py-2.5 text-xs transition-colors ${
                            path === t.href
                              ? 'bg-purple-600/20 text-purple-300'
                              : 'text-slate-300 hover:bg-white/5'
                          }`}
                        >
                          <span>{t.icon}</span>
                          <span>{t.name}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          {/* Mobile: scrollable icon nav */}
          <nav className="flex md:hidden items-center gap-0.5 overflow-x-auto scrollbar-hide max-w-[calc(100vw-80px)]">
            {CATEGORIES.flatMap(cat =>
              cat.tools.map(t => (
                <Link
                  key={t.href}
                  href={t.href}
                  className={`flex-shrink-0 flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs transition-all ${
                    path === t.href
                      ? 'bg-purple-600/20 text-purple-300 border border-purple-600/30'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span>{t.icon}</span>
                  <span>{t.short}</span>
                </Link>
              ))
            )}
          </nav>
        </div>
      </header>

      <div className="border-b border-[#1e1e3a] bg-gradient-to-r from-purple-950/20 to-transparent">
        <div className="max-w-6xl mx-auto px-4 py-5">
          <h1 className="text-xl font-bold text-white">{title}</h1>
          <p className="text-slate-400 text-sm mt-0.5">{subtitle}</p>
        </div>
      </div>

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6">
        {children}
      </main>

      <style jsx global>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
