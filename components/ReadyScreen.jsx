"use client";

import { useMemo, useState } from "react";
import { estimateWorkoutSeconds } from "../lib/steps";
import { unlockAudio } from "../lib/sound";

function formatEstimate(totalSeconds) {
  const mins = Math.round(totalSeconds / 60);
  if (mins < 1) return `${totalSeconds}s`;
  return `~${mins} min`;
}

function StepperRow({
  label,
  value,
  onChange,
  min = 0,
  step = 5,
  suffix = "s",
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-line">
      <span className="text-ink/70 text-sm">{label}</span>
      <div className="flex items-center gap-3">
        <button
          onClick={() => onChange(Math.max(min, value - step))}
          className="w-8 h-8 rounded-full bg-surface text-ink text-lg leading-none flex items-center justify-center"
        >
          −
        </button>
        <span className="font-mono text-ink w-14 text-center tabular-nums">
          {value}
          {suffix}
        </span>
        <button
          onClick={() => onChange(value + step)}
          className="w-8 h-8 rounded-full bg-surface text-ink text-lg leading-none flex items-center justify-center"
        >
          +
        </button>
      </div>
    </div>
  );
}

export default function ReadyScreen({ workout, onStart, onBack }) {
  const [rounds, setRounds] = useState(workout.rounds || 1);
  const [restBetweenRounds, setRestBetweenRounds] = useState(
    workout.restBetweenRounds || 0,
  );

  const estimatedSeconds = useMemo(
    () =>
      estimateWorkoutSeconds({
        ...workout,
        rounds,
        restBetweenRounds: restBetweenRounds || null,
      }),
    [workout, rounds, restBetweenRounds],
  );

  function handleStart() {
    unlockAudio();
    onStart({
      ...workout,
      rounds,
      restBetweenRounds: restBetweenRounds || null,
    });
  }

  return (
    <div className="min-h-screen flex flex-col px-6 py-10 max-w-md mx-auto">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-ink/50 text-sm mb-6 self-start"
      >
        <span aria-hidden>🏠</span> Edit prompt
      </button>

      <h1 className="text-2xl font-bold text-ink mb-1">
        {workout.title || "Your workout"}
      </h1>
      <p className="text-ink/50 text-sm mb-1">
        {workout.style === "sets" ? "Straight sets" : "Circuit"} ·{" "}
        {workout.exercises.length} moves
      </p>
      <p className="text-ink/40 text-xs mb-6 font-mono">
        Estimated time: {formatEstimate(estimatedSeconds)}
      </p>

      <div className="mb-2">
        <StepperRow
          label={workout.style === "sets" ? "Rounds per move" : "Rounds"}
          value={rounds}
          onChange={setRounds}
          min={1}
          step={1}
          suffix=""
        />
        <StepperRow
          label={
            workout.style === "sets"
              ? "Rest between sets"
              : "Rest between rounds"
          }
          value={restBetweenRounds}
          onChange={setRestBetweenRounds}
          min={0}
          step={5}
        />
      </div>

      <div className="flex-1 overflow-y-auto -mx-6 px-6 mt-4 space-y-2">
        {workout.exercises.map((ex, i) => {
          const exSets = ex.sets || rounds;
          const exRest = ex.restAfter || restBetweenRounds;
          return (
            <div key={i} className="bg-surface rounded-xl px-4 py-3">
              <div className="flex items-baseline justify-between">
                <span className="text-ink font-medium text-[15px]">
                  {ex.name}
                </span>
                <span className="font-mono text-ink/60 text-xs">
                  {ex.exerciseSeconds
                    ? `${ex.exerciseSeconds}s`
                    : `${ex.reps || "—"} reps${ex.perSide ? "/side" : ""}`}
                </span>
              </div>
              {(ex.weight || ex.cue) && (
                <p className="text-ink/40 text-xs mt-1">
                  {[ex.weight, ex.cue].filter(Boolean).join(" · ")}
                </p>
              )}
              {workout.style === "sets" ? (
                exSets > 1 && (
                  <p className="text-ink/40 text-xs mt-1">
                    × {exSets} sets
                    {exRest ? `, ${exRest}s rest between` : ""}
                  </p>
                )
              ) : ex.restAfter ? (
                <p className="text-rest/70 text-xs mt-1">
                  +{ex.restAfter}s rest before next move
                </p>
              ) : null}
            </div>
          );
        })}
      </div>

      <button
        onClick={handleStart}
        className="mt-6 w-full py-4 rounded-2xl bg-go text-accentInk font-bold text-base"
      >
        Start workout
      </button>
    </div>
  );
}
