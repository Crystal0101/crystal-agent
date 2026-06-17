'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ClientGameState, GameConfig, AIDifficulty } from '@/lib/game/types';

const AVATARS = ['😎', '🦊', '🐸', '🐼', '🦁', '🐯', '🦅', '🦋', '🦄', '🐲'];

const DEFAULT_CONFIG: GameConfig = {
  aiCount: 1,
  aiDifficulty: 'normal',
  impostorCount: 0,
  maxRounds: 3,
  roundDuration: 90,
  voteDuration: 60,
  eliminationMode: false,
};

interface HomePageProps {
  onCreateRoom: (playerName: string, avatar: string, config: GameConfig) => Promise<ClientGameState>;
  onJoinRoom: (roomId: string, playerName: string, avatar: string) => Promise<ClientGameState>;
}

export function HomePage({ onCreateRoom, onJoinRoom }: HomePageProps) {
  const [mode, setMode] = useState<'home' | 'create' | 'join'>('home');
  const [playerName, setPlayerName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0]);
  const [joinRoomId, setJoinRoomId] = useState('');
  const [config, setConfig] = useState<GameConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    if (!playerName.trim()) return setError('请输入你的名字');
    setLoading(true);
    setError('');
    try {
      await onCreateRoom(playerName.trim(), selectedAvatar, config);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '创建失败');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!playerName.trim()) return setError('请输入你的名字');
    if (!joinRoomId.trim()) return setError('请输入房间号');
    setLoading(true);
    setError('');
    try {
      await onJoinRoom(joinRoomId.trim(), playerName.trim(), selectedAvatar);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '加入失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <motion.div
          className="text-6xl mb-3"
          animate={{ rotate: [0, -8, 8, -8, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
        >
          🤖
        </motion.div>
        <h1 className="text-5xl font-bold mb-1" style={{ color: '#a855f7', textShadow: '0 0 30px rgba(168,85,247,0.5)' }}>
          AI杀
        </h1>
        <p className="text-slate-400 text-sm">人与AI同台 · 互相伪装 · 互相识破</p>
        <div className="flex justify-center gap-3 mt-3">
          <span className="text-xs bg-purple-900/40 border border-purple-700/40 text-purple-300 px-2.5 py-1 rounded-full">真实聊天话题</span>
          <span className="text-xs bg-cyan-900/40 border border-cyan-700/40 text-cyan-300 px-2.5 py-1 rounded-full">AI大师伪装</span>
          <span className="text-xs bg-pink-900/40 border border-pink-700/40 text-pink-300 px-2.5 py-1 rounded-full">多人对战</span>
        </div>
      </motion.div>

      <AnimatePresence mode="wait">
        {mode === 'home' && (
          <motion.div
            key="home"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="w-full max-w-sm space-y-3"
          >
            <button
              className="btn-primary w-full text-lg py-4"
              onClick={() => setMode('create')}
            >
              ✦ 创建房间
            </button>
            <button
              className="btn-secondary w-full text-lg py-4"
              onClick={() => setMode('join')}
            >
              → 加入房间
            </button>

            {/* Game intro */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="cyber-card p-4 mt-4 space-y-3 text-sm"
            >
              <div className="text-slate-300 font-semibold text-xs uppercase tracking-widest mb-3">游戏玩法</div>
              <div className="flex gap-3 items-start">
                <span className="text-xl flex-shrink-0">💬</span>
                <div>
                  <p className="text-white text-sm font-medium">真实话题聊天</p>
                  <p className="text-slate-500 text-xs mt-0.5">房间里混入了AI，大家一起聊深度话题</p>
                </div>
              </div>
              <div className="flex gap-3 items-start">
                <span className="text-xl flex-shrink-0">🔍</span>
                <div>
                  <p className="text-white text-sm font-medium">识破AI身份</p>
                  <p className="text-slate-500 text-xs mt-0.5">聊天结束后投票，指出谁是AI</p>
                </div>
              </div>
              <div className="flex gap-3 items-start">
                <span className="text-xl flex-shrink-0">🏆</span>
                <div>
                  <p className="text-white text-sm font-medium">得分对决</p>
                  <p className="text-slate-500 text-xs mt-0.5">识破AI +100分，AI成功潜伏 +200分</p>
                </div>
              </div>
              <div className="flex gap-3 items-start">
                <span className="text-xl flex-shrink-0">⚔️</span>
                <div>
                  <p className="text-white text-sm font-medium">处决模式</p>
                  <p className="text-slate-500 text-xs mt-0.5">每轮后多数票处决最可疑者，即时揭示身份</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {(mode === 'create' || mode === 'join') && (
          <motion.div
            key={mode}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            className="w-full max-w-sm"
          >
            <button
              onClick={() => { setMode('home'); setError(''); }}
              className="text-slate-400 hover:text-white mb-4 flex items-center gap-1 text-sm"
            >
              ← 返回
            </button>

            <div className="cyber-card p-5 space-y-4">
              <h2 className="text-xl font-bold text-white">
                {mode === 'create' ? '创建房间' : '加入房间'}
              </h2>

              {/* Avatar */}
              <div>
                <label className="text-sm text-slate-400 mb-2 block">选择头像</label>
                <div className="flex flex-wrap gap-2">
                  {AVATARS.map(a => (
                    <button
                      key={a}
                      onClick={() => setSelectedAvatar(a)}
                      className={`text-2xl w-10 h-10 rounded-lg transition-all ${
                        selectedAvatar === a
                          ? 'bg-purple-600 scale-110 border border-purple-400'
                          : 'bg-cyber-border hover:bg-slate-700'
                      }`}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="text-sm text-slate-400 mb-1 block">你的名字</label>
                <input
                  className="neon-input w-full px-3 py-2"
                  placeholder="输入昵称..."
                  value={playerName}
                  onChange={e => setPlayerName(e.target.value)}
                  maxLength={12}
                  onKeyDown={e => e.key === 'Enter' && (mode === 'create' ? handleCreate() : handleJoin())}
                />
              </div>

              {/* Join: room ID */}
              {mode === 'join' && (
                <div>
                  <label className="text-sm text-slate-400 mb-1 block">房间号</label>
                  <input
                    className="neon-input w-full px-3 py-2 uppercase tracking-widest font-mono"
                    placeholder="输入6位房间号..."
                    value={joinRoomId}
                    onChange={e => setJoinRoomId(e.target.value.toUpperCase())}
                    maxLength={6}
                    onKeyDown={e => e.key === 'Enter' && handleJoin()}
                  />
                </div>
              )}

              {/* Create: config */}
              {mode === 'create' && (
                <div className="space-y-3 border-t border-cyber-border pt-3">
                  <div className="text-sm text-slate-400 font-medium">房间设置</div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">AI数量</label>
                      <select
                        className="neon-input w-full px-2 py-2 text-sm"
                        value={config.aiCount}
                        onChange={e => setConfig(c => ({ ...c, aiCount: +e.target.value }))}
                      >
                        {[1, 2, 3].map(n => <option key={n} value={n}>{n}个AI</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">AI难度</label>
                      <select
                        className="neon-input w-full px-2 py-2 text-sm"
                        value={config.aiDifficulty}
                        onChange={e => setConfig(c => ({ ...c, aiDifficulty: e.target.value as AIDifficulty }))}
                      >
                        <option value="normal">普通</option>
                        <option value="advanced">进阶</option>
                        <option value="master">大师</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">聊天轮数</label>
                      <select
                        className="neon-input w-full px-2 py-2 text-sm"
                        value={config.maxRounds}
                        onChange={e => setConfig(c => ({ ...c, maxRounds: +e.target.value }))}
                      >
                        {[2, 3, 4, 5].map(n => <option key={n} value={n}>{n}轮</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">每轮时长</label>
                      <select
                        className="neon-input w-full px-2 py-2 text-sm"
                        value={config.roundDuration}
                        onChange={e => setConfig(c => ({ ...c, roundDuration: +e.target.value }))}
                      >
                        <option value={60}>60秒</option>
                        <option value={90}>90秒</option>
                        <option value={120}>2分钟</option>
                        <option value={180}>3分钟</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">卧底人类</label>
                    <select
                      className="neon-input w-full px-2 py-2 text-sm"
                      value={config.impostorCount}
                      onChange={e => setConfig(c => ({ ...c, impostorCount: +e.target.value }))}
                    >
                      <option value={0}>关闭</option>
                      <option value={1}>1名（被指认得分）</option>
                    </select>
                  </div>

                  {/* Elimination mode toggle */}
                  <button
                    onClick={() => setConfig(c => ({ ...c, eliminationMode: !c.eliminationMode }))}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${
                      config.eliminationMode
                        ? 'bg-red-950/30 border-red-700/50 text-red-300'
                        : 'bg-cyber-border/20 border-cyber-border text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">⚔️</span>
                      <div className="text-left">
                        <div className="text-sm font-medium">处决模式</div>
                        <div className="text-xs opacity-70">每轮后多数票处决可疑者，即时揭示身份</div>
                      </div>
                    </div>
                    <div className={`w-10 h-5 rounded-full relative transition-colors ${config.eliminationMode ? 'bg-red-600' : 'bg-slate-700'}`}>
                      <div className="w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all" style={{ left: config.eliminationMode ? '1.375rem' : '0.125rem' }} />
                    </div>
                  </button>
                </div>
              )}

              {error && (
                <div className="text-red-400 text-sm bg-red-900/20 border border-red-800 rounded-lg p-2">
                  {error}
                </div>
              )}

              <button
                className="btn-primary w-full"
                onClick={mode === 'create' ? handleCreate : handleJoin}
                disabled={loading}
              >
                {loading ? '处理中...' : (mode === 'create' ? '创建房间' : '加入房间')}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
