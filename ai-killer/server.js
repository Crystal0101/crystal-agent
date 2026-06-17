const { createServer } = require('http');
const { Server } = require('socket.io');
const next = require('next');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config({ path: '.env.local' });

const dev = process.env.NODE_ENV !== 'production';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev });
const handle = app.getRequestHandler();

const {
  createRoom,
  joinRoom,
  getRoom,
  setPlayerReady,
  addMessage,
  submitVote,
  startVoting,
  startGame,
  advanceRound,
  calculateResults,
  startElimination,
  submitEliminationVote,
  calculateElimination,
  addReaction,
  resetRoom,
  removePlayer,
  startNightPhase,
  submitNightAction,
  startChatRound,
} = require('./game/GameManager');

const { generateAIMessage, streamAIMessage, generateAiOpinion, clearAiOpinions } = require('./game/AIPlayer');

function getRoomState(room, myId) {
  return {
    roomId: room.id,
    hostId: room.hostId,
    participants: [...room.players, ...room.aiParticipants],
    phase: room.phase,
    messages: room.messages,
    config: room.config,
    votes: room.votes,
    currentRound: room.currentRound,
    currentTopic: room.currentTopic,
    roundEndTime: room.roundEndTime,
    voteEndTime: room.voteEndTime,
    eliminationEndTime: room.eliminationEndTime || 0,
    eliminationVotes: room.eliminationVotes || [],
    eliminationResult: room.eliminationResult || null,
    eliminatedIds: room.eliminatedIds || [],
    reactions: room.reactions || {},
    result: room.result,
    myId,
    myRole: room.players.find(p => p.id === myId)?.role || null,
    myHumanRole: room.playerRoles?.[myId] || null,
    nightEndTime: room.nightEndTime || 0,
    nightActionSubmitted: !!(room.nightActions?.[myId]),
    revealedRoles: room.phase === 'results' ? (room.playerRoles || {}) : {},
  };
}

// ─── Round / vote timers ──────────────────────────────────────────────────────
const roundTimers = new Map();
const voteTimers = new Map();
const eliminationTimers = new Map();
const nightTimers = new Map();

const NIGHT_DURATION_SEC = 35;

function clearRoomTimers(roomId) {
  if (roundTimers.has(roomId)) { clearTimeout(roundTimers.get(roomId)); roundTimers.delete(roomId); }
  if (voteTimers.has(roomId)) { clearTimeout(voteTimers.get(roomId)); voteTimers.delete(roomId); }
  if (eliminationTimers.has(roomId)) { clearTimeout(eliminationTimers.get(roomId)); eliminationTimers.delete(roomId); }
  if (nightTimers.has(roomId)) { clearTimeout(nightTimers.get(roomId)); nightTimers.delete(roomId); }
}

// ─── Round extension tracking ─────────────────────────────────────────────────
const extensionCounts = new Map(); // roomId -> number of extensions used this round
const MAX_EXTENSIONS = 2;
const EXTEND_SECONDS = 30;

function clearExtensionCount(roomId) { extensionCounts.delete(roomId); }
function getExtensionCount(roomId) { return extensionCounts.get(roomId) || 0; }
function incExtensionCount(roomId) { extensionCounts.set(roomId, getExtensionCount(roomId) + 1); }

// ─── AI response system ───────────────────────────────────────────────────────
const aiRoundCounts = new Map(); // roomId -> { aiId -> count }

function getAiCount(roomId, aiId) {
  return (aiRoundCounts.get(roomId) || {})[aiId] || 0;
}

function incAiCount(roomId, aiId) {
  if (!aiRoundCounts.has(roomId)) aiRoundCounts.set(roomId, {});
  const m = aiRoundCounts.get(roomId);
  m[aiId] = (m[aiId] || 0) + 1;
}

function resetAiCounts(roomId) {
  aiRoundCounts.set(roomId, {});
}

// Per-AI "is already scheduled to respond" cooldown — prevents flood from rapid human messages
const aiScheduled = new Map(); // roomId -> Set<aiId>

function isAiScheduled(roomId, aiId) {
  return !!(aiScheduled.get(roomId)?.has(aiId));
}
function markAiScheduled(roomId, aiId) {
  if (!aiScheduled.has(roomId)) aiScheduled.set(roomId, new Set());
  aiScheduled.get(roomId).add(aiId);
}
function unmarkAiScheduled(roomId, aiId) {
  aiScheduled.get(roomId)?.delete(aiId);
}
function resetAiScheduled(roomId) {
  aiScheduled.delete(roomId);
}

// Pending AI response timers per room (so we can cancel on phase change)
const pendingAITimers = new Map(); // roomId -> Set<timeoutId>

// ── 人类打字行为追踪 ──────────────────────────────────────────────────────────
// roomId -> { lastMsgAt, reactionTimes: number[], charRates: number[] }
const roomHumanStats = new Map();

function recordHumanMessage(roomId, msgLength) {
  const now = Date.now();
  if (!roomHumanStats.has(roomId)) {
    roomHumanStats.set(roomId, { lastMsgAt: 0, reactionTimes: [], charRates: [] });
  }
  const stats = roomHumanStats.get(roomId);
  if (stats.lastMsgAt > 0) {
    const elapsed = now - stats.lastMsgAt;
    // 有效区间：1s~90s（避免离开再回来的超长间隔污染数据）
    if (elapsed >= 1000 && elapsed <= 90000) {
      stats.reactionTimes.push(elapsed);
      if (stats.reactionTimes.length > 12) stats.reactionTimes.shift();
    }
    // 字符速率：只统计中等长度消息（避免单字或超长消息干扰）
    if (elapsed >= 2000 && msgLength >= 4 && msgLength <= 80) {
      stats.charRates.push(msgLength / (elapsed / 1000)); // chars/sec
      if (stats.charRates.length > 12) stats.charRates.shift();
    }
  }
  stats.lastMsgAt = now;
}

// 返回 AI 应使用的 { reactionMs, typingMsPerChar }
function getHumanAdaptedTiming(roomId) {
  const stats = roomHumanStats.get(roomId);
  const defaultReaction = 4000;
  const defaultCPS = 3.5; // ~3.5 中文字符/秒 ≈ 人类正常打字速度

  if (!stats || stats.reactionTimes.length < 2) {
    return { reactionMs: defaultReaction, typingMsPerChar: 1000 / defaultCPS };
  }

  const arr = stats.reactionTimes;
  const avgReaction = arr.reduce((a, b) => a + b, 0) / arr.length;
  // AI 反应时间 = 人类平均反应 × 随机缩放 [0.6, 1.3]，夹在 1.5s~12s 内
  const scale = 0.6 + Math.random() * 0.7;
  const reactionMs = Math.max(1500, Math.min(avgReaction * scale, 12000));

  let typingMsPerChar = 1000 / defaultCPS;
  if (stats.charRates.length >= 2) {
    const avgCPS = stats.charRates.reduce((a, b) => a + b, 0) / stats.charRates.length;
    // AI 字符速率 = 人类平均速率 × 随机缩放 [0.7, 1.2]，夹在 1~8 chars/sec
    const cpsScale = 0.7 + Math.random() * 0.5;
    const aiCPS = Math.max(1, Math.min(avgCPS * cpsScale, 8));
    typingMsPerChar = 1000 / aiCPS;
  }

  return { reactionMs, typingMsPerChar };
}

function addPendingTimer(roomId, timerId) {
  if (!pendingAITimers.has(roomId)) pendingAITimers.set(roomId, new Set());
  pendingAITimers.get(roomId).add(timerId);
}

function clearPendingAITimers(roomId) {
  const timers = pendingAITimers.get(roomId);
  if (timers) { timers.forEach(clearTimeout); timers.clear(); }
  resetAiScheduled(roomId);
}

// Fire one AI response after a human-adapted delay
function scheduleOneAI(io, roomId, ai, minMs, maxMs, mode) {
  const room = getRoom(roomId);
  if (!room || room.phase !== 'chat') return;
  if (getAiCount(roomId, ai.id) >= 5) return;
  if (isAiScheduled(roomId, ai.id)) return;

  markAiScheduled(roomId, ai.id);

  // 反应延迟：优先用人类自适应值，但不低于调用方的 minMs（紧急情况快速反应）
  const { reactionMs, typingMsPerChar } = getHumanAdaptedTiming(roomId);
  const delay = Math.max(minMs, Math.min(reactionMs, maxMs ?? reactionMs));

  const timer = setTimeout(async () => {
    unmarkAiScheduled(roomId, ai.id);

    const cur = getRoom(roomId);
    if (!cur || cur.phase !== 'chat') return;
    if (getAiCount(roomId, ai.id) >= 8) return;

    const allNames = [
      ...cur.players.map(p => p.name),
      ...cur.aiParticipants.map(a => a.name),
    ];

    io.to(roomId).emit('typing-indicator', { senderId: ai.id, senderName: ai.name, isTyping: true });

    try {
      const content = await generateAIMessage(
        ai.id, ai.name, ai.difficulty, cur.currentTopic, cur.messages, allNames, mode,
      );

      if (!content) {
        io.to(roomId).emit('typing-indicator', { senderId: ai.id, senderName: ai.name, isTyping: false });
        return;
      }

      // 打字延迟：模拟人类逐字输入，上限 10s，下限 1s
      const typingMs = Math.max(1000, Math.min(content.length * typingMsPerChar, 10000));
      await new Promise(resolve => setTimeout(resolve, typingMs));

      io.to(roomId).emit('typing-indicator', { senderId: ai.id, senderName: ai.name, isTyping: false });

      const r = getRoom(roomId);
      if (!r || r.phase !== 'chat') return;
      const myLastMsg = [...r.messages].reverse().find(m => m.senderId === ai.id);
      if (myLastMsg && myLastMsg.content === content) return;

      const msg = addMessage(roomId, ai.id, content);
      if (!('error' in msg)) {
        incAiCount(roomId, ai.id);
        io.to(roomId).emit('new-message', msg);
        onAIMessage(io, roomId);
      }
    } catch (e) {
      io.to(roomId).emit('typing-indicator', { senderId: ai.id, senderName: ai.name, isTyping: false });
      console.error('AI response error:', e.message);
    }
  }, delay);

  addPendingTimer(roomId, timer);
}

// Called after a HUMAN sends a message — each AI has a chance to reply
function onHumanMessage(io, roomId, messageContent) {
  const room = getRoom(roomId);
  if (!room || room.phase !== 'chat') return;

  const content = (messageContent || '').toLowerCase();

  // ─── 找最近的 AI 发言，判断人类是否在回应 AI ──────────────────────────────
  const nonSystemMsgs = room.messages.filter(m => !m.isSystem);
  const lastAIMsg = [...nonSystemMsgs].reverse().find(m => m.isAI);
  const timeSinceLastAI = lastAIMsg ? Date.now() - lastAIMsg.timestamp : Infinity;

  // ─── 遍历 AI，决定谁回复 ──────────────────────────────────────────────────
  const shuffledAIs = [...room.aiParticipants].sort(() => Math.random() - 0.5);
  let normalSlotsRemaining = 2; // 每条消息最多允许 2 个 AI 回复

  for (const ai of shuffledAIs) {
    if (getAiCount(roomId, ai.id) >= 5) continue;
    if (isAiScheduled(roomId, ai.id)) continue;

    const aiNameLower = ai.name.toLowerCase();

    // 1. 直接指控（被点名+怀疑词）→ 快速反击
    const accused = content.includes(aiNameLower) &&
      (content.includes('ai') || content.includes('机器') || content.includes('可疑') ||
       content.includes('不像人') || content.includes('假') || content.includes('就是你') ||
       content.includes('你是') || content.includes('感觉你') || content.includes('怀疑') ||
       content.includes('bot') || content.includes('程序') || content.includes('robot'));
    if (accused) {
      scheduleOneAI(io, roomId, ai, 500, 1500, 'defense');
      continue;
    }

    // 2. 被点名（直接和 AI 说话）→ 高概率快速回应
    const namedDirectly =
      content.startsWith(aiNameLower) ||
      content.includes(aiNameLower + '，') ||
      content.includes(aiNameLower + ',') ||
      content.includes(aiNameLower + '你') ||
      content.includes(aiNameLower + ' ') ||
      (content.includes(aiNameLower) && content.length < 30);
    if (namedDirectly && Math.random() < 0.92) {
      scheduleOneAI(io, roomId, ai, 600, 2000, 'followup');
      continue;
    }

    // 3. 人类在回应这个 AI 的最新发言 → 跟进对话
    const isReplyToThisAI = lastAIMsg?.senderId === ai.id && timeSinceLastAI < 30000;
    if (isReplyToThisAI && Math.random() < 0.88) {
      scheduleOneAI(io, roomId, ai, 800, 2500, 'followup');
      continue;
    }

    // 4. 普通回复槽：最多 2 个 AI，概率 70%
    if (normalSlotsRemaining > 0 && Math.random() < 0.70) {
      normalSlotsRemaining--;
      const aiIdx = room.aiParticipants.indexOf(ai);
      scheduleOneAI(io, roomId, ai, 1000 + aiIdx * 500, 3000 + aiIdx * 800);
    }
  }
}

// Called when an AI posts — with low probability, one other AI reacts (creates natural cross-talk)
function onAIMessage(io, roomId) {
  const room = getRoom(roomId);
  if (!room || room.phase !== 'chat') return;
  if (Math.random() > 0.28) return; // 28% chance of cross-AI reply

  const eligible = room.aiParticipants.filter(a =>
    getAiCount(roomId, a.id) < 5 && !isAiScheduled(roomId, a.id)
  );
  if (eligible.length === 0) return;

  const responder = eligible[Math.floor(Math.random() * eligible.length)];
  // Longer delay so it doesn't feel like a robot instantly responding to a robot
  scheduleOneAI(io, roomId, responder, 4000, 10000, 'react');
}

// Called when a round starts — AI might break the ice after silence
function scheduleIceBreaker(io, roomId) {
  const room = getRoom(roomId);
  if (!room) return;

  // 3-8 秒内破冰
  const delay = 3000 + Math.random() * 5000;
  const timer = setTimeout(() => {
    const cur = getRoom(roomId);
    if (!cur || cur.phase !== 'chat') return;

    const hasHumanMsg = cur.messages.some(m => !m.isSystem && !m.isAI);
    if (!hasHumanMsg) {
      const eligible = cur.aiParticipants.filter(a => getAiCount(roomId, a.id) < 5 && !isAiScheduled(roomId, a.id));
      if (eligible.length > 0) {
        const ai = eligible[Math.floor(Math.random() * eligible.length)];
        scheduleOneAI(io, roomId, ai, 500, 2000);
      }
    }
  }, delay);

  addPendingTimer(roomId, timer);
}

// After a quiet stretch (no messages for ~28s), one AI re-engages
function scheduleQuietCheck(io, roomId) {
  const timer = setTimeout(() => {
    const room = getRoom(roomId);
    if (!room || room.phase !== 'chat') return;

    const recent = room.messages.filter(m => !m.isSystem);
    const lastTime = recent.length > 0 ? recent[recent.length - 1].timestamp : 0;
    const silentMs = Date.now() - lastTime;

    if (silentMs > 18000) {
      const eligible = room.aiParticipants.filter(a => getAiCount(roomId, a.id) < 5 && !isAiScheduled(roomId, a.id));
      if (eligible.length > 0) {
        const ai = eligible[Math.floor(Math.random() * eligible.length)];
        const stirMode = ai.difficulty === 'master' ? 'stir' : undefined;
        scheduleOneAI(io, roomId, ai, 800, 3000, stirMode);
      }
    }

    scheduleQuietCheck(io, roomId);
  }, 30000);

  addPendingTimer(roomId, timer);
}

// In the last round's final 30 seconds, master AI preemptively accuses
function scheduleLastRoundAIFrenzy(io, roomId, durationSeconds) {
  const frenzyDelay = Math.max(0, (durationSeconds - 30)) * 1000;
  const timer = setTimeout(() => {
    const room = getRoom(roomId);
    if (!room || room.phase !== 'chat') return;
    if (room.currentRound < room.config.maxRounds) return;

    const masterAIs = room.aiParticipants.filter(a =>
      a.difficulty === 'master' && getAiCount(roomId, a.id) < 5 && !isAiScheduled(roomId, a.id)
    );
    if (masterAIs.length > 0) {
      scheduleOneAI(io, roomId, masterAIs[0], 1000, 5000, 'finalaccuse');
    }
  }, frenzyDelay);
  addPendingTimer(roomId, timer);
}

// ─── MIRROR 任务系统 ──────────────────────────────────────────────────────────
const MISSION_IDS = ['mission-001', 'mission-002', 'mission-003', 'mission-004'];
const missionTimers = new Map(); // roomId -> timerId

function scheduleMission(io, roomId) {
  const delay = 60000 + Math.random() * 30000; // 60-90秒后第一次触发
  const timer = setTimeout(() => {
    const room = getRoom(roomId);
    if (!room || room.phase !== 'chat') return;

    // 随机选一个任务，随机推给一个在线玩家
    const missionId = MISSION_IDS[Math.floor(Math.random() * MISSION_IDS.length)];
    const onlinePlayers = room.players.filter(p => p.isOnline && !room.eliminatedIds?.includes(p.id));
    if (onlinePlayers.length === 0) return;

    const target = onlinePlayers[Math.floor(Math.random() * onlinePlayers.length)];
    const targetSocket = [...io.sockets.sockets.values()].find(s => s.data?.playerId === target.id);
    if (targetSocket) {
      targetSocket.emit('mission-trigger', { missionId, triggeredAt: Date.now() });
    }

    // 安排第二次（概率40%）
    if (Math.random() < 0.4) {
      const timer2 = setTimeout(() => scheduleMission(io, roomId), 120000);
      addPendingTimer(roomId, timer2);
    }
  }, delay);

  missionTimers.set(roomId, timer);
  addPendingTimer(roomId, timer);
}

function injectMirrorMessage(io, roomId, content) {
  const room = getRoom(roomId);
  if (!room) return;
  const msg = {
    id: uuidv4(),
    senderId: 'echo-system',
    senderName: 'ECHO',
    senderAvatar: '◈',
    content,
    timestamp: Date.now(),
    isAI: false,
    isSystem: true,
  };
  room.messages.push(msg);
  io.to(roomId).emit('new-message', msg);
}

function handleMissionResult(io, roomId, playerId, result) {
  const room = getRoom(roomId);
  if (!room || room.phase !== 'chat') return;

  // ── bug fix 1：重置 AI 消息计数，让 AI 任务后能继续回复 ──────────────
  if (aiRoundCounts.has(roomId)) {
    const counts = aiRoundCounts.get(roomId);
    room.aiParticipants.forEach(ai => {
      if ((counts[ai.id] || 0) >= 4) counts[ai.id] = 2;
    });
  }

  const allParticipants = [...room.players, ...room.aiParticipants].filter(
    p => !room.eliminatedIds?.includes(p.id)
  );
  const others = allParticipants.filter(p => p.id !== playerId);

  // ── bug fix 2：情报直接注入聊天气泡，而非只靠横幅 ──────────────────
  if (result === 'perfect' && others.length > 0) {
    const target = others[Math.floor(Math.random() * others.length)];
    injectMirrorMessage(io, roomId,
      `信号解析完成。本局参与者 [${target.name}] 的意识模式存在机器特征。可作为投票参考。`
    );
    io.to(roomId).emit('mission-intel', {
      targetPlayerId: target.id,
      type: 'suspect',
      message: `${target.name} 的意识模式存在异常`,
      expiresAt: Date.now() + 30000,
    });
  } else if (result === 'success' && others.length > 0) {
    const target = others[Math.floor(Math.random() * others.length)];
    injectMirrorMessage(io, roomId,
      `情报上传完成。系统标记 [${target.name}] 存在可疑信号，置信度偏低，建议继续观察。`
    );
    io.to(roomId).emit('mission-intel', {
      targetPlayerId: target.id,
      type: 'suspect',
      message: `${target.name} 存在可疑信号`,
      expiresAt: Date.now() + 20000,
    });
  } else if (result === 'fail') {
    injectMirrorMessage(io, roomId, '解码失败。本次信号已自毁，未获得有效情报。');
  } else if (result === 'timeout') {
    injectMirrorMessage(io, roomId, '任务超时。连接已中断，本次情报作废。');
  }
}

// ─── Main server ──────────────────────────────────────────────────────────────
app.prepare().then(() => {
  const httpServer = createServer((req, res) => handle(req, res));
  const io = new Server(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
  });

  io.on('connection', (socket) => {
    // Create room
    socket.on('create-room', ({ playerName, avatar, config }, callback) => {
      try {
        const room = createRoom(socket.id, playerName, avatar, config);
        const player = room.players[0];
        socket.join(room.id);
        socket.data = { roomId: room.id, playerId: player.id };
        callback({ success: true, state: getRoomState(room, player.id) });
      } catch (e) {
        callback({ success: false, error: e.message });
      }
    });

    // Join room
    socket.on('join-room', ({ roomId, playerName, avatar }, callback) => {
      const result = joinRoom(roomId.toUpperCase(), socket.id, playerName, avatar);
      if ('error' in result) { callback({ success: false, error: result.error }); return; }
      const { room, player } = result;
      socket.join(room.id);
      socket.data = { roomId: room.id, playerId: player.id };
      // Broadcast to existing players with their own myId (not null)
      broadcastState(io, room.id, room);
      callback({ success: true, state: getRoomState(room, player.id) });
    });

    // Start game
    socket.on('start-game', (callback) => {
      const { roomId, playerId } = socket.data || {};
      if (!roomId) return callback?.({ success: false, error: '未加入房间' });

      const room = getRoom(roomId);
      if (!room || room.hostId !== playerId) return callback?.({ success: false, error: '只有房主可以开始游戏' });

      const result = startGame(roomId);
      if ('error' in result) return callback?.({ success: false, error: result.error });

      resetAiCounts(roomId);
      resetAiScheduled(roomId);
      startNight(io, roomId);
      callback?.({ success: true });
    });

    // Night action
    socket.on('submit-night-action', ({ type, targetId }, callback) => {
      const { roomId, playerId } = socket.data || {};
      if (!roomId || !playerId) return;

      const result = submitNightAction(roomId, playerId, { type, targetId });
      if ('error' in result) { callback?.({ success: false, error: result.error }); return; }

      const room = getRoom(roomId);
      if (room) broadcastState(io, roomId, room);
      callback?.({ success: true });
    });

    // Send message
    socket.on('send-message', ({ content, replyTo }, callback) => {
      const { roomId, playerId } = socket.data || {};
      if (!roomId || !playerId) return;

      const result = addMessage(roomId, playerId, content, replyTo);
      if ('error' in result) { callback?.({ success: false, error: result.error }); return; }

      io.to(roomId).emit('new-message', result);
      callback?.({ success: true });

      recordHumanMessage(roomId, content.length);
      onHumanMessage(io, roomId, content);
    });

    // Mission result
    socket.on('mission-result', ({ result }) => {
      const { roomId, playerId } = socket.data || {};
      if (!roomId || !playerId) return;
      handleMissionResult(io, roomId, playerId, result);
    });

    // Dev: 立即触发任务（仅开发环境）
    socket.on('dev-trigger-mission', ({ missionId } = {}) => {
      if (process.env.NODE_ENV === 'production') return;
      const id = missionId || MISSION_IDS[Math.floor(Math.random() * MISSION_IDS.length)];
      socket.emit('mission-trigger', { missionId: id, triggeredAt: Date.now() });
    });

    // Submit vote
    socket.on('submit-vote', ({ targetId }, callback) => {
      const { roomId, playerId } = socket.data || {};
      if (!roomId || !playerId) return;

      const result = submitVote(roomId, playerId, targetId);
      if ('error' in result) { callback?.({ success: false, error: result.error }); return; }

      broadcastState(io, roomId, result);
      callback?.({ success: true });

      const room = getRoom(roomId);
      if (room) {
        const onlinePlayers = room.players.filter(p => p.isOnline);
        if (room.votes.length >= onlinePlayers.length) {
          clearRoomTimers(roomId);
          finishVoting(io, roomId);
        }
      }
    });

    // Ready up
    socket.on('player-ready', () => {
      const { roomId, playerId } = socket.data || {};
      if (!roomId || !playerId) return;
      const room = setPlayerReady(roomId, playerId);
      if (room) broadcastState(io, roomId, room);
    });

    // Skip to vote
    socket.on('skip-to-vote', (callback) => {
      const { roomId, playerId } = socket.data || {};
      if (!roomId || !playerId) return;

      const room = getRoom(roomId);
      if (!room || room.phase !== 'chat') { callback?.({ success: false, error: '当前不在聊天阶段' }); return; }

      const isHost = room.hostId === playerId;

      if (isHost) {
        clearRoomTimers(roomId);
        clearPendingAITimers(roomId);
        const updated = room.currentRound >= room.config.maxRounds
          ? startVoting(roomId)
          : (() => { const r = startVoting(roomId); if (r) r.currentRound = room.config.maxRounds; return r; })();
        if (updated) {
          io.to(roomId).emit('phase-change', { phase: 'vote' });
          broadcastState(io, roomId, updated);
          scheduleVoteEnd(io, roomId, updated.config.voteDuration);
        }
        callback?.({ success: true });
      } else {
        if (!room.skipVotes) room.skipVotes = new Set();
        room.skipVotes.add(playerId);
        const onlinePlayers = room.players.filter(p => p.isOnline);
        const needed = Math.ceil(onlinePlayers.length / 2);
        io.to(roomId).emit('skip-vote-update', { count: room.skipVotes.size, needed });
        callback?.({ success: true, count: room.skipVotes.size, needed });

        if (room.skipVotes.size >= needed) {
          room.skipVotes = new Set();
          clearRoomTimers(roomId);
          clearPendingAITimers(roomId);
          const updated = startVoting(roomId);
          if (updated) {
            io.to(roomId).emit('phase-change', { phase: 'vote' });
            broadcastState(io, roomId, updated);
            scheduleVoteEnd(io, roomId, updated.config.voteDuration);
          }
        }
      }
    });

    // Extend round
    socket.on('extend-round', (callback) => {
      const { roomId, playerId } = socket.data || {};
      if (!roomId || !playerId) return;

      const room = getRoom(roomId);
      if (!room || room.phase !== 'chat') { callback?.({ success: false, error: '不在聊天阶段' }); return; }
      if (getExtensionCount(roomId) >= MAX_EXTENSIONS) { callback?.({ success: false, error: `每轮最多续时 ${MAX_EXTENSIONS} 次` }); return; }

      const isHost = room.hostId === playerId;

      if (isHost) {
        doExtendRound(io, roomId, 'host');
        callback?.({ success: true });
      } else {
        if (!room.extendVotes) room.extendVotes = new Set();
        room.extendVotes.add(playerId);
        const onlinePlayers = room.players.filter(p => p.isOnline);
        const needed = Math.ceil(onlinePlayers.length / 2);
        io.to(roomId).emit('extend-vote-update', { count: room.extendVotes.size, needed });
        callback?.({ success: true, count: room.extendVotes.size, needed });

        if (room.extendVotes.size >= needed) {
          doExtendRound(io, roomId, 'vote');
        }
      }
    });

    // Submit elimination vote
    socket.on('submit-elimination-vote', ({ targetId }, callback) => {
      const { roomId, playerId } = socket.data || {};
      if (!roomId || !playerId) return;

      const result = submitEliminationVote(roomId, playerId, targetId);
      if ('error' in result) { callback?.({ success: false, error: result.error }); return; }

      broadcastState(io, roomId, result);
      callback?.({ success: true });

      const room = getRoom(roomId);
      if (room) {
        const eligible = room.players.filter(p => p.isOnline && !room.eliminatedIds.includes(p.id));
        if (room.eliminationVotes.length >= eligible.length) {
          clearRoomTimers(roomId);
          finishElimination(io, roomId);
        }
      }
    });

    // React to message
    socket.on('react-to-message', ({ messageId, emoji }, callback) => {
      const { roomId, playerId } = socket.data || {};
      if (!roomId || !playerId) return;

      const ALLOWED = ['🤔', '❓', '💀', '👀'];
      if (!ALLOWED.includes(emoji)) return;

      const room = addReaction(roomId, messageId, emoji, playerId);
      if (room) broadcastState(io, roomId, room);
      callback?.({ success: true });
    });

    // Leave room
    socket.on('leave-room', () => {
      const { roomId } = socket.data || {};
      if (roomId) {
        socket.leave(roomId);
        const result = removePlayer(socket.id);
        if (result && result.room.players.length > 0) {
          broadcastState(io, result.room.id, result.room);
        }
      }
      socket.data = {};
    });

    // Play again
    socket.on('play-again', () => {
      const { roomId, playerId } = socket.data || {};
      if (!roomId) return;
      const room = getRoom(roomId);
      if (!room || room.hostId !== playerId) return;

      clearRoomTimers(roomId);
      clearPendingAITimers(roomId);
      resetAiCounts(roomId);
      resetAiScheduled(roomId);
      clearExtensionCount(roomId);
      const updated = resetRoom(roomId);
      if (updated) {
        io.to(roomId).emit('phase-change', { phase: 'lobby' });
        broadcastState(io, roomId, updated);
      }
    });

    // Disconnect
    socket.on('disconnect', () => {
      const result = removePlayer(socket.id);
      if (result) broadcastState(io, result.room.id, result.room);
    });
  });

  function broadcastState(io, roomId, room) {
    for (const [, socket] of io.sockets.sockets) {
      if (socket.data?.roomId === roomId) {
        socket.emit('game-state', getRoomState(room, socket.data.playerId));
      }
    }
  }

  function startNight(io, roomId) {
    const room = startNightPhase(roomId);
    if (!room) return;
    clearExtensionCount(roomId);
    resetAiCounts(roomId);
    resetAiScheduled(roomId);
    clearAiOpinions(room.aiParticipants.map(a => a.id));
    io.to(roomId).emit('phase-change', { phase: 'night' });
    broadcastState(io, roomId, room);
    scheduleNightEnd(io, roomId, NIGHT_DURATION_SEC);
  }

  function scheduleNightEnd(io, roomId, durationSeconds) {
    if (nightTimers.has(roomId)) { clearTimeout(nightTimers.get(roomId)); nightTimers.delete(roomId); }
    const timer = setTimeout(() => {
      const room = getRoom(roomId);
      if (!room || room.phase !== 'night') return;

      const { nightResults, room: updated } = startChatRound(roomId);
      if (!updated) return;

      // Send private night intel to each recipient
      for (const [playerId, intel] of Object.entries(nightResults)) {
        const target = [...io.sockets.sockets.values()].find(s => s.data?.playerId === playerId);
        if (target) target.emit('night-intel', intel);
      }

      clearExtensionCount(roomId);
      io.to(roomId).emit('phase-change', { phase: 'chat' });
      broadcastState(io, roomId, updated);
      scheduleRoundEnd(io, roomId, updated.config.roundDuration);
      scheduleIceBreaker(io, roomId);
      scheduleQuietCheck(io, roomId);
      scheduleLastRoundAIFrenzy(io, roomId, updated.config.roundDuration);
      if (updated.currentRound === 1) scheduleMission(io, roomId);

      // 预生成每个 AI 的本轮立场（异步，不阻塞）
      const allNames = [
        ...updated.players.map(p => p.name),
        ...updated.aiParticipants.map(a => a.name),
      ];
      for (const ai of updated.aiParticipants) {
        generateAiOpinion(ai.id, ai.name, updated.currentTopic, allNames).catch(() => {});
      }
    }, durationSeconds * 1000);
    nightTimers.set(roomId, timer);
  }

  function doExtendRound(io, roomId, reason) {
    const room = getRoom(roomId);
    if (!room || room.phase !== 'chat') return false;
    incExtensionCount(roomId);
    const extCount = getExtensionCount(roomId);
    room.roundEndTime = Date.now() + EXTEND_SECONDS * 1000;
    room.extendVotes = new Set();
    io.to(roomId).emit('round-extended', { reason, seconds: EXTEND_SECONDS, extensionCount: extCount, maxExtensions: MAX_EXTENSIONS });
    broadcastState(io, roomId, room);
    scheduleRoundEnd(io, roomId, EXTEND_SECONDS);
    return true;
  }

  function scheduleRoundEnd(io, roomId, durationSeconds) {
    clearRoomTimers(roomId);
    const timer = setTimeout(() => {
      const room = getRoom(roomId);
      if (!room || room.phase !== 'chat') return;

      // A. Auto-extend if conversation is hot (≥2 msgs in last 20s) and budget remains
      if (getExtensionCount(roomId) < MAX_EXTENSIONS) {
        const recent = room.messages.filter(m => !m.isSystem && Date.now() - m.timestamp < 20000);
        if (recent.length >= 2) {
          doExtendRound(io, roomId, 'auto');
          return;
        }
      }

      clearPendingAITimers(roomId);
      clearExtensionCount(roomId);

      const isLastRound = room.currentRound >= room.config.maxRounds;

      if (isLastRound) {
        const updated = startVoting(roomId);
        if (updated) {
          io.to(roomId).emit('phase-change', { phase: 'vote' });
          broadcastState(io, roomId, updated);
          scheduleVoteEnd(io, roomId, updated.config.voteDuration);
        }
      } else if (room.config.eliminationMode) {
        const updated = startElimination(roomId);
        if (updated) {
          io.to(roomId).emit('phase-change', { phase: 'elimination' });
          broadcastState(io, roomId, updated);
          scheduleEliminationEnd(io, roomId, 25);
        }
      } else {
        startNight(io, roomId);
      }
    }, durationSeconds * 1000);

    roundTimers.set(roomId, timer);
  }

  function scheduleEliminationEnd(io, roomId, durationSeconds) {
    const timer = setTimeout(() => finishElimination(io, roomId), durationSeconds * 1000);
    eliminationTimers.set(roomId, timer);
  }

  function finishElimination(io, roomId) {
    const room = getRoom(roomId);
    if (!room || room.phase !== 'elimination') return;

    const updated = calculateElimination(roomId);
    if (updated) {
      io.to(roomId).emit('phase-change', { phase: 'elimination-result' });
      broadcastState(io, roomId, updated);

      setTimeout(() => {
        const cur = getRoom(roomId);
        if (!cur) return;

        if (cur.currentRound >= cur.config.maxRounds) {
          const voting = startVoting(roomId);
          if (voting) {
            io.to(roomId).emit('phase-change', { phase: 'vote' });
            broadcastState(io, roomId, voting);
            scheduleVoteEnd(io, roomId, voting.config.voteDuration);
          }
        } else {
          startNight(io, roomId);
        }
      }, 4000);
    }
  }

  function scheduleVoteEnd(io, roomId, durationSeconds) {
    const timer = setTimeout(() => finishVoting(io, roomId), (Number(durationSeconds) || 60) * 1000);
    voteTimers.set(roomId, timer);
  }

  function finishVoting(io, roomId) {
    const room = getRoom(roomId);
    if (!room || room.phase !== 'vote') return;
    const updated = calculateResults(roomId);
    if (updated) {
      io.to(roomId).emit('phase-change', { phase: 'results' });
      broadcastState(io, roomId, updated);
    }
  }

  httpServer.listen(port, () => {
    console.log(`> AI杀 server ready on http://localhost:${port}`);
  });
});
