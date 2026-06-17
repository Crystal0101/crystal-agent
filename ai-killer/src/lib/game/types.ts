export type GamePhase = 'lobby' | 'night' | 'chat' | 'elimination' | 'vote' | 'results';

export type PlayerRole = 'human' | 'impostor';

export type HumanRole = 'detective' | 'guardian' | 'analyst' | 'civilian';

export type AIDifficulty = 'normal' | 'advanced' | 'master';

export interface Player {
  id: string;
  socketId: string;
  name: string;
  avatar: string;
  role: PlayerRole;
  isReady: boolean;
  isHost: boolean;
  score: number;
  isOnline: boolean;
}

export interface AIParticipant {
  id: string;
  name: string;
  avatar: string;
  difficulty: AIDifficulty;
  isAI: true;
}

export type Participant = Player | AIParticipant;

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  content: string;
  timestamp: number;
  isAI: boolean;
  isSystem: boolean;
  replyTo?: string;
}

export interface VoteRecord {
  voterId: string;
  targetId: string;
}

export interface GameConfig {
  aiCount: number;
  aiDifficulty: AIDifficulty;
  impostorCount: number;
  maxRounds: number;
  roundDuration: number;
  voteDuration: number;
  eliminationMode: boolean;
}

export interface RoundResult {
  round: number;
  eliminatedId: string | null;
  wasAI: boolean;
  votes: VoteRecord[];
}

export interface InvestigationRecord {
  round: number;
  investigatorId: string;
  targetId: string;
  targetName: string;
  isAI: boolean;
}

export interface GameResult {
  winners: 'humans' | 'ai' | 'draw';
  playerScores: Record<string, number>;
  identityReveal: Record<string, { isAI: boolean; role: PlayerRole | 'AI'; humanRole: HumanRole | null }>;
  roundResults: RoundResult[];
  investigationHistory: InvestigationRecord[];
}

export interface GameRoom {
  id: string;
  hostId: string;
  players: Player[];
  aiParticipants: AIParticipant[];
  phase: GamePhase;
  messages: ChatMessage[];
  config: GameConfig;
  votes: VoteRecord[];
  currentRound: number;
  currentTopic: string;
  roundEndTime: number;
  voteEndTime: number;
  result: GameResult | null;
  createdAt: number;
}

export interface EliminationResult {
  eliminatedId: string | null;
  wasAI: boolean | null;
  voteCounts: Record<string, number>;
}

export interface ClientGameState {
  roomId: string;
  hostId: string;
  participants: Participant[];
  phase: GamePhase;
  messages: ChatMessage[];
  config: GameConfig;
  votes: VoteRecord[];
  currentRound: number;
  currentTopic: string;
  roundEndTime: number;
  voteEndTime: number;
  eliminationEndTime: number;
  eliminationVotes: VoteRecord[];
  eliminationResult: EliminationResult | null;
  eliminatedIds: string[];
  reactions: Record<string, Record<string, string[]>>;
  result: GameResult | null;
  myId: string;
  myRole: PlayerRole | null;
  myHumanRole: HumanRole | null;
  nightEndTime: number;
  nightActionSubmitted: boolean;
  revealedRoles: Record<string, HumanRole>;
}

// Socket event payloads
export interface CreateRoomPayload {
  playerName: string;
  avatar: string;
  config: GameConfig;
}

export interface JoinRoomPayload {
  roomId: string;
  playerName: string;
  avatar: string;
}

export interface SendMessagePayload {
  content: string;
  replyTo?: string;
}

export interface SubmitVotePayload {
  targetId: string;
}
