"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { IntervalMode, INTERVAL_NAMES } from "@/lib/guitar";
import { TrainingConfig, Waveform, loadConfig, saveConfig, DEFAULT_CONFIG } from "@/lib/config";
import { loadDifficulty, clearDifficulty, getAverageTimes, loadModeTiming, clearModeTiming, getModeAverageTimes } from "@/lib/difficulty";

const ALL_MODES: { key: IntervalMode; label: string }[] = [
  { key: "ascending", label: "Ascending" },
  { key: "descending", label: "Descending" },
  { key: "harmonic", label: "Harmonic (simultaneous)" },
];

const INTERVAL_QUICK_SETS: { label: string; intervals: number[] }[] = [
  { label: "1–7 (P5)", intervals: [1, 2, 3, 4, 5, 6, 7] },
  { label: "1–12 (Oct)", intervals: Array.from({ length: 12 }, (_, i) => i + 1) },
  { label: "Jazz Intervals", intervals: [1,2,3,4,5,6,7,8,9,10,11,13,14,17,18,20,21] },
];

export default function Home() {
  const router = useRouter();
  const [config, setConfig] = useState<TrainingConfig>(DEFAULT_CONFIG);
  const [loaded, setLoaded] = useState(false);
  const [difficultyTimes, setDifficultyTimes] = useState<Record<string, number>>({});
  const [modeTimes, setModeTimes] = useState<Record<string, number>>({});
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => {
    setConfig(loadConfig());
    setDifficultyTimes(getAverageTimes(loadDifficulty()));
    setModeTimes(getModeAverageTimes(loadModeTiming()));
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) {
      saveConfig(config);
    }
  }, [config, loaded]);

  const toggleMode = (mode: IntervalMode) => {
    setConfig((prev) => {
      const modes = prev.allowedModes.includes(mode)
        ? prev.allowedModes.filter((m) => m !== mode)
        : [...prev.allowedModes, mode];
      if (modes.length === 0) return prev;
      return { ...prev, allowedModes: modes };
    });
  };

  const canStart = config.allowedModes.length > 0 && config.allowedIntervals.length > 0;

  if (!loaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950 text-white">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">🎸 Interval Trainer</h1>
      <p className="text-gray-400 mb-8 text-center">
        Train your ear to recognize guitar intervals
      </p>

      <div className="w-full max-w-md space-y-6">
        {/* Interval Modes */}
        <section>
          <h2 className="text-lg font-semibold mb-3">Interval Modes</h2>
          <div className="space-y-2">
            {ALL_MODES.map(({ key, label }) => (
              <label
                key={key}
                className="flex items-center gap-3 p-3 bg-gray-900 rounded-lg cursor-pointer hover:bg-gray-800 transition-colors"
              >
                <input
                  type="checkbox"
                  checked={config.allowedModes.includes(key)}
                  onChange={() => toggleMode(key)}
                  className="w-5 h-5 accent-blue-500"
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </section>

        {/* Allowed Intervals */}
        <section>
          <h2 className="text-lg font-semibold mb-3">
            Intervals{" "}
            <span className="text-blue-400 text-sm font-normal">
              ({config.allowedIntervals.length} selected)
            </span>
          </h2>

          <div className="flex flex-wrap gap-2 mb-3">
            <button
              onClick={() =>
                setConfig((prev) => ({
                  ...prev,
                  allowedIntervals: Array.from({ length: 24 }, (_, i) => i + 1),
                }))
              }
              className="text-xs px-3 py-1.5 bg-gray-800 text-gray-300 hover:bg-gray-700 rounded-full transition-colors"
            >
              All
            </button>
            <button
              onClick={() =>
                setConfig((prev) => ({
                  ...prev,
                  allowedIntervals: prev.allowedIntervals.length > 0 ? [] : [1],
                }))
              }
              className="text-xs px-3 py-1.5 bg-gray-800 text-gray-300 hover:bg-gray-700 rounded-full transition-colors"
            >
              None
            </button>
            {INTERVAL_QUICK_SETS.map(({ label, intervals }) => (
              <button
                key={label}
                onClick={() =>
                  setConfig((prev) => ({ ...prev, allowedIntervals: intervals }))
                }
                className={`text-xs px-3 py-1.5 rounded-full transition-colors ${
                  JSON.stringify([...config.allowedIntervals].sort((a, b) => a - b)) ===
                  JSON.stringify(intervals)
                    ? "bg-blue-600 text-white"
                    : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            {Array.from({ length: 24 }, (_, i) => i + 1).map((semitones) => (
              <label
                key={semitones}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                  config.allowedIntervals.includes(semitones)
                    ? "bg-gray-800"
                    : "bg-gray-900 text-gray-500"
                } hover:bg-gray-700`}
              >
                <input
                  type="checkbox"
                  checked={config.allowedIntervals.includes(semitones)}
                  onChange={() =>
                    setConfig((prev) => {
                      const has = prev.allowedIntervals.includes(semitones);
                      return {
                        ...prev,
                        allowedIntervals: has
                          ? prev.allowedIntervals.filter((s) => s !== semitones)
                          : [...prev.allowedIntervals, semitones].sort((a, b) => a - b),
                      };
                    })
                  }
                  className="w-4 h-4 accent-blue-500"
                />
                <span className="text-sm">
                  {INTERVAL_NAMES[semitones] || `${semitones}st`}
                </span>
              </label>
            ))}
          </div>
        </section>

        {/* Note Duration */}
        <section>
          <h2 className="text-lg font-semibold mb-3">
            Note Duration:{" "}
            <span className="text-blue-400">{config.noteDuration.toFixed(1)}s</span>
          </h2>
          <input
            type="range"
            min={0.3}
            max={3.0}
            step={0.1}
            value={config.noteDuration}
            onChange={(e) =>
              setConfig((prev) => ({
                ...prev,
                noteDuration: parseFloat(e.target.value),
              }))
            }
            className="w-full accent-blue-500"
            style={{ touchAction: "pan-y" }}
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>0.3s</span>
            <span>1.5s</span>
            <span>3.0s</span>
          </div>
        </section>

        {/* Note Delay */}
        <section>
          <h2 className="text-lg font-semibold mb-3">
            Delay Between Notes:{" "}
            <span className="text-blue-400">{config.noteDelay.toFixed(1)}s</span>
          </h2>
          <input
            type="range"
            min={0.1}
            max={2.0}
            step={0.1}
            value={config.noteDelay}
            onChange={(e) =>
              setConfig((prev) => ({
                ...prev,
                noteDelay: parseFloat(e.target.value),
              }))
            }
            className="w-full accent-blue-500"
            style={{ touchAction: "pan-y" }}
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>0.1s</span>
            <span>1.0s</span>
            <span>2.0s</span>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Only applies to ascending &amp; descending modes
          </p>
        </section>

        {/* Fret Range */}
        <section>
          <h2 className="text-lg font-semibold mb-3">
            Minimum Fret:{" "}
            <span className="text-blue-400">{config.minFret}</span>
          </h2>
          <input
            type="range"
            min={0}
            max={23}
            value={config.minFret}
            onChange={(e) => {
              const v = parseInt(e.target.value);
              setConfig((prev) => ({
                ...prev,
                minFret: v,
                maxFret: Math.max(prev.maxFret, v + 1),
              }));
            }}
            className="w-full accent-blue-500"
            style={{ touchAction: "pan-y" }}
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>0</span>
            <span>12</span>
            <span>23</span>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">
            Maximum Fret:{" "}
            <span className="text-blue-400">{config.maxFret}</span>
          </h2>
          <input
            type="range"
            min={1}
            max={24}
            value={config.maxFret}
            onChange={(e) => {
              const v = parseInt(e.target.value);
              setConfig((prev) => ({
                ...prev,
                maxFret: v,
                minFret: Math.min(prev.minFret, v - 1),
              }));
            }}
            className="w-full accent-blue-500"
            style={{ touchAction: "pan-y" }}
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>1</span>
            <span>12</span>
            <span>24</span>
          </div>
        </section>

        {/* Max Fret Jump */}
        <section>
          <h2 className="text-lg font-semibold mb-3">
            Max Fret Jump:{" "}
            <span className="text-blue-400">{config.maxFretJump} frets</span>
          </h2>
          <input
            type="range"
            min={1}
            max={24}
            value={config.maxFretJump}
            onChange={(e) =>
              setConfig((prev) => ({
                ...prev,
                maxFretJump: parseInt(e.target.value),
              }))
            }
            className="w-full accent-blue-500"
            style={{ touchAction: "pan-y" }}
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>1</span>
            <span>12</span>
            <span>24</span>
          </div>
        </section>

        {/* Waveform */}
        <section>
          <h2 className="text-lg font-semibold mb-3">Waveform</h2>
          <div className="flex flex-wrap gap-2">
            {(["pluck", "sine", "triangle", "square", "sawtooth"] as Waveform[]).map((w) => (
              <button
                key={w}
                onClick={() => setConfig((prev) => ({ ...prev, waveform: w }))}
                className={`text-sm px-4 py-2 rounded-lg transition-colors capitalize ${
                  config.waveform === w
                    ? "bg-blue-600 text-white"
                    : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                }`}
              >
                {w}
              </button>
            ))}
          </div>
        </section>

        {/* Adaptive Difficulty */}
        <section>
          <label className="flex items-center gap-3 p-3 bg-gray-900 rounded-lg cursor-pointer hover:bg-gray-800 transition-colors">
            <input
              type="checkbox"
              checked={config.adaptiveDifficulty}
              onChange={() =>
                setConfig((prev) => ({
                  ...prev,
                  adaptiveDifficulty: !prev.adaptiveDifficulty,
                }))
              }
              className="w-5 h-5 accent-blue-500"
            />
            <div>
              <span className="font-semibold">Adaptive Difficulty</span>
              <p className="text-xs text-gray-500 mt-0.5">
                Bias toward intervals you take longer to identify
              </p>
            </div>
          </label>
        </section>

        {/* Response Time Bar Graphs */}
        {(Object.keys(difficultyTimes).length > 0 || Object.keys(modeTimes).length > 0) && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">Response Times</h2>
              {!confirmClear ? (
                <button
                  onClick={() => setConfirmClear(true)}
                  className="text-xs px-3 py-1.5 bg-gray-800 text-gray-400 hover:bg-gray-700 rounded-lg transition-colors"
                >
                  Clear Data
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      clearDifficulty();
                      clearModeTiming();
                      setDifficultyTimes({});
                      setModeTimes({});
                      setConfirmClear(false);
                    }}
                    className="text-xs px-3 py-1.5 bg-red-700 hover:bg-red-600 text-white rounded-lg transition-colors"
                  >
                    Yes, clear
                  </button>
                  <button
                    onClick={() => setConfirmClear(false)}
                    className="text-xs px-3 py-1.5 bg-gray-800 text-gray-400 hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
            <div className="bg-gray-900 rounded-lg p-4 space-y-2">
              {(() => {
                // Group by interval, show max across strings
                const byInterval = new Map<number, number>();
                for (const [key, avg] of Object.entries(difficultyTimes)) {
                  const interval = parseInt(key.split(":")[1]);
                  const cur = byInterval.get(interval) ?? 0;
                  if (avg > cur) byInterval.set(interval, avg);
                }
                const sorted = [...byInterval.entries()].sort((a, b) => a[0] - b[0]);
                const maxTime = Math.max(...sorted.map(([, v]) => v), 1);
                return sorted.map(([interval, avg]) => (
                  <div key={interval} className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 w-24 shrink-0 truncate">
                      {INTERVAL_NAMES[interval] ?? `${interval}st`}
                    </span>
                    <div className="flex-1 h-4 bg-gray-800 rounded overflow-hidden">
                      <div
                        className="h-full bg-amber-500 rounded transition-all"
                        style={{ width: `${(avg / maxTime) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500 w-10 text-right">
                      {avg.toFixed(1)}s
                    </span>
                  </div>
                ));
              })()}
            </div>

            {/* Mode Response Times */}
            {Object.keys(modeTimes).length > 0 && (
              <>
                <h3 className="text-sm font-semibold text-gray-400 mt-4 mb-2">By Mode</h3>
                <div className="bg-gray-900 rounded-lg p-4 space-y-2">
                  {(() => {
                    const modeLabels: Record<string, string> = {
                      ascending: "Ascending",
                      descending: "Descending",
                      harmonic: "Harmonic",
                    };
                    const entries = Object.entries(modeTimes).sort((a, b) => a[0].localeCompare(b[0]));
                    const maxTime = Math.max(...entries.map(([, v]) => v), 1);
                    return entries.map(([mode, avg]) => (
                      <div key={mode} className="flex items-center gap-2">
                        <span className="text-xs text-gray-400 w-24 shrink-0">
                          {modeLabels[mode] ?? mode}
                        </span>
                        <div className="flex-1 h-4 bg-gray-800 rounded overflow-hidden">
                          <div
                            className="h-full bg-blue-500 rounded transition-all"
                            style={{ width: `${(avg / maxTime) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 w-10 text-right">
                          {avg.toFixed(1)}s
                        </span>
                      </div>
                    ));
                  })()}
                </div>
              </>
            )}
          </section>
        )}

        {/* Start Button */}
        <button
          onClick={() => router.push("/train")}
          disabled={!canStart}
          className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 rounded-xl text-xl font-bold transition-colors mt-4"
        >
          Start Training
        </button>

        <p className="text-xs text-gray-600 text-center">
          Use a Bluetooth page turner pedal or arrow keys to control the session.
          <br />
          ← Repeat interval &nbsp;|&nbsp; → Next interval
        </p>
      </div>
    </div>
  );
}
