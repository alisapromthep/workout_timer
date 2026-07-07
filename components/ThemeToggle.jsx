"use client";

import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [theme, setTheme] = useState("light");

  useEffect(() => {
    const stored = window.localStorage.getItem("theme");
    if (stored) {
      setTheme(stored);
      document.documentElement.setAttribute("data-theme", stored);
    }
  }, []);

  function toggle() {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    window.localStorage.setItem("theme", next);
  }

  return (
    <button
      onClick={toggle}
      aria-label="Toggle light and dark theme"
      className="fixed top-4 right-4 z-50 w-9 h-9 rounded-full bg-surface text-ink text-sm flex items-center justify-center"
    >
      {theme === "light" ? "🌙" : "☀️"}
    </button>
  );
}
