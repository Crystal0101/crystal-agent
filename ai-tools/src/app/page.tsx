'use client';
import Link from 'next/link';
import { motion } from 'framer-motion';

const CATEGORIES = [
  {
    label: '职场发展',
    icon: '💼',
    desc: '从简历到薪资，掌握职场主动权',
    headerColor: 'from-blue-900/40',
    tools: [
      {
        href: '/resume', icon: '🚀', name: '职场跃迁系统',
        desc: '简历评分 + 薪资谈判剧本 + 三条职业路径规划，一站式跃迁方案',
        tags: ['简历', '薪资谈判', '职业规划'],
        color: 'from-blue-600/20 to-blue-800/10',
        border: 'border-blue-700/30',
        accent: 'text-blue-400',
        badge: '升级',
      },
      {
        href: '/interview', icon: '🎯', name: '大厂面试复现器',
        desc: '字节/腾讯/阿里风格面官上身，STAR法则追问+压力测试，出来就是老手',
        tags: ['字节', '腾讯', '阿里'],
        color: 'from-orange-600/20 to-orange-800/10',
        border: 'border-orange-700/30',
        accent: 'text-orange-400',
        badge: '升级',
      },
      {
        href: '/negotiation', icon: '🤝', name: '谈判沙盘',
        desc: '工资/合同/合作条款全场景模拟对弈，AI扮演对手让你练出真本事',
        tags: ['薪资谈判', '商务谈判'],
        color: 'from-yellow-600/20 to-yellow-800/10',
        border: 'border-yellow-700/30',
        accent: 'text-yellow-400',
        badge: '新品',
      },
    ],
  },
  {
    label: '内容引爆',
    icon: '🔥',
    desc: '不只是写作，而是预测爆款、制造流量',
    headerColor: 'from-pink-900/40',
    tools: [
      {
        href: '/content', icon: '🧬', name: '爆款基因解码器',
        desc: '五平台内容 + 病毒指数评分 + 流行趋势注入，生成才是基础，爆款才是目标',
        tags: ['小红书', '抖音', '爆款预测'],
        color: 'from-pink-600/20 to-pink-800/10',
        border: 'border-pink-700/30',
        accent: 'text-pink-400',
        badge: '升级',
      },
      {
        href: '/ads', icon: '📢', name: '广告创意工厂',
        desc: '输入产品，输出20条差异化文案+各平台投放优先级+预测转化率排名',
        tags: ['信息流', '小红书投放', 'ROI预测'],
        color: 'from-rose-600/20 to-rose-800/10',
        border: 'border-rose-700/30',
        accent: 'text-rose-400',
        badge: '新品',
      },
      {
        href: '/brand', icon: '⭐', name: '个人IP打造器',
        desc: '输入你的背景和目标，输出90天内容日历+首批5篇文章+涨粉路径图',
        tags: ['个人品牌', 'KOL', '内容策略'],
        color: 'from-purple-600/20 to-purple-800/10',
        border: 'border-purple-700/30',
        accent: 'text-purple-400',
        badge: '新品',
      },
      {
        href: '/lovecoach', icon: '💘', name: '恋爱军师',
        desc: '消息解码 + 回复生成 + 心理画像 + 撩人剧本 + 复合攻略，掌握恋爱节奏',
        tags: ['消息解码', '回复话术', '复合攻略'],
        color: 'from-rose-600/20 to-pink-800/10',
        border: 'border-rose-700/30',
        accent: 'text-rose-400',
        badge: '新品',
      },
    ],
  },
  {
    label: '商业战略',
    icon: '♟️',
    desc: '比竞对看得更准，比市场判断更快',
    headerColor: 'from-emerald-900/40',
    tools: [
      {
        href: '/contract', icon: '⚖️', name: '合同谈判筹码',
        desc: '识别风险条款→生成对方角度分析→提供具体反制话术，不只是看问题而是解决它',
        tags: ['合同审查', '谈判话术', 'BATNA'],
        color: 'from-red-600/20 to-red-800/10',
        border: 'border-red-700/30',
        accent: 'text-red-400',
        badge: '升级',
      },
      {
        href: '/competitor', icon: '🔭', name: '竞品情报雷达',
        desc: '输入你的产品和对手，输出功能矩阵、定位差距图、可行性机会清单',
        tags: ['竞品分析', '市场定位', '战略机会'],
        color: 'from-cyan-600/20 to-cyan-800/10',
        border: 'border-cyan-700/30',
        accent: 'text-cyan-400',
        badge: '新品',
      },
      {
        href: '/pricing', icon: '💰', name: '定价实验室',
        desc: '定价心理学+竞对对标+目标客群分析，给你一套有说服力的定价策略',
        tags: ['定价策略', '价格锚点', '商业模式'],
        color: 'from-green-600/20 to-green-800/10',
        border: 'border-green-700/30',
        accent: 'text-green-400',
        badge: '新品',
      },
      {
        href: '/gtm', icon: '🚢', name: 'GTM发布台',
        desc: '产品上市完整包：发布稿+7封邮件序列+社媒日历+KOL简报+冷启动SOP',
        tags: ['GTM策略', '产品发布', '增长'],
        color: 'from-teal-600/20 to-teal-800/10',
        border: 'border-teal-700/30',
        accent: 'text-teal-400',
        badge: '新品',
      },
    ],
  },
  {
    label: '创业加速',
    icon: '🛸',
    desc: '0→1阶段的核心问题，AI来帮你系统化',
    headerColor: 'from-violet-900/40',
    tools: [
      {
        href: '/knowledge', icon: '💡', name: '融资故事工坊',
        desc: '输入你的阶段和数据，AI重构投资人最想听的叙事，30秒电梯稿到完整Pitch',
        tags: ['融资', '投资人', 'Pitch'],
        color: 'from-violet-600/20 to-violet-800/10',
        border: 'border-violet-700/30',
        accent: 'text-violet-400',
        badge: '升级',
      },
      {
        href: '/coldstart', icon: '❄️', name: '冷启动引擎',
        desc: '输入产品描述，输出10条精准获客渠道+每个渠道的话术脚本，找到你的第一批用户',
        tags: ['冷启动', '获客', 'PMF'],
        color: 'from-sky-600/20 to-sky-800/10',
        border: 'border-sky-700/30',
        accent: 'text-sky-400',
        badge: '新品',
      },
      {
        href: '/bizplan', icon: '📊', name: 'BP一键生成',
        desc: '10个问题10分钟，AI生成完整商业计划书，包含市场分析财务预测竞争格局',
        tags: ['商业计划书', '融资', '创业'],
        color: 'from-indigo-600/20 to-indigo-800/10',
        border: 'border-indigo-700/30',
        accent: 'text-indigo-400',
        badge: '新品',
      },
      {
        href: '/uxresearch', icon: '🔬', name: '用研分析台',
        desc: '粘贴访谈记录，AI自动提炼痛点矩阵+用户画像+功能优先级，替代3天的人工分析',
        tags: ['用户研究', '产品设计', 'UX'],
        color: 'from-amber-600/20 to-amber-800/10',
        border: 'border-amber-700/30',
        accent: 'text-amber-400',
        badge: '新品',
      },
      {
        href: '/investor', icon: '📬', name: '股东信生成器',
        desc: '输入本期关键指标和里程碑，AI用投资人最爱的叙事逻辑写出专业股东更新',
        tags: ['股东信', '投资人关系', 'IR'],
        color: 'from-emerald-600/20 to-emerald-800/10',
        border: 'border-emerald-700/30',
        accent: 'text-emerald-400',
        badge: '新品',
      },
    ],
  },
];

const BADGE_STYLE: Record<string, string> = {
  '新品': 'bg-emerald-500/15 text-emerald-300 border-emerald-600/30',
  '升级': 'bg-purple-500/15 text-purple-300 border-purple-600/30',
};

export default function Home() {
  const totalTools = CATEGORIES.reduce((n, c) => n + c.tools.length, 0);

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <div className="border-b border-[#1e1e3a] bg-gradient-to-b from-purple-950/30 to-transparent">
        <div className="max-w-5xl mx-auto px-4 py-14 text-center">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="inline-flex items-center gap-2 bg-purple-600/10 border border-purple-600/20 rounded-full px-4 py-1.5 text-purple-300 text-sm mb-5">
              <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              {totalTools} 个商业级 AI 工具 · 全面升级版
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">
              <span className="gradient-text">AI工具箱</span>
            </h1>
            <p className="text-slate-400 text-base max-w-2xl mx-auto leading-relaxed">
              不是聊天机器人。每个工具都有明确的商业目标、结构化的输出、专属的工作流。
            </p>
          </motion.div>
        </div>
      </div>

      {/* Categories */}
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-10">
        {CATEGORIES.map((cat, ci) => (
          <motion.section
            key={cat.label}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: ci * 0.1 }}
          >
            {/* Category header */}
            <div className={`flex items-center gap-3 mb-4 pb-3 border-b border-[#1e1e3a]`}>
              <span className="text-2xl">{cat.icon}</span>
              <div>
                <h2 className="text-base font-bold text-white">{cat.label}</h2>
                <p className="text-xs text-slate-500 mt-0.5">{cat.desc}</p>
              </div>
              <span className="ml-auto text-xs text-slate-600 border border-[#1e1e3a] rounded-full px-2 py-0.5">
                {cat.tools.length} 个工具
              </span>
            </div>

            {/* Tools grid */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {cat.tools.map((t, i) => (
                <motion.div
                  key={t.href}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: ci * 0.1 + i * 0.06 }}
                >
                  <Link href={t.href} className="block group h-full">
                    <div className={`card p-4 h-full bg-gradient-to-br ${t.color} border ${t.border} hover:scale-[1.02] transition-all duration-200 glow-purple`}>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{t.icon}</span>
                          <h3 className={`text-sm font-bold ${t.accent}`}>{t.name}</h3>
                        </div>
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border shrink-0 ${BADGE_STYLE[t.badge]}`}>
                          {t.badge}
                        </span>
                      </div>
                      <p className="text-slate-400 text-xs leading-relaxed mb-2.5">{t.desc}</p>
                      <div className="flex flex-wrap gap-1">
                        {t.tags.map(tag => (
                          <span key={tag} className="tag bg-white/5 text-slate-500 text-[10px]">{tag}</span>
                        ))}
                      </div>
                      <div className={`mt-2.5 text-xs ${t.accent} font-medium group-hover:translate-x-1 transition-transform inline-flex items-center gap-1`}>
                        立即使用 →
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </motion.section>
        ))}

        {/* Stats bar */}
        <div className="card p-5 flex flex-wrap gap-6 justify-around text-center mt-8">
          {[
            { n: String(totalTools), label: '核心工具' },
            { n: '4', label: '业务类别' },
            { n: 'Claude 4', label: 'AI 引擎' },
            { n: '结构化', label: '专属输出' },
            { n: 'PWA', label: '可安装' },
          ].map(s => (
            <div key={s.label}>
              <div className="text-lg font-bold gradient-text">{s.n}</div>
              <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
