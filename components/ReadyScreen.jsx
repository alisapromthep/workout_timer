"use client";

import { useEffect, useMemo, useState } from "react";
import { estimateWorkoutSeconds } from "../lib/steps";
import { unlockAudio } from "../lib/sound";
import ExerciseCard from "./ExerciseCard";

const UNDO_SECONDS = 5;

// Stable per-exercise ids so React keeps the right card (and its editor)
// attached to the right exercise when the list is reordered or trimmed.
let nextExerciseId = 0;
const newExerciseId = () => `ex-${++nextExerciseId}`;

function withIds(exercises) {
  return exercises.map((ex) => ({
    ...ex,
    name: ex.name || "",
    id: ex.id || newExerciseId(),
  }));
}

function blankExercise() {
  return {
    id: newExerciseId(),
    name: "",
    reps: 10,
    sets: null,
    perSide: false,
    weight: null,
    exerciseSeconds: null,
    restAfter: null,
    cue: null,
  };
}

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

export default function ReadyScreen({ workout, onStart, onBack }) {
  const isSets = workout.style === "sets";
  const [rounds, setRounds] = useState(workout.rounds || 1);
  const [restBetweenRounds, setRestBetweenRounds] = useState(
    workout.restBetweenRounds || 0,
  );
  const [exercises, setExercises] = useState(() => withIds(workout.exercises));
  const [applyToAll, setApplyToAll] = useState(false);
  const [editingId, setEditingId] = useState(null);
  // Last removed exercise and where it was, so "Undo" can put it back.
  const [removed, setRemoved] = useState(null);

  useEffect(() => {
    if (!removed) return;
    const timer = setTimeout(() => setRemoved(null), UNDO_SECONDS * 1000);
    return () => clearTimeout(timer);
  }, [removed]);

  const hasUnnamed = exercises.some((ex) => !ex.name.trim());

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

  function updateExercise(id, patch) {
    setExercises((prev) =>
      prev.map((ex) => (ex.id === id ? { ...ex, ...patch } : ex)),
    );
  }

  function moveExercise(index, delta) {
    setExercises((prev) => {
      const target = index + delta;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function removeExercise(index) {
    const ex = exercises[index];
    setExercises((prev) => prev.filter((_, i) => i !== index));
    if (editingId === ex.id) setEditingId(null);
    setRemoved({ exercise: ex, index });
  }

  function undoRemove() {
    if (!removed) return;
    setExercises((prev) => {
      const next = [...prev];
      next.splice(Math.min(removed.index, next.length), 0, removed.exercise);
      return next;
    });
    setRemoved(null);
  }

  function addExercise() {
    const ex = blankExercise();
    setExercises((prev) => [...prev, ex]);
    setEditingId(ex.id);
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
        {exercises.map((ex, i) => (
          <ExerciseCard
            key={ex.id}
            exercise={ex}
            isSets={isSets}
            rounds={rounds}
            restBetweenRounds={restBetweenRounds}
            editing={editingId === ex.id}
            onChange={(patch) => updateExercise(ex.id, patch)}
            onEdit={() => setEditingId(ex.id)}
            onDoneEditing={() => setEditingId(null)}
            onMoveUp={() => moveExercise(i, -1)}
            onMoveDown={() => moveExercise(i, 1)}
            onRemove={() => removeExercise(i)}
            canMoveUp={i > 0}
            canMoveDown={i < exercises.length - 1}
            canRemove={exercises.length > 1}
          />
        ))}

        <button
          onClick={addExercise}
          className="w-full py-3 rounded-xl border-2 border-dashed border-line text-ink/50 hover:text-ink text-sm font-medium transition-colors"
        >
          + Add exercise
        </button>
      </div>

      {removed && (
        <div className="mt-4 flex items-center justify-between gap-3 bg-ink text-paper rounded-xl px-4 py-2.5 text-sm">
          <span className="min-w-0 truncate">
            Removed {removed.exercise.name.trim() || "exercise"}
          </span>
          <button onClick={undoRemove} className="font-bold text-go shrink-0">
            Undo
          </button>
        </div>
      )}

      {hasUnnamed && (
        <p className="text-rest text-xs mt-4 text-center">
          Give every exercise a name to start.
        </p>
      )}

      <button
        onClick={handleStart}
        disabled={hasUnnamed}
        className="mt-6 w-full py-4 rounded-2xl bg-go text-accentInk font-bold text-base disabled:opacity-30 transition-opacity"
      >
        Start workout
      </button>
    </div>
  );
}
