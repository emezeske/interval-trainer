// Adaptive difficulty tracking
// Tracks average response time per (string, interval) pair
// and biases interval selection toward slower pairs.
// Also tracks per-mode (ascending/descending/harmonic) timing as a correction factor.

import { IntervalMode } from "./guitar";

const STORAGE_KEY = "interval-trainer-difficulty";
const MODE_STORAGE_KEY = "interval-trainer-mode-timing";
const MAX_DURATION = 30; // clamp durations above this (seconds)
const IGNORE_DURATION = 60; // entirely ignore durations above this
const DECAY = 0.85; // exponential decay for older samples (lower = more recent bias)
const MAX_SINGLE_WEIGHT = 0.5; // no single interval can exceed 50% selection probability

export interface DifficultyRecord {
  // key: "string:interval" e.g. "4:7"
  [key: string]: { weightedSum: number; weightedCount: number };
}

export function difficultyKey(stringNum: number, interval: number): string {
  return `${stringNum}:${Math.abs(interval)}`;
}

export function loadDifficulty(): DifficultyRecord {
  if (typeof window === "undefined") return {};
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {
    // ignore
  }
  return {};
}

export function saveDifficulty(data: DifficultyRecord): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function clearDifficulty(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}

/** Record a new response duration for a (string, interval) pair.
 *  Uses exponential moving average: new weighted average decays old data by DECAY. */
export function recordDuration(
  data: DifficultyRecord,
  stringNum: number,
  interval: number,
  durationSeconds: number
): DifficultyRecord {
  // Ignore absurdly long durations (user walked away)
  if (durationSeconds > IGNORE_DURATION) return data;
  // Clamp long but not absurd durations
  const clamped = Math.min(durationSeconds, MAX_DURATION);

  const key = difficultyKey(stringNum, interval);
  const existing = data[key];

  if (existing) {
    return {
      ...data,
      [key]: {
        weightedSum: existing.weightedSum * DECAY + clamped,
        weightedCount: existing.weightedCount * DECAY + 1,
      },
    };
  }
  return {
    ...data,
    [key]: { weightedSum: clamped, weightedCount: 1 },
  };
}

/** Get the weighted average time for each tracked pair */
export function getAverageTimes(data: DifficultyRecord): Record<string, number> {
  const result: Record<string, number> = {};
  for (const [key, { weightedSum, weightedCount }] of Object.entries(data)) {
    if (weightedCount > 0) {
      result[key] = weightedSum / weightedCount;
    }
  }
  return result;
}

/** Compute selection weights for the given allowed intervals.
 *  Returns a map from interval size to weight (unnormalized).
 *  Pairs with higher average time get higher weight, capped at MAX_SINGLE_WEIGHT of total. */
export function computeIntervalWeights(
  data: DifficultyRecord,
  allowedIntervals: number[]
): Map<number, number> {
  const averages = getAverageTimes(data);

  // Aggregate across all strings: for each interval size, take the max average
  const intervalAvg = new Map<number, number>();
  for (const [key, avg] of Object.entries(averages)) {
    const interval = parseInt(key.split(":")[1]);
    if (!allowedIntervals.includes(interval)) continue;
    const current = intervalAvg.get(interval) ?? 0;
    if (avg > current) intervalAvg.set(interval, avg);
  }

  // If no data, return uniform weights
  if (intervalAvg.size === 0) {
    const weights = new Map<number, number>();
    for (const i of allowedIntervals) weights.set(i, 1);
    return weights;
  }

  // Base weight for intervals with no data: median of known averages
  const knownAvgs = [...intervalAvg.values()].sort((a, b) => a - b);
  const medianAvg = knownAvgs[Math.floor(knownAvgs.length / 2)];

  // Assign raw weights proportional to average time
  const rawWeights = new Map<number, number>();
  for (const i of allowedIntervals) {
    rawWeights.set(i, intervalAvg.get(i) ?? medianAvg);
  }

  // Normalize and cap
  const total = [...rawWeights.values()].reduce((a, b) => a + b, 0);
  const maxAllowed = total * MAX_SINGLE_WEIGHT;

  // Cap any weight exceeding maxAllowed, redistribute excess
  const capped = new Map<number, number>();
  let excess = 0;
  let uncappedCount = 0;
  for (const [k, v] of rawWeights) {
    if (v > maxAllowed) {
      capped.set(k, maxAllowed);
      excess += v - maxAllowed;
    } else {
      capped.set(k, v);
      uncappedCount++;
    }
  }

  // Distribute excess equally among uncapped intervals
  if (excess > 0 && uncappedCount > 0) {
    const bonus = excess / uncappedCount;
    for (const [k, v] of capped) {
      if (v < maxAllowed) {
        capped.set(k, v + bonus);
      }
    }
  }

  return capped;
}

// --- Mode timing (ascending / descending / harmonic) ---

export type ModeRecord = Record<string, { weightedSum: number; weightedCount: number }>;

export function loadModeTiming(): ModeRecord {
  if (typeof window === "undefined") return {};
  try {
    const stored = localStorage.getItem(MODE_STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {
    // ignore
  }
  return {};
}

export function saveModeTiming(data: ModeRecord): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(MODE_STORAGE_KEY, JSON.stringify(data));
}

export function clearModeTiming(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(MODE_STORAGE_KEY);
}

export function recordModeDuration(
  data: ModeRecord,
  mode: IntervalMode,
  durationSeconds: number
): ModeRecord {
  if (durationSeconds > IGNORE_DURATION) return data;
  const clamped = Math.min(durationSeconds, MAX_DURATION);
  const existing = data[mode];
  if (existing) {
    return {
      ...data,
      [mode]: {
        weightedSum: existing.weightedSum * DECAY + clamped,
        weightedCount: existing.weightedCount * DECAY + 1,
      },
    };
  }
  return {
    ...data,
    [mode]: { weightedSum: clamped, weightedCount: 1 },
  };
}

export function getModeAverageTimes(data: ModeRecord): Record<string, number> {
  const result: Record<string, number> = {};
  for (const [key, { weightedSum, weightedCount }] of Object.entries(data)) {
    if (weightedCount > 0) {
      result[key] = weightedSum / weightedCount;
    }
  }
  return result;
}

/** Returns a correction factor for a given mode.
 *  Factor is relative to the fastest mode average.
 *  e.g. if ascending=3s, harmonic=6s → ascending factor=1.0, harmonic factor=0.5
 *  Multiply raw duration by this factor before recording interval difficulty. */
export function modeCorrectionFactor(data: ModeRecord, mode: IntervalMode): number {
  const avgs = getModeAverageTimes(data);
  const values = Object.values(avgs);
  if (values.length === 0) return 1;
  const fastest = Math.min(...values);
  const modeAvg = avgs[mode];
  if (!modeAvg || modeAvg <= 0) return 1;
  return fastest / modeAvg;
}
