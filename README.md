# 🎸 Interval Trainer

A web-based ear-training app for guitar players. It plays two notes and challenges you to identify the interval by ear.

> **100% vibe-coded** — this entire repo was built through natural-language conversations with GitHub Copilot (Claude), with no manual coding. See [PROMPTS.md](PROMPTS.md) for the full conversation history.

## How It Works

1. **Configure** your session on the home page — choose interval modes, select which intervals to drill, tweak audio settings, and set fret constraints.
2. **Train** — the app shows you the first note (name, string, and fret) and plays an interval. You identify the interval, then advance to reveal the answer with a fretboard diagram.
3. **Control** the session with on-screen buttons, keyboard shortcuts, or a Bluetooth page-turner pedal.

## Features

- **25 intervals** from minor 2nd to two octaves
- **Individual interval selection** — pick exactly which intervals to drill, with quick presets (1–7, 1–12, Jazz Intervals, All)
- **Three modes**: ascending, descending, and harmonic (simultaneous)
- **Karplus-Strong pluck synthesis** — realistic guitar-like tones via Web Audio API (no samples needed), plus sine, triangle, square, and sawtooth waveforms
- **Fretboard diagram** — SVG visualization showing root note (green), target positions (blue), and octave equivalents (grey), with open-string rendering
- **Correct enharmonic spelling** — note names use music-theory rules based on root and interval (e.g., C + m7 → B♭ not A♯), with proper Unicode accidentals (♯ ♭ 𝄪 𝄫)
- **Adaptive difficulty** — biases toward intervals you take longer to identify, with response-time tracking and bar graphs
- **Fret constraints** — configurable min/max fret range and max fret jump between root and target
- **Keyboard & pedal support**: `→` / `Space` / `PageDown` for next, `←` / `PageUp` for repeat — works with Bluetooth page-turner pedals
- **Configurable audio**: adjust note duration and delay between notes
- **Mobile-friendly** — responsive dark theme with safe-area insets and `min-h-dvh`
- **All settings persisted** to localStorage

## Configuration

| Setting | Range | Default |
| --- | --- | --- |
| Interval modes | Ascending, Descending, Harmonic | All three |
| Allowed intervals | Any subset of 1–24 semitones | 1–12 (up to octave) |
| Note duration | 0.3–3.0 s | 1.2 s |
| Delay between notes | 0.1–2.0 s | 0.6 s |
| Waveform | Pluck, Sine, Triangle, Square, Sawtooth | Pluck |
| Min fret | 0–23 | 0 |
| Max fret | 1–24 | 20 |
| Max fret jump | 1–24 | 5 |
| Adaptive difficulty | On / Off | On |

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production

```bash
npm run build
npm start
```

## Tech Stack

- [Next.js](https://nextjs.org) (App Router)
- [React](https://react.dev)
- [Tailwind CSS](https://tailwindcss.com)
- [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
