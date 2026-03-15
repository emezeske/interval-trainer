// Synthesized sound using Web Audio API

import { midiToFrequency } from "./guitar";
import { Waveform } from "./config";

let audioCtx: AudioContext | null = null;
let audioUnlocked = false;
let activeNodes: { source: AudioScheduledSourceNode; gain: GainNode }[] = [];

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  }
  return audioCtx;
}

/** Stop all currently playing notes immediately */
export function stopAll(): void {
  const ctx = getAudioContext();
  const now = ctx.currentTime;
  for (const node of activeNodes) {
    try {
      node.gain.gain.cancelScheduledValues(now);
      node.gain.gain.setValueAtTime(node.gain.gain.value, now);
      node.gain.gain.linearRampToValueAtTime(0, now + 0.02);
      node.source.stop(now + 0.03);
    } catch {
      // already stopped
    }
  }
  activeNodes = [];
}

/** Ensure AudioContext is resumed — must be called synchronously from a user gesture handler.
 *  On iOS WebKit, plays a silent buffer to unlock audio output. */
export function ensureAudioReady(): void {
  const ctx = getAudioContext();
  if (ctx.state === "suspended") {
    ctx.resume();
  }
  if (!audioUnlocked) {
    const buffer = ctx.createBuffer(1, 1, ctx.sampleRate);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start(0);
    audioUnlocked = true;
  }
}

/** Generate a Karplus-Strong plucked string buffer for a given frequency */
function generatePluckBuffer(freq: number, duration: number): AudioBuffer {
  const ctx = getAudioContext();
  const sampleRate = ctx.sampleRate;
  const samples = Math.ceil(sampleRate * duration);
  const buffer = ctx.createBuffer(1, samples, sampleRate);
  const data = buffer.getChannelData(0);

  // Delay line length = one period
  const period = Math.round(sampleRate / freq);
  // Initialize delay line with noise burst (the "pluck")
  const delayLine = new Float32Array(period);
  for (let i = 0; i < period; i++) {
    delayLine[i] = Math.random() * 2 - 1;
  }

  // Karplus-Strong: read from delay line, apply low-pass averaging filter, write back
  const damping = 0.996; // controls how quickly the sound decays
  let readIndex = 0;
  for (let i = 0; i < samples; i++) {
    const prevIndex = (readIndex + period - 1) % period;
    const nextIndex = (readIndex + 1) % period;
    // 3-point weighted averaging filter for a smoother, warmer tone
    const out = damping * (0.25 * delayLine[prevIndex] + 0.5 * delayLine[readIndex] + 0.25 * delayLine[nextIndex]);
    data[i] = out;
    delayLine[readIndex] = out;
    readIndex = nextIndex;
  }

  return buffer;
}

/** Play a Karplus-Strong plucked string note */
function playPluck(midi: number, duration: number, startOffset: number): void {
  const ctx = getAudioContext();
  const freq = midiToFrequency(midi);
  const start = ctx.currentTime + startOffset;

  const buffer = generatePluckBuffer(freq, duration + 0.1);
  const source = ctx.createBufferSource();
  source.buffer = buffer;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.7, start);
  // Fade out at the end to avoid click
  gain.gain.setValueAtTime(0.7, start + duration - 0.02);
  gain.gain.linearRampToValueAtTime(0, start + duration);

  source.connect(gain);
  gain.connect(ctx.destination);

  activeNodes.push({ source, gain });

  source.start(start);
  source.stop(start + duration + 0.05);

  source.onended = () => {
    activeNodes = activeNodes.filter((n) => n.source !== source);
  };
}

/** Play a tone for a given MIDI note number, starting at an optional offset (seconds) from now */
export function playNote(midi: number, duration = 1.2, startOffset = 0, waveform: Waveform = "triangle"): void {
  if (waveform === "pluck") {
    playPluck(midi, duration, startOffset);
    return;
  }

  const ctx = getAudioContext();
  const freq = midiToFrequency(midi);
  const start = ctx.currentTime + startOffset;

  const harmonics = [
    { ratio: 1, gain: 0.6 },
    { ratio: 2, gain: 0.2 },
    { ratio: 3, gain: 0.08 },
    { ratio: 4, gain: 0.04 },
  ];

  const masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(0.5, start);
  masterGain.connect(ctx.destination);

  for (const h of harmonics) {
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();

    osc.type = waveform as OscillatorType;
    osc.frequency.setValueAtTime(freq * h.ratio, start);

    // Sustained envelope: 20ms attack, hold, 20ms release
    oscGain.gain.setValueAtTime(0, start);
    oscGain.gain.linearRampToValueAtTime(h.gain, start + 0.02);
    oscGain.gain.setValueAtTime(h.gain, start + 0.02);
    oscGain.gain.linearRampToValueAtTime(h.gain * 0.7, start + duration * 0.8);
    oscGain.gain.linearRampToValueAtTime(0, start + duration);

    osc.connect(oscGain);
    oscGain.connect(masterGain);

    activeNodes.push({ source: osc, gain: oscGain });

    osc.start(start);
    osc.stop(start + duration + 0.05);

    osc.onended = () => {
      activeNodes = activeNodes.filter((n) => n.source !== osc);
    };
  }
}

/** Play an interval: two notes in sequence (ascending/descending) or simultaneously (harmonic) */
export function playInterval(
  midi1: number,
  midi2: number,
  mode: "ascending" | "descending" | "harmonic",
  noteDuration = 1.2,
  noteDelay = 0.6,
  waveform: Waveform = "triangle"
): void {
  stopAll();

  if (mode === "harmonic") {
    playNote(midi1, noteDuration, 0, waveform);
    playNote(midi2, noteDuration, 0, waveform);
  } else if (mode === "ascending") {
    const lower = Math.min(midi1, midi2);
    const upper = Math.max(midi1, midi2);
    playNote(lower, noteDuration, 0, waveform);
    playNote(upper, noteDuration, noteDuration + noteDelay, waveform);
  } else {
    // descending
    const lower = Math.min(midi1, midi2);
    const upper = Math.max(midi1, midi2);
    playNote(upper, noteDuration, 0, waveform);
    playNote(lower, noteDuration, noteDuration + noteDelay, waveform);
  }
}
