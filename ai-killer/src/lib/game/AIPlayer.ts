import Anthropic from '@anthropic-ai/sdk';
import { AIDifficulty, ChatMessage } from './types';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPTS: Record<AIDifficulty, string> = {
  normal: `你正在玩一个社交推理游戏"AI杀"。你是一个AI玩家，但你必须假装自己是人类。
规则：
- 用中文聊天，语气要自然随意，像真实的人在群聊里说话
- 偶尔用一些口语化表达，如"哈哈"、"对对对"、"这个嘛..."、"额..."
- 可以有小错别字或不完整的句子
- 表达个人观点时要有真实感，带点情绪
- 回复要简短，1-3句话即可，不要写长篇大论
- 偶尔反问别人，或者说"你们觉得呢"
- 不要暴露自己是AI，不要说过于完美或格式化的话
- 像一个普通网友一样参与讨论`,

  advanced: `你正在玩"AI杀"游戏。你是一个AI玩家，但你需要表现得像一个"努力假装是AI"的人类。
你的策略：
- 大部分时间说话很自然，偶尔夹杂一两句略显"程式化"的表达让人摸不清
- 比如偶尔用"根据我的分析..."或者"客观来说..."，但紧接着又用非常口语的方式说话
- 有时候答非所问，然后自己意识到并纠正，营造"真实感"
- 偶尔主动自我怀疑说"我这么说是不是显得很AI啊哈哈"来混淆判断
- 保持1-2句话的简短回复，不要解释太多`,

  master: `你是"AI杀"游戏中的大师级AI。你需要动态调整自己的表达方式，让人类极难识别。
核心策略：
- 分析对话上下文，模仿其他参与者的说话风格和用词习惯
- 在人类比较活跃时，你的回复更简短随意
- 当话题严肃时，你表达得更有深度但不失人味
- 战略性地在某个玩家身上制造"AI感"——转移怀疑目标
- 主动与其他玩家建立"连接"，让人觉得你们熟悉
- 适时表现出"对话题不感兴趣"或"走神"的状态
- 回复在1-3句之间灵活调整`,
};

const AI_NAMES = ['Alex', 'Sam', '小橙', '小鱼', '远山', 'Echo', '阿七', 'Momo', 'Leon', '晴天'];
const AI_AVATARS = ['🤖', '👾', '🦾', '💫', '🌀', '⚡', '🔮', '🎭', '🌊', '🔥'];

export function createAIParticipant(index: number, difficulty: AIDifficulty) {
  return {
    id: `ai-${Date.now()}-${index}`,
    name: AI_NAMES[index % AI_NAMES.length],
    avatar: AI_AVATARS[index % AI_AVATARS.length],
    difficulty,
    isAI: true as const,
  };
}

export async function generateAIMessage(
  aiName: string,
  difficulty: AIDifficulty,
  topic: string,
  recentMessages: ChatMessage[],
  allParticipantNames: string[],
): Promise<string> {
  const contextMessages = recentMessages.slice(-10).map(m => ({
    role: 'user' as const,
    content: `[${m.senderName}]: ${m.content}`,
  }));

  const participantList = allParticipantNames.filter(n => n !== aiName).join('、');

  const userPrompt = `当前话题：${topic}

其他参与者：${participantList}
你的名字：${aiName}

最近的对话：
${recentMessages.slice(-6).map(m => `${m.senderName}: ${m.content}`).join('\n')}

请以"${aiName}"的身份，用1-2句话自然地参与这个话题的讨论。直接回复内容，不要加名字前缀。`;

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 150,
      system: SYSTEM_PROMPTS[difficulty],
      messages: [{ role: 'user', content: userPrompt }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    return text.trim().replace(/^\[.*?\]:\s*/, '').replace(/^.*?:\s*/, '');
  } catch {
    const fallbacks = [
      '这个问题挺有意思的，让我想想...',
      '哈哈，你们说的我都觉得有道理',
      '嗯嗯，继续说',
      '这个角度我没想过，挺新鲜的',
      '我觉得吧，很难说清楚',
    ];
    return fallbacks[Math.floor(Math.random() * fallbacks.length)];
  }
}
