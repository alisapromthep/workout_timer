"use client";

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

function IconButton({ label, onClick, disabled = false, children }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="w-7 h-7 rounded-full text-ink/50 hover:text-ink hover:bg-paper text-sm leading-none flex items-center justify-center disabled:opacity-20 disabled:hover:bg-transparent disabled:cursor-not-allowed"
    >
      {children}
    </button>
  );
}

const inputClass =
  "w-full bg-paper rounded-lg px-3 py-2 text-sm text-ink placeholder:text-ink/30 outline-none focus:ring-2 focus:ring-go/60";

// Inline form for the fields the steppers don't cover. Changes apply as the
// user types; "Done" just closes the form.
function ExerciseEditor({ exercise, onChange, onDone }) {
  const timed = exercise.exerciseSeconds > 0;

  // Switching type keeps the other kind's value out of the way so the timer
  // and estimate treat the move as exactly one kind.
  function setTimed(nextTimed) {
    if (nextTimed === timed) return;
    onChange(
      nextTimed
        ? { exerciseSeconds: 30, reps: null, perSide: false }
        : { reps: 10, exerciseSeconds: null },
    );
  }

  return (
    <div className="mt-3 space-y-2.5">
      <input
        autoFocus
        value={exercise.name}
        onChange={(e) => onChange({ name: e.target.value })}
        placeholder="Exercise name"
        className={inputClass}
      />

      <div className="flex items-center gap-2">
        {[
          ["Reps", false],
          ["Timed", true],
        ].map(([label, value]) => (
          <button
            key={label}
            onClick={() => setTimed(value)}
            className={`flex-1 py-1.5 rounded-full text-xs font-medium transition-colors ${
              timed === value ? "bg-go text-accentInk" : "bg-paper text-ink/60"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {!timed && (
        <label className="flex items-center gap-2 text-ink/70 text-xs cursor-pointer">
          <input
            type="checkbox"
            checked={!!exercise.perSide}
            onChange={(e) => onChange({ perSide: e.target.checked })}
            className="accent-go"
          />
          Per side
        </label>
      )}

      <input
        value={exercise.weight || ""}
        onChange={(e) => onChange({ weight: e.target.value || null })}
        placeholder="Weight (e.g. 10 lb)"
        className={inputClass}
      />
      <input
        value={exercise.cue || ""}
        onChange={(e) => onChange({ cue: e.target.value || null })}
        placeholder="Form note (optional)"
        className={inputClass}
      />

      <div className="flex justify-end">
        <button
          onClick={onDone}
          className="px-4 py-1.5 rounded-full bg-ink text-paper text-xs font-medium"
        >
          Done
        </button>
      </div>
    </div>
  );
}

export default function ExerciseCard({
  exercise,
  isSets,
  rounds,
  restBetweenRounds,
  editing,
  onChange,
  onEdit,
  onDoneEditing,
  onMoveUp,
  onMoveDown,
  onRemove,
  canMoveUp,
  canMoveDown,
  canRemove,
}) {
  const timed = exercise.exerciseSeconds > 0;
  const exSets = exercise.sets || rounds;
  const exRest = exercise.restAfter ?? restBetweenRounds;
  const details = [
    exercise.weight,
    exercise.perSide && !timed ? "per side" : null,
    exercise.cue,
  ].filter(Boolean);

  return (
    <div
      className={`bg-surface rounded-xl px-4 py-3 ${
        editing ? "ring-2 ring-go/60" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className={`font-medium text-[15px] pt-1 min-w-0 break-words ${
            exercise.name.trim() ? "text-ink" : "text-rest"
          }`}
        >
          {exercise.name.trim() || "Untitled exercise"}
        </span>
        <div className="flex items-center shrink-0 -mr-1.5">
          <IconButton label="Move up" onClick={onMoveUp} disabled={!canMoveUp}>
            ↑
          </IconButton>
          <IconButton label="Move down" onClick={onMoveDown} disabled={!canMoveDown}>
            ↓
          </IconButton>
          <IconButton
            label={editing ? "Close editor" : "Edit exercise"}
            onClick={editing ? onDoneEditing : onEdit}
          >
            ✎
          </IconButton>
          <IconButton label="Remove exercise" onClick={onRemove} disabled={!canRemove}>
            ×
          </IconButton>
        </div>
      </div>

      {editing ? (
        <ExerciseEditor
          exercise={exercise}
          onChange={onChange}
          onDone={onDoneEditing}
        />
      ) : (
        details.length > 0 && (
          <p className="text-ink/40 text-xs mt-1">{details.join(" · ")}</p>
        )
      )}

      <div className="flex justify-between mt-3">
        {isSets && (
          <MiniStepper
            label="Sets"
            value={exSets}
            onChange={(v) => onChange({ sets: v })}
            min={1}
          />
        )}
        {timed ? (
          <MiniStepper
            label="Time"
            value={exercise.exerciseSeconds}
            onChange={(v) => onChange({ exerciseSeconds: v })}
            min={5}
            step={5}
            suffix="s"
          />
        ) : (
          <MiniStepper
            label="Reps"
            value={exercise.reps || 0}
            onChange={(v) => onChange({ reps: v })}
            min={1}
          />
        )}
        <MiniStepper
          label={isSets ? "Rest" : "Rest after"}
          value={isSets ? exRest : exercise.restAfter || 0}
          onChange={(v) => onChange({ restAfter: v })}
          min={0}
          step={5}
          suffix="s"
        />
      </div>
    </div>
  );
}
