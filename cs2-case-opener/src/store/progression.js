import { DAILY_REWARD_COINS, STREAK_BONUS } from '../data/economy.js';
import { earn } from './wallet.js';

const STORAGE_KEY = 'cs2_progression';

function safeParse(value, fallback) {
  try {
    return JSON.parse(value) ?? fallback;
  } catch {
    return fallback;
  }
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function previousDayKey(key) {
  const date = new Date(`${key}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

function emitChange(detail) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('progression:updated', { detail }));
  }
}

// Mission templates. `type` is matched in recordCaseOpen() to know what
// counts as progress.
// Reward `coins` are now in EUR (post-economy migration from coin-scale).
const MISSION_TEMPLATES = [
  { type: 'open_cases', label: 'Open 5 cases', target: 5, reward: { coins: 2.5, xp: 100 } },
  { type: 'rare_drop', label: 'Get a Classified or better', target: 1, reward: { coins: 5, xp: 200 } },
  { type: 'unique_cases', label: 'Open 3 different cases', target: 3, reward: { coins: 3.75, xp: 150 } },
];

function makeMission(index) {
  const template = MISSION_TEMPLATES[index % MISSION_TEMPLATES.length];
  return {
    id: crypto.randomUUID?.() ?? `${Date.now()}_${index}`,
    type: template.type,
    label: template.label,
    target: template.target,
    progress: 0,
    reward: template.reward,
    completed: false,
    // For unique_cases: ids of cases already counted.
    meta: {},
  };
}

function freshMissions() {
  return [makeMission(0), makeMission(1), makeMission(2)];
}

function migrateMissions(missions) {
  // Older stored missions don't have a `type` — infer it from the label so
  // existing progress tracking starts working immediately.
  return missions.map((m) => {
    if (m.type) return { ...m, meta: m.meta ?? {} };
    const byLabel = MISSION_TEMPLATES.find((t) => t.label === m.label);
    return { ...m, type: byLabel?.type ?? 'open_cases', meta: m.meta ?? {} };
  });
}

function loadState() {
  if (typeof localStorage === 'undefined') {
    return { xp: 0, level: 1, currentStreak: 0, lastDailyClaimDate: null, missions: freshMissions(), completedMissions: [] };
  }

  const stored = safeParse(localStorage.getItem(STORAGE_KEY), null);
  return stored && typeof stored === 'object'
    ? {
        xp: Number(stored.xp) || 0,
        level: Number(stored.level) || 1,
        currentStreak: Number(stored.currentStreak) || 0,
        lastDailyClaimDate: stored.lastDailyClaimDate ?? null,
        missions: Array.isArray(stored.missions) && stored.missions.length > 0 ? migrateMissions(stored.missions) : freshMissions(),
        completedMissions: Array.isArray(stored.completedMissions) ? stored.completedMissions : [],
      }
    : { xp: 0, level: 1, currentStreak: 0, lastDailyClaimDate: null, missions: freshMissions(), completedMissions: [] };
}

let state = loadState();

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // storage unavailable
  }
}

function computeLevel(xp) {
  return Math.max(1, Math.floor((Number(xp) || 0) / 500) + 1);
}

// Cumulative reward each time the player reaches the given level for the
// first time. Earlier levels are cheap; later milestones pay out more.
// Values are in EUR (post-economy migration).
const LEVEL_REWARDS = {
  2: 1,
  3: 1.5,
  5: 3,
  7: 5,
  10: 10,
  15: 20,
  20: 35,
  25: 60,
  30: 100,
};

export function getNextLevelReward(level) {
  const upcoming = Object.keys(LEVEL_REWARDS)
    .map(Number)
    .filter((lvl) => lvl > level)
    .sort((a, b) => a - b);
  if (upcoming.length === 0) return null;
  const next = upcoming[0];
  return { level: next, coins: LEVEL_REWARDS[next] };
}

function refreshMissions() {
  if (state.missions.every((mission) => mission.completed)) {
    state.missions = freshMissions();
  }
}

export function addXp(amount) {
  const delta = Math.max(0, Number(amount) || 0);
  const previousLevel = state.level;
  state.xp += delta;
  state.level = computeLevel(state.xp);
  const leveledUp = state.level > previousLevel;
  // Grant every milestone reward we crossed (in case +XP jumped multiple levels).
  const rewardsGranted = [];
  if (leveledUp) {
    for (let lvl = previousLevel + 1; lvl <= state.level; lvl += 1) {
      const reward = LEVEL_REWARDS[lvl];
      if (reward) {
        earn(reward, `level_up_${lvl}`);
        rewardsGranted.push({ level: lvl, coins: reward });
      }
    }
  }
  saveState();
  emitChange({ leveledUp, newXp: state.xp, newLevel: state.level, rewardsGranted });
  return { newXp: state.xp, newLevel: state.level, leveledUp, rewardsGranted };
}

export function claimDailyReward() {
  const key = todayKey();
  if (state.lastDailyClaimDate === key) {
    return null;
  }

  const yesterday = previousDayKey(key);
  if (!state.lastDailyClaimDate) {
    state.currentStreak = 1;
  } else if (state.lastDailyClaimDate === yesterday) {
    state.currentStreak = Math.min(7, (Number(state.currentStreak) || 0) + 1);
  } else {
    // Missed at least one day: restart streak from day 1.
    state.currentStreak = 1;
  }
  state.lastDailyClaimDate = key;
  const streakIndex = Math.max(0, Math.min(STREAK_BONUS.length - 1, state.currentStreak - 1));
  const coins = DAILY_REWARD_COINS + (STREAK_BONUS[streakIndex] ?? 0);
  earn(coins, 'daily_reward');
  saveState();
  emitChange({ dailyClaimed: true, coins, streakDay: state.currentStreak });
  return { coins, streakDay: state.currentStreak };
}

export function getMissions() {
  refreshMissions();
  return state.missions;
}

const RARE_RARITIES = new Set(['classified', 'covert', 'extraordinary']);

// Called once per case opening. Increments any matching mission and
// auto-claims the reward when a mission reaches its target.
export function recordCaseOpen({ caseId, rarity } = {}) {
  let touched = false;
  const finished = [];

  for (const mission of state.missions) {
    if (mission.completed) continue;

    let inc = 0;
    if (mission.type === 'open_cases') {
      inc = 1;
    } else if (mission.type === 'rare_drop') {
      if (rarity && RARE_RARITIES.has(rarity)) inc = 1;
    } else if (mission.type === 'unique_cases') {
      if (caseId && !mission.meta?.[caseId]) {
        mission.meta = { ...(mission.meta ?? {}), [caseId]: true };
        inc = 1;
      }
    }

    if (inc > 0) {
      mission.progress = Math.min(mission.target, mission.progress + inc);
      touched = true;
      if (mission.progress >= mission.target && !mission.completed) {
        mission.completed = true;
        state.completedMissions.push(mission.id);
        addXp(mission.reward.xp);
        earn(mission.reward.coins, 'mission_reward');
        finished.push(mission);
      }
    }
  }

  if (touched) {
    saveState();
    emitChange({ missionsUpdated: true, finished: finished.map((m) => m.id) });
    refreshMissions();
  }

  return finished;
}

export function completeMission(id) {
  const mission = state.missions.find((entry) => entry.id === id);
  if (!mission || mission.completed) {
    return false;
  }

  mission.progress = mission.target;
  mission.completed = true;
  state.completedMissions.push(id);
  addXp(mission.reward.xp);
  earn(mission.reward.coins, 'mission_reward');
  saveState();
  emitChange({ missionCompleted: id });
  refreshMissions();
  return true;
}

export function getProgressionState() {
  return typeof structuredClone === 'function' ? structuredClone(state) : JSON.parse(JSON.stringify(state));
}
