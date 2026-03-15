import { IntervalMode } from "./guitar";

export type Waveform = "sine" | "triangle" | "square" | "sawtooth" | "pluck";

export interface TrainingConfig {
  allowedModes: IntervalMode[];
  allowedIntervals: number[]; // which interval sizes (semitones) to drill
  noteDuration: number; // seconds each note is held
  noteDelay: number; // seconds between notes in melodic mode
  waveform: Waveform;
  adaptiveDifficulty: boolean;
  maxFretJump: number; // max fret distance between root and target
  minFret: number; // lowest fret allowed
  maxFret: number; // highest fret allowed
}

const STORAGE_KEY = "interval-trainer-config";

export const DEFAULT_CONFIG: TrainingConfig = {
  allowedModes: ["ascending", "descending", "harmonic"],
  allowedIntervals: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
  noteDuration: 1.2,
  noteDelay: 0.6,
  waveform: "pluck",
  adaptiveDifficulty: true,
  maxFretJump: 5,
  minFret: 0,
  maxFret: 20,
};

export function loadConfig(): TrainingConfig {
  if (typeof window === "undefined") return DEFAULT_CONFIG;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        allowedModes: parsed.allowedModes ?? DEFAULT_CONFIG.allowedModes,
        allowedIntervals: parsed.allowedIntervals
          ?? (parsed.maxInterval
            ? Array.from({ length: parsed.maxInterval }, (_, i) => i + 1)
            : DEFAULT_CONFIG.allowedIntervals),
        noteDuration: parsed.noteDuration ?? DEFAULT_CONFIG.noteDuration,
        noteDelay: parsed.noteDelay ?? DEFAULT_CONFIG.noteDelay,
        waveform: parsed.waveform ?? DEFAULT_CONFIG.waveform,
        adaptiveDifficulty: parsed.adaptiveDifficulty ?? DEFAULT_CONFIG.adaptiveDifficulty,
        maxFretJump: parsed.maxFretJump ?? DEFAULT_CONFIG.maxFretJump,
        minFret: parsed.minFret ?? DEFAULT_CONFIG.minFret,
        maxFret: parsed.maxFret ?? DEFAULT_CONFIG.maxFret,
      };
    }
  } catch {
    // ignore parse errors
  }
  return DEFAULT_CONFIG;
}

export function saveConfig(config: TrainingConfig): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}
