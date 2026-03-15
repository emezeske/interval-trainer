"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  generateInterval,
  formatNoteName,
  formatIntervalNoteName,
  getIntervalName,
  getStringName,
  isAccidental,
  midiToOctave,
  IntervalPair,
  IntervalMode,
} from "@/lib/guitar";
import { playInterval, ensureAudioReady, stopAll } from "@/lib/audio";
import { loadConfig } from "@/lib/config";
import { setupKeyboardFallback } from "@/lib/keyboard";
import FretboardDiagram from "./FretboardDiagram";
import {
  loadDifficulty,
  saveDifficulty,
  recordDuration,
  computeIntervalWeights,
  DifficultyRecord,
  loadModeTiming,
  saveModeTiming,
  recordModeDuration,
  modeCorrectionFactor,
  ModeRecord,
} from "@/lib/difficulty";

export default function TrainPage() {
  const router = useRouter();
  const [current, setCurrent] = useState<IntervalPair | null>(null);
  const [useFlats, setUseFlats] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);
  const [lastAnswer, setLastAnswer] = useState<{
    name: string;
    note1: string;
    note2: string;
    mode: IntervalMode;
    pair: IntervalPair;
  } | null>(null);
  const [count, setCount] = useState(0);
  const [history, setHistory] = useState<{ pair: IntervalPair; useFlats: boolean }[]>([]);
  const configRef = useRef(loadConfig());
  const currentRef = useRef<IntervalPair | null>(null);
  const useFlatsRef = useRef(false);
  const historyRef = useRef<{ pair: IntervalPair; useFlats: boolean }[]>([]);
  const difficultyRef = useRef<DifficultyRecord>(loadDifficulty());
  const modeTimingRef = useRef<ModeRecord>(loadModeTiming());
  const playStartRef = useRef<number>(0);
  const showAnswerRef = useRef(false);

  // Keep refs in sync
  useEffect(() => {
    currentRef.current = current;
  }, [current]);
  useEffect(() => {
    useFlatsRef.current = useFlats;
  }, [useFlats]);
  useEffect(() => {
    showAnswerRef.current = showAnswer;
  }, [showAnswer]);

  const playCurrentInterval = useCallback((pair: IntervalPair) => {
    ensureAudioReady();
    const config = configRef.current;
    playInterval(pair.note1.midi, pair.note2Midi, pair.mode, config.noteDuration, config.noteDelay, config.waveform);
  }, []);

  const pickFlats = () => Math.random() < 0.5;

  const nextInterval = useCallback(() => {
    ensureAudioReady();
    const config = configRef.current;

    // If there's a current interval, show the answer interstitial
    if (currentRef.current && !showAnswerRef.current) {
      // Record response time for adaptive difficulty
      if (config.adaptiveDifficulty && playStartRef.current > 0) {
        const duration = (Date.now() - playStartRef.current) / 1000;
        const prev = currentRef.current;

        // Record raw mode timing
        modeTimingRef.current = recordModeDuration(
          modeTimingRef.current,
          prev.mode,
          duration
        );
        saveModeTiming(modeTimingRef.current);

        // Apply mode correction factor before recording interval difficulty
        const correction = modeCorrectionFactor(modeTimingRef.current, prev.mode);
        const correctedDuration = duration * correction;

        difficultyRef.current = recordDuration(
          difficultyRef.current,
          prev.note1.string,
          prev.interval,
          correctedDuration
        );
        saveDifficulty(difficultyRef.current);
      }

      const flats = useFlatsRef.current;
      const prev = currentRef.current;
      setLastAnswer({
        name: getIntervalName(prev.interval),
        note1: formatNoteName(prev.note1.midi, flats),
        note2: formatIntervalNoteName(prev.note1.midi, prev.note2Midi, prev.interval, flats),
        mode: prev.mode,
        pair: prev,
      });
      setShowAnswer(true);
      stopAll();
      return;
    }

    // Dismiss interstitial and advance
    setShowAnswer(false);

    // Save current to history for back button
    if (currentRef.current) {
      const newHistory = [...historyRef.current, { pair: currentRef.current!, useFlats: useFlatsRef.current }];
      historyRef.current = newHistory;
      setHistory(newHistory);
    }

    // Compute weights for biased selection if adaptive difficulty is on
    const weights = config.adaptiveDifficulty
      ? computeIntervalWeights(difficultyRef.current, config.allowedIntervals)
      : undefined;

    const pair = generateInterval(config.allowedModes, config.allowedIntervals, weights, {
      maxFretJump: config.maxFretJump, minFret: config.minFret, maxFret: config.maxFret,
    });
    const flats = pickFlats();
    setCurrent(pair);
    currentRef.current = pair;
    setUseFlats(flats);
    useFlatsRef.current = flats;
    setCount((c) => c + 1);

    playCurrentInterval(pair);
    playStartRef.current = Date.now();
  }, [playCurrentInterval]);

  const goBack = useCallback(() => {
    if (historyRef.current.length === 0) return;
    stopAll();
    ensureAudioReady();
    setShowAnswer(false);
    const newHistory = [...historyRef.current];
    const prev = newHistory.pop()!;
    historyRef.current = newHistory;
    setHistory(newHistory);
    setCurrent(prev.pair);
    currentRef.current = prev.pair;
    setUseFlats(prev.useFlats);
    useFlatsRef.current = prev.useFlats;
    setCount((c) => c - 1);
    playCurrentInterval(prev.pair);
  }, [playCurrentInterval]);

  const repeatInterval = useCallback(() => {
    if (currentRef.current) {
      playCurrentInterval(currentRef.current);
    }
  }, [playCurrentInterval]);

  const handlePedalAction = useCallback(
    (action: "repeat" | "next") => {
      if (action === "next") nextInterval();
      else repeatInterval();
    },
    [nextInterval, repeatInterval]
  );

  // Set up keyboard listener on mount
  useEffect(() => {
    configRef.current = loadConfig();
    const cleanup = setupKeyboardFallback(handlePedalAction);
    return cleanup;
  }, [handlePedalAction]);

  // Generate first interval on mount
  useEffect(() => {
    const config = loadConfig();
    configRef.current = config;
    difficultyRef.current = loadDifficulty();
    modeTimingRef.current = loadModeTiming();
    const weights = config.adaptiveDifficulty
      ? computeIntervalWeights(difficultyRef.current, config.allowedIntervals)
      : undefined;
    const pair = generateInterval(config.allowedModes, config.allowedIntervals, weights, {
      maxFretJump: config.maxFretJump, minFret: config.minFret, maxFret: config.maxFret,
    });
    const flats = pickFlats();
    setCurrent(pair);
    currentRef.current = pair;
    setUseFlats(flats);
    useFlatsRef.current = flats;
    setCount(1);
    // Don't set playStartRef here — no user gesture has occurred yet,
    // so timing would be inflated. It gets set on first real "next".
  }, []);

  // Clean up audio on unmount
  useEffect(() => {
    return () => stopAll();
  }, []);

  const modeLabel = (mode: string) => {
    switch (mode) {
      case "ascending":
        return "↑ Ascending";
      case "descending":
        return "↓ Descending";
      case "harmonic":
        return "⟷ Harmonic";
      default:
        return mode;
    }
  };

  const formatRootDisplay = (pair: IntervalPair, flats: boolean) => {
    const noteName = formatNoteName(pair.note1.midi, flats);
    const stringLabel = `${getStringName(pair.note1.string)} string: ${noteName}`;
    const isAbove12 = pair.note1.fret > 12;
    return isAbove12 ? `${stringLabel} (8va)` : stringLabel;
  };

  return (
    <div className="min-h-dvh bg-gray-950 text-white flex flex-col items-center px-4 py-6 pb-[env(safe-area-inset-bottom,1.5rem)]">
      {/* Answer interstitial overlay */}
      {showAnswer && lastAnswer && (
        <div
          className="fixed inset-0 z-50 bg-gray-950 flex flex-col items-center justify-center gap-6 px-4"
          onClick={nextInterval}
          onTouchEnd={(e) => { e.preventDefault(); nextInterval(); }}
        >
          <p className="text-lg text-gray-500">The interval was:</p>
          <p className="text-5xl font-bold text-amber-400">{lastAnswer.name}</p>
          <p className="text-4xl text-gray-400">
            {lastAnswer.note1}{" "}
            <span className="inline-block">
              {lastAnswer.mode === "ascending" ? "↗" : lastAnswer.mode === "descending" ? "↘" : "→"}
            </span>{" "}
            {lastAnswer.note2}
          </p>
          <div className="w-full mt-2">
            <FretboardDiagram
              rootNote={lastAnswer.pair.note1}
              note2Midi={lastAnswer.pair.note2Midi}
              mode={lastAnswer.mode}
              maxFretJump={configRef.current.maxFretJump}
            />
          </div>
          <p className="text-base text-gray-600 mt-4">Tap anywhere or press any key to continue</p>
        </div>
      )}

      {/* Header */}
      <div className="w-full max-w-lg flex items-center justify-between mb-6">
        <button
          onClick={() => { stopAll(); router.push("/"); }}
          className="text-gray-400 hover:text-white transition-colors text-sm"
        >
          ← Settings
        </button>
        <span className="text-gray-500 text-sm">#{count}</span>
        <div />
      </div>

      {/* Current note info */}
      {current && (
        <div className="w-full max-w-lg flex-1 flex flex-col items-center justify-center gap-6">
          {/* Root note: "4th string: G#" or "4th string: G# (8va)" */}
          <div className="text-center">
            <p className="text-base text-gray-500 mb-3 uppercase tracking-wider">
              Root Note
            </p>
            <p className="text-5xl font-bold">
              {formatRootDisplay(current, useFlats)}
            </p>
          </div>

          {/* Mode indicator */}
          <div className="bg-gray-900 px-6 py-3 rounded-full">
            <p className="text-xl text-blue-400">{modeLabel(current.mode)}</p>
          </div>

          {/* Play button */}
          <button
            onClick={() => playCurrentInterval(current)}
            className="mt-4 px-8 py-4 bg-blue-600 hover:bg-blue-500 rounded-xl text-xl font-semibold transition-colors active:scale-95"
          >
            ▶ Play Interval
          </button>
        </div>
      )}

      {/* Controls */}
      <div className="w-full max-w-lg mt-8 grid grid-cols-3 gap-3">
        <button
          onClick={goBack}
          disabled={history.length === 0}
          className="py-4 bg-gray-800 hover:bg-gray-700 disabled:opacity-30 disabled:hover:bg-gray-800 rounded-xl text-center transition-colors active:scale-95"
        >
          <span className="text-2xl block mb-1">←</span>
          <span className="text-sm text-gray-400">Back</span>
        </button>
        <button
          onClick={repeatInterval}
          className="py-4 bg-gray-800 hover:bg-gray-700 rounded-xl text-center transition-colors active:scale-95"
        >
          <span className="text-2xl block mb-1">⟲</span>
          <span className="text-sm text-gray-400">Repeat</span>
        </button>
        <button
          onClick={nextInterval}
          className="py-4 bg-gray-800 hover:bg-gray-700 rounded-xl text-center transition-colors active:scale-95"
        >
          <span className="text-2xl block mb-1">→</span>
          <span className="text-sm text-gray-400">Next</span>
        </button>
      </div>

      <p className="text-xs text-gray-700 mt-4">
        Keyboard: ↑/← repeat | ↓/→/Space next
      </p>
    </div>
  );
}
