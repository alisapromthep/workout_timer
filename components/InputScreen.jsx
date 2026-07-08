"use client";

import { useState } from "react";

export default function InputScreen({ onWorkoutReady }) {
  const [mode, setMode] = useState("paste");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit() {
    if (!text.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, text }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        return;
      }
      onWorkoutReady(data.workout);
    } catch (e) {
      setError(
        "Could not reach the server. Check your connection and try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col px-6 py-10 max-w-md mx-auto">
      <div className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight text-ink">Reps</h1>
        <p className="text-ink/50 mt-1 text-sm">
          Paste a workout, or describe one.
        </p>
      </div>

      <div className="flex gap-2 mb-5">
        <button
          onClick={() => setMode("paste")}
          className={`flex-1 py-2.5 rounded-full text-sm font-medium transition-colors ${
            mode === "paste" ? "bg-go text-accentInk" : "bg-surface text-ink/60"
          }`}
        >
          Paste
        </button>
        <button
          onClick={() => setMode("describe")}
          className={`flex-1 py-2.5 rounded-full text-sm font-medium transition-colors ${
            mode === "describe"
              ? "bg-go text-accentInk"
              : "bg-surface text-ink/60"
          }`}
        >
          Describe
        </button>
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={
          mode === "paste"
            ? "Paste your workout here..."
            : "e.g. 20 minute upper body workout with dumbbells, 3 rounds, 45 sec rest"
        }
        className="flex-1 min-h-[240px] bg-surface rounded-2xl p-4 text-ink placeholder:text-ink/30 outline-none focus:ring-2 focus:ring-go/60 resize-none text-[15px] leading-relaxed"
      />

      {error && <p className="text-rest text-sm mt-3 leading-snug">{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={loading || !text.trim()}
        className="mt-5 w-full py-4 rounded-2xl bg-go text-accentInk font-bold text-base disabled:opacity-30 transition-opacity"
      >
        {loading
          ? "Building your workout…"
          : mode === "paste"
            ? "Parse workout"
            : "Generate workout"}
      </button>
      <a
        href="https://alisapromthep.dev"
        target="_blank"
        rel="noopener noreferrer"
        className="mt-8 text-center text-ink/30 text-xs hover:text-ink/50 transition-colors"
      >
        Built by Alisa Promthep ↗
      </a>
    </div>
  );
}
