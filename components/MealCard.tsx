"use client";

import type { Meal } from "@/lib/menu-data";

type MealCardProps = {
  meal: Meal;
  isNext: boolean;
  isDone: boolean;
  onToggleDone: () => void;
};

export default function MealCard({ meal, isNext, isDone, onToggleDone }: MealCardProps) {
  return (
    <article
      className={[
        "relative flex flex-col gap-4 rounded-2xl bg-white p-5 shadow-sm transition-all duration-300",
        isNext
          ? "border-2 border-orange-400 shadow-orange-100 shadow-md"
          : "border border-stone-200",
        isDone ? "opacity-55" : "opacity-100",
      ].join(" ")}
    >
      {/* ── Top badges ── */}
      <div className="flex items-start justify-between gap-2">
        {/* Emoji + name + time */}
        <div className="flex items-center gap-3">
          <span
            className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-3xl leading-none"
            aria-hidden
          >
            {meal.emoji}
          </span>

          <div>
            <h3 className="text-base font-semibold text-stone-800 leading-tight">
              {meal.name}
            </h3>
            <time className="text-sm font-medium text-orange-500">{meal.time}</time>
          </div>
        </div>

        {/* Right-side badges */}
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          {isNext && !isDone && (
            <span className="rounded-full bg-orange-500 px-2.5 py-0.5 text-xs font-semibold text-white tracking-wide">
              Próxima
            </span>
          )}
          {isDone && (
            <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700 tracking-wide">
              ✓ Feita
            </span>
          )}
        </div>
      </div>

      {/* ── Items list ── */}
      <ul className="flex flex-col gap-1.5">
        {meal.items.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-stone-600">
            <span className="mt-1 size-1.5 shrink-0 rounded-full bg-orange-300" aria-hidden />
            {item}
          </li>
        ))}
      </ul>

      {/* ── Divider ── */}
      <div className="h-px bg-stone-100" />

      {/* ── Tip ── */}
      <p className="text-xs italic text-stone-400 leading-relaxed">
        💡 {meal.tip}
      </p>

      {/* ── Toggle button ── */}
      <button
        onClick={onToggleDone}
        aria-label={isDone ? `Desmarcar ${meal.name} como feita` : `Marcar ${meal.name} como feita`}
        className={[
          "mt-auto flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-200",
          isDone
            ? "bg-stone-100 text-stone-500 hover:bg-red-50 hover:text-red-500"
            : "bg-green-500 text-white shadow-sm hover:bg-green-600 active:scale-95",
        ].join(" ")}
      >
        {isDone ? (
          <>
            <UndoIcon />
            Desmarcar
          </>
        ) : (
          <>
            <CheckIcon />
            Marcar como feita
          </>
        )}
      </button>

      {/* Glow ring for next meal */}
      {isNext && !isDone && (
        <span
          className="pointer-events-none absolute inset-0 rounded-2xl ring-2 ring-orange-300 ring-offset-1 animate-pulse"
          aria-hidden
        />
      )}
    </article>
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
