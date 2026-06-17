import { v4 as uuidv4 } from 'uuid';
import {
  GameRoom, Player, AIParticipant, ChatMessage, VoteRecord,
  GameConfig, GameResult, PlayerRole, GamePhase,
} from './types';
import { createAIParticipant, generateAIMessage } from './AIPlayer';
import { getRandomTopic } from './topics';

const AVATARS = ['😎', '🦊', '🐸', '🐼', '🦁', '🐯', '🦅', '🦋', '🦄', '🐲'];

const rooms = new Map<string, GameRoom>();

export function createRoom(hostSocketId: string, playerName: string, avatar: string, config: GameConfig): GameRoom {
  const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
  const hostPlayer: Player = {
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

  const aiParticipants: AIParticipant[] = [];
  for (let i = 0; i < config.aiCount; i++) {
    aiParticipants.push(createAIParticipant(i, config.aiDifficulty));
  }

  const room: GameRoom = {
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
    result: null,
    createdAt: Date.now(),
  };

  rooms.set(roomId, room);
  return room;
}

export function joinRoom(roomId: string, socketId: string, playerName: string, avatar: string): { room: GameRoom; player: Player } | { error: string } {
  const room = rooms.get(roomId);
  if (!room) return { error: '房间不存在' };
  if (room.phase !== 'lobby') return { error: '游戏已经开始' };
  if (room.players.length >= 8) return { error: '房间已满' };

  const usedAvatars = room.players.map(p => p.avatar);
  const availableAvatar = avatar || AVATARS.find(a => !usedAvatars.includes(a)) || AVATARS[room.players.length % AVATARS.length];

  const player: Player = {
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

export function getRoom(roomId: string): GameRoom | undefined {
  return rooms.get(roomId);
}

export function getRoomBySocket(socketId: string): { room: GameRoom; player: Player } | null {
  for (const room of rooms.values()) {
    const player = room.players.find(p => p.socketId === socketId);
    if (player) return { room, player };
  }
  return null;
}

export function setPlayerReady(roomId: string, playerId: string): GameRoom | null {
  const room = rooms.get(roomId);
  if (!room) return null;
  const player = room.players.find(p => p.id === playerId);
  if (player) player.isReady = true;
  return room;
}

export function startGame(roomId: string): GameRoom | { error: string } {
  const room = rooms.get(roomId);
  if (!room) return { error: '房间不存在' };
  if (room.players.length < 2) return { error: '至少需要2名玩家' };

  // Assign impostor roles
  const humanPlayers = [...room.players];
  const impostorCount = Math.min(room.config.impostorCount, Math.floor(humanPlayers.length / 2));
  const shuffled = humanPlayers.sort(() => Math.random() - 0.5);

  for (let i = 0; i < impostorCount; i++) {
    shuffled[i].role = 'impostor';
  }

  room.currentRound = 1;
  room.currentTopic = getRandomTopic();
  room.phase = 'chat';
  room.roundEndTime = Date.now() + room.config.roundDuration * 1000;
  room.messages = [];
  room.votes = [];

  const systemMsg: ChatMessage = {
    id: uuidv4(),
    senderId: 'system',
    senderName: '系统',
    senderAvatar: '⚙️',
    content: `第 ${room.currentRound} 轮开始！话题：${room.currentTopic}`,
    timestamp: Date.now(),
    isAI: false,
    isSystem: true,
  };
  room.messages.push(systemMsg);

  return room;
}

export function addMessage(roomId: string, senderId: string, content: string, replyTo?: string): ChatMessage | { error: string } {
  const room = rooms.get(roomId);
  if (!room) return { error: '房间不存在' };
  if (room.phase !== 'chat') return { error: '当前不在聊天阶段' };

  const sender = room.players.find(p => p.id === senderId) || room.aiParticipants.find(a => a.id === senderId);
  if (!sender) return { error: '发送者不存在' };

  const message: ChatMessage = {
    id: uuidv4(),
    senderId,
    senderName: sender.name,
    senderAvatar: sender.avatar,
    content: content.trim().slice(0, 500),
    timestamp: Date.now(),
    isAI: 'isAI' in sender && sender.isAI,
    isSystem: false,
    replyTo,
  };

  room.messages.push(message);
  return message;
}

export async function triggerAIMessages(roomId: string, onMessage: (msg: ChatMessage) => void): Promise<void> {
  const room = rooms.get(roomId);
  if (!room || room.phase !== 'chat') return;

  const allNames = [
    ...room.players.map(p => p.name),
    ...room.aiParticipants.map(a => a.name),
  ];

  for (const ai of room.aiParticipants) {
    // Random delay between AI responses to feel natural
    await new Promise(r => setTimeout(r, 2000 + Math.random() * 4000));

    const currentRoom = rooms.get(roomId);
    if (!currentRoom || currentRoom.phase !== 'chat') break;

    try {
      const content = await generateAIMessage(
        ai.name,
        ai.difficulty,
        room.currentTopic,
        room.messages,
        allNames,
      );

      const message: ChatMessage = {
        id: uuidv4(),
        senderId: ai.id,
        senderName: ai.name,
        senderAvatar: ai.avatar,
        content,
        timestamp: Date.now(),
        isAI: true,
        isSystem: false,
      };

      currentRoom.messages.push(message);
      onMessage(message);
    } catch {
      // silently skip if AI fails
    }
  }
}

export function submitVote(roomId: string, voterId: string, targetId: string): GameRoom | { error: string } {
  const room = rooms.get(roomId);
  if (!room) return { error: '房间不存在' };
  if (room.phase !== 'vote') return { error: '当前不在投票阶段' };

  // Remove existing vote from this voter
  room.votes = room.votes.filter(v => v.voterId !== voterId);
  room.votes.push({ voterId, targetId });

  return room;
}

export function startVoting(roomId: string): GameRoom | null {
  const room = rooms.get(roomId);
  if (!room) return null;

  room.phase = 'vote';
  room.votes = [];
  room.voteEndTime = Date.now() + room.config.voteDuration * 1000;

  const systemMsg: ChatMessage = {
    id: uuidv4(),
    senderId: 'system',
    senderName: '系统',
    senderAvatar: '⚙️',
    content: '聊天结束！现在开始投票，选出你认为是AI的玩家！',
    timestamp: Date.now(),
    isAI: false,
    isSystem: true,
  };
  room.messages.push(systemMsg);

  return room;
}

export function advanceRound(roomId: string): GameRoom | null {
  const room = rooms.get(roomId);
  if (!room) return null;

  room.currentRound++;
  room.currentTopic = getRandomTopic(room.messages.filter(m => m.isSystem).map(m => {
    const match = m.content.match(/话题：(.+)$/);
    return match ? match[1] : '';
  }));
  room.phase = 'chat';
  room.roundEndTime = Date.now() + room.config.roundDuration * 1000;
  room.votes = [];

  const systemMsg: ChatMessage = {
    id: uuidv4(),
    senderId: 'system',
    senderName: '系统',
    senderAvatar: '⚙️',
    content: `第 ${room.currentRound} 轮开始！新话题：${room.currentTopic}`,
    timestamp: Date.now(),
    isAI: false,
    isSystem: true,
  };
  room.messages.push(systemMsg);

  return room;
}

export function calculateResults(roomId: string): GameRoom | null {
  const room = rooms.get(roomId);
  if (!room) return null;

  // Count votes per target
  const voteCount: Record<string, number> = {};
  for (const vote of room.votes) {
    voteCount[vote.targetId] = (voteCount[vote.targetId] || 0) + 1;
  }

  // Calculate scores
  const playerScores: Record<string, number> = {};
  const identityReveal: GameResult['identityReveal'] = {};

  // Register all participants
  for (const p of room.players) {
    playerScores[p.id] = p.score;
    identityReveal[p.id] = { isAI: false, role: p.role, humanRole: null };
  }
  for (const ai of room.aiParticipants) {
    playerScores[ai.id] = 0;
    identityReveal[ai.id] = { isAI: true, role: 'AI', humanRole: null };
  }

  const aiIds = new Set(room.aiParticipants.map(a => a.id));
  const impostorIds = new Set(room.players.filter(p => p.role === 'impostor').map(p => p.id));

  for (const vote of room.votes) {
    const voterIsHuman = room.players.some(p => p.id === vote.voterId);
    if (!voterIsHuman) continue;

    if (aiIds.has(vote.targetId)) {
      // Correctly identified real AI
      playerScores[vote.voterId] = (playerScores[vote.voterId] || 0) + 100;
    } else if (impostorIds.has(vote.targetId)) {
      // Voted for human impostor — voter loses points, impostor gains
      playerScores[vote.voterId] = (playerScores[vote.voterId] || 0) - 80;
      playerScores[vote.targetId] = (playerScores[vote.targetId] || 0) + 150;
    } else {
      // Voted for innocent human
      playerScores[vote.voterId] = (playerScores[vote.voterId] || 0) - 30;
    }
  }

  // Bonus for AIs that weren't found
  for (const ai of room.aiParticipants) {
    const votesAgainst = voteCount[ai.id] || 0;
    if (votesAgainst === 0) {
      playerScores[ai.id] = (playerScores[ai.id] || 0) + 200;
    }
  }

  // Determine winner
  const totalHumanScore = room.players.reduce((s, p) => s + (playerScores[p.id] || 0), 0);
  const totalAIScore = room.aiParticipants.reduce((s, a) => s + (playerScores[a.id] || 0), 0);

  let winners: 'humans' | 'ai' | 'draw' = 'draw';
  if (totalHumanScore > totalAIScore) winners = 'humans';
  else if (totalAIScore > totalHumanScore) winners = 'ai';

  room.result = {
    winners,
    playerScores,
    identityReveal,
    roundResults: [],
    investigationHistory: [],
  };
  room.phase = 'results';

  return room;
}

export function resetRoom(roomId: string): GameRoom | null {
  const room = rooms.get(roomId);
  if (!room) return null;

  room.phase = 'lobby';
  room.messages = [];
  room.votes = [];
  room.currentRound = 0;
  room.currentTopic = '';
  room.roundEndTime = 0;
  room.voteEndTime = 0;
  room.result = null;

  for (const player of room.players) {
    player.isReady = player.isHost;
    player.role = 'human';
    player.score = 0;
  }

  // Recreate AI participants
  room.aiParticipants = [];
  for (let i = 0; i < room.config.aiCount; i++) {
    room.aiParticipants.push(createAIParticipant(i, room.config.aiDifficulty));
  }

  return room;
}

export function removePlayer(socketId: string): { room: GameRoom; player: Player } | null {
  for (const room of rooms.values()) {
    const idx = room.players.findIndex(p => p.socketId === socketId);
    if (idx !== -1) {
      const player = room.players[idx];
      player.isOnline = false;

      // If game hasn't started, remove them
      if (room.phase === 'lobby') {
        room.players.splice(idx, 1);
        // Transfer host if needed
        if (player.isHost && room.players.length > 0) {
          room.players[0].isHost = true;
          room.hostId = room.players[0].id;
        }
      }
      return { room, player };
    }
  }
  return null;
}
