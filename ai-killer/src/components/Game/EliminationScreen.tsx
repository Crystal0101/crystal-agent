'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ClientGameState, Participant } from '@/lib/game/types';
import { CountdownTimer } from '@/components/UI/CountdownTimer';

interface EliminationProps {
  state: ClientGameState;
  onSubmitVote: (targetId: string) => void;
}

export function EliminationScreen({ state, onSubmitVote }: EliminationProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [voted, setVoted] = useState(false);

  const myVote = state.eliminationVotes.find(v => v.voterId === state.myId);
  const hasVoted = voted || !!myVote;
  const showResult = !!state.eliminationResult;

  const eligible = state.participants.filter(
    p => p.id !== state.myId && !state.eliminatedIds.includes(p.id)
  );

  const getVoteCount = (id: string) =>
    state.eliminationVotes.filter(v => v.targetId === id).length;

  // Build evidence: message count + suspicion reactions per player
  const evidenceMap: Record<string, { msgs: number; suspicion: number; lastMsg?: string }> = {};
  for (const msg of state.messages) {
    if (msg.isSystem) continue;
    if (!evidenceMap[msg.senderId]) evidenceMap[msg.senderId] = { msgs: 0, suspicion: 0 };
    evidenceMap[msg.senderId].msgs++;
    evidenceMap[msg.senderId].lastMsg = msg.content;
    evidenceMap[msg.senderId].suspicion += state.reactions[msg.id]?.['🤔']?.length || 0;
  }
  const maxSuspicion = Math.max(1, ...Object.values(evidenceMap).map(e => e.suspicion));

  const handleVote = () => {
    if (!selected || hasVoted) return;
    onSubmitVote(selected);
    setVoted(true);
  };

  const totalVoters = state.participants.filter(
    p => !('isAI' in p && p.isAI) && !state.eliminatedIds.includes(p.id)
  ).length;

  if (showResult && state.eliminationResult) {
    const { eliminatedId, wasAI } = state.eliminationResult;
    const eliminated = eliminatedId
      ? state.participants.find(p => p.id === eliminatedId)
      : null;

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#0a0a14]"
      >
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', bounce: 0.5 }}
          className="text-center space-y-4"
        >
          {eliminated ? (
            <>
              <motion.div
                animate={{ rotate: [0, -10, 10, -10, 0] }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="text-7xl"
              >
                {wasAI ? '🤖' : '😱'}
              </motion.div>
              <div className="text-4xl font-black text-white">{eliminated.avatar}</div>
              <h2 className="text-2xl font-bold text-white">{eliminated.name}</h2>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.5, type: 'spring' }}
                className={`text-2xl font-black px-6 py-2 rounded-full ${
                  wasAI
                    ? 'bg-purple-900/60 text-purple-200 border-2 border-purple-500'
                    : 'bg-red-900/60 text-red-200 border-2 border-red-500'
                }`}
              >
                {wasAI ? '确实是AI！' : '误杀无辜！😭'}
              </motion.div>
              <p className="text-slate-400 text-sm mt-2">
                {wasAI
                  ? '人类的直觉很准！继续下一轮...'
                  : '一位无辜者被错误处决了...'}
              </p>
            </>
          ) : (
            <>
              <div className="text-6xl">🤷</div>
              <h2 className="text-xl font-bold text-white">未形成多数票</h2>
              <p className="text-slate-400 text-sm">本轮无人被处决，继续下一轮...</p>
            </>
          )}
        </motion.div>
      </motion.div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a14] p-4">
      {/* Header */}
      <div className="text-center py-5">
        <motion.div
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ duration: 0.8, repeat: Infinity }}
          className="text-5xl mb-3"
        >
          ⚔️
        </motion.div>
        <h2 className="text-2xl font-bold text-white">处决投票</h2>
        <p className="text-red-400 text-sm mt-1">多数票处决最可疑的人，揭示其身份</p>

        <div className="flex items-center justify-center gap-2 mt-3">
          <span className="text-slate-500 text-sm">倒计时:</span>
          <CountdownTimer endTime={state.eliminationEndTime} className="text-xl font-bold text-red-400" />
        </div>
      </div>

      {/* Vote progress */}
      <div className="cyber-card p-3 mb-4 flex items-center justify-between">
        <span className="text-sm text-slate-400">已投票人数</span>
        <span className="text-sm font-semibold text-red-400">
          {state.eliminationVotes.length} / {totalVoters}
        </span>
      </div>

      {/* Warning banner */}
      <div className="mb-4 p-3 rounded-xl bg-red-950/30 border border-red-900/40 text-center">
        <p className="text-red-300 text-xs leading-relaxed">
          ⚠️ 处决人类会被反扣分！AI不会参与此投票，被处决者的身份将立即揭示。
        </p>
      </div>

      {/* Candidates */}
      <div className="flex-1 space-y-3">
        {eligible.map((p, i) => {
          const id = p.id;
          const voteCount = getVoteCount(id);
          const isSelected = selected === id;
          const isMyVote = myVote?.targetId === id;

          return (
            <motion.button
              key={id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              onClick={() => !hasVoted && setSelected(isSelected ? null : id)}
              className={`w-full p-4 rounded-xl border transition-all text-left ${
                hasVoted && isMyVote
                  ? 'border-red-500 bg-red-900/20'
                  : isSelected && !hasVoted
                  ? 'border-red-500 bg-red-900/20 border-glow-purple'
                  : 'border-cyber-border bg-cyber-card hover:border-red-800'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="text-3xl">{p.avatar}</div>
                <div className="flex-1">
                  <div className="font-semibold text-white flex items-center gap-2">
                    {p.name}
                    {(evidenceMap[id]?.suspicion || 0) >= 2 && (
                      <span className="text-xs bg-orange-900/40 border border-orange-700/50 text-orange-400 px-1.5 py-0.5 rounded-full">
                        🤔 ×{evidenceMap[id].suspicion}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {evidenceMap[id] ? `发言${evidenceMap[id].msgs}条` : '未发言'}
                    {voteCount > 0 ? ` · ${voteCount}票` : ''}
                  </div>
                  {evidenceMap[id]?.lastMsg && (
                    <div className="text-xs text-slate-500 mt-0.5 line-clamp-1 italic">
                      最后说："{evidenceMap[id].lastMsg}"
                    </div>
                  )}
                </div>
                {isSelected && !hasVoted && <span className="text-red-400 text-2xl">⚔️</span>}
                {hasVoted && isMyVote && <span className="text-red-400 text-sm font-semibold">我投了</span>}
              </div>

              {/* Suspicion bar */}
              {(evidenceMap[id]?.suspicion || 0) > 0 && (
                <div className="mt-1.5 flex items-center gap-1.5">
                  <span className="text-xs text-slate-500">可疑度</span>
                  <div className="flex-1 h-0.5 bg-cyber-border rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${((evidenceMap[id]?.suspicion || 0) / maxSuspicion) * 100}%` }}
                      className="h-full bg-gradient-to-r from-yellow-600 to-orange-500"
                    />
                  </div>
                </div>
              )}

              {voteCount > 0 && (
                <div className="mt-1 h-1 bg-cyber-border rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(voteCount / totalVoters) * 100}%` }}
                    className="h-full bg-gradient-to-r from-red-700 to-orange-500"
                  />
                </div>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Submit */}
      <div className="mt-5 pb-4">
        {!hasVoted ? (
          <button
            className={`w-full py-4 text-lg font-bold rounded-xl transition-all ${
              selected
                ? 'bg-gradient-to-r from-red-700 to-orange-600 text-white hover:from-red-600 hover:to-orange-500'
                : 'bg-cyber-card border border-cyber-border text-slate-500 cursor-not-allowed'
            }`}
            onClick={handleVote}
            disabled={!selected}
          >
            {selected
              ? `⚔️ 处决 ${eligible.find(p => p.id === selected)?.name}`
              : '选择你要处决的人'}
          </button>
        ) : (
          <div className="text-center py-4 text-slate-400 text-sm">
            ✓ 投票完成，等待结果...
          </div>
        )}
      </div>
    </div>
  );
}
