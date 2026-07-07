"use client";

import { useEffect, useRef, useState } from "react";

const REST_ADJUST = 15;

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

// Looks ahead in the step list to find the name of the next actual move,
// so we can show a "Next up" preview during the current move or rest.
function findNextMoveName(steps, index) {
  for (let i = index + 1; i < steps.length; i++) {
    if (steps[i].type === "move") return steps[i].exercise.name;
    if (steps[i].type === "done") return null;
  }
  return null;
}

export default function TimerScreen({ steps, onFinish, onExit }) {
  const [index, setIndex] = useState(0);
  const [seconds, setSeconds] = useState(() => initialSeconds(steps[0]));
  const [paused, setPaused] = useState(false);
  const intervalRef = useRef(null);

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

  function goTo(nextIndex) {
    if (nextIndex >= steps.length) {
      onFinish();
      return;
    }
    setIndex(nextIndex);
    setSeconds(initialSecondsFor(steps[nextIndex]));
  }

  useEffect(() => {
    if (step.type === "done") {
      onFinish();
      return;
    }
    if (seconds === null) return;
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
  const nextMoveName = findNextMoveName(steps, index);

  return (
    <div
      className={`min-h-screen flex flex-col ${bg} transition-colors duration-300`}
    >
      <div className="max-w-md w-full mx-auto flex flex-col flex-1 px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={onExit}
            aria-label="Exit workout"
            className="text-accentInk/50 text-sm font-medium"
          >
            🏠
          </button>
          <ProgressLabel step={step} />
          <button
            onClick={() => setPaused((p) => !p)}
            className="text-accentInk/50 text-sm font-medium"
          >
            {paused ? "Resume" : "Pause"}
          </button>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center text-center">
          {step.type === "countdown" && (
            <>
              <p className="text-accentInk/60 text-base mb-2">Get ready</p>
              <p className="font-mono text-8xl font-bold text-accentInk tabular-nums">
                {seconds}
              </p>
              <p className="text-accentInk/70 text-lg font-medium mt-4">
                {step.next?.name}
              </p>
            </>
          )}

          {step.type === "move" && (
            <>
              <p className="text-accentInk/60 text-sm mb-2">
                Move {step.index} / {step.total}
              </p>
              <h2 className="text-3xl font-bold text-accentInk mb-4 px-4">
                {step.exercise.name}
              </h2>

              {step.timed ? (
                <p className="font-mono text-8xl font-bold text-accentInk tabular-nums">
                  {seconds}
                </p>
              ) : (
                <p className="font-mono text-7xl font-bold text-accentInk tabular-nums">
                  {step.exercise.reps ?? "—"}
                  <span className="text-2xl font-display font-medium ml-2">
                    reps{step.exercise.perSide ? "/side" : ""}
                  </span>
                </p>
              )}

              {(step.exercise.weight || step.exercise.cue) && (
                <p className="text-accentInk/60 text-sm mt-4 max-w-xs px-4">
                  {[step.exercise.weight, step.exercise.cue]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              )}
            </>
          )}

          {step.type === "rest" && (
            <>
              <p className="text-accentInk/70 text-base mb-2">{step.label}</p>
              <p className="font-mono text-8xl font-bold text-accentInk tabular-nums">
                {seconds}
              </p>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() =>
                    setSeconds((s) => Math.max(0, s - REST_ADJUST))
                  }
                  className="px-4 py-2 rounded-full bg-accentInk/10 text-accentInk text-sm font-medium"
                >
                  −{REST_ADJUST}s
                </button>
                <button
                  onClick={() => setSeconds((s) => s + REST_ADJUST)}
                  className="px-4 py-2 rounded-full bg-accentInk/10 text-accentInk text-sm font-medium"
                >
                  +{REST_ADJUST}s
                </button>
              </div>
            </>
          )}

          {nextMoveName && step.type !== "countdown" && (
            <p className="text-accentInk/50 text-xs mt-8 tracking-wide uppercase">
              Next: {nextMoveName}
            </p>
          )}
        </div>

        <button
          onClick={() => goTo(index + 1)}
          className="w-full py-4 rounded-2xl bg-accentInk text-accentPaper font-bold text-base"
        >
          {step.type === "move" && !step.timed ? "Done" : "Skip"}
        </button>
      </div>
    </div>
  );
}
