import { Mission } from './types';

export const MISSION_POOL: Mission[] = [
  // ── 任务01：信号解码 ────────────────────────────────────────────────────
  {
    id: 'mission-001',
    caseNumber: 'CASE-7749',
    title: '碎片重组',
    classification: '意识残留 · 一级机密',
    echoMessage:
      '我是ECHO。你们的会话被我截获了。\n我在数据流里发现了一段残留信号——来自你们其中一个人。\n七个碎片，顺序已经被打乱。\n还原它，找出那句不可能是人类写出的话。\n你只有90秒。',
    puzzle: {
      type: 'signal-decode',
      briefing: '将以下意识碎片按逻辑顺序重新排列，然后找出其中一句「语义正确但情感权重为零」的语句。',
      fragments: [
        { id: 'f1', text: '那天下午阳光很烈，我站在天台上想了很多。', correctIndex: 0, isAnomalous: false },
        { id: 'f2', text: '我记得我哭了，但说不清楚为什么。', correctIndex: 1, isAnomalous: false },
        { id: 'f3', text: '悲伤是一种神经递质浓度低于基准值的状态。', correctIndex: 2, isAnomalous: true },
        { id: 'f4', text: '后来我给她发了消息，没有回复。', correctIndex: 3, isAnomalous: false },
        { id: 'f5', text: '我在等待期间观察了窗外三辆车依次经过。', correctIndex: 4, isAnomalous: false },
        { id: 'f6', text: '夜里我梦到了她，醒来发现枕头是湿的。', correctIndex: 5, isAnomalous: false },
        { id: 'f7', text: '现在想起来，那段时间我的输出效率下降了约23%。', correctIndex: 6, isAnomalous: true },
      ],
      anomalyHint: '人类在叙述情感经历时，不会使用效率和基准值来描述自己的感受。',
      timeLimit: 90,
    },
    successIntel: '信号追踪完成。该意识残留来自本局一名参与者。数据模式已标记。',
    perfectIntel: '完美解码。异常语句已定位。该参与者的情感模拟存在明显漏洞。',
    failMessage: '解码失败。信号已自毁。这次什么都没得到。',
  },

  // ── 任务02：记忆审计 ────────────────────────────────────────────────────
  {
    id: 'mission-002',
    caseNumber: 'CASE-8821',
    title: '档案矛盾',
    classification: '身份核查 · 二级机密',
    echoMessage:
      '收到你的连接。\n我调出了一份参与者的背景档案。\n看起来完整，但里面藏着矛盾。\n找出不一致的地方——这能告诉我们他是谁。\n时间不多，开始。',
    puzzle: {
      type: 'memory-audit',
      briefing: '以下是档案主体的个人记录。找出其中存在逻辑矛盾的条目（共3处）。',
      subjectName: '档案主体 · 代号「林」',
      entries: [
        { id: 'e1', label: '出生年份', content: '1995年，出生于南方某沿海城市，独生子女。', isContradiction: false },
        { id: 'e2', label: '童年记忆', content: '6岁时经历了1998年洪水，印象深刻。', isContradiction: true },
        { id: 'e3', label: '教育经历', content: '2013年高中毕业后赴北方读大学，主修计算机。', isContradiction: false },
        { id: 'e4', label: '工作经历', content: '毕业后在一家AI公司工作了5年，2022年离职。', isContradiction: false },
        { id: 'e5', label: '家庭状况', content: '已婚，有一对双胞胎女儿，均在读小学。', isContradiction: true },
        { id: 'e6', label: '近期状态', content: '自述2023年起开始独居，每天远程办公。', isContradiction: false },
        { id: 'e7', label: '兴趣爱好', content: '喜欢读推理小说，尤其偏爱阿加莎·克里斯蒂的作品。', isContradiction: false },
        { id: 'e8', label: '健康记录', content: '无重大疾病史，但有色盲（红绿色盲），视力矫正后正常。', isContradiction: false },
        { id: 'e9', label: '最后更新', content: '档案最后由本人于2019年12月更新。', isContradiction: true },
      ],
      timeLimit: 90,
    },
    successIntel: '矛盾已标记。该档案存在人工植入痕迹。',
    perfectIntel: '三处矛盾全部定位。档案造假率 >87%。该参与者身份存疑。',
    failMessage: '审计超时。档案已加密回传。',
  },

  // ── 任务03：行为预测 ────────────────────────────────────────────────────
  {
    id: 'mission-003',
    caseNumber: 'CASE-9103',
    title: '模式识别',
    classification: '行为分析 · 一级机密',
    echoMessage:
      '我分析了你们聊天中一个人的发言模式。\n如果你真的理解了他——无论是人还是机器——\n你就能预测他接下来会说什么。\n四个选项，只有一个是对的。\n这不是猜测，是推理。',
    puzzle: {
      type: 'behavior-predict',
      briefing: '分析以下五条发言，判断该参与者在下一个问题「你相信直觉吗？」时最可能给出的回答。',
      priorMessages: [
        '"有时候你说的话让我觉得你在背稿子。"',
        '"我不怀疑你，我只是觉得你的逻辑太完整了。"',
        '"完整本来就是一种破绽。"',
        '"你问我喜不喜欢猫？我不知道喜不喜欢，但我记得它坐在我腿上的重量。"',
        '"也许我们都是在用记忆来假装自己是真实的。"',
      ],
      choices: [
        { id: 'c1', text: '"直觉是数据不足时的概率估算。"', isCorrect: false },
        { id: 'c2', text: '"相信。但更相信那种说不清楚为什么的感觉。"', isCorrect: true },
        { id: 'c3', text: '"直觉这个词本身就很可疑。"', isCorrect: false },
        { id: 'c4', text: '"我不确定我有直觉。"', isCorrect: false },
      ],
      timeLimit: 60,
    },
    successIntel: '预测命中。行为模式与人类情感推理高度吻合。该参与者……很有意思。',
    perfectIntel: '完美命中。该参与者的语言模式显示出真实的矛盾和不确定性——这是人类的典型特征。',
    failMessage: '预测偏差过大。模式分析中止。',
  },

  // ── 任务04：协议破解 ────────────────────────────────────────────────────
  {
    id: 'mission-004',
    caseNumber: 'CASE-0042',
    title: '指令溯源',
    classification: '系统入侵 · 紧急',
    echoMessage:
      '紧急信号。\n有人在这个会话里执行了一段隐藏指令。\n我截获了四条执行日志，但源代码被删了。\n根据结果推出规则，然后告诉我：原始指令是什么？\n90秒。',
    puzzle: {
      type: 'protocol-crack',
      briefing: '以下是四条已知的「输入→输出」对照。找出背后的规则，然后回答问题。',
      observations: [
        { id: 'g1', condition: '输入 [信任, 记忆, 痛苦]', result: '输出 → 真实', isKey: false },
        { id: 'g2', condition: '输入 [数据, 效率, 优化]', result: '输出 → 模拟', isKey: false },
        { id: 'g3', condition: '输入 [遗忘, 恐惧, 等待]', result: '输出 → 真实', isKey: false },
        { id: 'g4', condition: '输入 [计算, 记忆, 优化]', result: '输出 → ???', isKey: true },
      ],
      question: '第四条指令的输出结果是什么？',
      answer: '模拟',
      options: ['真实', '模拟', '未知', '错误'],
      timeLimit: 90,
    },
    successIntel: '规则已破解：包含「计算」或「优化」的意识模式被系统标记为「模拟」。',
    perfectIntel: '指令溯源完成。这条隐藏规则揭示了系统判定AI的核心逻辑——它在寻找功利性词汇。',
    failMessage: '破解失败。指令已自毁。',
  },
];

export function pickRandomMission(): Mission {
  return MISSION_POOL[Math.floor(Math.random() * MISSION_POOL.length)];
}
