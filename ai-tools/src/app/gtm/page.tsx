'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ToolLayout } from '@/components/Layout/ToolLayout';

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = 1 | 2 | 3;
type ResultTab = 'announcement' | 'emailSequence' | 'socialCalendar' | 'kolBrief' | 'sop';
type BudgetRange = '<1万' | '1-5万' | '5-20万' | '>20万';
type Channel = '微信群' | '小红书' | '抖音' | 'B站' | '微博' | '公众号' | '朋友圈';

interface FormData {
  // Step 1
  productName: string;
  oneLiner: string;
  targetUser: string;
  differentiator: string;
  // Step 2
  launchDate: string;
  channels: Channel[];
  budget: BudgetRange;
  // Step 3
  competitors: string;
  milestones: string;
  constraints: string;
}

interface EmailItem {
  day: number;
  subject: string;
  body: string;
  purpose: string;
}

interface SocialItem {
  day: number;
  platform: string;
  type: string;
  content: string;
}

interface SopWeek {
  week: string;
  tasks: string[];
  kpi: string;
}

interface GTMResult {
  announcement: string;
  emailSequence: EmailItem[];
  socialCalendar: SocialItem[];
  kolBrief: string;
  sop: SopWeek[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CHANNELS: Channel[] = ['微信群', '小红书', '抖音', 'B站', '微博', '公众号', '朋友圈'];
const BUDGETS: BudgetRange[] = ['<1万', '1-5万', '5-20万', '>20万'];

function buildGTMSystemPrompt(): string {
  return `你是一位顶级产品发布策略专家，擅长中国市场的GTM（Go-To-Market）策略制定。
你需要根据用户提供的产品信息，生成完整的发布工具包。

你必须严格按照以下JSON格式输出，不要有任何额外文字、Markdown代码块或解释：
{
  "announcement": "完整的发布公告/新闻稿（正式风格，500-800字，包含标题、正文、引用语、关于我们）",
  "emailSequence": [
    {
      "day": 数字（-7到14，负数为发布前，0为发布日）,
      "subject": "邮件主题",
      "body": "完整邮件正文（200-400字）",
      "purpose": "这封邮件的作用（15字以内）"
    }
  ],
  "socialCalendar": [
    {
      "day": 数字（1-14）,
      "platform": "平台名",
      "type": "内容类型（开箱视频/种草文案/直播预告等）",
      "content": "具体文案或内容描述（100-200字）"
    }
  ],
  "kolBrief": "完整KOL/达人合作简报（包含：产品背景、目标受众契合度、核心传播信息3条、内容指引、合作形式与报酬框架、注意事项），600-800字",
  "sop": [
    {
      "week": "第X周（具体日期范围描述）",
      "tasks": ["具体任务1", "具体任务2", "..."],
      "kpi": "本周关键指标"
    }
  ]
}

要求：
- emailSequence 包含7封邮件：发布前3封（Day-7、Day-3、Day-1）+ 发布日1封（Day0）+ 发布后3封（Day+3、Day+7、Day+14）
- socialCalendar 包含14天、覆盖用户选择的渠道，每天1-2条内容
- sop 包含4周计划（共30天）
- 所有内容要针对中国市场，接地气，可执行
- 文案要有力、有吸引力，避免空话套话`;
}

async function callAI(
  system: string,
  messages: { role: string; content: string }[],
  maxTokens = 4000
): Promise<string> {
  const res = await fetch('/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ system, messages, maxTokens }),
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.text as string;
}

function copyToClipboard(text: string, setCopied: (v: boolean) => void) {
  navigator.clipboard.writeText(text).then(() => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  });
}

// ─── Step Form ────────────────────────────────────────────────────────────────

interface StepFormProps {
  step: Step;
  data: FormData;
  onChange: (partial: Partial<FormData>) => void;
  onNext: () => void;
  onPrev: () => void;
  onSubmit: () => void;
  loading: boolean;
}

function StepForm({ step, data, onChange, onNext, onPrev, onSubmit, loading }: StepFormProps) {
  const toggleChannel = (ch: Channel) => {
    const next = data.channels.includes(ch)
      ? data.channels.filter(c => c !== ch)
      : [...data.channels, ch];
    onChange({ channels: next });
  };

  const canProceedStep1 =
    data.productName.trim() && data.oneLiner.trim() && data.targetUser.trim() && data.differentiator.trim();
  const canProceedStep2 = data.launchDate && data.channels.length > 0;

  return (
    <motion.div
      key={step}
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.25 }}
      className="max-w-xl mx-auto"
    >
      <div className="card p-8 space-y-6">
        {step === 1 && (
          <>
            <div className="text-center space-y-1">
              <div className="text-4xl mb-2">📦</div>
              <h3 className="text-xl font-bold text-white">产品基础信息</h3>
              <p className="text-slate-400 text-sm">让AI了解你要发布的产品</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm text-slate-300 font-medium">
                  产品名称 <span className="text-red-400">*</span>
                </label>
                <input
                  className="input"
                  placeholder="例如：FlowNote AI笔记助手"
                  value={data.productName}
                  onChange={e => onChange({ productName: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm text-slate-300 font-medium">
                  一句话卖点 <span className="text-red-400">*</span>
                </label>
                <input
                  className="input"
                  placeholder="例如：让AI帮你记会议笔记，自动生成行动清单"
                  value={data.oneLiner}
                  onChange={e => onChange({ oneLiner: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm text-slate-300 font-medium">
                  目标用户描述 <span className="text-red-400">*</span>
                </label>
                <textarea
                  className="textarea resize-none h-20"
                  placeholder="例如：25-35岁的职场人，每天开3-5个会议，痛苦于整理会议纪要"
                  value={data.targetUser}
                  onChange={e => onChange({ targetUser: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm text-slate-300 font-medium">
                  核心差异化优势 <span className="text-red-400">*</span>
                </label>
                <textarea
                  className="textarea resize-none h-20"
                  placeholder="例如：唯一支持中文方言识别，识别准确率99%，比同类产品快3倍"
                  value={data.differentiator}
                  onChange={e => onChange({ differentiator: e.target.value })}
                />
              </div>
            </div>

            <button
              onClick={onNext}
              disabled={!canProceedStep1}
              className="w-full py-3 rounded-xl font-medium text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={canProceedStep1 ? { background: 'linear-gradient(135deg, #0d9488, #0f766e)', color: 'white' } : { background: '#1e2d2d', color: '#4b6060' }}
            >
              下一步：发布计划 →
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <div className="text-center space-y-1">
              <div className="text-4xl mb-2">📅</div>
              <h3 className="text-xl font-bold text-white">发布计划</h3>
              <p className="text-slate-400 text-sm">确定发布时间和渠道策略</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm text-slate-300 font-medium">
                  发布日期 <span className="text-red-400">*</span>
                </label>
                <input
                  type="date"
                  className="input"
                  value={data.launchDate}
                  onChange={e => onChange({ launchDate: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm text-slate-300 font-medium">
                  发布渠道 <span className="text-red-400">*</span>
                  <span className="text-slate-500 font-normal ml-1">（可多选）</span>
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {CHANNELS.map(ch => (
                    <button
                      key={ch}
                      onClick={() => toggleChannel(ch)}
                      className={`py-2 rounded-xl text-xs font-medium transition-all border ${
                        data.channels.includes(ch)
                          ? 'bg-teal-600/20 border-teal-500/60 text-teal-300'
                          : 'border-[#2d2d50] text-slate-400 hover:border-teal-700/50 hover:text-slate-200'
                      }`}
                    >
                      {ch}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-slate-300 font-medium">预算范围</label>
                <div className="grid grid-cols-4 gap-2">
                  {BUDGETS.map(b => (
                    <button
                      key={b}
                      onClick={() => onChange({ budget: b })}
                      className={`py-2.5 rounded-xl text-xs font-medium transition-all border ${
                        data.budget === b
                          ? 'bg-teal-600/20 border-teal-500/60 text-teal-300'
                          : 'border-[#2d2d50] text-slate-400 hover:border-teal-700/50 hover:text-slate-200'
                      }`}
                    >
                      {b}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={onPrev}
                className="flex-1 py-3 rounded-xl font-medium text-sm border border-[#2d2d50] text-slate-400 hover:text-slate-200 hover:border-slate-600 transition-all"
              >
                ← 上一步
              </button>
              <button
                onClick={onNext}
                disabled={!canProceedStep2}
                className="flex-1 py-3 rounded-xl font-medium text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                style={canProceedStep2 ? { background: 'linear-gradient(135deg, #0d9488, #0f766e)', color: 'white' } : { background: '#1e2d2d', color: '#4b6060' }}
              >
                下一步：补充信息 →
              </button>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <div className="text-center space-y-1">
              <div className="text-4xl mb-2">✨</div>
              <h3 className="text-xl font-bold text-white">额外信息（可选）</h3>
              <p className="text-slate-400 text-sm">填写越多，生成越精准</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm text-slate-300 font-medium">主要竞争对手</label>
                <input
                  className="input"
                  placeholder="例如：印象笔记、飞书、Notion"
                  value={data.competitors}
                  onChange={e => onChange({ competitors: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm text-slate-300 font-medium">关键里程碑</label>
                <textarea
                  className="textarea resize-none h-20"
                  placeholder="例如：产品已有500个内测用户，NPS达75分，获得Pre-A轮融资"
                  value={data.milestones}
                  onChange={e => onChange({ milestones: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm text-slate-300 font-medium">约束条件</label>
                <textarea
                  className="textarea resize-none h-20"
                  placeholder="例如：不能在微博投广告、团队只有3人、需要在节日前完成发布"
                  value={data.constraints}
                  onChange={e => onChange({ constraints: e.target.value })}
                />
              </div>
            </div>

            <div className="flex items-start gap-3 bg-teal-950/20 border border-teal-900/30 rounded-xl px-4 py-3">
              <span className="text-teal-400 text-base mt-0.5">🚀</span>
              <p className="text-teal-200/70 text-xs leading-relaxed">
                AI将生成：发布公告、7封邮件序列、14天社媒日历、KOL简报、30天冷启动SOP。预计需要30-60秒。
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={onPrev}
                className="flex-1 py-3 rounded-xl font-medium text-sm border border-[#2d2d50] text-slate-400 hover:text-slate-200 hover:border-slate-600 transition-all"
              >
                ← 上一步
              </button>
              <button
                onClick={onSubmit}
                disabled={loading}
                className="flex-1 py-3 rounded-xl font-medium text-sm transition-all disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #0d9488, #0f766e)', color: 'white' }}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <motion.span
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                    />
                    生成中...
                  </span>
                ) : '生成发布工具包 🚀'}
              </button>
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}

// ─── Progress Bar ─────────────────────────────────────────────────────────────

function ProgressBar({ step }: { step: Step }) {
  const steps = [
    { n: 1, label: '产品信息' },
    { n: 2, label: '发布计划' },
    { n: 3, label: '额外信息' },
  ];
  return (
    <div className="flex items-center justify-center gap-0 mb-8 max-w-sm mx-auto">
      {steps.map((s, i) => (
        <div key={s.n} className="flex items-center">
          <div className="flex flex-col items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                step === s.n
                  ? 'bg-teal-500 text-white scale-110'
                  : step > s.n
                  ? 'bg-teal-800/60 text-teal-300'
                  : 'bg-[#1e1e3a] text-slate-500 border border-[#2d2d50]'
              }`}
            >
              {step > s.n ? '✓' : s.n}
            </div>
            <span
              className={`text-xs mt-1 ${
                step === s.n ? 'text-teal-300' : step > s.n ? 'text-teal-600' : 'text-slate-600'
              }`}
            >
              {s.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div
              className={`w-16 h-0.5 mx-1 mb-4 transition-all ${
                step > s.n ? 'bg-teal-700' : 'bg-[#2d2d50]'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Copy Button ──────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => copyToClipboard(text, setCopied)}
      className={`text-xs px-3 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 ${
        copied
          ? 'border-teal-600/50 text-teal-400 bg-teal-950/20'
          : 'border-[#2d2d50] text-slate-400 hover:text-teal-300 hover:border-teal-800/50'
      }`}
    >
      {copied ? '✓ 已复制' : '复制'}
    </button>
  );
}

// ─── Result View ──────────────────────────────────────────────────────────────

interface ResultViewProps {
  result: GTMResult;
  onRestart: () => void;
  productName: string;
}

function ResultView({ result, onRestart, productName }: ResultViewProps) {
  const [activeTab, setActiveTab] = useState<ResultTab>('announcement');

  const tabs: { id: ResultTab; label: string; icon: string }[] = [
    { id: 'announcement', label: '发布公告', icon: '📢' },
    { id: 'emailSequence', label: '邮件序列', icon: '✉️' },
    { id: 'socialCalendar', label: '社媒日历', icon: '📱' },
    { id: 'kolBrief', label: 'KOL简报', icon: '⭐' },
    { id: 'sop', label: '冷启动SOP', icon: '📋' },
  ];

  const purposeColor = (day: number) => {
    if (day < 0) return 'bg-purple-900/30 text-purple-300 border-purple-800/30';
    if (day === 0) return 'bg-teal-900/30 text-teal-300 border-teal-800/30';
    return 'bg-blue-900/30 text-blue-300 border-blue-800/30';
  };

  const dayLabel = (day: number) => {
    if (day < 0) return `发布前第${Math.abs(day)}天`;
    if (day === 0) return '发布日';
    return `发布后第${day}天`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-5 max-w-3xl mx-auto"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-white">{productName} 发布工具包</h3>
          <p className="text-slate-400 text-sm">5个模块已就绪，点击标签切换查看</p>
        </div>
        <button
          onClick={onRestart}
          className="text-xs px-3 py-1.5 rounded-lg border border-[#2d2d50] text-slate-400 hover:text-teal-300 hover:border-teal-800/50 transition-all"
        >
          重新生成
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-2 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 border ${
              activeTab === tab.id
                ? 'bg-teal-600/20 border-teal-500/60 text-teal-300'
                : 'border-[#2d2d50] text-slate-400 hover:text-teal-300 hover:border-teal-800/50'
            }`}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        {activeTab === 'announcement' && (
          <motion.div
            key="announcement"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="card p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-teal-400 flex items-center gap-2">
                📢 发布公告 / 新闻稿
              </h4>
              <CopyButton text={result.announcement} />
            </div>
            <div className="bg-[#0f0f1e] rounded-xl px-5 py-4 border border-[#1e1e3a]">
              <pre className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap font-sans">
                {result.announcement}
              </pre>
            </div>
          </motion.div>
        )}

        {activeTab === 'emailSequence' && (
          <motion.div
            key="emailSequence"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            {result.emailSequence.map((email, i) => (
              <div key={i} className="card p-5 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${purposeColor(email.day)}`}>
                      {dayLabel(email.day)}
                    </span>
                    <span className="text-xs text-slate-500 border border-[#2d2d50] px-2 py-0.5 rounded-full">
                      {email.purpose}
                    </span>
                  </div>
                  <CopyButton text={`主题：${email.subject}\n\n${email.body}`} />
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">邮件主题</p>
                  <p className="text-white font-medium text-sm">{email.subject}</p>
                </div>
                <div className="border-t border-[#1e1e3a] pt-3">
                  <p className="text-xs text-slate-500 mb-2">邮件正文</p>
                  <pre className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap font-sans">
                    {email.body}
                  </pre>
                </div>
              </div>
            ))}
          </motion.div>
        )}

        {activeTab === 'socialCalendar' && (
          <motion.div
            key="socialCalendar"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="card p-5 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-teal-400">📱 14天社媒内容日历</h4>
              <CopyButton
                text={result.socialCalendar
                  .map(s => `Day${s.day} | ${s.platform} | ${s.type}\n${s.content}`)
                  .join('\n\n')}
              />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#1e1e3a]">
                    <th className="text-left py-2 px-2 text-xs text-slate-500 font-medium w-16">天数</th>
                    <th className="text-left py-2 px-2 text-xs text-slate-500 font-medium w-20">平台</th>
                    <th className="text-left py-2 px-2 text-xs text-slate-500 font-medium w-24">内容类型</th>
                    <th className="text-left py-2 px-2 text-xs text-slate-500 font-medium">文案/内容</th>
                  </tr>
                </thead>
                <tbody>
                  {result.socialCalendar.map((item, i) => (
                    <tr
                      key={i}
                      className={`border-b border-[#1a1a2e] hover:bg-[#1a1a2e]/50 transition-colors ${
                        i % 2 === 0 ? '' : 'bg-[#0f0f1e]/30'
                      }`}
                    >
                      <td className="py-3 px-2 text-teal-400 font-mono text-xs">D{item.day}</td>
                      <td className="py-3 px-2">
                        <span className="text-xs bg-teal-900/30 text-teal-300 border border-teal-800/30 px-1.5 py-0.5 rounded">
                          {item.platform}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-slate-400 text-xs">{item.type}</td>
                      <td className="py-3 px-2 text-slate-300 text-xs leading-relaxed">{item.content}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {activeTab === 'kolBrief' && (
          <motion.div
            key="kolBrief"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="card p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-teal-400 flex items-center gap-2">
                ⭐ KOL / 达人合作简报
              </h4>
              <CopyButton text={result.kolBrief} />
            </div>
            <div className="bg-[#0f0f1e] rounded-xl px-5 py-4 border border-[#1e1e3a]">
              <pre className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap font-sans">
                {result.kolBrief}
              </pre>
            </div>
          </motion.div>
        )}

        {activeTab === 'sop' && (
          <motion.div
            key="sop"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-teal-400">📋 冷启动30天行动计划</h4>
              <CopyButton
                text={result.sop
                  .map(
                    w =>
                      `${w.week}\nKPI：${w.kpi}\n${w.tasks.map((t, i) => `${i + 1}. ${t}`).join('\n')}`
                  )
                  .join('\n\n')}
              />
            </div>
            {result.sop.map((week, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
                className="card p-5 space-y-3"
              >
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h5 className="text-teal-300 font-semibold text-sm">{week.week}</h5>
                  <span className="text-xs bg-teal-900/30 text-teal-400 border border-teal-800/30 px-2 py-1 rounded-lg">
                    KPI: {week.kpi}
                  </span>
                </div>
                <ul className="space-y-2">
                  {week.tasks.map((task, j) => (
                    <li key={j} className="flex items-start gap-2 text-sm text-slate-300">
                      <span className="text-teal-600 flex-shrink-0 mt-0.5 font-mono text-xs">
                        {String(j + 1).padStart(2, '0')}
                      </span>
                      {task}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function GTMPage() {
  const [step, setStep] = useState<Step>(1);
  const [formData, setFormData] = useState<FormData>({
    productName: '',
    oneLiner: '',
    targetUser: '',
    differentiator: '',
    launchDate: '',
    channels: [],
    budget: '1-5万',
    competitors: '',
    milestones: '',
    constraints: '',
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GTMResult | null>(null);
  const [error, setError] = useState('');

  const updateForm = (partial: Partial<FormData>) => {
    setFormData(prev => ({ ...prev, ...partial }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');

    const userPrompt = `
产品名称：${formData.productName}
一句话卖点：${formData.oneLiner}
目标用户：${formData.targetUser}
核心差异化：${formData.differentiator}
发布日期：${formData.launchDate}
发布渠道：${formData.channels.join('、')}
预算范围：${formData.budget}
${formData.competitors ? `竞争对手：${formData.competitors}` : ''}
${formData.milestones ? `关键里程碑：${formData.milestones}` : ''}
${formData.constraints ? `约束条件：${formData.constraints}` : ''}

请生成完整的GTM发布工具包。`.trim();

    try {
      const raw = await callAI(
        buildGTMSystemPrompt(),
        [{ role: 'user', content: userPrompt }],
        4000
      );

      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('Invalid JSON response');
      const parsed: GTMResult = JSON.parse(jsonMatch[0]);
      setResult(parsed);
    } catch (e) {
      console.error(e);
      setError('生成失败，请稍后重试。若问题持续，检查API配置或缩减输入内容。');
    } finally {
      setLoading(false);
    }
  };

  const handleRestart = () => {
    setResult(null);
    setStep(1);
    setFormData({
      productName: '',
      oneLiner: '',
      targetUser: '',
      differentiator: '',
      launchDate: '',
      channels: [],
      budget: '1-5万',
      competitors: '',
      milestones: '',
      constraints: '',
    });
  };

  return (
    <ToolLayout
      title="GTM 发布台"
      subtitle="输入产品信息 · 一键生成完整发布工具包 · 公告/邮件/社媒/KOL/SOP"
    >
      <AnimatePresence mode="wait">
        {result ? (
          <motion.div key="result" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <ResultView result={result} onRestart={handleRestart} productName={formData.productName} />
          </motion.div>
        ) : loading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-32 space-y-5"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
              className="w-12 h-12 border-2 border-teal-600/30 border-t-teal-400 rounded-full"
            />
            <div className="text-center space-y-2">
              <p className="text-slate-300 font-medium">AI正在生成你的发布工具包...</p>
              <p className="text-slate-500 text-sm">包含5个模块，预计需要30-60秒</p>
            </div>
            <div className="flex gap-3 flex-wrap justify-center">
              {['发布公告', '邮件序列', '社媒日历', 'KOL简报', '冷启动SOP'].map((item, i) => (
                <motion.span
                  key={item}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.3 + 0.5 }}
                  className="text-xs bg-teal-950/30 text-teal-400 border border-teal-800/30 px-2.5 py-1 rounded-full"
                >
                  {item}
                </motion.span>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <ProgressBar step={step} />
            {error && (
              <div className="max-w-xl mx-auto mb-4 bg-red-950/30 border border-red-800/40 rounded-xl px-4 py-3 flex items-start gap-2">
                <span className="text-red-400 mt-0.5">⚠️</span>
                <p className="text-red-300/80 text-sm">{error}</p>
              </div>
            )}
            <AnimatePresence mode="wait">
              <StepForm
                step={step}
                data={formData}
                onChange={updateForm}
                onNext={() => setStep(prev => (prev < 3 ? ((prev + 1) as Step) : prev))}
                onPrev={() => setStep(prev => (prev > 1 ? ((prev - 1) as Step) : prev))}
                onSubmit={handleSubmit}
                loading={loading}
              />
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </ToolLayout>
  );
}
