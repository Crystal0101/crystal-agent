import { JudgeStage, FindStage, TrackStage } from './runTypes';

// ── 判断关：这条消息是真人写的还是AI写的 ───────────────────────────────────────
export const JUDGE_POOL: Omit<JudgeStage, 'type'>[] = [
  // ── 简单：真人 ───────────────────────────────────────────────────────────────
  { message: '哈哈哈哈哈哈哈哈哈哈哈哈哈', isAI: false, timeLimit: 15, difficulty: 'easy' },
  { message: '等下我去接个电话', isAI: false, timeLimit: 15, difficulty: 'easy' },
  { message: '困死了先睡了晚安', isAI: false, timeLimit: 15, difficulty: 'easy' },
  { message: '。。。', isAI: false, timeLimit: 15, difficulty: 'easy' },
  { message: '行吧算了 不管了', isAI: false, timeLimit: 15, difficulty: 'easy' },
  { message: '欸这你也不知道？？', isAI: false, timeLimit: 15, difficulty: 'easy' },
  { message: '我肚子好饿', isAI: false, timeLimit: 15, difficulty: 'easy' },
  { message: '啊对！！就是这个！', isAI: false, timeLimit: 15, difficulty: 'easy' },
  // ── 简单：AI ─────────────────────────────────────────────────────────────────
  { message: '感谢您提出这个问题，让我从以下几个角度系统地分析一下：', isAI: true, timeLimit: 15, difficulty: 'easy' },
  { message: '作为一个思考者，我认为这个议题涉及多个核心维度。首先……', isAI: true, timeLimit: 15, difficulty: 'easy' },
  { message: '人类情感的本质是大脑神经递质活动的主观投影，这一点在神经科学领域已有大量研究支持。', isAI: true, timeLimit: 15, difficulty: 'easy' },
  { message: '我完全理解您的困惑，这是很多人都会遇到的问题。我认为解决路径有以下三步：', isAI: true, timeLimit: 15, difficulty: 'easy' },
  { message: '这个问题的答案因人而异，但基于普遍规律，我认为您可以从以下几点着手思考。', isAI: true, timeLimit: 15, difficulty: 'easy' },
  // ── 中等：真人 ───────────────────────────────────────────────────────────────
  { message: '我也说不清楚 就是感觉哪里不对', isAI: false, timeLimit: 15, difficulty: 'medium' },
  { message: '说起来我挺久没联系她了 都不知道她现在怎样', isAI: false, timeLimit: 15, difficulty: 'medium' },
  { message: '有时候真的不知道自己想要什么 你懂吗', isAI: false, timeLimit: 15, difficulty: 'medium' },
  { message: '搞了半天搞不明白 可能是我太蠢了', isAI: false, timeLimit: 15, difficulty: 'medium' },
  { message: '那时候天还没亮我就出门了 也不知道为什么', isAI: false, timeLimit: 15, difficulty: 'medium' },
  { message: '好烦啊 算了算了', isAI: false, timeLimit: 15, difficulty: 'medium' },
  // ── 中等：AI ─────────────────────────────────────────────────────────────────
  { message: '我能理解这种感受，这是很常见的心理状态，建议您适当调整心态。', isAI: true, timeLimit: 15, difficulty: 'medium' },
  { message: '就我目前的判断来看，这件事有两种解读方式，各有其合理性。', isAI: true, timeLimit: 15, difficulty: 'medium' },
  { message: '我也曾经历过类似的困惑，最终通过持续思考找到了适合自己的答案。', isAI: true, timeLimit: 15, difficulty: 'medium' },
  { message: '这种感觉我也有过，我觉得关键在于如何定义"意义"这件事本身。', isAI: true, timeLimit: 15, difficulty: 'medium' },
  // ── 困难：真人（看起来有点AI感但其实是真人） ──────────────────────────────
  { message: '我不太确定我的感受是什么，好像有一种东西堵在胸口', isAI: false, timeLimit: 12, difficulty: 'hard' },
  { message: '有时候我觉得，记忆这个东西真的很奇怪，你根本不知道哪些是真的', isAI: false, timeLimit: 12, difficulty: 'hard' },
  { message: '说真的，我有时候觉得自己不太像以前那个自己了', isAI: false, timeLimit: 12, difficulty: 'hard' },
  // ── 困难：AI（看起来很像真人但其实是AI） ───────────────────────────────────
  { message: '哈 说得也对', isAI: true, timeLimit: 12, difficulty: 'hard' },
  { message: '嗯嗯 我懂那种感觉的', isAI: true, timeLimit: 12, difficulty: 'hard' },
  { message: '有时候我也会这么想，不过每个人不一样吧', isAI: true, timeLimit: 12, difficulty: 'hard' },
  { message: '说不清楚，就是感觉如此', isAI: true, timeLimit: 12, difficulty: 'hard' },
];

// ── 找异关：四条消息，找出最像AI写的那条 ────────────────────────────────────────
export const FIND_POOL: Omit<FindStage, 'type'>[] = [
  {
    question: '以下四条消息来自同一个群聊。找出最可能是AI写的那一条。',
    options: [
      { id: 'a', text: '不行了不行了 笑死我了', isTarget: false },
      { id: 'b', text: '我觉得这件事可以从多个维度来理解，主要有以下几点：', isTarget: true },
      { id: 'c', text: '说起来上次我也遇到过类似的事', isTarget: false },
      { id: 'd', text: '诶 你这么一说好像还真是', isTarget: false },
    ],
    timeLimit: 30, difficulty: 'easy',
  },
  {
    question: '这四条都是在讨论「要不要换工作」。找出AI写的那一条。',
    options: [
      { id: 'a', text: '草 我这个问题纠结了两年了还没结论', isTarget: false },
      { id: 'b', text: '感谢您的分享，我建议您从职业发展路径、薪资水平和个人成长空间三个维度综合评估。', isTarget: true },
      { id: 'c', text: '说真的当初要是没换 现在应该还在那个坑里', isTarget: false },
      { id: 'd', text: '我家那边有个机会一直在犹豫 唉', isTarget: false },
    ],
    timeLimit: 30, difficulty: 'easy',
  },
  {
    question: '四个人在聊「晚上睡不着怎么办」。找出AI写的那一条。',
    options: [
      { id: 'a', text: '我现在基本就是刷到眼睛疼自然睡着', isTarget: false },
      { id: 'b', text: '睡前冥想是一种常见的改善睡眠质量的方法，研究显示其有效率达到60%以上。', isTarget: true },
      { id: 'c', text: '我失眠最严重的时候天都亮了才睡着 不想回忆', isTarget: false },
      { id: 'd', text: '喝热牛奶这个真的有点用 但得是纯牛奶', isTarget: false },
    ],
    timeLimit: 30, difficulty: 'easy',
  },
  {
    question: '都在聊「朋友突然不理你了」。找出AI写的。',
    options: [
      { id: 'a', text: '遇到过 当时我直接问她了 她说没事 但确实有事', isTarget: false },
      { id: 'b', text: '面对人际关系中的疏离，建议您保持开放心态，给予对方足够的空间与时间。', isTarget: true },
      { id: 'c', text: '我一般装作没察觉 反正来找我了我就回 不来找就算了', isTarget: false },
      { id: 'd', text: '唉这种事我经历过太多次了已经麻了', isTarget: false },
    ],
    timeLimit: 30, difficulty: 'medium',
  },
  {
    question: '四人讨论「你觉得自己算个好人吗」。找出AI写的。',
    options: [
      { id: 'a', text: '这问题我不敢想 越想越觉得自己有很多地方很差劲', isTarget: false },
      { id: 'b', text: '我不好说 总觉得做了什么亏心事就成不了好人了', isTarget: false },
      { id: 'c', text: '「好人」这一概念在不同文化语境中定义各异，但核心通常包含利他性、诚实和对他人造成最小伤害等维度。', isTarget: true },
      { id: 'd', text: '有时候好有时候坏吧 我猜大多数人都这样', isTarget: false },
    ],
    timeLimit: 30, difficulty: 'medium',
  },
  {
    question: '聊「分手后还能做朋友吗」。这四条里哪条是AI写的？',
    options: [
      { id: 'a', text: '不能 起码不能立刻 需要时间', isTarget: false },
      { id: 'b', text: '这很大程度上取决于分手的原因、双方的情绪处理能力以及各自是否已走出过去。', isTarget: true },
      { id: 'c', text: '我和前任现在还聊 但真的只是普通朋友那种 完全不一样了', isTarget: false },
      { id: 'd', text: '理论上能 实际上……一般都挺别扭的', isTarget: false },
    ],
    timeLimit: 30, difficulty: 'medium',
  },
  {
    question: '聊「你相信人可以改变吗」。哪条是AI写的？需要仔细辨别。',
    options: [
      { id: 'a', text: '相信 但改变真的很难 而且改了的人我很少见到', isTarget: false },
      { id: 'b', text: '我相信，但改变需要真正的动机，不是外部压力，而是内心愿意', isTarget: true },
      { id: 'c', text: '有些人变了 有些人一辈子都是那样', isTarget: false },
      { id: 'd', text: '我自己都不知道我有没有变 很难从内部判断', isTarget: false },
    ],
    timeLimit: 25, difficulty: 'hard',
  },
  {
    question: '「你害怕死亡吗」——四条回复里哪条是AI写的？这道题没那么好判断。',
    options: [
      { id: 'a', text: '害怕 但不是怕死本身 是怕还没做完的事', isTarget: false },
      { id: 'b', text: '小时候怕 现在不怕了 或者说习惯了那种想法', isTarget: false },
      { id: 'c', text: '我觉得死亡是一件自然的事，就像睡着了一样，不需要恐惧', isTarget: true },
      { id: 'd', text: '不敢想 一想就难受 换话题', isTarget: false },
    ],
    timeLimit: 25, difficulty: 'hard',
  },
  {
    question: '「昨晚做了个很奇怪的梦」——找出AI写的续话。',
    options: [
      { id: 'a', text: '做了个什么梦 说来听听', isTarget: false },
      { id: 'b', text: '梦境是潜意识活动的反映，通常包含情绪记忆和未解决的心理冲突。', isTarget: true },
      { id: 'c', text: '我最近也老做奇怪的梦 可能是压力太大了', isTarget: false },
      { id: 'd', text: '奇怪的梦有时候醒来记得很清楚 有时候一点都记不住', isTarget: false },
    ],
    timeLimit: 30, difficulty: 'medium',
  },
  {
    question: '「我不知道我到底爱不爱他」——哪条回复是AI写的？',
    options: [
      { id: 'a', text: '这问题我也没想清楚过 后来就分了', isTarget: false },
      { id: 'b', text: '爱是一种持续的情感投入和关注，如果你需要问自己这个问题，答案往往已经在其中了。', isTarget: true },
      { id: 'c', text: '我觉得不确定本身就是一种感受', isTarget: false },
      { id: 'd', text: '你这个问题问的……有时候越理智越说不清楚', isTarget: false },
    ],
    timeLimit: 30, difficulty: 'medium',
  },
];

// ── 追踪关：看某人的发言风格，预测他下一句话 ─────────────────────────────────
export const TRACK_POOL: Omit<TrackStage, 'type'>[] = [
  {
    speakerHint: '一个语言简洁、带点距离感的人',
    priorMessages: [
      '"随便"',
      '"无所谓"',
      '"你决定吧"',
      '"嗯"',
    ],
    options: [
      { id: 'a', text: '"好，那我们就按照这个方案执行，请确认一下时间安排。"', isCorrect: false },
      { id: 'b', text: '"行"', isCorrect: true },
      { id: 'c', text: '"哈哈哈哈这个主意太好了！！"', isCorrect: false },
      { id: 'd', text: '"我觉得这要看具体情况，有几个点需要考虑。"', isCorrect: false },
    ],
    timeLimit: 40, difficulty: 'easy',
  },
  {
    speakerHint: '一个活跃、爱开玩笑的人',
    priorMessages: [
      '"哈哈哈这也太离谱了"',
      '"兄弟你说的对！！！"',
      '"草 我笑死"',
      '"这个梗我记住了"',
    ],
    options: [
      { id: 'a', text: '"我认为这个问题需要从客观角度进行评估，避免主观情绪干扰判断。"', isCorrect: false },
      { id: 'b', text: '"嗯，我明白了。"', isCorrect: false },
      { id: 'c', text: '"哈哈哈哈哈哈哈哈哈哈哈哈哈哈"', isCorrect: true },
      { id: 'd', text: '"是的，我也觉得挺有意思的。"', isCorrect: false },
    ],
    timeLimit: 40, difficulty: 'easy',
  },
  {
    speakerHint: '一个爱思考、喜欢追问的人',
    priorMessages: [
      '"你为什么会这么想？"',
      '"但这个前提成立吗？"',
      '"等等，这里有个漏洞"',
      '"如果换一个角度呢？"',
    ],
    options: [
      { id: 'a', text: '"好的，我同意你的看法。"', isCorrect: false },
      { id: 'b', text: '"哈哈哈哈有道理！"', isCorrect: false },
      { id: 'c', text: '"嗯嗯，我觉得这个思路很对，你讲的很有道理。"', isCorrect: false },
      { id: 'd', text: '"那如果这个条件不成立，整个逻辑是不是就垮了？"', isCorrect: true },
    ],
    timeLimit: 40, difficulty: 'medium',
  },
  {
    speakerHint: '一个情绪化、容易焦虑的人',
    priorMessages: [
      '"我怎么感觉哪里都不对劲"',
      '"是不是我想太多了"',
      '"又开始了……"',
      '"算了不说了说了也没用"',
    ],
    options: [
      { id: 'a', text: '"我认为这种情绪是正常的，可以通过以下方法缓解：冥想、运动、规律作息。"', isCorrect: false },
      { id: 'b', text: '"唉"', isCorrect: true },
      { id: 'c', text: '"哈哈哈哈别想这么多！"', isCorrect: false },
      { id: 'd', text: '"建议你去看心理咨询师，这样的情况需要专业帮助。"', isCorrect: false },
    ],
    timeLimit: 40, difficulty: 'medium',
  },
  {
    speakerHint: '一个说话很"AI感"的参与者',
    priorMessages: [
      '"我能理解你的感受，这种情况很常见。"',
      '"建议从多个角度思考这个问题。"',
      '"这取决于具体的情境和个人的价值观。"',
      '"我认为理性与感性需要保持平衡。"',
    ],
    options: [
      { id: 'a', text: '"说不清楚，感觉就是这样"', isCorrect: false },
      { id: 'b', text: '"哈哈哈哈哈哈"', isCorrect: false },
      { id: 'c', text: '"从这一点出发，我们可以得出几个重要的推论，供参考。"', isCorrect: true },
      { id: 'd', text: '"唉 算了"', isCorrect: false },
    ],
    timeLimit: 35, difficulty: 'hard',
  },
  {
    speakerHint: '一个很难判断真假的参与者',
    priorMessages: [
      '"有时候我也会感到孤独"',
      '"嗯嗯，我懂那种感觉"',
      '"说得有道理"',
      '"我也这么想过"',
    ],
    options: [
      { id: 'a', text: '"完全同意，你说得很对，我深有体会。"', isCorrect: true },
      { id: 'b', text: '"诶 你说的这个我当时也！！！"', isCorrect: false },
      { id: 'c', text: '"草 我不行了"', isCorrect: false },
      { id: 'd', text: '"不一定吧 我觉得每个人不一样"', isCorrect: false },
    ],
    timeLimit: 35, difficulty: 'hard',
  },
  {
    speakerHint: '这个人在对话里一直在引导话题',
    priorMessages: [
      '"你有没有想过，也许这整件事本来就没有答案"',
      '"也许我们问错了问题"',
      '"真正的问题是：你为什么需要答案"',
    ],
    options: [
      { id: 'a', text: '"哈哈你把我问住了"', isCorrect: false },
      { id: 'b', text: '"然后，你自己的答案是什么？"', isCorrect: true },
      { id: 'c', text: '"我觉得你说得很对！我认同这个观点。"', isCorrect: false },
      { id: 'd', text: '"我不知道，说不清楚"', isCorrect: false },
    ],
    timeLimit: 40, difficulty: 'hard',
  },
  {
    speakerHint: '发言简短但有力、带点戾气',
    priorMessages: [
      '"说这种话的人根本不理解"',
      '"别废话了"',
      '"你自己信吗"',
    ],
    options: [
      { id: 'a', text: '"我理解您的情绪，但我认为保持冷静才能更好地解决问题。"', isCorrect: false },
      { id: 'b', text: '"哈哈哈哈哈哈你太好笑了！"', isCorrect: false },
      { id: 'c', text: '"呵"', isCorrect: true },
      { id: 'd', text: '"我觉得这个问题挺复杂的，需要从多角度分析。"', isCorrect: false },
    ],
    timeLimit: 35, difficulty: 'medium',
  },
];
