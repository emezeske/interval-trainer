"use client";

import { GuitarNote, IntervalMode, midiToGuitarPositions } from "@/lib/guitar";

// Standard single-dot fret markers
const SINGLE_DOTS = [3, 5, 7, 9, 15, 17, 19, 21];
const DOUBLE_DOTS = [12];

interface Props {
  rootNote: GuitarNote;
  note2Midi: number;
  mode: IntervalMode;
  maxFretJump: number;
}

export default function FretboardDiagram({ rootNote, note2Midi, mode, maxFretJump }: Props) {
  const allNote2 = midiToGuitarPositions(note2Midi);

  // Filter interval notes to within reach of root, unless ascending on 1st string
  const note2Positions = allNote2.filter((pos) => {
    const fretDist = Math.abs(pos.fret - rootNote.fret);
    if (fretDist <= maxFretJump) return true;
    // Exception: ascending on 1st string — may need a big jump
    if (mode === "ascending" && pos.string === 1) return true;
    return false;
  });

  // Find octave equivalents of the target note (same pitch class, different octave)
  const note2PitchClass = note2Midi % 12;
  const octavePositions: { string: number; fret: number }[] = [];
  // Collect all positions that are the same pitch class but a different MIDI note
  for (let midi = 40; midi <= 86; midi++) {
    if (midi % 12 === note2PitchClass && midi !== note2Midi) {
      for (const pos of midiToGuitarPositions(midi)) {
        octavePositions.push(pos);
      }
    }
  }

  // Center the view on the root note, show 4 frets each side
  // Extend one fret left so notes at displayMin have a full fret behind them
  const viewRadius = 4;
  const rawMin = Math.max(0, rootNote.fret - viewRadius);
  const displayMin = rawMin > 0 ? rawMin - 1 : rawMin;
  const displayMax = rootNote.fret + viewRadius;

  const frets: number[] = [];
  for (let f = displayMin; f <= displayMax; f++) frets.push(f);

  const strings = [1, 2, 3, 4, 5, 6]; // high E to low E

  // Layout constants — larger for bigger display
  const stringSpacing = 36;
  const fretSpacing = 72;
  const padLeft = 50;
  const padTop = 52;
  const padBottom = 20;
  const padRight = 20;
  const dotRadius = 12;

  // Position helpers
  const stringY = (s: number) => padTop + (s - 1) * stringSpacing;
  const fretX = (f: number) => padLeft + (f - displayMin) * fretSpacing;

  // A note sits between its fret wire and the previous one
  const noteX = (fret: number) => {
    if (fret === 0) return fretX(0) - fretSpacing * 0.4;
    return fretX(fret) - fretSpacing * 0.5;
  };

  // Leftmost x where strings need to reach
  const leftEdge = displayMin > 0
    ? fretX(displayMin) - 20
    : padLeft - 10;

  // Minimum fret for rendering note circles (displayMin is just a visual buffer)
  const noteMinFret = rawMin;

  const rightEdge = fretX(displayMax);
  const width = rightEdge + padLeft;
  const height = padTop + (strings.length - 1) * stringSpacing + padBottom;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full"
      style={{ maxHeight: 260 }}
    >
      {/* Nut (thick line at fret 0) */}
      {displayMin === 0 && (
        <line
          x1={fretX(0)}
          y1={padTop - 6}
          x2={fretX(0)}
          y2={stringY(6) + 6}
          stroke="#bbb"
          strokeWidth={5}
        />
      )}

      {/* Fret wires */}
      {frets.map((f) =>
        f === 0 && displayMin === 0 ? null : (
          <line
            key={`fret-${f}`}
            x1={fretX(f)}
            y1={padTop - 6}
            x2={fretX(f)}
            y2={stringY(6) + 6}
            stroke="#777"
            strokeWidth={1.5}
          />
        )
      )}

      {/* Strings */}
      {strings.map((s) => (
        <line
          key={`string-${s}`}
          x1={leftEdge}
          y1={stringY(s)}
          x2={rightEdge + 20}
          y2={stringY(s)}
          stroke="#999"
          strokeWidth={s > 3 ? 2.5 : 1.2}
        />
      ))}

      {/* Fret marker dots */}
      {frets.map((f) => {
        if (f === 0 || f < noteMinFret) return null;
        const cx = fretX(f) - fretSpacing * 0.5;
        const cy = (stringY(1) + stringY(6)) / 2;
        if (SINGLE_DOTS.includes(f)) {
          return (
            <circle key={`dot-${f}`} cx={cx} cy={cy} r={5} fill="#666" />
          );
        }
        if (DOUBLE_DOTS.includes(f)) {
          return (
            <g key={`dot-${f}`}>
              <circle cx={cx} cy={cy - stringSpacing * 1.2} r={5} fill="#666" />
              <circle cx={cx} cy={cy + stringSpacing * 1.2} r={5} fill="#666" />
            </g>
          );
        }
        return null;
      })}

      {/* Fret number label at root position */}
      <text
        x={rootNote.fret === 0 ? Math.max(noteX(0), 4) : noteX(rootNote.fret)}
        y={padTop - 16}
        fill="#999"
        fontSize={44}
        textAnchor={rootNote.fret === 0 ? "start" : "middle"}
        fontFamily="system-ui, sans-serif"
        fontWeight="bold"
      >
        {rootNote.fret === 0 ? "open" : `${rootNote.fret}fr`}
      </text>

      {/* Octave equivalents of target note (lavender open circles) */}
      {octavePositions.map((pos) => {
        if (pos.fret < noteMinFret || pos.fret > displayMax) return null;
        // Skip if overlaps with root or actual target positions
        if (pos.string === rootNote.string && pos.fret === rootNote.fret) return null;
        if (note2Positions.some((n) => n.string === pos.string && n.fret === pos.fret)) return null;
        return (
          <circle
            key={`oct-${pos.string}-${pos.fret}`}
            cx={noteX(pos.fret)}
            cy={stringY(pos.string)}
            r={dotRadius}
            fill="none"
            stroke="#888"
            strokeWidth={2.5}
            opacity={0.8}
          />
        );
      })}

      {/* Note2 positions (blue) — draw first so root overlaps if same spot */}
      {note2Positions.map((pos) => {
        // Only render if fret is in the visible range
        if (pos.fret < noteMinFret || pos.fret > displayMax) return null;
        return (
          <circle
            key={`n2-${pos.string}-${pos.fret}`}
            cx={noteX(pos.fret)}
            cy={stringY(pos.string)}
            r={dotRadius}
            fill={pos.fret === 0 ? "none" : "#3b82f6"}
            stroke={pos.fret === 0 ? "#3b82f6" : "none"}
            strokeWidth={pos.fret === 0 ? 2.5 : 0}
            opacity={0.9}
          />
        );
      })}

      {/* Root note (green) */}
      <circle
        cx={noteX(rootNote.fret)}
        cy={stringY(rootNote.string)}
        r={dotRadius}
        fill={rootNote.fret === 0 ? "none" : "#22c55e"}
        stroke={rootNote.fret === 0 ? "#22c55e" : "none"}
        strokeWidth={rootNote.fret === 0 ? 2.5 : 0}
      />
    </svg>
  );
}
