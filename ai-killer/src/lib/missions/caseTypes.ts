export type StageOutcome = 'correct' | 'wrong' | 'timeout';

export interface Clue {
  stageIndex: number;
  label: string;
  content: string;
}

// ── 密码破译：给规则 + 编码，选正确解码结果 ─────────────────────────────────
export interface CipherPayload {
  type: 'cipher';
  rule: string;          // 密码规则说明
  encoded: string;       // 显示给玩家的编码原文
  options: { id: string; text: string; isCorrect: boolean }[];
  timeLimit: number;
}

// ── 逻辑矛盾：谁在说谎？ ──────────────────────────────────────────────────────
export interface LogicPayload {
  type: 'logic';
  context?: string;      // 背景说明
  statements: { speaker: string; text: string }[];
  question: string;
  options: { id: string; text: string; isCorrect: boolean }[];
  explanation: string;   // 答案揭晓时的解释
  timeLimit: number;
}

// ── 记忆关：看档案N秒，然后回答 ─────────────────────────────────────────────
export interface MemoryPayload {
  type: 'memory';
  memoryTime: number;    // 展示秒数
  profile: { label: string; value: string }[];
  question: string;
  options: { id: string; text: string; isCorrect: boolean }[];
  timeLimit: number;
}

// ── 脑筋急转弯 ────────────────────────────────────────────────────────────────
export interface RiddlePayload {
  type: 'riddle';
  riddle: string;
  hint?: string;
  options: { id: string; text: string; isCorrect: boolean }[];
  timeLimit: number;
}

// ── 序列推理：找规律 ─────────────────────────────────────────────────────────
export interface SequencePayload {
  type: 'sequence';
  context: string;
  sequence: string[];    // 展示的序列，最后一项填 '?'
  rule: string;          // 揭示正确答案后展示
  options: { id: string; text: string; isCorrect: boolean }[];
  timeLimit: number;
}

// ── 综合选择题（通用） ────────────────────────────────────────────────────────
export interface ChoicePayload {
  type: 'choice';
  paragraphs: string[];  // 阅读材料（可多段）
  question: string;
  options: { id: string; text: string; isCorrect: boolean }[];
  timeLimit: number;
}

// ── 最终关：展示积累线索 + 定案 ─────────────────────────────────────────────
export interface SynthesisPayload {
  type: 'synthesis';
  question: string;
  options: { id: string; text: string; isCorrect: boolean }[];
  timeLimit: number;
}

export type AnyPayload =
  | CipherPayload | LogicPayload | MemoryPayload | RiddlePayload
  | SequencePayload | ChoicePayload | SynthesisPayload;

export interface CaseStage {
  echoComment: string;   // ECHO 在本关开始前说的话
  clue?: string;         // 答对后获得的线索（短文本）
  payload: AnyPayload;
}

export interface MissionCase {
  id: string;
  caseNumber: string;
  title: string;
  intro: string;         // ECHO 开场白（\n 分行）
  stages: CaseStage[];
}
