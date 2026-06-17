'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { ClientGameState, ChatMessage } from '@/lib/game/types';
import { MissionResult } from '@/lib/missions/types';
import { MissionCase } from '@/lib/missions/caseTypes';
import { pickRandomCase } from '@/lib/missions/casePool';

export interface SkipVoteStatus { count: number; needed: number }
export interface TypingUser { senderId: string; senderName: string }
export interface ExtendVoteStatus { count: number; needed: number }
export interface RoundExtended { reason: 'auto' | 'host' | 'vote'; seconds: number; extensionCount: number; maxExtensions: number }
export interface MissionTrigger { missionId: string; triggeredAt?: number }
export interface MissionIntel { targetPlayerId: string | null; type: 'suspect' | 'clear' | 'reveal'; message: string; expiresAt: number }
export interface NightIntel {
  type: 'investigation' | 'protection_confirmed' | 'protected';
  targetId?: string;
  targetName?: string;
  isAI?: boolean;
  message?: string;
}

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);
  const [gameState, setGameState] = useState<ClientGameState | null>(null);
  const [connected, setConnected] = useState(false);
  const [skipVoteStatus, setSkipVoteStatus] = useState<SkipVoteStatus | null>(null);
  const [extendVoteStatus, setExtendVoteStatus] = useState<ExtendVoteStatus | null>(null);
  const [roundExtended, setRoundExtended] = useState<RoundExtended | null>(null);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [pendingMission, setPendingMission] = useState<MissionTrigger | null>(null);
  const [missionIntel, setMissionIntel] = useState<MissionIntel | null>(null);
  const [activeCase, setActiveCase] = useState<MissionCase | null>(null);
  const [nightIntel, setNightIntel] = useState<NightIntel | null>(null);

  useEffect(() => {
    const socket = io({ transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    socket.on('game-state', (state: ClientGameState) => {
      setGameState(state);
      setSkipVoteStatus(null);
      setExtendVoteStatus(null);
    });

    socket.on('new-message', (msg: ChatMessage) => {
      setGameState(prev => prev ? { ...prev, messages: [...prev.messages, msg] } : prev);
      setTypingUsers(prev => prev.filter(u => u.senderId !== msg.senderId));
    });

    socket.on('phase-change', ({ phase }: { phase: string }) => {
      setGameState(prev => prev ? { ...prev, phase: phase as ClientGameState['phase'] } : prev);
      if (phase !== 'chat') {
        setSkipVoteStatus(null);
        setExtendVoteStatus(null);
        setRoundExtended(null);
        setTypingUsers([]);
      }
    });

    socket.on('skip-vote-update', (status: SkipVoteStatus) => {
      setSkipVoteStatus(status);
    });

    socket.on('extend-vote-update', (status: ExtendVoteStatus) => {
      setExtendVoteStatus(status);
    });

    socket.on('round-extended', (info: RoundExtended) => {
      setRoundExtended(info);
      setExtendVoteStatus(null);
      // Auto-clear the notification after 4s
      setTimeout(() => setRoundExtended(null), 4000);
    });

    socket.on('typing-indicator', ({ senderId, senderName, isTyping }: { senderId: string; senderName: string; isTyping: boolean }) => {
      setTypingUsers(prev => {
        if (isTyping) {
          if (prev.some(u => u.senderId === senderId)) return prev;
          return [...prev, { senderId, senderName }];
        } else {
          return prev.filter(u => u.senderId !== senderId);
        }
      });
    });

    socket.on('mission-trigger', (trigger: MissionTrigger) => {
      setPendingMission(trigger);
      setActiveCase(pickRandomCase());
    });

    socket.on('mission-intel', (intel: MissionIntel) => {
      setMissionIntel(intel);
      setTimeout(() => setMissionIntel(null), intel.expiresAt - Date.now());
    });

    socket.on('night-intel', (intel: NightIntel) => {
      setNightIntel(intel);
      setTimeout(() => setNightIntel(null), 30000);
    });

    return () => { socket.disconnect(); };
  }, []);

  const createRoom = useCallback((playerName: string, avatar: string, config: object) => {
    return new Promise<ClientGameState>((resolve, reject) => {
      socketRef.current?.emit('create-room', { playerName, avatar, config }, (res: { success: boolean; state?: ClientGameState; error?: string }) => {
        if (res.success && res.state) { setGameState(res.state); resolve(res.state); }
        else reject(new Error(res.error || '创建房间失败'));
      });
    });
  }, []);

  const joinRoom = useCallback((roomId: string, playerName: string, avatar: string) => {
    return new Promise<ClientGameState>((resolve, reject) => {
      socketRef.current?.emit('join-room', { roomId, playerName, avatar }, (res: { success: boolean; state?: ClientGameState; error?: string }) => {
        if (res.success && res.state) { setGameState(res.state); resolve(res.state); }
        else reject(new Error(res.error || '加入房间失败'));
      });
    });
  }, []);

  const startGame = useCallback(() => {
    return new Promise<void>((resolve, reject) => {
      socketRef.current?.emit('start-game', (res: { success: boolean; error?: string }) => {
        if (res?.success) resolve();
        else reject(new Error(res?.error || '开始失败'));
      });
    });
  }, []);

  const sendMessage = useCallback((content: string, replyTo?: string) => {
    socketRef.current?.emit('send-message', { content, replyTo });
  }, []);

  const submitVote = useCallback((targetId: string) => {
    socketRef.current?.emit('submit-vote', { targetId });
  }, []);

  const playAgain = useCallback(() => {
    socketRef.current?.emit('play-again');
  }, []);

  const playerReady = useCallback(() => {
    socketRef.current?.emit('player-ready');
  }, []);

  const skipToVote = useCallback(() => {
    return new Promise<{ count?: number; needed?: number }>((resolve) => {
      socketRef.current?.emit('skip-to-vote', (res: { success: boolean; count?: number; needed?: number }) => {
        if (res?.count !== undefined) setSkipVoteStatus({ count: res.count, needed: res.needed! });
        resolve(res || {});
      });
    });
  }, []);

  const extendRound = useCallback(() => {
    return new Promise<{ success: boolean; count?: number; needed?: number; error?: string }>((resolve) => {
      socketRef.current?.emit('extend-round', (res: { success: boolean; count?: number; needed?: number; error?: string }) => {
        if (res?.count !== undefined) setExtendVoteStatus({ count: res.count, needed: res.needed! });
        resolve(res || { success: false });
      });
    });
  }, []);

  const submitEliminationVote = useCallback((targetId: string) => {
    socketRef.current?.emit('submit-elimination-vote', { targetId });
  }, []);

  const reactToMessage = useCallback((messageId: string, emoji: string) => {
    socketRef.current?.emit('react-to-message', { messageId, emoji });
  }, []);

  const leaveGame = useCallback(() => {
    socketRef.current?.emit('leave-room');
    setGameState(null);
    setSkipVoteStatus(null);
    setPendingMission(null);
    setActiveCase(null);
    setNightIntel(null);
  }, []);

  const reportMissionResult = useCallback((result: MissionResult) => {
    setPendingMission(null);
    setActiveCase(null);
    socketRef.current?.emit('mission-result', { result });
  }, []);

  const devTriggerMission = useCallback((missionId?: string) => {
    socketRef.current?.emit('dev-trigger-mission', missionId ? { missionId } : {});
  }, []);

  const submitNightAction = useCallback((type: string, targetId: string) => {
    return new Promise<void>((resolve, reject) => {
      socketRef.current?.emit('submit-night-action', { type, targetId }, (res: { success: boolean; error?: string }) => {
        if (res?.success) resolve();
        else reject(new Error(res?.error || '提交失败'));
      });
    });
  }, []);

  return {
    gameState,
    connected,
    activeCase,
    skipVoteStatus,
    extendVoteStatus,
    roundExtended,
    typingUsers,
    pendingMission,
    missionIntel,
    nightIntel,
    createRoom,
    joinRoom,
    startGame,
    sendMessage,
    submitVote,
    submitEliminationVote,
    reactToMessage,
    playAgain,
    playerReady,
    skipToVote,
    extendRound,
    leaveGame,
    reportMissionResult,
    devTriggerMission,
    submitNightAction,
  };
}
