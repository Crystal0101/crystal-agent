'use client';
import { motion } from 'framer-motion';
import { ClientGameState, Participant } from '@/lib/game/types';

interface LobbyProps {
  state: ClientGameState;
  onStartGame: () => void;
  onReady: () => void;
  onLeave: () => void;
}

export function LobbyScreen({ state, onStartGame, onReady, onLeave }: LobbyProps) {
  const me = state.participants.find(p => p.id === state.myId) as Participant & { isReady?: boolean; isHost?: boolean };
  const isHost = state.hostId === state.myId;
  const humanPlayers = state.participants.filter(p => !('isAI' in p && p.isAI));
  const allReady = humanPlayers.every(p => ('isReady' in p && p.isReady));

  const difficultyLabels: Record<string, string> = {
    normal: '普通',
    advanced: '进阶',
    master: '大师',
  };

  return (
    <div className="min-h-screen flex flex-col p-4">
      {/* Header */}
      <div className="text-center py-6 relative">
        <button onClick={onLeave} className="absolute right-0 top-6 text-slate-500 hover:text-slate-300 text-lg px-2">✕</button>
        <div className="text-4xl mb-2">🎮</div>
        <h2 className="text-2xl font-bold text-white">等待玩家</h2>
        <div className="flex items-center justify-center gap-2 mt-2">
          <span className="text-slate-400 text-sm">房间号</span>
          <span className="font-mono font-bold text-cyber-purple-light tracking-widest text-lg">
            {state.roomId}
          </span>
          <button
            onClick={() => navigator.clipboard?.writeText(state.roomId)}
            className="text-slate-500 hover:text-slate-300 text-xs"
          >
            复制
          </button>
        </div>
      </div>

      {/* Players */}
      <div className="cyber-card p-4 mb-4">
        <div className="text-sm text-slate-400 mb-3">
          玩家 ({humanPlayers.length}人)
          {state.config.aiCount > 0 && (
            <span className="ml-2 text-purple-400">+ {state.config.aiCount}个AI</span>
          )}
        </div>
        <div className="space-y-2">
          {humanPlayers.map((p, i) => {
            const player = p as Participant & { isReady?: boolean; isHost?: boolean; isOnline?: boolean };
            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="flex items-center gap-3 p-2 rounded-lg bg-cyber-border/30"
              >
                <span className="text-2xl">{p.avatar}</span>
                <div className="flex-1">
                  <span className="text-white font-medium">{p.name}</span>
                  {player.isHost && (
                    <span className="ml-2 text-xs text-yellow-400 bg-yellow-400/10 px-1.5 py-0.5 rounded">房主</span>
                  )}
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  player.isOnline === false ? 'bg-gray-700 text-gray-400' :
                  player.isReady ? 'bg-green-900/40 text-green-400' : 'bg-slate-700 text-slate-400'
                }`}>
                  {player.isOnline === false ? '已离线' : player.isReady ? '已准备' : '等待中'}
                </span>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Config summary */}
      <div className="cyber-card p-4 mb-4 grid grid-cols-2 gap-3 text-sm">
        <div className="text-center">
          <div className="text-slate-400 text-xs mb-1">AI数量</div>
          <div className="text-purple-400 font-semibold">{state.config.aiCount}个</div>
        </div>
        <div className="text-center">
          <div className="text-slate-400 text-xs mb-1">AI难度</div>
          <div className="text-purple-400 font-semibold">{difficultyLabels[state.config.aiDifficulty]}</div>
        </div>
        <div className="text-center">
          <div className="text-slate-400 text-xs mb-1">聊天轮数</div>
          <div className="text-cyan-400 font-semibold">{state.config.maxRounds}轮</div>
        </div>
        <div className="text-center">
          <div className="text-slate-400 text-xs mb-1">每轮时长</div>
          <div className="text-cyan-400 font-semibold">{state.config.roundDuration}秒</div>
        </div>
      </div>

      {/* Role system teaser */}
      <div className="cyber-card p-3 mb-3">
        <div className="text-xs text-slate-500 mb-2 uppercase tracking-widest font-mono">开局将分配秘密职业</div>
        <div className="grid grid-cols-2 gap-1.5">
          {([
            { icon: '🔍', name: '侦探', desc: '每夜调查1人身份' },
            { icon: '🛡️', name: '守护者', desc: '每夜保护1人免于处决' },
            { icon: '🧪', name: '分析师', desc: '独家可见AI可疑度' },
            { icon: '⭐', name: '平民', desc: '最终投票票权×2' },
          ] as const).map(r => (
            <div key={r.name} className="flex items-start gap-1.5 bg-white/3 rounded-lg px-2 py-1.5">
              <span className="text-sm flex-shrink-0 mt-0.5">{r.icon}</span>
              <div>
                <div className="text-xs text-slate-300 font-medium">{r.name}</div>
                <div className="text-[10px] text-slate-600">{r.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Elimination mode badge */}
      {state.config.eliminationMode && (
        <div className="cyber-card p-3 mb-4 flex items-center gap-3 border-red-800/40 bg-red-950/20">
          <span className="text-2xl">⚔️</span>
          <div>
            <div className="text-red-300 text-sm font-semibold">处决模式已开启</div>
            <div className="text-xs text-red-400/70">每轮聊天结束后，多数票处决最可疑的人</div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="mt-auto space-y-3">
        {isHost ? (
          <button
            className="btn-primary w-full py-4 text-lg"
            onClick={onStartGame}
            disabled={humanPlayers.length < 1}
          >
            开始游戏
          </button>
        ) : (
          <button
            className="btn-secondary w-full py-4 text-lg"
            onClick={onReady}
          >
            {(me as { isReady?: boolean })?.isReady ? '✓ 已准备' : '准备好了'}
          </button>
        )}
        <p className="text-center text-xs text-slate-500">
          {isHost ? '邀请朋友加入后点击开始游戏' : '等待房主开始游戏'}
        </p>
      </div>
    </div>
  );
}
