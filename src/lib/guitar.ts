// Guitar note/interval logic

export const NOTE_NAMES = [
  "C",
  "C♯",
  "D",
  "D♯",
  "E",
  "F",
  "F♯",
  "G",
  "G♯",
  "A",
  "A♯",
  "B",
] as const;

export const NOTE_NAMES_FLAT = [
  "C",
  "D♭",
  "D",
  "E♭",
  "E",
  "F",
  "G♭",
  "G",
  "A♭",
  "A",
  "B♭",
  "B",
] as const;

export type NoteName = (typeof NOTE_NAMES)[number] | (typeof NOTE_NAMES_FLAT)[number];

export interface GuitarNote {
  midi: number; // MIDI note number
  name: NoteName;
  octave: number;
  string: number; // 1 (high E) to 6 (low E)
  fret: number;
}

export const INTERVAL_NAMES: Record<number, string> = {
  0: "Unison",
  1: "Minor 2nd",
  2: "Major 2nd",
  3: "Minor 3rd",
  4: "Major 3rd",
  5: "Perfect 4th",
  6: "Tritone",
  7: "Perfect 5th",
  8: "Minor 6th",
  9: "Major 6th",
  10: "Minor 7th",
  11: "Major 7th",
  12: "Octave",
  13: "Minor 9th",
  14: "Major 9th",
  15: "Minor 10th",
  16: "Major 10th",
  17: "Perfect 11th",
  18: "Augmented 11th",
  19: "Perfect 12th",
  20: "Minor 13th",
  21: "Major 13th",
  22: "Minor 14th",
  23: "Major 14th",
  24: "2 Octaves",
};

// Standard guitar tuning: string open note MIDI values
// String 6 (low E) = E2 = MIDI 40
// String 5 (A)     = A2 = MIDI 45
// String 4 (D)     = D3 = MIDI 50
// String 3 (G)     = G3 = MIDI 55
// String 2 (B)     = B3 = MIDI 59
// String 1 (high E)= E4 = MIDI 64
const STRING_OPEN_MIDI = [64, 59, 55, 50, 45, 40]; // index 0 = string 1

const MAX_FRET = 22;

// Guitar range: E2 (40) to D6 (86) with 22 frets
export const GUITAR_MIN_MIDI = 40; // E2
export const GUITAR_MAX_MIDI = 86; // D6 (string 1, fret 22)

export function midiToNoteName(midi: number): NoteName {
  return NOTE_NAMES[midi % 12];
}

export function midiToOctave(midi: number): number {
  return Math.floor(midi / 12) - 1;
}

export function midiToFrequency(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export function formatNote(midi: number, useFlats = false): string {
  const names = useFlats ? NOTE_NAMES_FLAT : NOTE_NAMES;
  return `${names[midi % 12]}${midiToOctave(midi)}`;
}

/** Returns true if the MIDI note is a sharp/flat (black key) */
export function isAccidental(midi: number): boolean {
  return [1, 3, 6, 8, 10].includes(midi % 12);
}

/** Format a note name without octave */
export function formatNoteName(midi: number, useFlats = false): string {
  const names = useFlats ? NOTE_NAMES_FLAT : NOTE_NAMES;
  return names[midi % 12];
}

// Letter names and their semitone values for interval spelling
const LETTERS = ["C", "D", "E", "F", "G", "A", "B"];
const LETTER_SEMITONES = [0, 2, 4, 5, 7, 9, 11];

// Each interval (in semitones mod 12) maps to a generic letter offset
// e.g. any kind of 3rd is 2 letters up, any kind of 7th is 6 letters up
const INTERVAL_LETTER_OFFSET: Record<number, number> = {
  0: 0, 1: 1, 2: 1, 3: 2, 4: 2, 5: 3, 6: 3,
  7: 4, 8: 5, 9: 5, 10: 6, 11: 6,
};

/** Get the letter index (0-6, C through B) for a MIDI note given sharp/flat context */
function midiToLetterIndex(midi: number, useFlats: boolean): number {
  const pc = midi % 12;
  const natural = LETTER_SEMITONES.indexOf(pc);
  if (natural >= 0) return natural;
  // Accidental: sharp → letter below, flat → letter above
  return useFlats
    ? LETTER_SEMITONES.indexOf(pc + 1)
    : LETTER_SEMITONES.indexOf(pc - 1);
}

/** Format the target note name based on the root note and interval, using correct
 *  enharmonic spelling (e.g. C + m7 → Bb not A#, C + tritone → F# ascending / Gb descending) */
export function formatIntervalNoteName(
  rootMidi: number,
  targetMidi: number,
  intervalSemitones: number,
  useFlats: boolean
): string {
  const rootLetterIdx = midiToLetterIndex(rootMidi, useFlats);
  const absSemitones = Math.abs(intervalSemitones);
  const reduced = absSemitones % 12;
  const ascending = intervalSemitones >= 0;

  const letterOffset = INTERVAL_LETTER_OFFSET[reduced];

  // For ascending, target letter = root + offset; for descending, root - offset
  const targetLetterIdx = ascending
    ? (rootLetterIdx + letterOffset) % 7
    : (rootLetterIdx - letterOffset + 7) % 7;

  const targetLetter = LETTERS[targetLetterIdx];
  const targetNaturalSemitone = LETTER_SEMITONES[targetLetterIdx];
  const targetPitchClass = ((targetMidi % 12) + 12) % 12;

  // Difference between actual pitch and the natural letter
  let diff = targetPitchClass - targetNaturalSemitone;
  if (diff > 6) diff -= 12;
  if (diff < -6) diff += 12;

  if (diff === 0) return targetLetter;
  if (diff === 1) return targetLetter + "♯";
  if (diff === -1) return targetLetter + "♭";
  if (diff === 2) return targetLetter + "𝄪";
  if (diff === -2) return targetLetter + "𝄫";
  return targetLetter; // fallback
}

export function getIntervalName(semitones: number): string {
  const abs = Math.abs(semitones);
  return INTERVAL_NAMES[abs] || `${abs} semitones`;
}

export function getStringName(stringNum: number): string {
  const names: Record<number, string> = {
    1: "1st",
    2: "2nd",
    3: "3rd",
    4: "4th",
    5: "5th",
    6: "6th",
  };
  return names[stringNum] || `${stringNum}th`;
}

/** Find which string and fret a MIDI note could be played on.
 *  Returns all possible positions, preferring lower fret numbers. */
export function midiToGuitarPositions(midi: number): GuitarNote[] {
  const positions: GuitarNote[] = [];
  for (let s = 0; s < 6; s++) {
    const fret = midi - STRING_OPEN_MIDI[s];
    if (fret >= 0 && fret <= MAX_FRET) {
      positions.push({
        midi,
        name: midiToNoteName(midi),
        octave: midiToOctave(midi),
        string: s + 1,
        fret,
      });
    }
  }
  return positions;
}

export type IntervalMode = "ascending" | "descending" | "harmonic";

export interface IntervalPair {
  note1: GuitarNote;
  note2Midi: number;
  interval: number; // signed semitones (positive = up, 0 for harmonic uses abs)
  mode: IntervalMode;
}

/** Generate a random interval pair given config constraints.
 *  If intervalWeights is provided, bias interval size selection accordingly. */
export function generateInterval(
  allowedModes: IntervalMode[],
  allowedIntervals: number[],
  intervalWeights?: Map<number, number>,
  fretConstraints?: { maxFretJump: number; minFret: number; maxFret: number }
): IntervalPair {
  const mode = allowedModes[Math.floor(Math.random() * allowedModes.length)];
  const maxJump = fretConstraints?.maxFretJump ?? 99;
  const minFret = fretConstraints?.minFret ?? 0;
  const maxFret = fretConstraints?.maxFret ?? MAX_FRET;

  // Build pool of valid root positions within fret range
  const validRoots: GuitarNote[] = [];
  for (let midi = GUITAR_MIN_MIDI; midi <= GUITAR_MAX_MIDI; midi++) {
    for (const pos of midiToGuitarPositions(midi)) {
      if (pos.fret >= minFret && pos.fret <= maxFret) {
        validRoots.push(pos);
      }
    }
  }

  // If no valid roots exist for this fret range, fall back to all positions
  if (validRoots.length === 0) {
    for (let midi = GUITAR_MIN_MIDI; midi <= GUITAR_MAX_MIDI; midi++) {
      validRoots.push(...midiToGuitarPositions(midi));
    }
  }

  // Pick interval size — weighted if provided, otherwise uniform
  function pickIntervalSize(): number {
    if (!intervalWeights || intervalWeights.size === 0) {
      return allowedIntervals[Math.floor(Math.random() * allowedIntervals.length)];
    }
    const entries = [...intervalWeights.entries()].filter(([k]) => allowedIntervals.includes(k));
    const total = entries.reduce((sum, [, w]) => sum + w, 0);
    let r = Math.random() * total;
    for (const [size, weight] of entries) {
      r -= weight;
      if (r <= 0) return size;
    }
    return entries[entries.length - 1][0];
  }

  // Check if the target note has any position within fret range and jump limit
  function hasValidTarget(rootFret: number, targetMidi: number): boolean {
    for (const pos of midiToGuitarPositions(targetMidi)) {
      if (pos.fret >= minFret && pos.fret <= maxFret && Math.abs(pos.fret - rootFret) <= maxJump) {
        return true;
      }
    }
    return false;
  }

  let note1: GuitarNote;
  let intervalSize: number;
  let note2Midi: number;

  // Keep trying until we get a valid pair
  let attempts = 0;
  do {
    note1 = validRoots[Math.floor(Math.random() * validRoots.length)];
    intervalSize = pickIntervalSize();

    if (mode === "descending") {
      note2Midi = note1.midi - intervalSize;
    } else {
      note2Midi = note1.midi + intervalSize;
    }
    attempts++;
  } while (
    (note2Midi < GUITAR_MIN_MIDI || note2Midi > GUITAR_MAX_MIDI || !hasValidTarget(note1.fret, note2Midi)) &&
    attempts < 200
  );

  // Fallback: clamp if we couldn't find valid pair
  if (note2Midi < GUITAR_MIN_MIDI || note2Midi > GUITAR_MAX_MIDI || !hasValidTarget(note1.fret, note2Midi)) {
    note2Midi = Math.max(
      GUITAR_MIN_MIDI,
      Math.min(GUITAR_MAX_MIDI, note2Midi)
    );
    intervalSize = Math.abs(note2Midi - note1.midi);
  }

  const signedInterval = mode === "descending" ? -intervalSize : intervalSize;

  return {
    note1,
    note2Midi,
    interval: signedInterval,
    mode,
  };
}
