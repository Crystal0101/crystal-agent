'use client';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ClientGameState, Participant, HumanRole } from '@/lib/game/types';

const HUMAN_ROLE_META: Record<HumanRole, { icon: string; name: string }> = {
  detective: { icon: '🔍', name: '侦探' },
  guardian:  { icon: '🛡️', name: '守护者' },
  analyst:   { icon: '🧪', name: '分析师' },
  civilian:  { icon: '⭐', name: '平民' },
};

function Confetti({ active }: { active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles: { x: number; y: number; vx: number; vy: number; color: string; size: number; rot: number; rotV: number }[] = [];
    const colors = ['#a855f7', '#06b6d4', '#ec4899', '#f59e0b', '#10b981'];

    for (let i = 0; i < 80; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: -20,
        vx: (Math.random() - 0.5) * 4,
        vy: Math.random() * 3 + 2,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 6 + 4,
        rot: Math.random() * 360,
        rotV: (Math.random() - 0.5) * 6,
      });
    }

    let animId: number;
    function draw() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.05;
        p.rot += p.rotV;
        if (p.y < canvas.height + 20) alive = true;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rot * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size / 2);
        ctx.restore();
      }
      if (alive) animId = requestAnimationFrame(draw);
    }

    animId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animId);
  }, [active]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-50"
      style={{ opacity: active ? 1 : 0 }}
    />
  );
}

interface ResultsProps {
  state: ClientGameState;
  onPlayAgain: () => void;
  isHost: boolean;
  onLeave: () => void;
}

type Phase = 'drum' | 'reveal' | 'final' | 'replay';

export function ResultsScreen({ state, onPlayAgain, isHost, onLeave }: ResultsProps) {
  const result = state.result;
  const [phase, setPhase] = useState<Phase>('drum');
  const [revealedCount, setRevealedCount] = useState(0);
  const [showReplay, setShowReplay] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  const participants = state.participants;

  useEffect(() => {
    // Drum roll phase
    const t1 = setTimeout(() => setPhase('reveal'), 2200);
    return () => clearTimeout(t1);
  }, []);

  useEffect(() => {
    if (phase !== 'reveal') return;
    if (revealedCount >= participants.length) {
      const t = setTimeout(() => {
        setPhase('final');
        if (result?.winners === 'humans') setShowConfetti(true);
      }, 1000);
      return () => clearTimeout(t);
    }
    const delay = revealedCount === 0 ? 400 : 900;
    const t = setTimeout(() => setRevealedCount(n => n + 1), delay);
    return () => clearTimeout(t);
  }, [phase, revealedCount, participants.length, result?.winners]);

  if (!result) return null;

  const winnerText = { humans: '人类获胜！', ai: 'AI成功伪装！', draw: '势均力敌' }[result.winners];
  const winnerEmoji = { humans: '🏆', ai: '🤖', draw: '🤝' }[result.winners];
  const winnerColor = { humans: 'text-emerald-400', ai: 'text-purple-400', draw: 'text-yellow-400' }[result.winners];
  const sortedScores = Object.entries(result.playerScores).sort(([, a], [, b]) => (b as number) - (a as number));

  const getParticipant = (id: string) => participants.find(p => p.id === id);

  const aiMessages = state.messages.filter(m => m.isAI && !m.isSystem);
  const humanMessages = state.messages.filter(m => !m.isAI && !m.isSystem);

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a14]">
      <Confetti active={showConfetti} />
      <AnimatePresence mode="wait">

        {/* ── Drum roll ── */}
        {phase === 'drum' && (
          <motion.div
            key="drum"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.3 }}
            className="flex-1 flex flex-col items-center justify-center gap-6 p-8"
          >
            <motion.div
              animate={{ scale: [1, 1.1, 1], rotate: [0, -5, 5, -5, 0] }}
              transition={{ duration: 0.6, repeat: Infinity }}
              className="text-7xl"
            >
              🥁
            </motion.div>
            <motion.div
              className="text-2xl font-bold text-white text-center"
              animate={{ opacity: [1, 0.4, 1] }}
              transition={{ duration: 0.4, repeat: Infinity }}
            >
              身份揭晓中...
            </motion.div>
            <div className="flex gap-1">
              {[0, 1, 2, 3, 4].map(i => (
                <motion.div
                  key={i}
                  className="w-2 h-2 rounded-full bg-purple-400"
                  animate={{ scale: [1, 1.6, 1] }}
                  transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.1 }}
                />
              ))}
            </div>
          </motion.div>
        )}

        {/* ── Card flip reveal ── */}
        {(phase === 'reveal' || phase === 'final') && !showReplay && (
          <motion.div
            key="reveal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex-1 flex flex-col p-4"
          >
            {/* Winner banner (shows after all revealed) */}
            <AnimatePresence>
              {phase === 'final' && (
                <motion.div
                  initial={{ opacity: 0, y: -30, scale: 0.8 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ type: 'spring', bounce: 0.5 }}
                  className="text-center py-5"
                >
                  <div className="text-5xl mb-2">{winnerEmoji}</div>
                  <h2 className={`text-2xl font-black ${winnerColor}`}>{winnerText}</h2>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Identity cards */}
            <div className="space-y-2.5">
              {participants.map((p, i) => {
                const isRevealed = i < revealedCount;
                const identity = result.identityReveal[p.id];
                const score = (result.playerScores[p.id] as number) || 0;
                const isActualAI = 'isAI' in p && p.isAI;

                return (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, x: -40 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    {!isRevealed ? (
                      /* Face-down card */
                      <div className="cyber-card p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-cyber-border flex items-center justify-center text-xl grayscale">
                          {p.avatar}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-slate-300">{p.name}</div>
                        </div>
                        <motion.div
                          animate={{ opacity: [0.3, 1, 0.3] }}
                          transition={{ duration: 1, repeat: Infinity }}
                          className="text-slate-500 text-sm"
                        >
                          ???
                        </motion.div>
                      </div>
                    ) : (
                      /* Revealed card */
                      <motion.div
                        initial={{ scale: 1.1, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: 'spring', bounce: 0.4 }}
                        className={`p-4 rounded-xl border flex items-center gap-3 ${
                          isActualAI
                            ? 'bg-purple-950/40 border-purple-600/50'
                            : identity?.role === 'impostor'
                            ? 'bg-pink-950/40 border-pink-600/50'
                            : 'bg-emerald-950/20 border-emerald-800/40'
                        }`}
                      >
                        <div className="relative">
                          <span className="text-3xl">{p.avatar}</span>
                          {isActualAI && (
                            <motion.span
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="absolute -top-1 -right-1 text-sm"
                            >
                              🤖
                            </motion.span>
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold text-white">{p.name}</div>
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: 'auto' }}
                            className="overflow-hidden flex items-center gap-1 mt-0.5 flex-wrap"
                          >
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full inline-block ${
                              isActualAI
                                ? 'bg-purple-800/50 text-purple-200'
                                : identity?.role === 'impostor'
                                ? 'bg-pink-800/50 text-pink-200'
                                : 'bg-emerald-800/40 text-emerald-200'
                            }`}>
                              {isActualAI ? '🤖 真AI' : identity?.role === 'impostor' ? '🎭 卧底人类' : '✅ 普通人类'}
                            </span>
                            {!isActualAI && identity?.humanRole && HUMAN_ROLE_META[identity.humanRole] && (
                              <span className="text-xs px-1.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-slate-400">
                                {HUMAN_ROLE_META[identity.humanRole].icon} {HUMAN_ROLE_META[identity.humanRole].name}
                              </span>
                            )}
                          </motion.div>
                        </div>
                        <div className={`font-mono font-bold text-lg ${score > 0 ? 'text-emerald-400' : score < 0 ? 'text-red-400' : 'text-slate-400'}`}>
                          {score > 0 ? `+${score}` : score}
                        </div>
                      </motion.div>
                    )}
                  </motion.div>
                );
              })}
            </div>

            {/* Scoreboard + actions */}
            <AnimatePresence>
              {phase === 'final' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="mt-4 space-y-3"
                >
                  {/* Vote details */}
                  {state.votes.length > 0 && (
                    <div className="cyber-card p-4">
                      <div className="text-xs text-slate-400 mb-2 font-semibold uppercase tracking-wide">投票详情</div>
                      <div className="space-y-1.5">
                        {state.votes.map((vote, i) => {
                          const voter = getParticipant(vote.voterId);
                          const target = getParticipant(vote.targetId);
                          const targetIdentity = result.identityReveal[vote.targetId];
                          const wasCorrect = targetIdentity?.isAI === true;
                          return (
                            <motion.div
                              key={i}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ delay: 0.3 + i * 0.05 }}
                              className="flex items-center gap-2 text-sm"
                            >
                              <span className="text-base">{voter?.avatar}</span>
                              <span className="text-slate-300 text-xs">{voter?.name}</span>
                              <span className="text-slate-600 text-xs">→</span>
                              <span className="text-base">{target?.avatar}</span>
                              <span className="text-slate-300 text-xs">{target?.name}</span>
                              <span className={`ml-auto text-xs font-semibold ${wasCorrect ? 'text-emerald-400' : 'text-red-400'}`}>
                                {wasCorrect ? '✓ 正确' : '✗ 错误'}
                              </span>
                            </motion.div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Investigation history */}
                  {result.investigationHistory?.length > 0 && (
                    <div className="cyber-card p-4">
                      <div className="text-xs text-amber-400/80 mb-2 font-semibold uppercase tracking-wide">🔍 侦探调查记录</div>
                      <div className="space-y-1.5">
                        {result.investigationHistory.map((rec, i) => (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.3 + i * 0.08 }}
                            className="flex items-center gap-2 text-xs"
                          >
                            <span className="text-slate-500">第{rec.round}轮</span>
                            <span className="text-slate-400">调查</span>
                            <span className="text-slate-300 font-medium">{rec.targetName}</span>
                            <span className="text-slate-600">→</span>
                            <span className={`font-bold ${rec.isAI ? 'text-red-400' : 'text-emerald-400'}`}>
                              {rec.isAI ? '🤖 AI' : '👤 人类'}
                            </span>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Replay button */}
                  <button
                    onClick={() => setShowReplay(true)}
                    className="w-full py-2.5 rounded-xl border border-purple-600/40 text-purple-300 text-sm font-medium hover:bg-purple-900/20 transition-colors"
                  >
                    🔍 复盘：查看哪些消息是AI发的
                  </button>

                  {/* Scoreboard */}
                  <div className="cyber-card p-4">
                    <div className="text-xs text-slate-400 mb-2 font-semibold uppercase tracking-wide">本局排名</div>
                    {sortedScores.map(([id, rawScore], i) => {
                      const p = getParticipant(id);
                      const score = rawScore as number;
                      if (!p) return null;
                      return (
                        <motion.div
                          key={id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.4 + i * 0.07 }}
                          className="flex items-center gap-3 py-2 border-b border-cyber-border/30 last:border-0"
                        >
                          <span className="text-slate-500 text-sm w-5 text-center font-bold">
                            {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                          </span>
                          <span className="text-xl">{p.avatar}</span>
                          <span className="flex-1 text-sm text-white">{p.name}</span>
                          <span className={`font-mono font-bold ${score > 0 ? 'text-emerald-400' : score < 0 ? 'text-red-400' : 'text-slate-400'}`}>
                            {score > 0 ? `+${score}` : score}
                          </span>
                        </motion.div>
                      );
                    })}
                  </div>

                  <div className="pb-4 space-y-2">
                    {isHost && (
                      <button className="btn-primary w-full py-3.5 text-base font-bold" onClick={onPlayAgain}>
                        🔄 再来一局
                      </button>
                    )}
                    {!isHost && (
                      <p className="text-center text-sm text-slate-500 py-2">等待房主开始新一局...</p>
                    )}
                    <button className="btn-secondary w-full" onClick={onLeave}>
                      退出
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* ── Message Replay ── */}
        {showReplay && (
          <motion.div
            key="replay"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex-1 flex flex-col"
          >
            <div className="glass sticky top-0 z-10 px-4 py-3 flex items-center gap-3">
              <button onClick={() => setShowReplay(false)} className="text-slate-400 hover:text-white text-lg">←</button>
              <div>
                <div className="text-white font-semibold text-sm">聊天复盘</div>
                <div className="text-xs text-slate-500">
                  {aiMessages.length}条AI消息 / {humanMessages.length}条人类消息
                </div>
              </div>
              {/* Legend */}
              <div className="ml-auto flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-400 inline-block" />AI</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-500 inline-block" />人类</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2 pb-8">
              {state.messages.filter(m => !m.isSystem).map((msg, i) => {
                const isAI = msg.isAI;
                const isMe = msg.senderId === state.myId;
                const aiIdx = state.participants.findIndex(p => p.id === msg.senderId);
                const sender = state.participants.find(p => p.id === msg.senderId);
                const identity = result.identityReveal[msg.senderId];

                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className={`flex gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
                  >
                    <div className="relative flex-shrink-0">
                      <span className="text-xl mt-1 block">{sender?.avatar || msg.senderAvatar}</span>
                      {isAI && (
                        <span className="absolute -bottom-0.5 -right-0.5 text-xs">🤖</span>
                      )}
                    </div>
                    <div className={`max-w-[75%] flex flex-col gap-0.5 ${isMe ? 'items-end' : 'items-start'}`}>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-slate-400">{msg.senderName}</span>
                        {isAI && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-900/60 text-purple-300 border border-purple-700/50 font-semibold">
                            AI
                          </span>
                        )}
                        {identity?.role === 'impostor' && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-pink-900/60 text-pink-300 border border-pink-700/50 font-semibold">
                            卧底
                          </span>
                        )}
                      </div>
                      <div className={`rounded-2xl px-3 py-2 text-sm ${
                        isAI
                          ? 'bg-purple-950/60 border border-purple-600/40 text-purple-100 rounded-tl-sm'
                          : isMe
                          ? 'bg-gradient-to-br from-slate-700 to-slate-600 text-white rounded-tr-sm'
                          : 'bg-cyber-card border border-cyber-border text-slate-200 rounded-tl-sm'
                      }`}>
                        {msg.content}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            <div className="glass sticky bottom-0 px-4 py-3">
              <div className="flex gap-3">
                {isHost && (
                  <button className="btn-primary flex-1 py-3 font-bold" onClick={onPlayAgain}>
                    🔄 再来一局
                  </button>
                )}
                <button className="btn-secondary flex-1 py-3" onClick={onLeave}>
                  退出
                </button>
              </div>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
