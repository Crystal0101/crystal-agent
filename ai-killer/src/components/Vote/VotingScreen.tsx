'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ClientGameState, Participant } from '@/lib/game/types';
import { CountdownTimer } from '@/components/UI/CountdownTimer';

interface VotingProps {
  state: ClientGameState;
  onSubmitVote: (targetId: string) => void;
  onLeave: () => void;
}

export function VotingScreen({ state, onSubmitVote, onLeave }: VotingProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [voted, setVoted] = useState(false);

  const myVote = state.votes.find(v => v.voterId === state.myId);
  const hasVoted = voted || !!myVote;

  const getVoteCount = (id: string) =>
    state.votes.filter(v => v.targetId === id).length;

  const candidates = state.participants.filter(p =>
    p.id !== state.myId && !state.eliminatedIds?.includes(p.id)
  );

  // Evidence: count 🤔 reactions on each player's messages
  const suspicionMap: Record<string, number> = {};
  for (const msg of state.messages) {
    const count = state.reactions[msg.id]?.['🤔']?.length || 0;
    if (count > 0) suspicionMap[msg.senderId] = (suspicionMap[msg.senderId] || 0) + count;
  }
  const maxSuspicion = Math.max(1, ...Object.values(suspicionMap));

  const handleVote = () => {
    if (!selected || hasVoted) return;
    onSubmitVote(selected);
    setVoted(true);
  };

  return (
    <div className="min-h-screen flex flex-col p-4">
      {/* Header */}
      <div className="text-center py-6 relative">
        <button onClick={onLeave} className="absolute right-0 top-6 text-slate-500 hover:text-slate-300 text-lg px-2">✕</button>
        <motion.div
          animate={{ rotate: [0, -10, 10, -10, 0] }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="text-5xl mb-3"
        >
          🔍
        </motion.div>
        <h2 className="text-2xl font-bold text-white">投票时间</h2>
        <p className="text-slate-400 text-sm mt-1">你认为谁是AI？</p>

        <div className="flex items-center justify-center gap-2 mt-3">
          <span className="text-slate-500 text-sm">剩余时间:</span>
          <CountdownTimer endTime={state.voteEndTime} className="text-xl font-bold text-purple-400" />
        </div>
      </div>

      {/* Vote progress */}
      <div className="cyber-card p-3 mb-4 flex items-center justify-between">
        <span className="text-sm text-slate-400">已投票</span>
        <span className="text-sm font-semibold text-purple-400">
          {state.votes.length} / {state.participants.filter(p => !('isAI' in p && (p as { isAI?: boolean }).isAI) && !state.eliminatedIds?.includes(p.id)).length}
        </span>
      </div>

      {/* Candidates */}
      <div className="flex-1 space-y-3">
        {candidates.map((p, i) => {
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
                  ? 'border-purple-500 bg-purple-900/20 border-glow-purple'
                  : 'border-cyber-border bg-cyber-card hover:border-slate-600'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="text-3xl">{p.avatar}</div>
                <div className="flex-1">
                  <div className="font-semibold text-white flex items-center gap-2">
                    {p.name}
                    {(suspicionMap[id] || 0) >= 2 && (
                      <span className="text-xs bg-orange-900/40 border border-orange-700/40 text-orange-400 px-1.5 py-0.5 rounded-full">
                        🤔 ×{suspicionMap[id]}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {voteCount > 0 ? `${voteCount}票` : '暂无票数'}
                  </div>
                </div>
                {hasVoted && isMyVote && (
                  <span className="text-red-400 text-sm font-semibold">我的票</span>
                )}
                {isSelected && !hasVoted && (
                  <span className="text-purple-400 text-2xl">●</span>
                )}
              </div>

              {/* Suspicion bar */}
              {(suspicionMap[id] || 0) > 0 && (
                <div className="mt-1.5 mb-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-500">可疑度</span>
                    <div className="flex-1 h-1 bg-cyber-border rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(suspicionMap[id] / maxSuspicion) * 100}%` }}
                        className="h-full bg-gradient-to-r from-yellow-600 to-orange-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Vote bar */}
              {voteCount > 0 && (
                <div className="mt-2 h-1 bg-cyber-border rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(voteCount / state.participants.filter(p => !('isAI' in p && p.isAI)).length) * 100}%` }}
                    className="h-full bg-gradient-to-r from-purple-600 to-pink-500"
                  />
                </div>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Submit button */}
      <div className="mt-6 pb-4">
        {!hasVoted ? (
          <button
            className="btn-danger w-full py-4 text-lg"
            onClick={handleVote}
            disabled={!selected}
          >
            {selected ? `指认 ${candidates.find(p => p.id === selected)?.name} 是AI` : '请选择一位玩家'}
          </button>
        ) : (
          <div className="text-center py-4 text-slate-400 text-sm">
            ✓ 投票完成，等待其他玩家...
          </div>
        )}
      </div>
    </div>
  );
}
