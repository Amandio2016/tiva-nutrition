"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { GeneratedPlan, MealItem } from "@/types";
import BottomNav from "@/components/BottomNav";
import { cachePlan, getCachedPlan } from "@/lib/planCache";

// ── Constants ─────────────────────────────────────────────────────────────────

const JS_TO_PT = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const DAY_SHORT: Record<string, string> = {
  Segunda: "Seg", Terça: "Ter", Quarta: "Qua",
  Quinta:  "Qui", Sexta:  "Sex", Sábado: "Sáb", Domingo: "Dom",
};
const MONTHS_PT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

// ── Helpers ───────────────────────────────────────────────────────────────────

function dateISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

interface WeekDay { dayName: string; iso: string; date: number; month: number }

function getWeekDays(today: Date): WeekDay[] {
  const monOffset = (today.getDay() + 6) % 7;
  const monday = new Date(today);
  monday.setDate(today.getDate() - monOffset);

  return ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"].map(
    (dayName, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return { dayName, iso: dateISO(d), date: d.getDate(), month: d.getMonth() };
    }
  );
}

function loadDayDone(iso: string): string[] {
  try {
    const raw = localStorage.getItem(`tiva_daily_${iso}`);
    if (raw) return JSON.parse(raw).doneMeals ?? [];
  } catch {}
  return [];
}

function toggleDayDone(iso: string, mealName: string): string[] {
  const current = loadDayDone(iso);
  const next = current.includes(mealName)
    ? current.filter(n => n !== mealName)
    : [...current, mealName];
  try {
    const raw = localStorage.getItem(`tiva_daily_${iso}`);
    const data = raw ? JSON.parse(raw) : {};
    localStorage.setItem(`tiva_daily_${iso}`, JSON.stringify({ ...data, doneMeals: next }));
  } catch {}
  return next;
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SemanaPage() {
  const router = useRouter();
  const [loading,      setLoading]      = useState(true);
  const [plan,         setPlan]         = useState<GeneratedPlan | null>(null);
  const [mounted,      setMounted]      = useState(false);
  const [now,          setNow]          = useState<Date | null>(null);
  const [selectedDay,  setSelectedDay]  = useState<string | null>(null);
  const [weekDone,     setWeekDone]     = useState<Record<string, string[]>>({});

  useEffect(() => {
    setMounted(true);
    const today = new Date();
    setNow(today);
    setSelectedDay(JS_TO_PT[today.getDay()]);

    const done: Record<string, string[]> = {};
    getWeekDays(today).forEach(({ dayName, iso }) => {
      done[dayName] = loadDayDone(iso);
    });
    setWeekDone(done);
  }, []);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const { data: planRow } = await supabase
        .from("generated_plans")
        .select("plan_data")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (planRow?.plan_data) {
        const fetched = planRow.plan_data as GeneratedPlan;
        cachePlan(fetched);
        setPlan(fetched);
      } else {
        const cached = getCachedPlan();
        if (cached) setPlan(cached);
      }
      setLoading(false);
    })();
  }, [router]);

  const handleToggle = (dayName: string, iso: string, mealName: string) => {
    const next = toggleDayDone(iso, mealName);
    setWeekDone(prev => ({ ...prev, [dayName]: next }));
  };

  if (!mounted || loading) return <LoadingScreen />;

  const safeNow   = now ?? new Date();
  const todayName = JS_TO_PT[safeNow.getDay()];
  const week      = getWeekDays(safeNow);
  const selDay    = selectedDay ?? todayName;
  const selMeta   = week.find(w => w.dayName === selDay)!;
  const meals: MealItem[] = plan?.weekly_menu[selDay] ?? [];
  const doneMeals = weekDone[selDay] ?? [];

  return (
    <div className="flex min-h-screen flex-col" style={{ background: "#0F0A06" }}>

      {/* Fixed header */}
      <header
        className="fixed left-0 right-0 top-0 z-20 flex h-14 items-center justify-between px-5"
        style={{
          background: "rgba(15,10,6,0.95)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        <span className="text-sm font-black tracking-widest" style={{ color: "#F97316" }}>
          💪 TIVA
        </span>
        <span className="text-sm font-bold text-white">Menu da Semana</span>
        <div className="w-20" aria-hidden />
      </header>

      {/* Sticky day selector */}
      <div
        className="fixed left-0 right-0 top-14 z-10 px-4 py-3"
        style={{
          background: "rgba(15,10,6,0.96)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        <div className="mx-auto max-w-[430px]">
          <div className="flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {week.map(({ dayName, date, month }) => {
              const isToday    = dayName === todayName;
              const isSelected = dayName === selDay;
              const total      = plan?.weekly_menu[dayName]?.length ?? 0;
              const done       = (weekDone[dayName] ?? []).length;

              return (
                <button
                  key={dayName}
                  onClick={() => setSelectedDay(dayName)}
                  className="flex shrink-0 flex-col items-center rounded-2xl border px-3.5 py-2.5 transition-all active:scale-95"
                  style={{
                    borderColor: isSelected
                      ? "#F97316"
                      : isToday
                      ? "rgba(249,115,22,0.35)"
                      : "rgba(255,255,255,0.08)",
                    background: isSelected
                      ? "rgba(249,115,22,0.15)"
                      : isToday
                      ? "rgba(249,115,22,0.05)"
                      : "rgba(255,255,255,0.03)",
                    color: isSelected
                      ? "#F97316"
                      : isToday
                      ? "rgba(249,115,22,0.8)"
                      : "rgba(255,255,255,0.4)",
                  }}
                >
                  <span className="text-xs font-bold">{DAY_SHORT[dayName]}</span>
                  <span className="text-base font-black leading-none">{date}</span>
                  {isToday ? (
                    <span
                      className="mt-1 rounded-full px-1.5 py-0.5 text-[8px] font-bold leading-none"
                      style={{ background: "#F97316", color: "#fff" }}
                    >
                      Hoje
                    </span>
                  ) : total > 0 ? (
                    <span
                      className="mt-1 text-[9px] font-bold leading-none"
                      style={{ color: done === total ? "#22C55E" : "rgba(255,255,255,0.2)" }}
                    >
                      {done}/{total}
                    </span>
                  ) : (
                    <span className="mt-1 text-[9px] text-transparent">·</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main content — offset for header (56px) + day bar (~80px) */}
      <main className="flex-1 overflow-y-auto pb-20 pt-36">
        <div className="mx-auto flex max-w-[430px] flex-col gap-4 px-4 py-4">

          {/* Selected day heading */}
          <div className="flex items-baseline gap-2">
            <h2 className="text-lg font-black text-white">{selDay}</h2>
            <span className="text-xs text-white/30">
              {selMeta?.date} {MONTHS_PT[selMeta?.month ?? 0]}
            </span>
            {selDay === todayName && (
              <span
                className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                style={{ background: "rgba(249,115,22,0.15)", color: "#F97316" }}
              >
                Hoje
              </span>
            )}
          </div>

          {/* Meal list or empty states */}
          {!plan ? (
            <NoPlanMsg />
          ) : meals.length === 0 ? (
            <p className="py-8 text-center text-sm text-white/25">
              Sem refeições para este dia no plano.
            </p>
          ) : (
            meals.map((meal, i) => (
              <ExpandableMealCard
                key={i}
                meal={meal}
                done={doneMeals.includes(meal.name)}
                onToggle={() => handleToggle(selDay, selMeta.iso, meal.name)}
              />
            ))
          )}

        </div>
      </main>

      <BottomNav />
    </div>
  );
}

// ── Expandable meal card ──────────────────────────────────────────────────────

function ExpandableMealCard({
  meal,
  done,
  onToggle,
}: {
  meal: MealItem;
  done: boolean;
  onToggle: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className="overflow-hidden rounded-2xl border transition-all"
      style={{
        borderColor: done ? "rgba(34,197,94,0.2)" : "rgba(255,255,255,0.07)",
        background: done ? "rgba(34,197,94,0.05)" : "rgba(255,255,255,0.025)",
        opacity: done ? 0.75 : 1,
      }}
    >
      {/* Row */}
      <div className="flex items-center gap-3 px-4 py-3">
        <span className="shrink-0 text-2xl" aria-hidden>{meal.emoji}</span>

        <button className="flex-1 text-left" onClick={() => setOpen(o => !o)}>
          <p className="text-sm font-semibold text-white">{meal.name}</p>
          <p className="text-xs text-white/30">{meal.time}</p>
        </button>

        <div className="flex items-center gap-2">
          {/* Expand */}
          <button
            onClick={() => setOpen(o => !o)}
            className="flex size-7 items-center justify-center rounded-lg text-[10px] text-white/30 transition-all"
            style={{ background: "rgba(255,255,255,0.05)" }}
            aria-label={open ? "Fechar" : "Expandir"}
          >
            {open ? "▲" : "▼"}
          </button>
          {/* Done toggle */}
          <button
            onClick={onToggle}
            className="flex size-7 items-center justify-center rounded-lg text-sm font-bold transition-all active:scale-90"
            style={{
              background: done ? "rgba(34,197,94,0.2)" : "rgba(255,255,255,0.07)",
              color: done ? "#22C55E" : "rgba(255,255,255,0.3)",
            }}
            aria-label={done ? "Desmarcar" : "Marcar feita"}
          >
            ✓
          </button>
        </div>
      </div>

      {/* Expanded items */}
      {open && (
        <div
          className="border-t px-4 pb-4 pt-3"
          style={{ borderColor: "rgba(255,255,255,0.06)" }}
        >
          <ul className="flex flex-col gap-1.5">
            {meal.items.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-white/45">
                <span
                  className="mt-1.5 size-1 shrink-0 rounded-full"
                  style={{ background: "rgba(249,115,22,0.5)" }}
                  aria-hidden
                />
                {item}
              </li>
            ))}
          </ul>
          {meal.tip && (
            <p className="mt-3 text-xs italic text-white/25">💡 {meal.tip}</p>
          )}
        </div>
      )}
    </div>
  );
}

// ── No plan message ───────────────────────────────────────────────────────────

function NoPlanMsg() {
  return (
    <div className="flex flex-col items-center py-12 text-center">
      <span className="mb-4 text-5xl" aria-hidden>📅</span>
      <p className="mb-2 font-bold text-white">Sem plano gerado</p>
      <p className="mb-6 text-sm text-white/35">
        Gera o teu plano personalizado para ver o menu da semana.
      </p>
      <a
        href="/gerar-plano"
        className="rounded-xl px-6 py-3 text-sm font-bold text-white transition-all active:scale-95"
        style={{ background: "linear-gradient(135deg, #F97316, #EA6A0A)" }}
      >
        Gerar plano →
      </a>
    </div>
  );
}

// ── Loading screen ────────────────────────────────────────────────────────────

function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center" style={{ background: "#0F0A06" }}>
      <div className="flex flex-col items-center gap-4">
        <div
          className="size-12 animate-spin rounded-full"
          style={{ border: "2px solid rgba(249,115,22,0.15)", borderTopColor: "#F97316" }}
        />
        <p className="text-sm text-white/30">A carregar...</p>
      </div>
    </div>
  );
}
