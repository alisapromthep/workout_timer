"use client";

export default function DoneScreen({ onRestart }) {
  return (
    <div className="min-h-screen bg-paper flex flex-col items-center justify-center px-6 text-center">
      <p className="text-rest text-sm font-medium tracking-widest uppercase mb-3">
        Complete
      </p>
      <h1 className="text-3xl font-bold text-ink mb-8">Nice work.</h1>
      <button
        onClick={onRestart}
        className="px-8 py-4 rounded-2xl bg-go text-accentInk font-bold text-base"
      >
        New workout
      </button>
    </div>
  );
}
