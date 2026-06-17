'use client';
import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ClientGameState, HumanRole, Participant } from '@/lib/game/types';
import { CountdownTimer } from '@/components/UI/CountdownTimer';

const ROLE_META: Record<HumanRole, {
  icon: string;
  name: string;
  color: string;
  bg: string;
  border: string;
  desc: string;
  actionLabel: string;
  passiveHint: string;
}> = {
  detective: {
    icon: '🔍',
    name: '侦探',
    color: 'text-amber-300',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/40',
    desc: '你拥有独特的洞察力，能在夜间秘密调查一名玩家，获知其真实身份。',
    actionLabel: '秘密调查',
    passiveHint: '',
  },
  guardian: {
    icon: '🛡️',
    name: '守护者',
    color: 'text-blue-300',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/40',
    desc: '你能在夜间庇护一名玩家，使其在本轮处决中获得豁免。',
    actionLabel: '给予保护',
    passiveHint: '',
  },
  analyst: {
    icon: '🧪',
    name: '分析师',
    color: 'text-purple-300',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/40',
    desc: '你能感知语言模式的细微差异，聊天时独家可见每条消息的"AI 可疑度"。',
    actionLabel: '',
    passiveHint: '能力将在聊天阶段自动生效',
  },
  civilian: {
    icon: '⭐',
    name: '平民',
    color: 'text-slate-300',
    bg: 'bg-slate-500/10',
    border: 'border-slate-500/40',
    desc: '你的声音举足轻重。最终投票时，你的票权将计为 ×2。',
    actionLabel: '',
    passiveHint: '能力将在最终投票时自动生效',
  },
};

interface NightPhaseScreenProps {
  state: ClientGameState;
  onSubmitAction: (type: string, targetId: string) => Promise<void>;
  onLeave: () => void;
}

export function NightPhaseScreen({ state, onSubmitAction, onLeave }: NightPhaseScreenProps) {
  const role = state.myHumanRole || 'civilian';
  const meta = ROLE_META[role];
  const [selectedTarget, setSelectedTarget] = useState<string>('');
  const [submitted, setSubmitted] = useState(state.nightActionSubmitted);
  const [submitting, setSubmitting] = useState(false);
  const [showLeave, setShowLeave] = useState(false);
  const isActive = role === 'detective' || role === 'guardian';
  const actionType = role === 'detective' ? 'investigate' : 'protect';

  const eligible = state.participants.filter(
    p => p.id !== state.myId && !state.eliminatedIds.includes(p.id)
  );

  const starPositions = useMemo(() =>
    Array.from({ length: 40 }, (_, i) => ({
      id: i,
      left: `${(i * 7 + 3) % 100}%`,
      top: `${(i * 11 + 7) % 100}%`,
      opacity: 0.1 + (i % 5) * 0.1,
      duration: 2 + (i % 3),
      delay: (i % 4) * 0.75,
    })),
  []);

  const handleSubmit = async () => {
    if (!selectedTarget || submitting || submitted) return;
    setSubmitting(true);
    try {
      await onSubmitAction(actionType, selectedTarget);
      setSubmitted(true);
    } catch {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden bg-[#020814]">
      {/* Starfield background */}
      <div className="absolute inset-0 pointer-events-none">
        {starPositions.map(s => (
          <motion.div
            key={s.id}
            className="absolute w-0.5 h-0.5 bg-white rounded-full"
            style={{ left: s.left, top: s.top, opacity: s.opacity }}
            animate={{ opacity: [s.opacity, s.opacity + 0.4, s.opacity] }}
            transition={{ duration: s.duration, repeat: Infinity, delay: s.delay }}
          />
        ))}
      </div>

      {/* Header */}
      <div className="relative z-10 px-4 pt-5 pb-3 flex items-center justify-between">
        <div>
          <div className="text-blue-400/70 text-xs font-mono tracking-widest">NIGHT PHASE</div>
          <div className="text-white/80 text-sm font-medium mt-0.5">
            夜晚降临 · 第 {state.currentRound + 1} 轮前
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-xs text-slate-500">黎明倒计时</div>
            <CountdownTimer endTime={state.nightEndTime} className="text-base font-bold text-blue-300 font-mono" />
          </div>
          <button onClick={() => setShowLeave(true)} className="text-slate-600 hover:text-slate-400 text-lg">✕</button>
        </div>
      </div>

      {/* Role card */}
      <div className="flex-1 flex flex-col px-4 pb-6 gap-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5 }}
          className={`p-4 rounded-xl border ${meta.bg} ${meta.border}`}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="text-3xl">{meta.icon}</div>
            <div>
              <div className={`text-lg font-bold ${meta.color}`}>{meta.name}</div>
              <div className="text-xs text-slate-500">你的秘密职业</div>
            </div>
            {isActive && (
              <div className={`ml-auto text-xs px-2 py-0.5 rounded-full border ${meta.border} ${meta.color}`}>
                行动型
              </div>
            )}
          </div>
          <p className="text-sm text-slate-300 leading-relaxed">{meta.desc}</p>
          {meta.passiveHint && (
            <div className="mt-2 text-xs text-slate-500 flex items-center gap-1">
              <span>⚡</span> {meta.passiveHint}
            </div>
          )}
        </motion.div>

        {/* Action area for detective / guardian */}
        {isActive && !submitted && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col gap-3"
          >
            <div className={`text-xs font-mono ${meta.color} uppercase tracking-widest`}>
              {meta.actionLabel} — 选择目标
            </div>
            <div className="flex flex-col gap-2 max-h-[280px] overflow-y-auto">
              {eligible.map(p => {
                const isSelected = selectedTarget === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => setSelectedTarget(p.id)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all ${
                      isSelected
                        ? `${meta.bg} ${meta.border} ${meta.color}`
                        : 'bg-white/3 border-white/10 text-slate-300 hover:bg-white/6'
                    }`}
                  >
                    <span className="text-2xl">{p.avatar}</span>
                    <span className="font-medium text-sm">{p.name}</span>
                    {isSelected && <span className={`ml-auto text-lg ${meta.color}`}>✓</span>}
                  </button>
                );
              })}
            </div>

            <motion.button
              onClick={handleSubmit}
              disabled={!selectedTarget || submitting}
              className={`w-full py-3 rounded-xl font-bold text-sm transition-all ${
                selectedTarget && !submitting
                  ? `${meta.bg} ${meta.border} border ${meta.color} hover:opacity-80`
                  : 'bg-white/5 border border-white/10 text-slate-600 cursor-not-allowed'
              }`}
              whileTap={selectedTarget && !submitting ? { scale: 0.97 } : {}}
            >
              {submitting ? '提交中...' : `确认${meta.actionLabel}`}
            </motion.button>
          </motion.div>
        )}

        {/* Submitted confirmation */}
        {isActive && submitted && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`p-4 rounded-xl border ${meta.bg} ${meta.border} text-center`}
          >
            <div className="text-2xl mb-2">✓</div>
            <div className={`font-bold ${meta.color}`}>行动已提交</div>
            <div className="text-xs text-slate-500 mt-1">等待黎明到来，获取结果</div>
          </motion.div>
        )}

        {/* Passive role waiting screen */}
        {!isActive && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="flex-1 flex flex-col items-center justify-center gap-4 py-8"
          >
            <div className="text-4xl animate-pulse">🌙</div>
            <div className="text-slate-400 text-sm text-center leading-relaxed">
              夜晚中，其他玩家正在行动。<br />
              静待黎明，聊天将随即开始。
            </div>
          </motion.div>
        )}

        {/* All roles: role reminder strip */}
        <div className="mt-auto pt-2">
          <div className="text-xs text-slate-600 text-center mb-2">本局职业分布</div>
          <div className="flex justify-center gap-3">
            {(['detective', 'guardian', 'analyst', 'civilian'] as HumanRole[]).map(r => {
              const m = ROLE_META[r];
              return (
                <div key={r} className={`flex flex-col items-center gap-0.5 ${r === role ? m.color : 'text-slate-700'}`}>
                  <span className="text-sm">{m.icon}</span>
                  <span className="text-[9px]">{m.name}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Leave confirm */}
      <AnimatePresence>
        {showLeave && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 z-50 flex items-end"
            onClick={() => setShowLeave(false)}
          >
            <motion.div
              initial={{ y: 80 }}
              animate={{ y: 0 }}
              exit={{ y: 80 }}
              className="w-full bg-[#0f1623] border-t border-slate-700 p-6 rounded-t-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="text-white font-bold text-center mb-4">确认退出游戏？</div>
              <div className="flex flex-col gap-2">
                <button
                  onClick={onLeave}
                  className="w-full py-3 bg-red-500/20 border border-red-500/40 text-red-400 rounded-xl font-medium text-sm"
                >
                  退出游戏
                </button>
                <button
                  onClick={() => setShowLeave(false)}
                  className="w-full py-3 bg-white/5 border border-white/10 text-slate-300 rounded-xl font-medium text-sm"
                >
                  继续游戏
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
