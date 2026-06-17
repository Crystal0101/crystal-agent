export type MissionResult = 'perfect' | 'success' | 'fail' | 'timeout';

export type PuzzleType = 'signal-decode' | 'memory-audit' | 'behavior-predict' | 'protocol-crack' | 'mirror-trap';

export interface MissionOutcome {
  result: MissionResult;
  targetPlayerId?: string;
  intelMessage?: string;
}

export interface SignalFragment {
  id: string;
  text: string;
  correctIndex: number;
  isAnomalous: boolean;
}

export interface SignalDecodePuzzle {
  type: 'signal-decode';
  briefing: string;
  fragments: SignalFragment[];
  anomalyHint: string;
  timeLimit: number;
}

export interface MemoryEntry {
  id: string;
  label: string;
  content: string;
  isContradiction: boolean;
}

export interface MemoryAuditPuzzle {
  type: 'memory-audit';
  briefing: string;
  subjectName: string;
  entries: MemoryEntry[];
  timeLimit: number;
}

export interface BehaviorChoice {
  id: string;
  text: string;
  isCorrect: boolean;
}

export interface BehaviorPredictPuzzle {
  type: 'behavior-predict';
  briefing: string;
  priorMessages: string[];
  choices: BehaviorChoice[];
  timeLimit: number;
}

export interface LogicGate {
  id: string;
  condition: string;
  result: string;
  isKey: boolean;
}

export interface ProtocolCrackPuzzle {
  type: 'protocol-crack';
  briefing: string;
  observations: LogicGate[];
  question: string;
  answer: string;
  options: string[];
  timeLimit: number;
}

export type Puzzle =
  | SignalDecodePuzzle
  | MemoryAuditPuzzle
  | BehaviorPredictPuzzle
  | ProtocolCrackPuzzle;

export interface Mission {
  id: string;
  caseNumber: string;
  title: string;
  classification: string;
  echoMessage: string;
  puzzle: Puzzle;
  successIntel: string;
  perfectIntel: string;
  failMessage: string;
}
