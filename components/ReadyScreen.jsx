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
  disabled = false,
}) {
  return (
    <div
      className={`flex items-center justify-between py-3 border-b border-line ${
        disabled ? "opacity-40" : ""
      }`}
    >
      <span className="text-ink/70 text-sm">{label}</span>
      <div className="flex items-center gap-3">
        <button
          onClick={() => onChange(Math.max(min, value - step))}
          disabled={disabled}
          className="w-8 h-8 rounded-full bg-surface text-ink text-lg leading-none flex items-center justify-center disabled:cursor-not-allowed"
        >
          −
        </button>
        <span className="font-mono text-ink w-14 text-center tabular-nums">
          {value}
          {suffix}
        </span>
        <button
          onClick={() => onChange(value + step)}
          disabled={disabled}
          className="w-8 h-8 rounded-full bg-surface text-ink text-lg leading-none flex items-center justify-center disabled:cursor-not-allowed"
        >
          +
        </button>
      </div>
    </div>
  );
}

// Compact stepper used inside each exercise card.
function MiniStepper({ label, value, onChange, min = 0, step = 1, suffix = "" }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-ink/40 text-[10px] uppercase tracking-wide">
        {label}
      </span>
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onChange(Math.max(min, value - step))}
          className="w-6 h-6 rounded-full bg-paper text-ink text-sm leading-none flex items-center justify-center"
        >
          −
        </button>
        <span className="font-mono text-ink text-xs w-9 text-center tabular-nums">
          {value}
          {suffix}
        </span>
        <button
          onClick={() => onChange(value + step)}
          className="w-6 h-6 rounded-full bg-paper text-ink text-sm leading-none flex items-center justify-center"
        >
          +
        </button>
      </div>
    </div>
  );
}

export default function ReadyScreen({ workout, onStart, onBack }) {
  const isSets = workout.style === "sets";
  const [rounds, setRounds] = useState(workout.rounds || 1);
  const [restBetweenRounds, setRestBetweenRounds] = useState(
    workout.restBetweenRounds || 0,
  );
  const [exercises, setExercises] = useState(workout.exercises);
  const [applyToAll, setApplyToAll] = useState(false);

  // In sets style, an exercise's own "sets"/"restAfter" override the
  // workout-wide values, so the top controls would silently do nothing for
  // those exercises. Lock them unless the user opts into overwriting.
  const hasPerExercise =
    isSets && exercises.some((ex) => ex.sets != null || ex.restAfter != null);
  const globalLocked = hasPerExercise && !applyToAll;

  const finalWorkout = useMemo(
    () => ({
      ...workout,
      exercises,
      rounds,
      restBetweenRounds: restBetweenRounds || null,
    }),
    [workout, exercises, rounds, restBetweenRounds],
  );

  const estimatedSeconds = useMemo(
    () => estimateWorkoutSeconds(finalWorkout),
    [finalWorkout],
  );

  function updateExercise(index, patch) {
    setExercises((prev) =>
      prev.map((ex, i) => (i === index ? { ...ex, ...patch } : ex)),
    );
  }

  function handleRoundsChange(value) {
    setRounds(value);
    if (hasPerExercise) {
      setExercises((prev) => prev.map((ex) => ({ ...ex, sets: value })));
    }
  }

  function handleRestChange(value) {
    setRestBetweenRounds(value);
    if (hasPerExercise) {
      setExercises((prev) => prev.map((ex) => ({ ...ex, restAfter: value })));
    }
  }

  function handleStart() {
    unlockAudio();
    onStart(finalWorkout);
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
        {isSets ? "Straight sets" : "Circuit"} · {exercises.length} moves
      </p>
      <p className="text-ink/40 text-xs mb-6 font-mono">
        Estimated time: {formatEstimate(estimatedSeconds)}
      </p>

      {hasPerExercise && (
        <div className="mb-2">
          <label className="flex items-center justify-between gap-3 cursor-pointer">
            <span className="text-ink/70 text-sm">Apply to all exercises</span>
            <button
              role="switch"
              aria-checked={applyToAll}
              onClick={() => setApplyToAll((v) => !v)}
              className={`relative w-10 h-6 rounded-full transition-colors shrink-0 ${
                applyToAll ? "bg-go" : "bg-surface"
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-ink/80 transition-transform ${
                  applyToAll ? "translate-x-4" : ""
                }`}
              />
            </button>
          </label>
          <p className="text-rest text-xs mt-1">
            {applyToAll
              ? "⚠ Changes below will overwrite the sets and rest of every exercise."
              : "Exercises have their own sets/rest. Turn on to change them all at once."}
          </p>
        </div>
      )}

      <div className="mb-2">
        <StepperRow
          label={isSets ? "Rounds per move" : "Rounds"}
          value={rounds}
          onChange={handleRoundsChange}
          min={1}
          step={1}
          suffix=""
          disabled={globalLocked}
        />
        <StepperRow
          label={isSets ? "Rest between sets" : "Rest between rounds"}
          value={restBetweenRounds}
          onChange={handleRestChange}
          min={0}
          step={5}
          disabled={globalLocked}
        />
      </div>

      <div className="flex-1 overflow-y-auto -mx-6 px-6 mt-4 space-y-2">
        {exercises.map((ex, i) => {
          const timed = ex.exerciseSeconds > 0;
          const exSets = ex.sets || rounds;
          const exRest = ex.restAfter ?? restBetweenRounds;
          return (
            <div key={i} className="bg-surface rounded-xl px-4 py-3">
              <div className="flex items-baseline justify-between">
                <span className="text-ink font-medium text-[15px]">
                  {ex.name}
                </span>
                {ex.perSide && !timed && (
                  <span className="text-ink/40 text-xs">per side</span>
                )}
              </div>
              {(ex.weight || ex.cue) && (
                <p className="text-ink/40 text-xs mt-1">
                  {[ex.weight, ex.cue].filter(Boolean).join(" · ")}
                </p>
              )}
              <div className="flex justify-between mt-3">
                {isSets && (
                  <MiniStepper
                    label="Sets"
                    value={exSets}
                    onChange={(v) => updateExercise(i, { sets: v })}
                    min={1}
                  />
                )}
                {timed ? (
                  <MiniStepper
                    label="Time"
                    value={ex.exerciseSeconds}
                    onChange={(v) => updateExercise(i, { exerciseSeconds: v })}
                    min={5}
                    step={5}
                    suffix="s"
                  />
                ) : (
                  <MiniStepper
                    label="Reps"
                    value={ex.reps || 0}
                    onChange={(v) => updateExercise(i, { reps: v })}
                    min={1}
                  />
                )}
                <MiniStepper
                  label={isSets ? "Rest" : "Rest after"}
                  value={isSets ? exRest : ex.restAfter || 0}
                  onChange={(v) => updateExercise(i, { restAfter: v })}
                  min={0}
                  step={5}
                  suffix="s"
                />
              </div>
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
