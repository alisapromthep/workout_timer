"use client";

import { useState } from "react";

function totalSeconds(log) {
  return log.reduce((sum, entry) => sum + (entry.actualSeconds || 0), 0);
}

function formatDuration(totalSecs) {
  const m = Math.floor(totalSecs / 60);
  const s = totalSecs % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

// Builds the plain-text version of the summary for copy/paste.
function buildSummaryText(title, log, finalNote) {
  const lines = [
    title ? `${title} — Workout Summary` : "Workout Summary",
    `Total time: ${formatDuration(totalSeconds(log))}`,
    "",
  ];

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

  if (finalNote && finalNote.trim()) {
    lines.push("", `Notes: ${finalNote.trim()}`);
  }

  return lines.join("\n");
}

export default function DoneScreen({ workoutTitle, log = [], onRestart }) {
  const [copied, setCopied] = useState(false);
  const [finalNote, setFinalNote] = useState("");

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(
        buildSummaryText(workoutTitle, log, finalNote),
      );
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
      <h1 className="text-3xl font-bold text-ink mb-1">Nice work.</h1>
      {log.length > 0 && (
        <p className="text-ink/50 text-sm mb-6">
          Total time:{" "}
          <span className="font-mono">{formatDuration(totalSeconds(log))}</span>
        </p>
      )}

      {log.length > 0 && (
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
      )}

      <label className="text-ink/50 text-xs font-medium uppercase tracking-wide mb-2">
        Notes
      </label>
      <textarea
        value={finalNote}
        onChange={(e) => setFinalNote(e.target.value)}
        placeholder="How did it go? Anything to remember for next time..."
        rows={3}
        className="w-full bg-surface placeholder:text-ink/40 text-ink rounded-xl p-3 text-sm outline-none resize-none mb-3"
      />

      <button
        onClick={handleCopy}
        className="w-full py-3 rounded-2xl bg-surface text-ink font-medium text-sm mb-3"
      >
        {copied ? "Copied ✓" : "Copy summary"}
      </button>

      <button
        onClick={onRestart}
        className="w-full py-4 rounded-2xl bg-go text-accentInk font-bold text-base"
      >
        New workout
      </button>
    </div>
  );
}
