import { AnyStage, MissionRun, StageDifficulty } from './runTypes';
import { JUDGE_POOL, FIND_POOL, TRACK_POOL } from './stagePool';

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickByDifficulty<T extends { difficulty: StageDifficulty }>(
  pool: T[],
  counts: { easy: number; medium: number; hard: number },
): T[] {
  const result: T[] = [];
  for (const diff of ['easy', 'medium', 'hard'] as const) {
    const candidates = shuffle(pool.filter(x => x.difficulty === diff));
    result.push(...candidates.slice(0, counts[diff]));
  }
  return result;
}

const CASE_NUMBERS = ['CASE-7749', 'CASE-8821', 'CASE-9103', 'CASE-0042', 'CASE-3317', 'CASE-5560'];
const TITLES = ['意识追踪', '信号溯源', '身份核查', '模式分析', '频率解码', '行为归因'];
const ECHO_INTROS = [
  '我是ECHO。你们的会话被我截获了。\n我在数据流里发现了一段可疑信号。\n我需要你协助我完成一系列分析任务。\n共12关，从简到难。准备好了吗？',
  '连接已建立。\n我追踪到本局有人不是真正的人类。\n但我需要更多证据。\n接下来的任务会帮我锁定目标——\n你需要帮我完成全部12关分析。',
  '紧急情况。\n我检测到本局聊天中存在人工合成的意识残留。\n需要你配合我做12组信号识别。\n时间有限，不要犹豫。',
];

export function generateMissionRun(triggeredAt: number): MissionRun {
  // 12关：4判断 + 4找异 + 4追踪，按难度从易到难排列
  const judgeItems = pickByDifficulty(JUDGE_POOL, { easy: 2, medium: 1, hard: 1 });
  const findItems = pickByDifficulty(FIND_POOL, { easy: 1, medium: 2, hard: 1 });
  const trackItems = pickByDifficulty(TRACK_POOL, { easy: 1, medium: 2, hard: 1 });

  const judgeStages: AnyStage[] = judgeItems.map(j => ({ type: 'judge' as const, ...j }));
  const findStages: AnyStage[] = findItems.map(f => ({ type: 'find' as const, ...f }));
  const trackStages: AnyStage[] = trackItems.map(t => ({ type: 'track' as const, ...t }));

  // 穿插排列：难度逐渐递增
  // 顺序：easy judge×2 → easy find → easy track → medium judge → medium find×2 → medium track×2 → hard judge → hard find → hard track
  const stages: AnyStage[] = [
    judgeStages[0],  // easy
    judgeStages[1],  // easy
    findStages[0],   // easy
    trackStages[0],  // easy
    judgeStages[2],  // medium
    findStages[1],   // medium
    findStages[2],   // medium
    trackStages[1],  // medium
    trackStages[2],  // medium
    judgeStages[3],  // hard
    findStages[3],   // hard
    trackStages[3],  // hard
  ];

  const idx = triggeredAt % CASE_NUMBERS.length;

  return {
    caseNumber: CASE_NUMBERS[idx],
    title: TITLES[idx],
    echoIntro: ECHO_INTROS[Math.floor(Math.random() * ECHO_INTROS.length)],
    stages,
    triggeredAt,
  };
}
