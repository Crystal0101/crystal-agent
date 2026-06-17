export type StageOutcome = 'correct' | 'wrong' | 'timeout';
export type StageDifficulty = 'easy' | 'medium' | 'hard';

export interface JudgeStage {
  type: 'judge';
  message: string;
  isAI: boolean;
  timeLimit: number;
  difficulty: StageDifficulty;
}

export interface FindStage {
  type: 'find';
  question: string;
  options: { id: string; text: string; isTarget: boolean }[];
  timeLimit: number;
  difficulty: StageDifficulty;
}

export interface TrackStage {
  type: 'track';
  speakerHint: string;
  priorMessages: string[];
  options: { id: string; text: string; isCorrect: boolean }[];
  timeLimit: number;
  difficulty: StageDifficulty;
}

export type AnyStage = JudgeStage | FindStage | TrackStage;

export interface MissionRun {
  caseNumber: string;
  title: string;
  echoIntro: string;
  stages: AnyStage[];
  triggeredAt: number;
}
