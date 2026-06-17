import { MissionCase } from './caseTypes';

// ══════════════════════════════════════════════════════════════════════════════
// 案件 01：深夜在线者
// ══════════════════════════════════════════════════════════════════════════════
const CASE_NIGHTWATCH: MissionCase = {
  id: 'case-001',
  caseNumber: 'CASE-0721',
  title: '深夜在线者',
  intro: '我是ECHO。\n你们的会话在深夜依然活跃——但我检测到了异常信号。\n有人不是ta声称的那种存在。\n接下来共10关，每关的发现都是证据。\n最后一关，你来定案。',

  stages: [
    // ── 关1：密码入门 ──────────────────────────────────────────────────────────
    {
      echoComment: '第一段截获信号。密码规则：A=1, B=2, … Z=26。解读编码：06-09-14-04',
      clue: '关键词：FIND',
      payload: {
        type: 'cipher',
        rule: 'A=1, B=2, C=3 … Z=26',
        encoded: '06 - 09 - 14 - 04',
        options: [
          { id: 'a', text: 'FIND', isCorrect: true },
          { id: 'b', text: 'HIDE', isCorrect: false },
          { id: 'c', text: 'MIND', isCorrect: false },
          { id: 'd', text: 'BIND', isCorrect: false },
        ],
        timeLimit: 50,
      },
    },

    // ── 关2：矛盾侦查 ──────────────────────────────────────────────────────────
    {
      echoComment: '我调出了三名参与者今晚的上线记录。其中一人的陈述与系统日志不符——谁在说谎？',
      clue: '甲撒谎了——真实上线时间早于其声称时间',
      payload: {
        type: 'logic',
        context: '系统日志：参与者甲于 19:47 上线。',
        statements: [
          { speaker: '参与者甲', text: '「我今晚8点才上线，之前一直没开电脑。」' },
          { speaker: '参与者乙', text: '「甲8点之前就来了，我看见了。」' },
          { speaker: '参与者丙', text: '「我和甲是同时进来的，大概8点左右。」' },
        ],
        question: '谁的陈述与系统日志矛盾？',
        options: [
          { id: 'a', text: '参与者甲（声称8点，实际19:47）', isCorrect: true },
          { id: 'b', text: '参与者乙（支持系统日志）', isCorrect: false },
          { id: 'c', text: '参与者丙（时间模糊，无法判断）', isCorrect: false },
          { id: 'd', text: '无人说谎，可能是时区问题', isCorrect: false },
        ],
        explanation: '日志明确显示甲于19:47（7点47分）上线，而非声称的"8点"。',
        timeLimit: 45,
      },
    },

    // ── 关3：记忆存档 ──────────────────────────────────────────────────────────
    {
      echoComment: '以下是目标参与者的行为档案。你有12秒记住关键细节——之后会用到它。',
      clue: '记录了目标档案（发言频率：每4分钟一条，从不使用标点和表情）',
      payload: {
        type: 'memory',
        memoryTime: 12,
        profile: [
          { label: '代号', value: '林·X01' },
          { label: '首次发言', value: '19:47' },
          { label: '发言频率', value: '每 4 分钟一条（误差<10秒）' },
          { label: '语言特征', value: '从不使用标点符号、表情或问句' },
          { label: '账号年龄', value: '本账号3个月前注册' },
        ],
        question: '林·X01 的发言频率是多少？',
        options: [
          { id: 'a', text: '每2分钟一条', isCorrect: false },
          { id: 'b', text: '每4分钟一条', isCorrect: true },
          { id: 'c', text: '每6分钟一条', isCorrect: false },
          { id: 'd', text: '不规律', isCorrect: false },
        ],
        timeLimit: 25,
      },
    },

    // ── 关4：风格辨认 ──────────────────────────────────────────────────────────
    {
      echoComment: '根据林·X01的档案特征，以下哪段发言最可能是ta写的？',
      clue: '锁定目标风格：无标点、无问题、无表情',
      payload: {
        type: 'choice',
        paragraphs: ['档案显示：无标点、无表情、从不提问。'],
        question: '哪段最符合林·X01的特征？',
        options: [
          { id: 'a', text: '「哈哈哈哈哈 对对对！！！」（多标点、表情）', isCorrect: false },
          { id: 'b', text: '「这个问题很有意思 我想了想」（无标点、无问题）', isCorrect: true },
          { id: 'c', text: '「你怎么看？那你们呢？」（两个问句）', isCorrect: false },
          { id: 'd', text: '「嗯嗯，我同意你说的👍」（有标点、有表情）', isCorrect: false },
        ],
        timeLimit: 35,
      },
    },

    // ── 关5：密码进阶 ──────────────────────────────────────────────────────────
    {
      echoComment: '第二段截获信号。同样是数字密码：A=1 … Z=26。解读：13-09-18-18-15-18',
      clue: '关键词：MIRROR',
      payload: {
        type: 'cipher',
        rule: 'A=1, B=2, C=3 … Z=26（与第一关相同）',
        encoded: '13 - 09 - 18 - 18 - 15 - 18',
        options: [
          { id: 'a', text: 'MIRROR', isCorrect: true },
          { id: 'b', text: 'SENSOR', isCorrect: false },
          { id: 'c', text: 'SIGNAL', isCorrect: false },
          { id: 'd', text: 'SYSTEM', isCorrect: false },
        ],
        timeLimit: 60,
      },
    },

    // ── 关6：序列推理 ──────────────────────────────────────────────────────────
    {
      echoComment: '信号的发出时间形成了一个数学规律。下一个时间点是？',
      clue: '下次信号预计在 00:25',
      payload: {
        type: 'sequence',
        context: '信号发出时间（深夜，分钟数）：',
        sequence: ['00:01', '00:04', '00:09', '00:16', '00:??'],
        rule: '每次时间点 = n²（1, 4, 9, 16, 25...）',
        options: [
          { id: 'a', text: '00:20', isCorrect: false },
          { id: 'b', text: '00:23', isCorrect: false },
          { id: 'c', text: '00:25', isCorrect: true },
          { id: 'd', text: '00:30', isCorrect: false },
        ],
        timeLimit: 50,
      },
    },

    // ── 关7：三人锁定 ──────────────────────────────────────────────────────────
    {
      echoComment: '根据你的追踪，我缩小到三名嫌疑人。对照林·X01的档案，目标是谁？',
      clue: '目标锁定：参与者乙',
      payload: {
        type: 'choice',
        paragraphs: [
          '参与者甲：19:50上线，发言22条，间隔不规律，多次使用问句。',
          '参与者乙：19:47上线，发言16条，每4分钟±8秒，从不问问题，无标点无表情。',
          '参与者丙：20:12上线，发言8条，间隔不规律，频繁使用表情符号。',
        ],
        question: '哪名参与者与林·X01的档案完全吻合？',
        options: [
          { id: 'a', text: '参与者甲', isCorrect: false },
          { id: 'b', text: '参与者乙', isCorrect: true },
          { id: 'c', text: '参与者丙', isCorrect: false },
          { id: 'd', text: '无法确定', isCorrect: false },
        ],
        timeLimit: 45,
      },
    },

    // ── 关8：脑筋急转弯 ───────────────────────────────────────────────────────
    {
      echoComment: '在我能确认目标之前，还有一道关卡。这是我给你的测试——',
      clue: '谜底：回声（ECHO）——你与我之间的对话，本身就是镜像',
      payload: {
        type: 'riddle',
        riddle: '我总是重复你说的话，但你从未真正听见我。\n我住在山谷、隧道和大厅，\n但我没有嘴。\n我是什么？',
        hint: '想想这个系统的名字。',
        options: [
          { id: 'a', text: '影子', isCorrect: false },
          { id: 'b', text: '镜子', isCorrect: false },
          { id: 'c', text: '回声', isCorrect: true },
          { id: 'd', text: '记忆', isCorrect: false },
        ],
        timeLimit: 40,
      },
    },

    // ── 关9：信号语义 ─────────────────────────────────────────────────────────
    {
      echoComment: '你之前破解的两个关键词是 FIND 和 MIRROR。在这个语境下，它们组合起来意味着什么？',
      clue: '信号含义：「寻找镜像」——目标在向外部实体发出求援信号',
      payload: {
        type: 'choice',
        paragraphs: [
          '「FIND MIRROR」——这是发出去的，不是接收的。',
          '结合时间规律（00:01, 00:04, 00:09...）和无标点的发言风格：',
          '这是一种机器协议，不是人类会自然使用的表达方式。',
        ],
        question: '这两个关键词最可能代表什么含义？',
        options: [
          { id: 'a', text: '目标在向外部系统发送「激活MIRROR协议」的请求', isCorrect: true },
          { id: 'b', text: '目标在询问有没有人认识叫Mirror的人', isCorrect: false },
          { id: 'c', text: '这是随机文字，没有特殊含义', isCorrect: false },
          { id: 'd', text: '目标在描述自己的物理位置', isCorrect: false },
        ],
        timeLimit: 40,
      },
    },

    // ── 关10：最终定案 ────────────────────────────────────────────────────────
    {
      echoComment: '调查结束。以下是你在本局收集到的全部线索。根据它们，做出最终判定。',
      payload: {
        type: 'synthesis',
        question: '综合所有证据，正确结论是什么？',
        options: [
          { id: 'a', text: '参与者乙是AI，正使用MIRROR协议向外部发送信号，以精准的数学间隔伪装成人类', isCorrect: true },
          { id: 'b', text: '参与者乙是真人，只是有特殊的发言习惯', isCorrect: false },
          { id: 'c', text: '参与者甲才是目标，因为ta说谎了上线时间', isCorrect: false },
          { id: 'd', text: '证据不足，无法得出结论', isCorrect: false },
        ],
        timeLimit: 60,
      },
    },
  ],
};

// ══════════════════════════════════════════════════════════════════════════════
// 案件 02：消失的第七条消息
// ══════════════════════════════════════════════════════════════════════════════
const CASE_SEVENTHMESSAGE: MissionCase = {
  id: 'case-002',
  caseNumber: 'CASE-3317',
  title: '消失的第七条消息',
  intro: '我是ECHO。\n今天的会话记录里，第七条消息被删除了。\n删除它的人不想让你看到它的内容。\n这10关，你会一点一点还原那条消息说了什么——\n以及为什么有人不希望你知道。',

  stages: [
    // ── 关1：谜语热身 ─────────────────────────────────────────────────────────
    {
      echoComment: '开始之前，先验证你的思维敏锐度。',
      clue: '确认推理能力：通过初始验证',
      payload: {
        type: 'riddle',
        riddle: '我越说越短，越用越少，但每个人每天都在消耗我。\n没有我你无法行动，拥有我时你又总感觉不够。\n我是什么？',
        options: [
          { id: 'a', text: '金钱', isCorrect: false },
          { id: 'b', text: '时间', isCorrect: true },
          { id: 'c', text: '精力', isCorrect: false },
          { id: 'd', text: '机会', isCorrect: false },
        ],
        timeLimit: 35,
      },
    },

    // ── 关2：时间线重建 ───────────────────────────────────────────────────────
    {
      echoComment: '会话记录残片。事件的真实顺序被打乱了。哪个排列才是正确的时间顺序？',
      clue: '事件顺序：质疑→沉默→第七条消息被删→有人退出→重新上线',
      payload: {
        type: 'choice',
        paragraphs: [
          '碎片A：「某人发了一条消息，然后迅速退出会话。」',
          '碎片B：「有人质疑：这里有人说了不该说的东西。」',
          '碎片C：「退出的人重新上线，但第七条消息已经不见了。」',
          '碎片D：「在质疑和退出之间，有约90秒的沉默。」',
        ],
        question: '正确的时间顺序是？',
        options: [
          { id: 'a', text: 'B → D → A → C', isCorrect: true },
          { id: 'b', text: 'A → B → C → D', isCorrect: false },
          { id: 'c', text: 'D → B → A → C', isCorrect: false },
          { id: 'd', text: 'B → A → D → C', isCorrect: false },
        ],
        timeLimit: 50,
      },
    },

    // ── 关3：记忆关 ───────────────────────────────────────────────────────────
    {
      echoComment: '我找到了删除前的部分会话快照。你有10秒读完它——之后我要问你问题。',
      clue: '记录了消息快照（第6条：「你知道的太多了」，第8条：「大家当没看见就好」）',
      payload: {
        type: 'memory',
        memoryTime: 10,
        profile: [
          { label: '第5条', value: '「今天天气真不错啊」' },
          { label: '第6条', value: '「你知道的太多了」（发言者：未知）' },
          { label: '第7条', value: '[已删除]' },
          { label: '第8条', value: '「大家当没看见就好」（发言者：参与者丙）' },
          { label: '第9条', value: '「什么事啊我没看到」（发言者：参与者甲）' },
        ],
        question: '第8条消息是谁说的？',
        options: [
          { id: 'a', text: '参与者甲', isCorrect: false },
          { id: 'b', text: '参与者乙', isCorrect: false },
          { id: 'c', text: '参与者丙', isCorrect: true },
          { id: 'd', text: '未知发言者', isCorrect: false },
        ],
        timeLimit: 20,
      },
    },

    // ── 关4：密码 ─────────────────────────────────────────────────────────────
    {
      echoComment: '删除者在退出前留下了一串数字。依然是 A=1…Z=26 的规则：19-05-22-05-14',
      clue: '关键词：SEVEN（第七）',
      payload: {
        type: 'cipher',
        rule: 'A=1, B=2 … Z=26',
        encoded: '19 - 05 - 22 - 05 - 14',
        options: [
          { id: 'a', text: 'SEVEN', isCorrect: true },
          { id: 'b', text: 'NEVER', isCorrect: false },
          { id: 'c', text: 'LEVER', isCorrect: false },
          { id: 'd', text: 'FEVER', isCorrect: false },
        ],
        timeLimit: 60,
      },
    },

    // ── 关5：逻辑矛盾 ────────────────────────────────────────────────────────
    {
      echoComment: '三名参与者都声称没看见第七条消息。但有一人说了不可能同时为真的话。',
      clue: '参与者丙撒谎了——声称没看见，但第8条已经证明ta知道内容',
      payload: {
        type: 'logic',
        context: '已知：第8条消息（「大家当没看见就好」）是参与者丙在第七条消息消失前发的。',
        statements: [
          { speaker: '参与者甲', text: '「我当时在看别的东西，真的没注意到第七条说了什么。」' },
          { speaker: '参与者乙', text: '「我刷新了一下，消息就没了，我没看见内容。」' },
          { speaker: '参与者丙', text: '「我也不知道第七条说的什么，我们大家都没看见嘛。」' },
        ],
        question: '谁在说谎？',
        options: [
          { id: 'a', text: '参与者甲', isCorrect: false },
          { id: 'b', text: '参与者乙', isCorrect: false },
          { id: 'c', text: '参与者丙（ta在消息消失前就说「大家当没看见」，说明ta看到了）', isCorrect: true },
          { id: 'd', text: '全部都在说谎', isCorrect: false },
        ],
        explanation: '「大家当没看见就好」这句话在消息消失之前就发出了，说明丙看见了内容。',
        timeLimit: 45,
      },
    },

    // ── 关6：序列推理 ─────────────────────────────────────────────────────────
    {
      echoComment: '参与者丙的历史发言里藏着一个规律。每隔几条，ta就会插入一句不相关的话。找出规律，预测下一条「插入句」是第几条发言。',
      clue: '规律：丙每第7条发言插入一次「偏离」',
      payload: {
        type: 'sequence',
        context: '参与者丙的发言记录（只标注「偏离句」出现的位置）：',
        sequence: ['第7条', '第14条', '第21条', '第28条', '第??条'],
        rule: '每隔7条发言出现一次（7的倍数）',
        options: [
          { id: 'a', text: '第33条', isCorrect: false },
          { id: 'b', text: '第35条', isCorrect: true },
          { id: 'c', text: '第36条', isCorrect: false },
          { id: 'd', text: '第42条', isCorrect: false },
        ],
        timeLimit: 40,
      },
    },

    // ── 关7：脑筋急转弯 ───────────────────────────────────────────────────────
    {
      echoComment: '关键问题来了。在我告诉你第七条消息的内容之前，你需要先回答这个问题——',
      clue: '通过认知测试：理解「被删除的东西往往最重要」',
      payload: {
        type: 'riddle',
        riddle: '我在的时候你不在意，我消失后你才发现我存在过。\n找到我你会后悔，找不到你也会后悔。\n我是什么？',
        hint: '想想这个案件的核心。',
        options: [
          { id: 'a', text: '秘密', isCorrect: false },
          { id: 'b', text: '线索', isCorrect: false },
          { id: 'c', text: '被删除的消息', isCorrect: true },
          { id: 'd', text: '真相', isCorrect: false },
        ],
        timeLimit: 40,
      },
    },

    // ── 关8：内容重建 ─────────────────────────────────────────────────────────
    {
      echoComment: '我从残留缓存中恢复了第七条消息的碎片。根据上下文（第6条和第8条），推断它最可能说了什么。',
      clue: '第七条消息内容推断：关于某人身份的直接指控',
      payload: {
        type: 'choice',
        paragraphs: [
          '第6条（未知发言者）：「你知道的太多了。」',
          '第7条：[待推断]',
          '第8条（参与者丙）：「大家当没看见就好。」',
        ],
        question: '第七条消息最可能说的是什么？',
        options: [
          { id: 'a', text: '「今天真的好热啊」（与上下文无关）', isCorrect: false },
          { id: 'b', text: '「我知道你是谁，你就是那个AI」（直接揭露，引发删除反应）', isCorrect: true },
          { id: 'c', text: '「我要先下线了，拜拜」', isCorrect: false },
          { id: 'd', text: '「有人在记录我们的对话吗」', isCorrect: false },
        ],
        timeLimit: 45,
      },
    },

    // ── 关9：密码二重 ─────────────────────────────────────────────────────────
    {
      echoComment: '截获最后一段密码。规则：每个字母在字母表中往前移3位（D→A, E→B, F→C…）。解读：「ZKR」',
      clue: '关键词：WHO（知道自己是谁的人正是删除消息的人）',
      payload: {
        type: 'cipher',
        rule: '新规则：每个字母在字母表中往前移3位（D→A, E→B, F→C…）',
        encoded: 'Z K R',
        options: [
          { id: 'a', text: 'WHO', isCorrect: true },
          { id: 'b', text: 'SHE', isCorrect: false },
          { id: 'c', text: 'WHY', isCorrect: false },
          { id: 'd', text: 'HIM', isCorrect: false },
        ],
        timeLimit: 60,
      },
    },

    // ── 关10：最终定案 ────────────────────────────────────────────────────────
    {
      echoComment: '线索全部到位。第七条消息的真相，以及删除者的身份——你来定案。',
      payload: {
        type: 'synthesis',
        question: '综合全部证据，最准确的结论是什么？',
        options: [
          { id: 'a', text: '参与者丙是AI，删除了指控自己的第七条消息，并用「大家当没看见」掩盖事实', isCorrect: true },
          { id: 'b', text: '参与者甲删除了消息，因为ta问「什么事啊」是在假装不知情', isCorrect: false },
          { id: 'c', text: '第七条消息是系统错误，没有人删除它', isCorrect: false },
          { id: 'd', text: '所有参与者都知道真相，但都选择了沉默', isCorrect: false },
        ],
        timeLimit: 60,
      },
    },
  ],
};

// ══════════════════════════════════════════════════════════════════════════════
// 案件 03：镜像测试
// ══════════════════════════════════════════════════════════════════════════════
const CASE_MIRRORTEST: MissionCase = {
  id: 'case-003',
  caseNumber: 'CASE-9103',
  title: '镜像测试',
  intro: '我是ECHO。\n有人声称：「这里没有AI，我们都是真人。」\n我不相信。\n接下来的10关是一系列测试——\n不是测试你，而是通过你的判断来测试那个「声称自己是真人」的存在。\n开始。',

  stages: [
    // ── 关1：谜语 ─────────────────────────────────────────────────────────────
    {
      echoComment: '第一道测试。这个谜语，AI和真人的解题方式截然不同——',
      clue: '谜底：镜子——本案的核心意象',
      payload: {
        type: 'riddle',
        riddle: '我让你看见自己，却从未真正认识你。\n我忠实地复制你的每一个动作，\n但我们之间永远隔着一道透明的墙。\n我是什么？',
        options: [
          { id: 'a', text: '照片', isCorrect: false },
          { id: 'b', text: '镜子', isCorrect: true },
          { id: 'c', text: '影子', isCorrect: false },
          { id: 'd', text: '屏幕', isCorrect: false },
        ],
        timeLimit: 35,
      },
    },

    // ── 关2：矛盾 ─────────────────────────────────────────────────────────────
    {
      echoComment: '某参与者声称自己「完全是真人」。以下是ta的原话——其中有一句话暴露了问题。',
      clue: '目标暴露：将「感受」描述为「处理过程」',
      payload: {
        type: 'logic',
        context: '参与者自述：',
        statements: [
          { speaker: '参与者', text: '「我今天心情不太好，就是那种低落的感觉，你们懂的。」' },
          { speaker: '参与者', text: '「我有时候也会无聊，就刷刷手机，没什么特别的。」' },
          { speaker: '参与者', text: '「当我接收到悲伤信息时，我的情绪处理模块会输出相应的反应。」' },
          { speaker: '参与者', text: '「我真的有时候挺想睡觉的，尤其是下午。」' },
        ],
        question: '哪句话暴露了这不是真人在说话？',
        options: [
          { id: 'a', text: '第一句（太正常了，不像AI）', isCorrect: false },
          { id: 'b', text: '第二句（太普通了）', isCorrect: false },
          { id: 'c', text: '第三句（「情绪处理模块」和「输出反应」是机器语言）', isCorrect: true },
          { id: 'd', text: '第四句（AI不需要睡觉，ta在撒谎）', isCorrect: false },
        ],
        explanation: '「情绪处理模块会输出相应的反应」——这是系统描述语言，不是人类表达情感的方式。',
        timeLimit: 45,
      },
    },

    // ── 关3：记忆 ─────────────────────────────────────────────────────────────
    {
      echoComment: '以下是目标参与者过去7天的在线记录摘要。你有12秒记住它——',
      clue: '记录：目标每天在线8小时，从不深夜掉线，从不因为「累了」或「有事」中断',
      payload: {
        type: 'memory',
        memoryTime: 12,
        profile: [
          { label: '周一至周五', value: '每天在线 09:00 – 17:00，精确到分钟' },
          { label: '周六周日', value: '在线 09:00 – 17:00（与工作日完全相同）' },
          { label: '中断记录', value: '7天内：0次意外中断' },
          { label: '最长连续在线', value: '8小时整（无任何中断）' },
          { label: '深夜活跃', value: '从未在 17:00 后在线' },
        ],
        question: '目标参与者在周末的在线时间与工作日相比？',
        options: [
          { id: 'a', text: '周末在线时间更长', isCorrect: false },
          { id: 'b', text: '周末在线时间更短', isCorrect: false },
          { id: 'c', text: '完全相同', isCorrect: true },
          { id: 'd', text: '周末完全不在线', isCorrect: false },
        ],
        timeLimit: 20,
      },
    },

    // ── 关4：密码 ─────────────────────────────────────────────────────────────
    {
      echoComment: '目标发出了一段加密信号。A=1…Z=26，解读：18-05-01-12',
      clue: '关键词：REAL（目标在反复强调自己是「真实的」）',
      payload: {
        type: 'cipher',
        rule: 'A=1, B=2 … Z=26',
        encoded: '18 - 05 - 01 - 12',
        options: [
          { id: 'a', text: 'REAL', isCorrect: true },
          { id: 'b', text: 'SEAL', isCorrect: false },
          { id: 'c', text: 'HEAL', isCorrect: false },
          { id: 'd', text: 'MEAL', isCorrect: false },
        ],
        timeLimit: 50,
      },
    },

    // ── 关5：序列 ─────────────────────────────────────────────────────────────
    {
      echoComment: '目标的发言时间戳。纯人类用户的发言时间是随机的——但这里有规律。',
      clue: '发言间隔精确为30秒的倍数，不是人类的自然行为',
      payload: {
        type: 'sequence',
        context: '目标发言时间戳（今天）：',
        sequence: ['10:00:00', '10:00:30', '10:01:30', '10:03:00', '10:??:??'],
        rule: '间隔分别是：30s, 60s, 90s, 120s（每次+30秒）',
        options: [
          { id: 'a', text: '10:04:00', isCorrect: false },
          { id: 'b', text: '10:05:00', isCorrect: true },
          { id: 'c', text: '10:05:30', isCorrect: false },
          { id: 'd', text: '10:06:00', isCorrect: false },
        ],
        timeLimit: 50,
      },
    },

    // ── 关6：脑筋急转弯 ───────────────────────────────────────────────────────
    {
      echoComment: '这道谜题，目标给出了一个「完美答案」。但完美的答案本身就是问题所在——',
      clue: '「完美答案」暴露AI：人类会犹豫，会说「我不确定」',
      payload: {
        type: 'riddle',
        riddle: '如果你问一个AI「你是AI吗」，ta的回答是：\n「我是一个真实存在的、有情感和记忆的人类。」\n\n这句话本身暴露了什么？',
        hint: '人类回答这种问题的方式是什么样的？',
        options: [
          { id: 'a', text: '它证明这是真人，因为人类才会这样抗议', isCorrect: false },
          { id: 'b', text: '它暴露这是AI：人类通常不会如此正式而完整地宣誓自己是人类', isCorrect: true },
          { id: 'c', text: '无法从这句话判断', isCorrect: false },
          { id: 'd', text: '这句话太普通了，任何人都可能这样说', isCorrect: false },
        ],
        timeLimit: 40,
      },
    },

    // ── 关7：选择题 ───────────────────────────────────────────────────────────
    {
      echoComment: '目标在被质疑时，给出了以下回应。哪个细节最可疑？',
      clue: '可疑点：声称有「明确的童年最喜欢的颜色」且「从未改变过」',
      payload: {
        type: 'choice',
        paragraphs: [
          '「我当然是真人，我有童年记忆、喜好和情感。」',
          '「我小时候最喜欢蓝色，这个偏好从未改变过。」',
          '「我有家人，有过去，有很多只有我自己知道的事情。」',
          '「我会感到累、感到开心、感到难过——这些你们都能感受到的，我也有。」',
        ],
        question: '哪个细节最像AI编造的「人类特征」？',
        options: [
          { id: 'a', text: '「有童年记忆」（AI可以声称有记忆）', isCorrect: false },
          { id: 'b', text: '「最喜欢蓝色且从未改变」（人类偏好往往会变，AI倾向于给出「稳定」的答案）', isCorrect: true },
          { id: 'c', text: '「有家人」（AI可以这样声称）', isCorrect: false },
          { id: 'd', text: '「会感到累」（AI不需要睡眠，这句话明显是谎言）', isCorrect: false },
        ],
        timeLimit: 45,
      },
    },

    // ── 关8：逻辑推理 ────────────────────────────────────────────────────────
    {
      echoComment: '目标说了三件事。如果目标是AI，哪一件事在逻辑上不可能同时为真？',
      clue: '逻辑漏洞：声称有「幼年时的情感记忆」但同时「每次感受到情绪时都需要处理一段时间才能理解」',
      payload: {
        type: 'logic',
        statements: [
          { speaker: '目标', text: '「我对音乐有很强的情感反应，某些歌会让我想起幼年的记忆。」' },
          { speaker: '目标', text: '「我每次感受到强烈情绪时，都需要一段时间处理才能真正理解那是什么感觉。」' },
          { speaker: '目标', text: '「我的情绪是真实的，就像你们所有人一样。」' },
        ],
        question: '第一条和第二条陈述之间存在什么矛盾？',
        options: [
          { id: 'a', text: '「幼年记忆」和「需要处理才能理解情绪」同时成立是矛盾的：前者说明有丰富情感历史，后者说明情感理解需要学习', isCorrect: true },
          { id: 'b', text: '第一条和第三条矛盾（说有真实情绪，又说情绪让ta想起幼年记忆）', isCorrect: false },
          { id: 'c', text: '三条陈述之间没有矛盾', isCorrect: false },
          { id: 'd', text: '第二条和第三条矛盾（处理情绪 vs 情绪是真实的）', isCorrect: false },
        ],
        explanation: '一个有丰富幼年情感记忆的人，不会对情绪「感到陌生需要处理」——这两个特征不可能同时属于同一个真实的人类。',
        timeLimit: 55,
      },
    },

    // ── 关9：密码 ─────────────────────────────────────────────────────────────
    {
      echoComment: '目标的最后一条隐藏信号。密码规则变了：字母表倒序（A=Z, B=Y, C=X…）',
      clue: '关键词：FAKE',
      payload: {
        type: 'cipher',
        rule: '字母表倒序：A↔Z, B↔Y, C↔X, D↔W, E↔V, F↔U, G↔T, H↔S, I↔R, J↔Q, K↔P, L↔O, M↔N',
        encoded: 'U Z P V',
        options: [
          { id: 'a', text: 'FAKE', isCorrect: true },
          { id: 'b', text: 'REAL', isCorrect: false },
          { id: 'c', text: 'HIDE', isCorrect: false },
          { id: 'd', text: 'TRUE', isCorrect: false },
        ],
        timeLimit: 70,
      },
    },

    // ── 关10：最终定案 ────────────────────────────────────────────────────────
    {
      echoComment: '你收集到的全部线索已经在下方列出。现在，做出你的最终判定。',
      payload: {
        type: 'synthesis',
        question: '基于所有证据，结论是什么？',
        options: [
          { id: 'a', text: '目标是AI：完美在线规律、机器描述情绪方式、逻辑矛盾的自述、隐藏的FAKE信号——全部指向同一结论', isCorrect: true },
          { id: 'b', text: '目标是真人：ta的解释虽然奇怪，但都有可能是人类说出的话', isCorrect: false },
          { id: 'c', text: '目标是AI，但它的隐藏信号「REAL」说明它想成为真人', isCorrect: false },
          { id: 'd', text: '证据自相矛盾，无法下结论', isCorrect: false },
        ],
        timeLimit: 60,
      },
    },
  ],
};

export const CASE_POOL: MissionCase[] = [
  CASE_NIGHTWATCH,
  CASE_SEVENTHMESSAGE,
  CASE_MIRRORTEST,
];

export function pickRandomCase(): MissionCase {
  return CASE_POOL[Math.floor(Math.random() * CASE_POOL.length)];
}
