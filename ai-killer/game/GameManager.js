const { v4: uuidv4 } = require('uuid');
const { createAIParticipant, generateAIMessage } = require('./AIPlayer');
const { getRandomTopic } = require('./topics');

const AVATARS = ['😎', '🦊', '🐸', '🐼', '🦁', '🐯', '🦅', '🦋', '🦄', '🐲'];
const rooms = new Map();

function createRoom(hostSocketId, playerName, avatar, config) {
  const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
  const hostPlayer = {
    id: uuidv4(),
    socketId: hostSocketId,
    name: playerName,
    avatar: avatar || AVATARS[0],
    role: 'human',
    isReady: true,
    isHost: true,
    score: 0,
    isOnline: true,
  };

  const aiParticipants = [];
  for (let i = 0; i < config.aiCount; i++) {
    aiParticipants.push(createAIParticipant(i, config.aiDifficulty));
  }

  const room = {
    id: roomId,
    hostId: hostPlayer.id,
    players: [hostPlayer],
    aiParticipants,
    phase: 'lobby',
    messages: [],
    config,
    votes: [],
    currentRound: 0,
    currentTopic: '',
    roundEndTime: 0,
    voteEndTime: 0,
    eliminationEndTime: 0,
    eliminationVotes: [],
    eliminationResult: null,
    eliminatedIds: [],
    reactions: {},
    result: null,
    createdAt: Date.now(),
    usedTopics: [],
    lastActivityAt: Date.now(),
  };

  rooms.set(roomId, room);
  return room;
}

function joinRoom(roomId, socketId, playerName, avatar) {
  const room = rooms.get(roomId);
  if (!room) return { error: '房间不存在' };
  if (room.phase !== 'lobby') return { error: '游戏已经开始' };
  if (room.players.length >= 8) return { error: '房间已满' };

  const usedAvatars = room.players.map(p => p.avatar);
  const availableAvatar = avatar || AVATARS.find(a => !usedAvatars.includes(a)) || AVATARS[room.players.length % AVATARS.length];

  const player = {
    id: uuidv4(),
    socketId,
    name: playerName,
    avatar: availableAvatar,
    role: 'human',
    isReady: false,
    isHost: false,
    score: 0,
    isOnline: true,
  };

  room.players.push(player);
  return { room, player };
}

function getRoom(roomId) {
  return rooms.get(roomId);
}

function getRoomBySocket(socketId) {
  for (const room of rooms.values()) {
    const player = room.players.find(p => p.socketId === socketId);
    if (player) return { room, player };
  }
  return null;
}

function setPlayerReady(roomId, playerId) {
  const room = rooms.get(roomId);
  if (!room) return null;
  const player = room.players.find(p => p.id === playerId);
  if (player) player.isReady = true;
  return room;
}

const HUMAN_ROLE_LIST = ['detective', 'guardian', 'analyst'];

function assignHumanRoles(room) {
  const count = room.players.length;
  let roles = HUMAN_ROLE_LIST.slice(0, Math.min(count, HUMAN_ROLE_LIST.length));
  while (roles.length < count) roles.push('civilian');
  const shuffled = [...roles].sort(() => Math.random() - 0.5);
  room.playerRoles = {};
  room.players.forEach((p, i) => { room.playerRoles[p.id] = shuffled[i]; });
}

function startGame(roomId) {
  const room = rooms.get(roomId);
  if (!room) return { error: '房间不存在' };
  if (room.players.length < 1) return { error: '至少需要1名玩家' };

  const shuffled = [...room.players].sort(() => Math.random() - 0.5);
  const impostorCount = Math.min(room.config.impostorCount || 0, Math.floor(shuffled.length / 2));
  for (const p of room.players) p.role = 'human';
  for (let i = 0; i < impostorCount; i++) shuffled[i].role = 'impostor';

  assignHumanRoles(room);

  room.currentRound = 0;
  room.usedTopics = [];
  room.messages = [];
  room.votes = [];
  room.eliminatedIds = [];
  room.investigationHistory = [];
  room.nightActions = {};
  room.guardedPlayerId = null;
  room.lastActivityAt = Date.now();

  return room;
}

function startNightPhase(roomId) {
  const room = rooms.get(roomId);
  if (!room) return null;
  room.phase = 'night';
  room.nightEndTime = Date.now() + 35 * 1000;
  room.nightActions = {};
  room.guardedPlayerId = null;
  return room;
}

function submitNightAction(roomId, playerId, action) {
  const room = rooms.get(roomId);
  if (!room || room.phase !== 'night') return { error: '不在夜间阶段' };
  const role = room.playerRoles?.[playerId];
  if (!['detective', 'guardian'].includes(role)) return { error: '你的职业无法执行行动' };
  if (room.nightActions?.[playerId]) return { error: '已提交行动' };
  if (!room.nightActions) room.nightActions = {};
  room.nightActions[playerId] = action;
  return { success: true };
}

function processNightActions(room) {
  const results = {};
  if (!room.nightActions) return results;

  for (const [playerId, action] of Object.entries(room.nightActions)) {
    const role = room.playerRoles?.[playerId];

    if (role === 'detective' && action.type === 'investigate') {
      const all = [...room.players, ...room.aiParticipants];
      const target = all.find(p => p.id === action.targetId);
      if (target) {
        const isAI = !!target.isAI;
        results[playerId] = { type: 'investigation', targetId: target.id, targetName: target.name, isAI };
        if (!room.investigationHistory) room.investigationHistory = [];
        room.investigationHistory.push({
          round: room.currentRound + 1,
          investigatorId: playerId,
          targetId: target.id,
          targetName: target.name,
          isAI,
        });
      }
    }

    if (role === 'guardian' && action.type === 'protect') {
      room.guardedPlayerId = action.targetId;
      const target = room.players.find(p => p.id === action.targetId);
      if (target) {
        results[playerId] = { type: 'protection_confirmed', targetName: target.name };
        results[action.targetId] = { type: 'protected', message: '你已被守护者保护，本轮免于处决' };
      }
    }
  }

  return results;
}

function startChatRound(roomId) {
  const room = rooms.get(roomId);
  if (!room) return { nightResults: {}, room: null };

  const nightResults = processNightActions(room);

  room.currentRound++;
  room.usedTopics = room.usedTopics || [];
  room.currentTopic = getRandomTopic(room.usedTopics);
  room.usedTopics.push(room.currentTopic);
  room.phase = 'chat';
  room.lastActivityAt = Date.now();
  room.roundEndTime = Date.now() + room.config.roundDuration * 1000;
  room.votes = [];

  room.messages.push({
    id: uuidv4(), senderId: 'system', senderName: '系统', senderAvatar: '⚙️',
    content: `第 ${room.currentRound} 轮开始！话题：${room.currentTopic}`,
    timestamp: Date.now(), isAI: false, isSystem: true,
  });

  return { nightResults, room };
}

function addMessage(roomId, senderId, content, replyTo) {
  const room = rooms.get(roomId);
  if (!room) return { error: '房间不存在' };
  if (room.phase !== 'chat') return { error: '当前不在聊天阶段' };
  room.lastActivityAt = Date.now();

  const sender = room.players.find(p => p.id === senderId) || room.aiParticipants.find(a => a.id === senderId);
  if (!sender) return { error: '发送者不存在' };

  const message = {
    id: uuidv4(),
    senderId,
    senderName: sender.name,
    senderAvatar: sender.avatar,
    content: String(content).trim().slice(0, 500),
    timestamp: Date.now(),
    isAI: !!(sender.isAI),
    isSystem: false,
    replyTo,
  };

  room.messages.push(message);
  return message;
}

async function triggerAIMessages(roomId, onMessage) {
  const room = rooms.get(roomId);
  if (!room || room.phase !== 'chat') return;

  const allNames = [
    ...room.players.map(p => p.name),
    ...room.aiParticipants.map(a => a.name),
  ];

  for (const ai of room.aiParticipants) {
    await new Promise(r => setTimeout(r, 2000 + Math.random() * 5000));

    const cur = rooms.get(roomId);
    if (!cur || cur.phase !== 'chat') break;

    try {
      const content = await generateAIMessage(
        ai.id,
        ai.name,
        ai.difficulty,
        cur.currentTopic,
        cur.messages,
        allNames,
      );

      const message = {
        id: uuidv4(),
        senderId: ai.id,
        senderName: ai.name,
        senderAvatar: ai.avatar,
        content,
        timestamp: Date.now(),
        isAI: true,
        isSystem: false,
      };

      cur.messages.push(message);
      onMessage(message);
    } catch (e) {
      console.error('AI message error:', e.message);
    }
  }
}

function submitVote(roomId, voterId, targetId) {
  const room = rooms.get(roomId);
  if (!room) return { error: '房间不存在' };
  if (room.phase !== 'vote') return { error: '当前不在投票阶段' };
  if (voterId === targetId) return { error: '不能投票给自己' };

  room.votes = room.votes.filter(v => v.voterId !== voterId);
  room.votes.push({ voterId, targetId });
  return room;
}

function startVoting(roomId) {
  const room = rooms.get(roomId);
  if (!room) return null;

  room.phase = 'vote';
  room.votes = [];
  room.voteEndTime = Date.now() + room.config.voteDuration * 1000;

  room.messages.push({
    id: uuidv4(),
    senderId: 'system',
    senderName: '系统',
    senderAvatar: '⚙️',
    content: '聊天结束！现在开始投票，选出你认为是AI的玩家！',
    timestamp: Date.now(),
    isAI: false,
    isSystem: true,
  });

  return room;
}

function advanceRound(roomId) {
  const room = rooms.get(roomId);
  if (!room) return null;

  room.currentRound++;
  room.usedTopics = room.usedTopics || [];
  room.currentTopic = getRandomTopic(room.usedTopics);
  room.usedTopics.push(room.currentTopic);
  room.phase = 'chat';
  room.lastActivityAt = Date.now();
  room.roundEndTime = Date.now() + room.config.roundDuration * 1000;
  room.votes = [];

  room.messages.push({
    id: uuidv4(),
    senderId: 'system',
    senderName: '系统',
    senderAvatar: '⚙️',
    content: `第 ${room.currentRound} 轮开始！新话题：${room.currentTopic}`,
    timestamp: Date.now(),
    isAI: false,
    isSystem: true,
  });

  return room;
}

function calculateResults(roomId) {
  const room = rooms.get(roomId);
  if (!room) return null;

  const aiIds = new Set(room.aiParticipants.map(a => a.id));
  const impostorIds = new Set(room.players.filter(p => p.role === 'impostor').map(p => p.id));
  // Civilian gets ×2 voting weight
  const civilianId = Object.entries(room.playerRoles || {}).find(([, r]) => r === 'civilian')?.[0];

  const playerScores = {};
  const identityReveal = {};

  for (const p of room.players) {
    playerScores[p.id] = 0;
    identityReveal[p.id] = { isAI: false, role: p.role, humanRole: room.playerRoles?.[p.id] || 'civilian' };
  }
  for (const ai of room.aiParticipants) {
    playerScores[ai.id] = 0;
    identityReveal[ai.id] = { isAI: true, role: 'AI', humanRole: null };
  }

  for (const vote of room.votes) {
    if (!room.players.some(p => p.id === vote.voterId)) continue;
    const weight = vote.voterId === civilianId ? 2 : 1;

    if (aiIds.has(vote.targetId)) {
      playerScores[vote.voterId] = (playerScores[vote.voterId] || 0) + 100 * weight;
    } else if (impostorIds.has(vote.targetId)) {
      playerScores[vote.voterId] = (playerScores[vote.voterId] || 0) - 80 * weight;
      playerScores[vote.targetId] = (playerScores[vote.targetId] || 0) + 150;
    } else {
      playerScores[vote.voterId] = (playerScores[vote.voterId] || 0) - 30 * weight;
    }
  }

  // Bonus for AIs not caught
  const votedIds = new Set(room.votes.map(v => v.targetId));
  for (const ai of room.aiParticipants) {
    if (!votedIds.has(ai.id)) {
      playerScores[ai.id] = (playerScores[ai.id] || 0) + 200;
    }
  }

  const totalHuman = room.players.reduce((s, p) => s + (playerScores[p.id] || 0), 0);
  const totalAI = room.aiParticipants.reduce((s, a) => s + (playerScores[a.id] || 0), 0);

  let winners = 'draw';
  if (totalHuman > totalAI) winners = 'humans';
  else if (totalAI > totalHuman) winners = 'ai';

  for (const p of room.players) {
    p.score = (p.score || 0) + (playerScores[p.id] || 0);
  }

  room.result = {
    winners, playerScores, identityReveal, roundResults: [],
    investigationHistory: room.investigationHistory || [],
  };
  room.phase = 'results';
  room.lastActivityAt = Date.now();
  return room;
}

function startElimination(roomId) {
  const room = rooms.get(roomId);
  if (!room) return null;

  room.phase = 'elimination';
  room.eliminationVotes = [];
  room.eliminationResult = null;
  room.eliminationEndTime = Date.now() + 25 * 1000;

  const { v4: uuidv4 } = require('uuid');
  room.messages.push({
    id: uuidv4(),
    senderId: 'system',
    senderName: '系统',
    senderAvatar: '⚙️',
    content: `聊天结束！处决投票开始，25秒内投票处决你认为最可疑的人！`,
    timestamp: Date.now(),
    isAI: false,
    isSystem: true,
  });

  return room;
}

function submitEliminationVote(roomId, voterId, targetId) {
  const room = rooms.get(roomId);
  if (!room) return { error: '房间不存在' };
  if (room.phase !== 'elimination') return { error: '当前不在处决投票阶段' };
  if (voterId === targetId) return { error: '不能投票给自己' };

  room.eliminationVotes = room.eliminationVotes.filter(v => v.voterId !== voterId);
  room.eliminationVotes.push({ voterId, targetId });
  return room;
}

function calculateElimination(roomId) {
  const room = rooms.get(roomId);
  if (!room) return null;

  const { v4: uuidv4 } = require('uuid');
  const voteCounts = {};
  const onlinePlayers = room.players.filter(p => p.isOnline && !room.eliminatedIds.includes(p.id));
  const aiParticipants = room.aiParticipants.filter(a => !room.eliminatedIds.includes(a.id));
  const allParticipants = [...onlinePlayers, ...aiParticipants];

  for (const v of room.eliminationVotes) {
    voteCounts[v.targetId] = (voteCounts[v.targetId] || 0) + 1;
  }

  const majority = Math.ceil(allParticipants.length / 2);
  let eliminatedId = null;
  let maxVotes = 0;

  for (const [id, count] of Object.entries(voteCounts)) {
    if (count > maxVotes) { maxVotes = count; eliminatedId = id; }
  }

  // Only eliminate if majority voted for same person
  if (!eliminatedId || maxVotes < majority) eliminatedId = null;

  // Guardian protection: if the top-voted target is guarded, block elimination
  if (eliminatedId && room.guardedPlayerId === eliminatedId) {
    const guarded = allParticipants.find(p => p.id === eliminatedId);
    room.messages.push({
      id: uuidv4(), senderId: 'system', senderName: '系统', senderAvatar: '⚙️',
      content: `🛡️ 守护者的保护生效！${guarded?.name || '???'} 免于本轮处决。`,
      timestamp: Date.now(), isAI: false, isSystem: true,
    });
    room.eliminationResult = { eliminatedId: null, wasAI: null, voteCounts, guardedSaved: true };
    return room;
  }

  let wasAI = null;
  if (eliminatedId) {
    wasAI = aiParticipants.some(a => a.id === eliminatedId);
    room.eliminatedIds.push(eliminatedId);

    const eliminated = allParticipants.find(p => p.id === eliminatedId);
    room.messages.push({
      id: uuidv4(),
      senderId: 'system',
      senderName: '系统',
      senderAvatar: '⚙️',
      content: `${eliminated?.name || '???'} 被处决了！真实身份：${wasAI ? '🤖 AI！' : '😱 普通人类！'}`,
      timestamp: Date.now(),
      isAI: false,
      isSystem: true,
    });
  } else {
    room.messages.push({
      id: uuidv4(),
      senderId: 'system',
      senderName: '系统',
      senderAvatar: '⚙️',
      content: '未形成多数票，本轮无人被处决。',
      timestamp: Date.now(),
      isAI: false,
      isSystem: true,
    });
  }

  room.eliminationResult = { eliminatedId, wasAI, voteCounts };
  return room;
}

function addReaction(roomId, messageId, emoji, senderId) {
  const room = rooms.get(roomId);
  if (!room) return null;

  if (!room.reactions[messageId]) room.reactions[messageId] = {};
  if (!room.reactions[messageId][emoji]) room.reactions[messageId][emoji] = [];

  const idx = room.reactions[messageId][emoji].indexOf(senderId);
  if (idx >= 0) {
    room.reactions[messageId][emoji].splice(idx, 1);
    if (room.reactions[messageId][emoji].length === 0) delete room.reactions[messageId][emoji];
    if (Object.keys(room.reactions[messageId]).length === 0) delete room.reactions[messageId];
  } else {
    room.reactions[messageId][emoji].push(senderId);
  }

  return room;
}

function resetRoom(roomId) {
  const room = rooms.get(roomId);
  if (!room) return null;

  room.phase = 'lobby';
  room.messages = [];
  room.votes = [];
  room.eliminationVotes = [];
  room.eliminationResult = null;
  room.eliminatedIds = [];
  room.reactions = {};
  room.currentRound = 0;
  room.currentTopic = '';
  room.roundEndTime = 0;
  room.voteEndTime = 0;
  room.eliminationEndTime = 0;
  room.nightEndTime = 0;
  room.nightActions = {};
  room.guardedPlayerId = null;
  room.playerRoles = {};
  room.investigationHistory = [];
  room.result = null;

  for (const p of room.players) {
    p.isReady = p.isHost;
    p.role = 'human';
    p.score = 0;
  }

  room.aiParticipants = [];
  for (let i = 0; i < room.config.aiCount; i++) {
    room.aiParticipants.push(createAIParticipant(i, room.config.aiDifficulty));
  }

  return room;
}

function removePlayer(socketId) {
  for (const room of rooms.values()) {
    const idx = room.players.findIndex(p => p.socketId === socketId);
    if (idx !== -1) {
      const player = room.players[idx];
      player.isOnline = false;

      if (room.phase === 'lobby') {
        room.players.splice(idx, 1);
        if (player.isHost && room.players.length > 0) {
          room.players[0].isHost = true;
          room.hostId = room.players[0].id;
        }
        if (room.players.length === 0) {
          rooms.delete(room.id);
        }
      }
      return { room, player };
    }
  }
  return null;
}

// Clean up rooms idle for more than 2 hours
function cleanupStaleRooms() {
  const TWO_HOURS = 2 * 60 * 60 * 1000;
  const now = Date.now();
  for (const [roomId, room] of rooms.entries()) {
    const idle = now - (room.lastActivityAt || room.createdAt);
    if (idle > TWO_HOURS) {
      rooms.delete(roomId);
    }
  }
}

// Run cleanup every 30 minutes
setInterval(cleanupStaleRooms, 30 * 60 * 1000);

module.exports = {
  createRoom, joinRoom, getRoom, getRoomBySocket,
  setPlayerReady, startGame, addMessage, triggerAIMessages,
  submitVote, startVoting, advanceRound, calculateResults,
  startElimination, submitEliminationVote, calculateElimination,
  addReaction, resetRoom, removePlayer,
  startNightPhase, submitNightAction, startChatRound,
};
