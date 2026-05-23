"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "creatine-tracker";

type StoredState = {
  date: string; // YYYY-MM-DD
  taken: boolean;
};

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function loadState(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const stored: StoredState = JSON.parse(raw);
    return stored.date === todayISO() ? stored.taken : false;
  } catch {
    return false;
  }
}

function saveState(taken: boolean): void {
  const payload: StoredState = { date: todayISO(), taken };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export default function CreatineTracker() {
  const [taken, setTaken] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Hydrate from localStorage only on client to avoid SSR mismatch
  useEffect(() => {
    setTaken(loadState());
    setMounted(true);
  }, []);

  function handleToggle() {
    if (animating) return;

    setAnimating(true);
    const next = !taken;
    setTaken(next);
    saveState(next);

    setTimeout(() => setAnimating(false), 400);
  }

  // Skeleton during SSR / before hydration
  if (!mounted) {
    return (
      <div className="flex flex-col items-center gap-5 rounded-2xl bg-white p-8 shadow-sm border border-stone-200">
        <div className="size-32 rounded-full bg-stone-100 animate-pulse" />
        <div className="h-4 w-32 rounded bg-stone-100 animate-pulse" />
        <div className="h-10 w-48 rounded-xl bg-stone-100 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-5 rounded-2xl bg-white p-8 shadow-sm border border-stone-200">
      {/* ── Circle indicator ── */}
      <button
        onClick={handleToggle}
        aria-label={taken ? "Marcar creatina como não tomada" : "Marcar creatina como tomada"}
        className={[
          "relative flex size-32 items-center justify-center rounded-full border-4 transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
          taken
            ? "border-green-400 bg-green-50 focus-visible:ring-green-400"
            : "border-stone-300 bg-stone-50 focus-visible:ring-stone-400",
          animating ? "scale-110" : "scale-100 hover:scale-105",
        ].join(" ")}
      >
        {/* Outer pulse ring — only when taken */}
        {taken && (
          <span
            className="absolute inset-0 rounded-full bg-green-300 opacity-25 animate-ping"
            aria-hidden
          />
        )}

        {/* Checkmark SVG */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
          className={[
            "size-14 stroke-current transition-all duration-300",
            taken ? "text-green-500" : "text-stone-300",
            animating && taken ? "scale-110" : "scale-100",
          ].join(" ")}
        >
          <path d="M4.5 12.75l6 6 9-13.5" />
        </svg>
      </button>

      {/* ── Label ── */}
      <div className="flex flex-col items-center gap-1 text-center">
        <span className="text-2xl">💊</span>
        <p
          className={[
            "text-base font-semibold transition-colors duration-300",
            taken ? "text-green-600" : "text-stone-600",
          ].join(" ")}
        >
          Creatina 5g hoje
        </p>
        <p
          className={[
            "text-sm transition-colors duration-300",
            taken ? "text-green-400" : "text-stone-400",
          ].join(" ")}
        >
          {taken ? "Tomada no matabicho ✓" : "Por tomar — mistura no somo"}
        </p>
      </div>

      {/* ── Action button ── */}
      <button
        onClick={handleToggle}
        disabled={animating}
        className={[
          "flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold transition-all duration-200 disabled:pointer-events-none",
          taken
            ? "bg-stone-100 text-stone-500 hover:bg-red-50 hover:text-red-500"
            : "bg-green-500 text-white shadow-sm hover:bg-green-600 active:scale-95",
        ].join(" ")}
      >
        {taken ? (
          <>
            <UndoIcon />
            Desmarcar
          </>
        ) : (
          <>
            <CheckIcon />
            Marcar como tomada
          </>
        )}
      </button>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className="size-4 shrink-0"
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function UndoIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className="size-4 shrink-0"
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M7.793 2.232a.75.75 0 0 1-.025 1.06L3.622 7.25h10.003a5.375 5.375 0 0 1 0 10.75H10.75a.75.75 0 0 1 0-1.5h2.875a3.875 3.875 0 0 0 0-7.75H3.622l4.146 3.957a.75.75 0 0 1-1.036 1.085l-5.5-5.25a.75.75 0 0 1 0-1.085l5.5-5.25a.75.75 0 0 1 1.061.025Z"
        clipRule="evenodd"
      />
    </svg>
  );
}
