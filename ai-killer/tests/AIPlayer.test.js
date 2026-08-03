'use strict';

// ─── Mock Anthropic SDK before any require ────────────────────────────────────
const mockCreate = jest.fn();
jest.mock('@anthropic-ai/sdk', () => ({
  default: jest.fn(() => ({ messages: { create: mockCreate } })),
}));

const { createAIParticipant, generateAIMessage } = require('../game/AIPlayer');

const DIFFICULTY_LEVELS = ['easy', 'normal', 'hard', 'master'];

// ─── createAIParticipant ──────────────────────────────────────────────────────
describe('createAIParticipant', () => {
  test('returns object with all required fields', () => {
    const ai = createAIParticipant(0, 'normal');
    expect(ai).toMatchObject({
      id: expect.stringMatching(/^ai-[0-9a-f-]{36}$/),
      name: expect.any(String),
      avatar: expect.any(String),
      difficulty: 'normal',
      isAI: true,
    });
    expect(ai.name.length).toBeGreaterThan(0);
    expect(ai.avatar.length).toBeGreaterThan(0);
  });

  test.each(DIFFICULTY_LEVELS)('supports difficulty level: %s', (level) => {
    const ai = createAIParticipant(0, level);
    expect(ai.difficulty).toBe(level);
  });

  test('different indices produce different names', () => {
    const names = Array.from({ length: 5 }, (_, i) => createAIParticipant(i, 'easy').name);
    const unique = new Set(names);
    expect(unique.size).toBeGreaterThan(1);
  });

  test('different indices produce different avatars', () => {
    const avatars = Array.from({ length: 5 }, (_, i) => createAIParticipant(i, 'easy').avatar);
    const unique = new Set(avatars);
    expect(unique.size).toBeGreaterThan(1);
  });

  test('generates unique ids across multiple participants (uses timestamp+index)', () => {
    const ids = Array.from({ length: 5 }, (_, i) => createAIParticipant(i, 'easy').id);
    const unique = new Set(ids);
    expect(unique.size).toBe(5);
  });

  test('isAI is always true', () => {
    for (let i = 0; i < 10; i++) {
      expect(createAIParticipant(i, 'easy').isAI).toBe(true);
    }
  });
});

// ─── generateAIMessage ────────────────────────────────────────────────────────
describe('generateAIMessage', () => {
  const baseMsgs = [
    { id: '1', senderId: 'p1', senderName: '小明', content: '你觉得呢', isAI: false, isSystem: false, timestamp: Date.now() - 5000 },
    { id: '2', senderId: 'p2', senderName: '小红', content: '我觉得挺有意思', isAI: false, isSystem: false, timestamp: Date.now() - 3000 },
  ];
  const allNames = ['小明', '小红', 'Alex'];
  const topic = '你最近一次发呆是什么时候';

  beforeEach(() => {
    mockCreate.mockReset();
    delete process.env.ANTHROPIC_API_KEY;
  });

  // ── No API key ──────────────────────────────────────────────────────────────
  test('returns fallback string when ANTHROPIC_API_KEY is not set', async () => {
    const result = await generateAIMessage('ai-x', 'Alex', 'easy', topic, baseMsgs, allNames);
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  // ── Successful API call ─────────────────────────────────────────────────────
  test('returns text from API on success', async () => {
    process.env.ANTHROPIC_API_KEY = 'test-key';
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: '我记得上次发呆是在等公交的时候' }],
    });
    const result = await generateAIMessage('ai-x', 'Alex', 'easy', topic, baseMsgs, allNames);
    expect(result).toBe('我记得上次发呆是在等公交的时候');
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });

  test('calls API with correct model and max_tokens', async () => {
    process.env.ANTHROPIC_API_KEY = 'test-key';
    mockCreate.mockResolvedValueOnce({ content: [{ type: 'text', text: '好的' }] });
    await generateAIMessage('ai-x', 'Alex', 'easy', topic, baseMsgs, allNames);
    const call = mockCreate.mock.calls[0][0];
    expect(call.model).toBe('claude-haiku-4-5-20251001');
    expect(call.max_tokens).toBe(150);
  });

  test('passes topic in the prompt', async () => {
    process.env.ANTHROPIC_API_KEY = 'test-key';
    mockCreate.mockResolvedValueOnce({ content: [{ type: 'text', text: '回复' }] });
    await generateAIMessage('ai-x', 'Alex', 'easy', '独特话题XYZ', baseMsgs, allNames);
    const call = mockCreate.mock.calls[0][0];
    expect(JSON.stringify(call.messages)).toContain('独特话题XYZ');
  });

  // ── Prefix stripping ────────────────────────────────────────────────────────
  test('strips "Alex: " prefix from AI response', async () => {
    process.env.ANTHROPIC_API_KEY = 'test-key';
    mockCreate.mockResolvedValueOnce({ content: [{ type: 'text', text: 'Alex: 我挺喜欢发呆的' }] });
    const result = await generateAIMessage('ai-x', 'Alex', 'easy', topic, baseMsgs, allNames);
    expect(result).not.toMatch(/^Alex:/);
    expect(result).toContain('我挺喜欢发呆的');
  });

  test('strips bracket-prefixed labels like [Alex]: from response', async () => {
    process.env.ANTHROPIC_API_KEY = 'test-key';
    mockCreate.mockResolvedValueOnce({ content: [{ type: 'text', text: '[Alex]: 我说话了' }] });
    const result = await generateAIMessage('ai-x', 'Alex', 'easy', topic, baseMsgs, allNames);
    expect(result).not.toMatch(/^\[Alex\]/);
  });

  // ── Fallback on empty / non-text content ───────────────────────────────────
  test('returns fallback when API returns empty text', async () => {
    process.env.ANTHROPIC_API_KEY = 'test-key';
    mockCreate.mockResolvedValueOnce({ content: [{ type: 'text', text: '' }] });
    const result = await generateAIMessage('ai-x', 'Alex', 'easy', topic, baseMsgs, allNames);
    expect(typeof result).toBe('string');
  });

  test('returns fallback when content array is non-text type', async () => {
    process.env.ANTHROPIC_API_KEY = 'test-key';
    mockCreate.mockResolvedValueOnce({ content: [{ type: 'tool_use', id: 'x', name: 'foo', input: {} }] });
    const result = await generateAIMessage('ai-x', 'Alex', 'easy', topic, baseMsgs, allNames);
    expect(typeof result === 'string' || result === null).toBe(true);
  });

  // ── Error handling ──────────────────────────────────────────────────────────
  test('handles API error gracefully (returns null or string)', async () => {
    process.env.ANTHROPIC_API_KEY = 'test-key';
    mockCreate.mockRejectedValueOnce(Object.assign(new Error('Network'), { status: 500 }));
    const result = await generateAIMessage('ai-x', 'Alex', 'easy', topic, baseMsgs, allNames);
    expect(result === null || typeof result === 'string').toBe(true);
  });

  test('does not throw on API error', async () => {
    process.env.ANTHROPIC_API_KEY = 'test-key';
    mockCreate.mockRejectedValueOnce(new Error('timeout'));
    await expect(
      generateAIMessage('ai-x', 'Alex', 'easy', topic, baseMsgs, allNames)
    ).resolves.not.toThrow();
  });

  // ── Mode instructions ───────────────────────────────────────────────────────
  test('defense mode includes 被怀疑 instruction in system prompt', async () => {
    process.env.ANTHROPIC_API_KEY = 'test-key';
    mockCreate.mockResolvedValueOnce({ content: [{ type: 'text', text: '我才不是AI' }] });
    await generateAIMessage('ai-x', 'Alex', 'master', topic, baseMsgs, allNames, 'defense');
    const call = mockCreate.mock.calls[0][0];
    expect(call.system).toContain('可疑或是AI');
  });

  test('followup mode includes 回应 instruction in system prompt', async () => {
    process.env.ANTHROPIC_API_KEY = 'test-key';
    mockCreate.mockResolvedValueOnce({ content: [{ type: 'text', text: '是啊' }] });
    await generateAIMessage('ai-x', 'Alex', 'easy', topic, baseMsgs, allNames, 'followup');
    const call = mockCreate.mock.calls[0][0];
    expect(call.system).toContain('回应');
  });

  test('stir mode includes 挑起 instruction in system prompt', async () => {
    process.env.ANTHROPIC_API_KEY = 'test-key';
    mockCreate.mockResolvedValueOnce({ content: [{ type: 'text', text: '你们呢' }] });
    await generateAIMessage('ai-x', 'Alex', 'master', topic, baseMsgs, allNames, 'stir');
    const call = mockCreate.mock.calls[0][0];
    expect(call.system).toContain('继续聊');
  });

  test('finalaccuse mode includes 最后关头 instruction in system prompt', async () => {
    process.env.ANTHROPIC_API_KEY = 'test-key';
    mockCreate.mockResolvedValueOnce({ content: [{ type: 'text', text: '可疑' }] });
    await generateAIMessage('ai-x', 'Alex', 'master', topic, baseMsgs, allNames, 'finalaccuse');
    const call = mockCreate.mock.calls[0][0];
    expect(call.system).toContain('快投票');
  });

  // ── Context building ────────────────────────────────────────────────────────
  test('includes recent message history in user prompt', async () => {
    process.env.ANTHROPIC_API_KEY = 'test-key';
    mockCreate.mockResolvedValueOnce({ content: [{ type: 'text', text: '有道理' }] });
    const msgs = [{ id: '1', senderId: 'p1', senderName: '小明', content: '独特标记内容XQZ', isAI: false, isSystem: false, timestamp: Date.now() }];
    await generateAIMessage('ai-x', 'Alex', 'easy', topic, msgs, allNames);
    const call = mockCreate.mock.calls[0][0];
    expect(JSON.stringify(call.messages)).toContain('独特标记内容XQZ');
  });

  test('filters system messages from context', async () => {
    process.env.ANTHROPIC_API_KEY = 'test-key';
    mockCreate.mockResolvedValueOnce({ content: [{ type: 'text', text: '好' }] });
    const msgs = [
      { id: '1', senderId: 'system', senderName: '系统', content: '第1轮开始', isAI: false, isSystem: true, timestamp: Date.now() },
      { id: '2', senderId: 'p1', senderName: '小明', content: '玩家内容', isAI: false, isSystem: false, timestamp: Date.now() },
    ];
    await generateAIMessage('ai-x', 'Alex', 'easy', topic, msgs, allNames);
    const call = mockCreate.mock.calls[0][0];
    // system message content should NOT appear in recent chat context (it's filtered by !m.isSystem)
    expect(JSON.stringify(call.messages)).not.toContain('第1轮开始');
    expect(JSON.stringify(call.messages)).toContain('玩家内容');
  });
});
