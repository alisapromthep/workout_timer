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

function moveStep(exercise, round, totalRounds, index, total) {
  const timed = typeof exercise.exerciseSeconds === 'number' && exercise.exerciseSeconds > 0;
  return {
    type: 'move',
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
  const style = workout.style === 'sets' ? 'sets' : 'circuit';

  let isFirst = true;

  const pushCountdown = (next) => {
    if (!isFirst) {
      steps.push({ type: 'countdown', seconds: GET_READY_SECONDS, next });
    }
    isFirst = false;
  };

  if (style === 'circuit') {
    for (let r = 0; r < rounds; r++) {
      exercises.forEach((ex, i) => {
        pushCountdown(ex);
        steps.push(moveStep(ex, r + 1, rounds, i + 1, exercises.length));
        if (ex.restAfter) {
          steps.push({
            type: 'rest',
            seconds: ex.restAfter,
            label: 'Rest',
            round: r + 1,
            totalRounds: rounds,
          });
        }
      });
      if (r < rounds - 1 && workout.restBetweenRounds) {
        steps.push({
          type: 'rest',
          seconds: workout.restBetweenRounds,
          label: `Rest between rounds`,
          round: r + 1,
          totalRounds: rounds,
        });
      }
    }
  } else {
    // sets style: finish all rounds of one exercise before moving on
    exercises.forEach((ex) => {
      for (let r = 0; r < rounds; r++) {
        pushCountdown(ex);
        steps.push(moveStep(ex, r + 1, rounds, 1, 1));
        if (r < rounds - 1 && (workout.restBetweenRounds || ex.restAfter)) {
          steps.push({
            type: 'rest',
            seconds: ex.restAfter || workout.restBetweenRounds,
            label: 'Rest',
            round: r + 1,
            totalRounds: rounds,
          });
        }
      }
    });
  }

  steps.push({ type: 'done' });
  return steps;
}
