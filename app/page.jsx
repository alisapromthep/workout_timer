"use client";

import { useState } from "react";
import InputScreen from "../components/InputScreen";
import ReadyScreen from "../components/ReadyScreen";
import TimerScreen from "../components/TimerScreen";
import DoneScreen from "../components/DoneScreen";
import { buildSteps } from "../lib/steps";

export default function Page() {
  const [screen, setScreen] = useState("input"); // input | ready | timer | done
  const [workout, setWorkout] = useState(null);
  const [steps, setSteps] = useState([]);
  const [log, setLog] = useState([]);

  function handleWorkoutReady(w) {
    setWorkout(w);
    setScreen("ready");
  }

  function handleStart(finalWorkout) {
    setWorkout(finalWorkout);
    setSteps(buildSteps(finalWorkout));
    setLog([]);
    setScreen("timer");
  }

  function handleFinish(finalLog) {
    setLog(finalLog);
    setScreen("done");
  }

  function handleRestart() {
    setWorkout(null);
    setSteps([]);
    setLog([]);
    setScreen("input");
  }

  if (screen === "input") {
    return <InputScreen onWorkoutReady={handleWorkoutReady} />;
  }
  if (screen === "ready") {
    return (
      <ReadyScreen
        workout={workout}
        onStart={handleStart}
        onBack={() => setScreen("input")}
      />
    );
  }
  if (screen === "timer") {
    return (
      <TimerScreen
        steps={steps}
        onFinish={handleFinish}
        onExit={() => setScreen("ready")}
      />
    );
  }
  return (
    <DoneScreen
      workoutTitle={workout?.title}
      log={log}
      onRestart={handleRestart}
    />
  );
}
