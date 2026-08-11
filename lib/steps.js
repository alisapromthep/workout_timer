// Turns a structured workout object into a flat list of steps the timer
// screen can run through one at a time.
//
// Step shapes:
//   { type: 'countdown', seconds: 5, next: <exercise> }
//   { type: 'move', exercise, timed: false, round, totalRounds, index, total }
//   { type: 'move', exercise, timed: true, seconds, round, totalRounds, index, total }
//   { type: 'rest', seconds, label, round, totalRounds }
//   { type: 'done' }

const GET_READY_SECONDS = 5;

// Rep-based moves have no fixed duration until someone actually does them —
// these are just reasonable assumptions for estimating total workout time.
const ASSUMED_SECONDS_PER_REP = 3;
const ASSUMED_SECONDS_UNTIMED_FALLBACK = 30;

function moveStep(exercise, round, totalRounds, index, total) {
  const timed =
    typeof exercise.exerciseSeconds === "number" &&
    exercise.exerciseSeconds > 0;
  return {
    type: "move",
    exercise,
    timed,
    seconds: timed ? exercise.exerciseSeconds : null,
    round,
    totalRounds,
    index,
    total,
  };
}

export function buildSteps(workout) {
  const steps = [];
  const rounds = Math.max(1, workout.rounds || 1);
  const exercises = workout.exercises || [];
  const style = workout.style === "sets" ? "sets" : "circuit";

  let isFirst = true;

  const pushCountdown = (next) => {
    if (!isFirst) {
      steps.push({ type: "countdown", seconds: GET_READY_SECONDS, next });
    }
    isFirst = false;
  };

  if (style === "circuit") {
    for (let r = 0; r < rounds; r++) {
      exercises.forEach((ex, i) => {
        pushCountdown(ex);
        steps.push(moveStep(ex, r + 1, rounds, i + 1, exercises.length));
        if (ex.restAfter) {
          steps.push({
            type: "rest",
            seconds: ex.restAfter,
            label: "Rest",
            round: r + 1,
            totalRounds: rounds,
          });
        }
      });
      if (r < rounds - 1 && workout.restBetweenRounds) {
        steps.push({
          type: "rest",
          seconds: workout.restBetweenRounds,
          label: `Rest between rounds`,
          round: r + 1,
          totalRounds: rounds,
        });
      }
    }
  } else {
    // sets style: finish all sets of one exercise before moving on. Each
    // exercise can override how many sets it gets via its own "sets" field,
    // falling back to the workout-wide "rounds" when it doesn't specify one.
    // Rest happens after every set, including an exercise's final set,
    // since that's the break before the next exercise starts — the only
    // time we skip it is after the very last set of the very last move.
    exercises.forEach((ex, exIndex) => {
      const exSets = Math.max(1, ex.sets || rounds);
      for (let r = 0; r < exSets; r++) {
        pushCountdown(ex);
        steps.push(
          moveStep(ex, r + 1, exSets, exIndex + 1, exercises.length),
        );

        const restSeconds = ex.restAfter || workout.restBetweenRounds;
        const isLastRoundOfWorkout =
          r === exSets - 1 && exIndex === exercises.length - 1;

        if (restSeconds && !isLastRoundOfWorkout) {
          steps.push({
            type: "rest",
            seconds: restSeconds,
            label: "Rest",
            round: r + 1,
            totalRounds: exSets,
          });
        }
      }
    });
  }

  steps.push({ type: "done" });
  return steps;
}

function estimateMoveSeconds(exercise) {
  if (
    typeof exercise.exerciseSeconds === "number" &&
    exercise.exerciseSeconds > 0
  ) {
    return exercise.exerciseSeconds;
  }
  if (typeof exercise.reps === "number" && exercise.reps > 0) {
    const totalReps = exercise.perSide ? exercise.reps * 2 : exercise.reps;
    return totalReps * ASSUMED_SECONDS_PER_REP;
  }
  return ASSUMED_SECONDS_UNTIMED_FALLBACK;
}

// Estimates total workout duration in seconds, for display before starting.
// Rep-based moves use an assumed pace since their real duration is unknown
// until someone actually performs them.
export function estimateWorkoutSeconds(workout) {
  const steps = buildSteps(workout);
  return steps.reduce((total, step) => {
    if (step.type === "countdown" || step.type === "rest") {
      return total + step.seconds;
    }
    if (step.type === "move") {
      return total + (step.timed ? step.seconds : estimateMoveSeconds(step.exercise));
    }
    return total;
  }, 0);
}
