'use strict';

const { TOPICS, getRandomTopic } = require('../game/topics');

describe('TOPICS array', () => {
  test('is a non-empty array', () => {
    expect(Array.isArray(TOPICS)).toBe(true);
    expect(TOPICS.length).toBeGreaterThan(0);
  });

  test('contains only non-empty strings', () => {
    for (const t of TOPICS) {
      expect(typeof t).toBe('string');
      expect(t.trim().length).toBeGreaterThan(0);
    }
  });

  test('has no duplicate entries', () => {
    const unique = new Set(TOPICS);
    expect(unique.size).toBe(TOPICS.length);
  });
});

describe('getRandomTopic', () => {
  test('returns a topic that exists in TOPICS', () => {
    for (let i = 0; i < 30; i++) {
      expect(TOPICS).toContain(getRandomTopic());
    }
  });

  test('excludes specified topics', () => {
    // Exclude all but the last one → must return the last one
    const exclude = TOPICS.slice(0, TOPICS.length - 1);
    const result = getRandomTopic(exclude);
    expect(result).toBe(TOPICS[TOPICS.length - 1]);
  });

  test('falls back to full pool when all topics excluded', () => {
    for (let i = 0; i < 10; i++) {
      expect(TOPICS).toContain(getRandomTopic([...TOPICS]));
    }
  });

  test('works with empty exclusion array', () => {
    expect(TOPICS).toContain(getRandomTopic([]));
  });

  test('works with no argument (default param)', () => {
    expect(TOPICS).toContain(getRandomTopic());
  });

  test('returns different topics over many calls (distribution check)', () => {
    const seen = new Set();
    for (let i = 0; i < 100; i++) seen.add(getRandomTopic());
    // With 50+ topics and 100 draws, expect at least 10 distinct
    expect(seen.size).toBeGreaterThan(10);
  });
});
