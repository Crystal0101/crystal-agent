'use client';
import { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ClientGameState, ChatMessage, HumanRole } from '@/lib/game/types';
import { CountdownTimer } from '@/components/UI/CountdownTimer';
import { SkipVoteStatus, ExtendVoteStatus, RoundExtended, TypingUser, MissionIntel, NightIntel } from '@/hooks/useSocket';

const REACTION_EMOJIS = ['🤔', '❓', '💀', '👀'];

const ROLE_META: Record<HumanRole, { icon: string; name: string; color: string }> = {
  detective: { icon: '🔍', name: '侦探', color: 'text-amber-300' },
  guardian:  { icon: '🛡️', name: '守护者', color: 'text-blue-300' },
  analyst:   { icon: '🧪', name: '分析师', color: 'text-purple-300' },
  civilian:  { icon: '⭐', name: '平民', color: 'text-slate-400' },
};

function computeSuspicion(
  msg: ChatMessage,
  allMessages: ChatMessage[],
  reactions: Record<string, Record<string, string[]>>
): number {
  let score = 0;
  const msgIdx = allMessages.findIndex(m => m.id === msg.id);
  const prev = allMessages.slice(0, msgIdx).filter(m => !m.isSystem).at(-1);
  if (prev) {
    const gap = msg.timestamp - prev.timestamp;
    if (gap < 3000) score += 0.3;
    if (gap < 1200) score += 0.2;
  }
  const suspects = reactions[msg.id]?.['🤔']?.length || 0;
  score += Math.min(suspects * 0.25, 0.5);
  const len = msg.content.length;
  if (len < 5 || len > 200) score += 0.1;
  return Math.min(score, 1);
}

interface ChatScreenProps {
  state: ClientGameState;
  onSendMessage: (content: string, replyTo?: string) => void;
  onSkipToVote: () => void;
  onExtendRound: () => Promise<{ success: boolean; count?: number; needed?: number; error?: string }>;
  onLeave: () => void;
  onReact: (messageId: string, emoji: string) => void;
  isHost: boolean;
  skipVoteStatus: SkipVoteStatus | null;
  extendVoteStatus: ExtendVoteStatus | null;
  roundExtended: RoundExtended | null;
  typingUsers?: TypingUser[];
  missionIntel?: MissionIntel | null;
  nightIntel?: NightIntel | null;
}

export function ChatScreen({ state, onSendMessage, onSkipToVote, onExtendRound, onLeave, onReact, isHost, skipVoteStatus, extendVoteStatus, roundExtended, typingUsers = [], missionIntel, nightIntel }: ChatScreenProps) {
  const [input, setInput] = useState('');
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [skipRequested, setSkipRequested] = useState(false);
  const [extendRequested, setExtendRequested] = useState(false);
  const [dismissedIntel, setDismissedIntel] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isImpostor = state.myRole === 'impostor';
  const myRole = state.myHumanRole;
  const roleMeta = myRole ? ROLE_META[myRole] : null;
  const isAnalyst = myRole === 'analyst';
  const showNightIntel = !!nightIntel && !dismissedIntel;

  const suspicionMap = useMemo(() => {
    if (!isAnalyst) return {};
    const map: Record<string, number> = {};
    for (const msg of state.messages) {
      if (!msg.isSystem) map[msg.id] = computeSuspicion(msg, state.messages, state.reactions);
    }
    return map;
  }, [isAnalyst, state.messages, state.reactions]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [state.messages]);

  useEffect(() => {
    if (nightIntel) setDismissedIntel(false);
  }, [nightIntel]);

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
    onSendMessage(text, replyTo?.id);
    setInput('');
    setReplyTo(null);
    inputRef.current?.focus();
  };

  const handleSkip = () => {
    setSkipRequested(true);
    onSkipToVote();
  };

  const handleExtend = async () => {
    setExtendRequested(true);
    const res = await onExtendRound();
    if (!res.success) setExtendRequested(false); // reset if server rejected (e.g. max reached)
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <div className="glass sticky top-0 z-10 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <div className="text-xs text-slate-400">第 {state.currentRound} / {state.config.maxRounds} 轮</div>
              {roleMeta && (
                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border border-white/10 bg-white/5 ${roleMeta.color}`}>
                  {roleMeta.icon} {roleMeta.name}
                </span>
              )}
            </div>
            <div className="text-white font-medium text-sm mt-0.5 line-clamp-1">💬 {state.currentTopic}</div>
          </div>
          <div className="flex items-center gap-3 ml-2 flex-shrink-0">
            <div className="text-right">
              <div className="text-xs text-slate-500">剩余</div>
              <CountdownTimer endTime={state.roundEndTime} className="text-base font-bold text-purple-400" />
            </div>
            <button onClick={() => setShowLeaveConfirm(true)} className="text-slate-500 hover:text-slate-300 text-lg">✕</button>
          </div>
        </div>

        {/* Night intel banner */}
        <AnimatePresence>
          {showNightIntel && nightIntel && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className={`mt-2 px-3 py-2 rounded-lg text-xs flex items-center justify-between gap-2 ${
                nightIntel.type === 'investigation'
                  ? nightIntel.isAI
                    ? 'bg-red-500/15 border border-red-500/30 text-red-300'
                    : 'bg-green-500/15 border border-green-500/30 text-green-300'
                  : nightIntel.type === 'protection_confirmed'
                  ? 'bg-blue-500/15 border border-blue-500/30 text-blue-300'
                  : 'bg-blue-500/15 border border-blue-500/30 text-blue-300'
              }`}
            >
              <span>
                {nightIntel.type === 'investigation' && `🔍 调查结果：${nightIntel.targetName} 是 ${nightIntel.isAI ? '🤖 AI！' : '👤 普通人类。'}`}
                {nightIntel.type === 'protection_confirmed' && `🛡️ 已保护 ${nightIntel.targetName}，本轮处决将豁免。`}
                {nightIntel.type === 'protected' && `🛡️ ${nightIntel.message}`}
              </span>
              <button onClick={() => setDismissedIntel(true)} className="flex-shrink-0 opacity-60 hover:opacity-100">✕</button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Progress — key on roundEndTime so it resets correctly when extended */}
        <div className="mt-2 h-0.5 bg-cyber-border rounded-full overflow-hidden">
          <motion.div
            key={state.roundEndTime}
            className="h-full bg-gradient-to-r from-purple-600 to-cyan-500"
            initial={{ width: `${Math.min(100, Math.max(0, (state.roundEndTime - Date.now()) / (state.config.roundDuration * 10)))}%` }}
            animate={{ width: '0%' }}
            transition={{ duration: Math.max(0, (state.roundEndTime - Date.now()) / 1000), ease: 'linear' }}
          />
        </div>

        {/* Skip / Extend controls */}
        <div className="mt-2 flex items-center gap-2 flex-wrap">
          {/* Skip to vote */}
          {isHost ? (
            <button
              onClick={handleSkip}
              className="text-xs text-yellow-400 hover:text-yellow-300 border border-yellow-600/30 hover:border-yellow-500/50 px-2.5 py-1 rounded-full transition-colors"
            >
              ⚡ 直接开始投票
            </button>
          ) : (
            <button
              onClick={handleSkip}
              disabled={skipRequested}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                skipRequested
                  ? 'text-slate-500 border-slate-700 cursor-not-allowed'
                  : 'text-slate-400 hover:text-slate-300 border-slate-700 hover:border-slate-500'
              }`}
            >
              {skipRequested ? '✓ 已发起快进' : '⏩ 快进投票'}
            </button>
          )}

          {/* Extend round */}
          {isHost ? (
            <button
              onClick={handleExtend}
              disabled={extendRequested}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                extendRequested
                  ? 'text-slate-500 border-slate-700 cursor-not-allowed'
                  : 'text-green-400 hover:text-green-300 border-green-600/30 hover:border-green-500/50'
              }`}
            >
              {extendRequested ? '✓ 已续时' : '⏱ 再聊30秒'}
            </button>
          ) : (
            <button
              onClick={handleExtend}
              disabled={extendRequested}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                extendRequested
                  ? 'text-slate-500 border-slate-700 cursor-not-allowed'
                  : 'text-green-400 hover:text-green-300 border-green-700/30 hover:border-green-600/50'
              }`}
            >
              {extendRequested ? '✓ 已投续时' : '⏱ 发起续时'}
            </button>
          )}

          {/* Vote status pills */}
          <div className="ml-auto flex gap-2 items-center">
            {skipVoteStatus && (
              <span className="text-xs text-yellow-400">快进 {skipVoteStatus.count}/{skipVoteStatus.needed}</span>
            )}
            {extendVoteStatus && (
              <span className="text-xs text-green-400">续时 {extendVoteStatus.count}/{extendVoteStatus.needed}</span>
            )}
          </div>
        </div>

        {/* Round-extended notification */}
        <AnimatePresence>
          {roundExtended && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-2 px-3 py-1.5 rounded-lg bg-green-900/30 border border-green-700/40 text-xs text-green-400 text-center"
            >
              ⏱ 续时 +{roundExtended.seconds}s
              {roundExtended.reason === 'auto' && ' · 聊得正热，自动续时'}
              {roundExtended.reason === 'host' && ' · 房主延长时间'}
              {roundExtended.reason === 'vote' && ' · 大家投票续时'}
              {' '}（{roundExtended.extensionCount}/{roundExtended.maxExtensions}）
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Role badge */}
      {isImpostor && (
        <div className="mx-4 mt-2 p-2 rounded-lg bg-pink-900/30 border border-pink-700/40 text-center text-sm text-pink-400">
          🎭 你是卧底人类 — 让别人误认为你是AI
        </div>
      )}

      {/* MIRROR 情报横幅 */}
      <AnimatePresence>
        {missionIntel && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mx-4 mt-2 px-3 py-2 rounded-lg border border-[#00ffb4]/40 bg-[#00ffb4]/5 flex items-start gap-2"
          >
            <span className="text-[#00ffb4] text-xs mt-0.5 flex-shrink-0">◈ MIRROR</span>
            <span className="font-mono text-xs text-[#00ffb4]/80 leading-relaxed">{missionIntel.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Participants strip with suspicion meter */}
      <div className="px-4 py-2 flex gap-3 overflow-x-auto border-b border-cyber-border/30">
        {state.participants.map(p => {
          // Count 🤔 reactions from all messages sent by this participant
          const suspicionCount = state.messages.reduce((total, msg) => {
            if (msg.senderId === p.id && state.reactions[msg.id]?.['🤔']) {
              return total + state.reactions[msg.id]['🤔'].length;
            }
            return total;
          }, 0);
          const isEliminated = state.eliminatedIds?.includes(p.id);
          return (
            <div key={p.id} className={`flex flex-col items-center gap-0.5 flex-shrink-0 transition-opacity ${isEliminated ? 'opacity-30' : ''}`}>
              <div className="relative">
                <div className="text-xl">{p.avatar}</div>
                {suspicionCount > 0 && (
                  <div className={`absolute -top-1 -right-1 text-xs w-4 h-4 rounded-full flex items-center justify-center font-bold ${
                    suspicionCount >= 3 ? 'bg-red-600 text-white' :
                    suspicionCount >= 2 ? 'bg-orange-600 text-white' :
                    'bg-yellow-600/80 text-white'
                  }`}>
                    {suspicionCount}
                  </div>
                )}
                {/* MIRROR情报标记 */}
                {missionIntel?.targetPlayerId === p.id && (
                  <motion.div
                    className={`absolute -bottom-1 -right-1 text-xs w-4 h-4 rounded-full flex items-center justify-center font-bold ${
                      missionIntel.type === 'suspect' ? 'bg-[#00ffb4] text-black' :
                      missionIntel.type === 'reveal' ? 'bg-purple-500 text-white' :
                      'bg-slate-600 text-white'
                    }`}
                    animate={{ scale: [1, 1.3, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  >
                    {missionIntel.type === 'suspect' ? '⚠' : missionIntel.type === 'reveal' ? '!' : '✓'}
                  </motion.div>
                )}
              </div>
              <div className="text-xs text-slate-400 max-w-[44px] truncate text-center">
                {isEliminated ? '💀' : p.name}
              </div>
            </div>
          );
        })}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2 pb-4">
        <AnimatePresence initial={false}>
          {state.messages.map(msg => (
            <motion.div
              key={msg.id}
              id={`msg-${msg.id}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <MessageBubble
                msg={msg}
                isMe={msg.senderId === state.myId}
                onReply={setReplyTo}
                onReact={onReact}
                myId={state.myId}
                reactions={state.reactions[msg.id] || {}}
                replyMsg={msg.replyTo ? state.messages.find(m => m.id === msg.replyTo) : undefined}
                suspicion={isAnalyst && !msg.isSystem ? suspicionMap[msg.id] ?? 0 : undefined}
              />
            </motion.div>
          ))}
          {/* Typing indicators */}
          {typingUsers.filter(u => u.senderId !== state.myId).map(u => (
            <motion.div
              key={`typing-${u.senderId}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.2 }}
            >
              <TypingBubble name={u.senderName} avatar={state.participants.find(p => p.id === u.senderId)?.avatar} />
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="glass sticky bottom-0 p-3">
        {replyTo && (
          <div className="flex items-center gap-2 mb-2 text-xs text-slate-400 bg-cyber-border/30 rounded-lg px-2 py-1.5">
            <span className="text-purple-400">↩ {replyTo.senderName}:</span>
            <span className="flex-1 truncate">{replyTo.content}</span>
            <button onClick={() => setReplyTo(null)} className="text-slate-500">✕</button>
          </div>
        )}
        <div className="flex gap-2">
          <input
            ref={inputRef}
            className="neon-input flex-1 px-3 py-2.5 text-sm"
            placeholder="说点什么..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            maxLength={300}
          />
          <button className="btn-primary px-4 py-2.5" onClick={handleSend} disabled={!input.trim()}>
            发送
          </button>
        </div>
      </div>

      {/* Leave confirm modal */}
      <AnimatePresence>
        {showLeaveConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => setShowLeaveConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="cyber-card p-6 mx-6 text-center"
              onClick={e => e.stopPropagation()}
            >
              <div className="text-3xl mb-3">🚪</div>
              <h3 className="text-lg font-bold text-white mb-2">退出游戏？</h3>
              <p className="text-slate-400 text-sm mb-5">游戏进行中，退出后无法重新加入此局。</p>
              <div className="flex gap-3">
                <button className="btn-secondary flex-1" onClick={() => setShowLeaveConfirm(false)}>继续游戏</button>
                <button className="btn-danger flex-1" onClick={onLeave}>确认退出</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TypingBubble({ name, avatar }: { name: string; avatar?: string }) {
  return (
    <div className="flex gap-2 items-end">
      <div className="text-xl flex-shrink-0">{avatar || '💬'}</div>
      <div className="flex flex-col items-start gap-0.5">
        <span className="text-xs text-slate-400 px-1">{name}</span>
        <div className="bg-cyber-card border border-cyber-border rounded-2xl rounded-tl-sm px-3 py-2.5 flex items-center gap-1">
          {[0, 1, 2].map(i => (
            <motion.div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-slate-400"
              animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.18 }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ msg, isMe, myId, onReply, onReact, reactions, replyMsg, suspicion }: {
  msg: ChatMessage; isMe: boolean; myId: string;
  onReply: (msg: ChatMessage) => void;
  onReact: (messageId: string, emoji: string) => void;
  reactions: Record<string, string[]>;
  replyMsg?: ChatMessage;
  suspicion?: number;
}) {
  const [showReactPicker, setShowReactPicker] = useState(false);

  if (msg.isSystem) {
    return (
      <div className="text-center">
        <span className="text-xs text-slate-500 bg-cyber-border/30 px-3 py-1 rounded-full">⚙️ {msg.content}</span>
      </div>
    );
  }

  const totalReactions = Object.values(reactions).reduce((n, v) => n + v.length, 0);

  return (
    <div className={`flex gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'} group`}>
      <div className="text-xl flex-shrink-0 mt-1">{msg.senderAvatar}</div>
      <div className={`max-w-[75%] flex flex-col gap-0.5 ${isMe ? 'items-end' : 'items-start'}`}>
        {!isMe && <span className="text-xs text-slate-400 px-1">{msg.senderName}</span>}
        {replyMsg && (
          <button
            className="text-xs text-slate-400 bg-cyber-border/30 rounded-lg px-2 py-1 line-clamp-1 border-l-2 border-purple-600 text-left hover:bg-cyber-border/50 active:bg-cyber-border/50 transition-colors"
            onClick={() => {
              const el = document.getElementById(`msg-${replyMsg.id}`);
              el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
              el?.classList.add('ring-1', 'ring-purple-500', 'rounded-2xl');
              setTimeout(() => el?.classList.remove('ring-1', 'ring-purple-500', 'rounded-2xl'), 1200);
            }}
          >
            <span className="text-purple-400 font-medium">{replyMsg.senderName}</span>
            <span className="ml-1 text-slate-500">{replyMsg.content}</span>
          </button>
        )}
        <div className="relative">
          <div
            className={`rounded-2xl px-3 py-2 text-sm ${
              isMe
                ? 'bg-gradient-to-br from-purple-700 to-purple-600 text-white rounded-tr-sm'
                : 'bg-cyber-card border border-cyber-border text-slate-200 rounded-tl-sm'
            }`}
          >
            {msg.content}
          </div>

          {/* Action buttons: reply + react — always faintly visible, full on hover */}
          <div
            className={`absolute top-0.5 flex items-center gap-0.5 opacity-30 group-hover:opacity-100 transition-opacity ${
              isMe ? 'right-full mr-1' : 'left-full ml-1'
            }`}
          >
            <button
              onClick={() => onReply(msg)}
              className="text-slate-400 hover:text-purple-400 active:text-purple-400 text-sm px-1 py-0.5"
              title="引用回复"
            >
              ↩
            </button>
            <button
              onClick={() => setShowReactPicker(p => !p)}
              className="text-slate-500 hover:text-slate-300 active:text-slate-300 text-base px-1"
            >
              +
            </button>
          </div>

          {/* Reaction picker */}
          <AnimatePresence>
            {showReactPicker && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className={`absolute z-20 bottom-full mb-1 flex gap-1 bg-[#1a1a2e] border border-[#2d2d50] rounded-2xl px-2 py-1.5 shadow-2xl ${
                  isMe ? 'right-0' : 'left-0'
                }`}
              >
                {REACTION_EMOJIS.map(emoji => (
                  <button
                    key={emoji}
                    onClick={() => { onReact(msg.id, emoji); setShowReactPicker(false); }}
                    className="text-xl hover:scale-125 transition-transform p-0.5"
                  >
                    {emoji}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Reaction pills */}
        {totalReactions > 0 && (
          <div className={`flex flex-wrap gap-1 mt-0.5 ${isMe ? 'justify-end' : 'justify-start'}`}>
            {Object.entries(reactions).map(([emoji, users]) => users.length > 0 && (
              <motion.button
                key={emoji}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                onClick={() => onReact(msg.id, emoji)}
                className={`flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded-full border transition-colors ${
                  users.includes(myId)
                    ? 'bg-purple-900/40 border-purple-600/50 text-purple-300'
                    : 'bg-cyber-border/30 border-cyber-border text-slate-400 hover:border-slate-500'
                }`}
              >
                <span>{emoji}</span>
                <span>{users.length}</span>
              </motion.button>
            ))}
          </div>
        )}

        {/* Analyst suspicion bar */}
        {suspicion !== undefined && suspicion > 0 && (
          <div className={`flex items-center gap-1 px-1 mt-0.5 ${isMe ? 'justify-end' : 'justify-start'}`}>
            <div className="w-16 h-0.5 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                className={`h-full rounded-full ${suspicion > 0.6 ? 'bg-red-400' : suspicion > 0.3 ? 'bg-yellow-400' : 'bg-green-400'}`}
                initial={{ width: 0 }}
                animate={{ width: `${suspicion * 100}%` }}
              />
            </div>
            <span className="text-[9px] text-slate-600">
              {suspicion > 0.6 ? '可疑' : suspicion > 0.3 ? '偏疑' : ''}
            </span>
          </div>
        )}
        <span className="text-xs text-slate-600 px-1">
          {new Date(msg.timestamp).toLocaleTimeString('zh', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  );
}
