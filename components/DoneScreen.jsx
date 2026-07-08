"use client";

import { useState } from "react";

// Builds the plain-text version of the summary for copy/paste.
function buildSummaryText(title, log) {
  const lines = [title ? `${title} — Workout Summary` : "Workout Summary", ""];

  log.forEach((entry) => {
    if (entry.type === "move") {
      const roundLabel =
        entry.totalRounds > 1
          ? ` (round ${entry.round}/${entry.totalRounds})`
          : "";
      const planned = entry.plannedReps
        ? `${entry.plannedReps} reps planned`
        : entry.plannedSeconds
          ? `${entry.plannedSeconds}s planned`
          : "";
      lines.push(
        `${entry.name}${roundLabel} — ${entry.actualSeconds}s${planned ? ` (${planned})` : ""}`,
      );
    } else {
      const adj = entry.adjustment
        ? `, adjusted ${entry.adjustment > 0 ? "+" : ""}${entry.adjustment}s`
        : "";
      lines.push(
        `${entry.label} — ${entry.actualSeconds}s (planned ${entry.plannedSeconds}s${adj})`,
      );
      if (entry.note) lines.push(`  note: ${entry.note}`);
    }
  });

  return lines.join("\n");
}

export default function DoneScreen({ workoutTitle, log = [], onRestart }) {
  const [copied, setCopied] = useState(false);
  const summaryText = buildSummaryText(workoutTitle, log);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(summaryText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      // clipboard API unavailable — text is still visible to select manually
    }
  }

  return (
    <div className="min-h-screen bg-paper flex flex-col px-6 py-10 max-w-md mx-auto">
      <button
        onClick={onRestart}
        className="flex items-center gap-1.5 text-ink/50 text-sm mb-6 self-start"
      >
        <span aria-hidden>🏠</span> Home
      </button>

      <p className="text-rest text-sm font-medium tracking-widest uppercase mb-1">
        Workout Complete
      </p>
      <h1 className="text-3xl font-bold text-ink mb-6">Nice work.</h1>

      {log.length > 0 && (
        <>
          <div className="flex-1 overflow-y-auto -mx-6 px-6 space-y-2 mb-4">
            {log.map((entry, i) => (
              <div key={i} className="bg-surface rounded-xl px-4 py-3">
                {entry.type === "move" ? (
                  <>
                    <div className="flex items-baseline justify-between">
                      <span className="text-ink font-medium text-[15px]">
                        {entry.name}
                      </span>
                      {entry.totalRounds > 1 && (
                        <span className="text-ink/40 text-xs">
                          Round {entry.round}/{entry.totalRounds}
                        </span>
                      )}
                    </div>
                    <p className="text-ink/50 text-xs mt-1">
                      {entry.actualSeconds}s
                      {entry.plannedReps
                        ? ` · ${entry.plannedReps} reps planned`
                        : entry.plannedSeconds
                          ? ` / ${entry.plannedSeconds}s planned`
                          : ""}
                    </p>
                  </>
                ) : (
                  <>
                    <div className="flex items-baseline justify-between">
                      <span className="text-ink font-medium text-[15px]">
                        {entry.label}
                      </span>
                      <span className="text-ink/40 text-xs">
                        {entry.actualSeconds}s
                      </span>
                    </div>
                    {entry.adjustment !== 0 && (
                      <p className="text-rest/70 text-xs mt-1">
                        Adjusted {entry.adjustment > 0 ? "+" : ""}
                        {entry.adjustment}s from planned {entry.plannedSeconds}s
                      </p>
                    )}
                    {entry.note && (
                      <p className="text-ink/60 text-xs mt-1 italic">
                        "{entry.note}"
                      </p>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>

          <button
            onClick={handleCopy}
            className="w-full py-3 rounded-2xl bg-surface text-ink font-medium text-sm mb-3"
          >
            {copied ? "Copied ✓" : "Copy summary"}
          </button>
        </>
      )}

      <button
        onClick={onRestart}
        className="w-full py-4 rounded-2xl bg-go text-accentInk font-bold text-base"
      >
        New workout
      </button>
    </div>
  );
}
