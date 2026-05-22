import { beforeEach, describe, it, expect, vi } from 'vitest';

beforeEach(() => {
  vi.resetModules();
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear(),
  };
});

describe('recordCaseOpen', () => {
  it('increments the "open N cases" mission once per open', async () => {
    const { recordCaseOpen, getMissions } = await import('../src/store/progression.js');
    recordCaseOpen({ caseId: 'chroma_case', rarity: 'milspec' });
    recordCaseOpen({ caseId: 'chroma_case', rarity: 'milspec' });
    const openMission = getMissions().find((m) => m.type === 'open_cases');
    expect(openMission.progress).toBe(2);
    expect(openMission.completed).toBe(false);
  });

  it('completes "rare drop" on a Classified', async () => {
    const { recordCaseOpen, getMissions } = await import('../src/store/progression.js');
    const finished = recordCaseOpen({ caseId: 'kilowatt_case', rarity: 'classified' });
    const rare = getMissions().find((m) => m.type === 'rare_drop');
    expect(rare.completed).toBe(true);
    expect(finished.some((m) => m.type === 'rare_drop')).toBe(true);
  });

  it('does NOT count "rare drop" for a Mil-Spec drop', async () => {
    const { recordCaseOpen, getMissions } = await import('../src/store/progression.js');
    recordCaseOpen({ caseId: 'chroma_case', rarity: 'milspec' });
    const rare = getMissions().find((m) => m.type === 'rare_drop');
    expect(rare.progress).toBe(0);
    expect(rare.completed).toBe(false);
  });

  it('"open 3 different cases" only counts each case once', async () => {
    const { recordCaseOpen, getMissions } = await import('../src/store/progression.js');
    recordCaseOpen({ caseId: 'a', rarity: 'milspec' });
    recordCaseOpen({ caseId: 'a', rarity: 'milspec' });
    recordCaseOpen({ caseId: 'a', rarity: 'milspec' });
    const unique = getMissions().find((m) => m.type === 'unique_cases');
    expect(unique.progress).toBe(1);
    expect(unique.completed).toBe(false);
  });
});

describe('addXp + level rewards', () => {
  it('grants milestone reward when crossing level 2', async () => {
    const { addXp } = await import('../src/store/progression.js');
    // Default level = 1 (xp 0); level threshold is xp/500 + 1.
    // 500 XP → level 2 → €1 reward.
    const result = addXp(500);
    expect(result.leveledUp).toBe(true);
    expect(result.newLevel).toBe(2);
    expect(result.rewardsGranted).toEqual([{ level: 2, coins: 1 }]);
  });

  it('grants every milestone when XP jump crosses multiple levels', async () => {
    const { addXp } = await import('../src/store/progression.js');
    // 2500 XP → level 6 → milestones at 2, 3, 5 should fire.
    const result = addXp(2500);
    const levels = result.rewardsGranted.map((r) => r.level);
    expect(levels).toContain(2);
    expect(levels).toContain(3);
    expect(levels).toContain(5);
  });
});

describe('getNextLevelReward', () => {
  it('returns the next milestone after the current level', async () => {
    const { getNextLevelReward } = await import('../src/store/progression.js');
    expect(getNextLevelReward(1)).toEqual({ level: 2, coins: 1 });
    expect(getNextLevelReward(2)).toEqual({ level: 3, coins: 1.5 });
    expect(getNextLevelReward(7)).toEqual({ level: 10, coins: 10 });
  });

  it('returns null past the last milestone', async () => {
    const { getNextLevelReward } = await import('../src/store/progression.js');
    expect(getNextLevelReward(99)).toBeNull();
  });
});
