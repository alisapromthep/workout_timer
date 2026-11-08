"use client";

import { useEffect, useRef, useState } from "react";
import { playBell, playTick } from "../lib/sound";
import ProgressRail from "./ProgressRail";

const REST_ADJUST = 15;
const FINAL_TICK_SECONDS = 3;
const MIN_TIMED_SECONDS_FOR_FINAL_TICK = 5;

function ProgressLabel({ step }) {
  if (step.type === "move" || step.type === "rest") {
    if (step.totalRounds > 1) {
      return (
        <p className="text-accentInk/50 text-sm font-medium tracking-wide uppercase">
          Round {step.round} / {step.totalRounds}
        </p>
      );
    }
  }
  return null;
}

// Looks ahead in the step list to find the next actual move, so we can
// show a "Next up" preview (name + weight) during the current move or rest.
function findNextMove(steps, index) {
  for (let i = index + 1; i < steps.length; i++) {
    if (steps[i].type === "move") return steps[i].exercise;
    if (steps[i].type === "done") return null;
  }
  return null;
}

function nameWithWeight(exercise) {
  return [exercise.name, exercise.weight].filter(Boolean).join(" · ");
}

// Turns the step being left into a summary log entry. Countdown steps
// aren't logged — they're just the 5s transition, not a tracked activity.
function buildLogEntry(step, actualSeconds, adjustment, note) {
  if (step.type === "move") {
    return {
      type: "move",
      name: step.exercise.name,
      timed: step.timed,
      plannedSeconds: step.timed ? step.seconds : null,
      plannedReps: step.timed ? null : step.exercise.reps,
      actualSeconds,
      round: step.round,
      totalRounds: step.totalRounds,
    };
  }
  if (step.type === "rest") {
    return {
      type: "rest",
      label: step.label,
      plannedSeconds: step.seconds,
      actualSeconds,
      adjustment,
      note: note.trim(),
    };
  }
  return null;
}

export default function TimerScreen({ steps, onFinish, onExit }) {
  const [index, setIndex] = useState(0);
  const [seconds, setSeconds] = useState(() => initialSeconds(steps[0]));
  const [paused, setPaused] = useState(false);
  const [note, setNote] = useState("");
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const intervalRef = useRef(null);
  const stepStartRef = useRef(Date.now());
  const noteRef = useRef("");
  const adjustmentRef = useRef(0);
  const logRef = useRef([]);

  const step = steps[index];

  function initialSecondsFor(s) {
    if (s.type === "countdown") return s.seconds;
    if (s.type === "rest") return s.seconds;
    if (s.type === "move" && s.timed) return s.seconds;
    return null;
  }

  function initialSeconds(s) {
    return initialSecondsFor(s);
  }

  // Reset per-step trackers every time we land on a new step.
  useEffect(() => {
    stepStartRef.current = Date.now();
    adjustmentRef.current = 0;
    noteRef.current = "";
    setNote("");
  }, [index]);

  // Bell when a move or rest actually starts.
  useEffect(() => {
    const current = steps[index];
    if (current && (current.type === "move" || current.type === "rest")) {
      playBell();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  // Tick each second during the "get ready" countdown.
  useEffect(() => {
    if (steps[index]?.type === "countdown" && seconds !== null) {
      playTick();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, seconds]);

  // Tick during the final few seconds of a timed move, so long enough
  // exercises get a "wrap it up" cue without ticking through short ones.
  useEffect(() => {
    const current = steps[index];
    if (
      current?.type === "move" &&
      current.timed &&
      current.seconds >= MIN_TIMED_SECONDS_FOR_FINAL_TICK &&
      seconds > 0 &&
      seconds <= FINAL_TICK_SECONDS
    ) {
      playTick();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, seconds]);

  function adjustRest(delta) {
    setSeconds((s) => Math.max(0, s + delta));
    adjustmentRef.current += delta;
  }

  function handleNoteChange(e) {
    setNote(e.target.value);
    noteRef.current = e.target.value;
  }

  // advance to a given step index, logging the step we're leaving first
  function goTo(nextIndex) {
    const leaving = steps[index];
    const actualSeconds = Math.round(
      (Date.now() - stepStartRef.current) / 1000,
    );
    const entry = buildLogEntry(
      leaving,
      actualSeconds,
      adjustmentRef.current,
      noteRef.current,
    );
    if (entry) logRef.current = [...logRef.current, entry];

    if (nextIndex >= steps.length || steps[nextIndex]?.type === "done") {
      onFinish(logRef.current);
      return;
    }
    setIndex(nextIndex);
    setSeconds(initialSecondsFor(steps[nextIndex]));
  }

  function finishEarly() {
    setShowEndConfirm(false);
    clearInterval(intervalRef.current);
    goTo(steps.length);
  }

  useEffect(() => {
    if (seconds === null) return; // rep-based move: no auto timer
    if (paused) return;

    intervalRef.current = setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          clearInterval(intervalRef.current);
          goTo(index + 1);
          return 0;
        }
        return s - 1;
      });
    }, 1000);

    return () => clearInterval(intervalRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, paused]);

  if (!step || step.type === "done") return null;

  const bg =
    step.type === "countdown"
      ? "bg-ready"
      : step.type === "rest"
        ? "bg-rest"
        : "bg-go";
  const nextMove = findNextMove(steps, index);

  return (
    <div
      className={`min-h-screen flex ${bg} transition-colors duration-300`}
    >
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="max-w-md md:max-w-2xl lg:max-w-3xl w-full mx-auto flex flex-col flex-1 px-6 md:px-10 py-8 md:py-12">
          <div className="flex items-center justify-between mb-8">
            <button
              onClick={onExit}
              aria-label="Exit workout"
              className="text-accentInk/50 text-sm md:text-base font-medium"
            >
              🏠
            </button>
            <ProgressLabel step={step} />
            <button
              onClick={() => setPaused((p) => !p)}
              className="text-accentInk/50 text-sm md:text-base font-medium"
            >
              {paused ? "Resume" : "Pause"}
            </button>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center text-center">
            {step.type === "countdown" && (
              <>
                <p className="text-accentInk/60 text-base md:text-xl mb-2">Get ready</p>
                <p className="font-mono text-8xl md:text-9xl lg:text-[10rem] font-bold text-accentInk tabular-nums">
                  {seconds}
                </p>
                <p className="text-accentInk/70 text-lg md:text-2xl font-medium mt-4">
                  {step.next && nameWithWeight(step.next)}
                </p>
              </>
            )}

            {step.type === "move" && (
              <>
                <p className="text-accentInk/60 text-sm md:text-base mb-2">
                  Move {step.index} / {step.total}
                </p>
                <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-accentInk mb-4 px-4">
                  {step.exercise.name}
                </h2>

                {step.timed ? (
                  <p className="font-mono text-8xl md:text-9xl lg:text-[10rem] font-bold text-accentInk tabular-nums">
                    {seconds}
                  </p>
                ) : (
                  <p className="font-mono text-7xl md:text-8xl lg:text-9xl font-bold text-accentInk tabular-nums">
                    {step.exercise.reps ?? "—"}
                    <span className="text-2xl md:text-3xl font-display font-medium ml-2">
                      reps{step.exercise.perSide ? "/side" : ""}
                    </span>
                  </p>
                )}

                {(step.exercise.weight || step.exercise.cue) && (
                  <p className="text-accentInk/60 text-sm md:text-base mt-4 max-w-xs md:max-w-md px-4">
                    {[step.exercise.weight, step.exercise.cue]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                )}
              </>
            )}

            {step.type === "rest" && (
              <>
                <p className="text-accentInk/70 text-base md:text-xl mb-2">{step.label}</p>
                <p className="font-mono text-8xl md:text-9xl lg:text-[10rem] font-bold text-accentInk tabular-nums">
                  {seconds}
                </p>
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => adjustRest(-REST_ADJUST)}
                    className="px-4 py-2 md:px-5 md:py-2.5 rounded-full bg-accentInk/10 text-accentInk text-sm md:text-base font-medium"
                  >
                    −{REST_ADJUST}s
                  </button>
                  <button
                    onClick={() => adjustRest(REST_ADJUST)}
                    className="px-4 py-2 md:px-5 md:py-2.5 rounded-full bg-accentInk/10 text-accentInk text-sm md:text-base font-medium"
                  >
                    +{REST_ADJUST}s
                  </button>
                </div>
                <textarea
                  value={note}
                  onChange={handleNoteChange}
                  placeholder="Notes: how it felt, weight used, adjustments..."
                  rows={2}
                  className="mt-6 w-full max-w-xs md:max-w-md bg-accentInk/10 placeholder:text-accentInk/40 text-accentInk rounded-xl p-3 text-sm md:text-base outline-none resize-none"
                />
              </>
            )}

            {nextMove && step.type !== "countdown" && (
              <p className="text-accentInk/50 text-xs md:text-sm mt-8 tracking-wide uppercase">
                Next: {nameWithWeight(nextMove)}
              </p>
            )}
          </div>

          <button
            onClick={() => goTo(index + 1)}
            className="w-full py-4 md:py-5 rounded-2xl bg-accentInk text-accentPaper font-bold text-base md:text-lg"
          >
            {step.type === "move" && !step.timed ? "Done" : "Skip"}
          </button>
          <button
            onClick={() => setShowEndConfirm(true)}
            className="w-full py-3 text-accentInk/50 text-sm md:text-base font-medium mt-1"
          >
            Finish early
          </button>
        </div>
      </div>

      <ProgressRail steps={steps} index={index} />

      {showEndConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center px-6 z-50">
          <div className="bg-paper rounded-2xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold text-ink mb-2">End session?</h3>
            <p className="text-ink/60 text-sm mb-6">
              This will end the workout now. Your progress so far will be
              saved in the summary.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowEndConfirm(false)}
                className="flex-1 py-3 rounded-xl bg-surface text-ink font-medium text-sm"
              >
                Cancel
              </button>
              <button
                onClick={finishEarly}
                className="flex-1 py-3 rounded-xl bg-rest text-accentInk font-bold text-sm"
              >
                End session
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
