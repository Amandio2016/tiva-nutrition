"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { GeneratedPlan, MealItem, Profile } from "@/types";
import BottomNav from "@/components/BottomNav";
import { useNotifications } from "@/hooks/useNotifications";
import { cachePlan, getCachedPlan } from "@/lib/planCache";

// ── Constants ─────────────────────────────────────────────────────────────────

const JS_TO_PT = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const MONTHS_PT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const GOAL_LABEL: Record<string, string> = {
  ganhar_massa:         "Ganhar massa muscular",
  emagrecer:            "Emagrecer",
  manter_peso:          "Manter o peso",
  melhorar_performance: "Melhorar performance",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function timeToMin(t: string): number {
  const [h, m = 0] = t.split(":").map(Number);
  return h * 60 + m;
}

function greet(h: number): string {
  if (h < 12) return "Bom dia";
  if (h < 19) return "Boa tarde";
  return "Boa noite";
}

// ── Daily state (localStorage, date-keyed) ────────────────────────────────────

interface DailyState {
  doneMeals:    string[];
  takenSupps:   string[];
  trainingDone: boolean;
  water:        number;
  sleep:        number;
}

const DEFAULT_DAILY: DailyState = {
  doneMeals: [], takenSupps: [], trainingDone: false, water: 0, sleep: 7,
};

function loadDaily(): DailyState {
  try {
    const raw = localStorage.getItem(`tiva_daily_${todayISO()}`);
    if (raw) return { ...DEFAULT_DAILY, ...JSON.parse(raw) };
  } catch {}
  return { ...DEFAULT_DAILY };
}

function saveDaily(s: DailyState): void {
  try { localStorage.setItem(`tiva_daily_${todayISO()}`, JSON.stringify(s)); } catch {}
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [plan,    setPlan]    = useState<GeneratedPlan | null>(null);
  const [daily,   setDaily]   = useState<DailyState>(DEFAULT_DAILY);
  const [mounted, setMounted] = useState(false);
  const [now,     setNow]     = useState<Date | null>(null);

  // Hydration-safe: clock only on client
  useEffect(() => {
    setMounted(true);
    setNow(new Date());
    setDaily(loadDaily());
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  // Fetch profile + active plan
  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const [{ data: prof }, { data: planRow }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).single(),
        supabase
          .from("generated_plans")
          .select("plan_data")
          .eq("user_id", user.id)
          .eq("is_active", true)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      if (prof) setProfile(prof as Profile);
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

  // Notifications — auto-asks permission after 2 s on first visit
  const { permission, scheduleForToday } = useNotifications(true);

  // Schedule today's meal notifications whenever plan or permission changes
  useEffect(() => {
    if (permission !== "granted" || !plan) return;
    const dayName = JS_TO_PT[new Date().getDay()];
    scheduleForToday(plan.weekly_menu[dayName] ?? []);
  }, [plan, permission, scheduleForToday]);

  const updateDaily = useCallback((fn: (s: DailyState) => DailyState) => {
    setDaily(prev => { const next = fn(prev); saveDaily(next); return next; });
  }, []);

  const toggleMeal = (name: string) =>
    updateDaily(s => ({
      ...s,
      doneMeals: s.doneMeals.includes(name)
        ? s.doneMeals.filter(n => n !== name)
        : [...s.doneMeals, name],
    }));

  // ── Render gates ──────────────────────────────────────────────────────────
  if (!mounted || loading) return <LoadingScreen />;
  if (!profile)            return <LoadingScreen />;
  if (!plan)               return <NoPlanScreen name={profile.name ?? "Atleta"} />;

  // ── Derived state ─────────────────────────────────────────────────────────
  const safeNow      = now ?? new Date();
  const dayName      = JS_TO_PT[safeNow.getDay()];
  const tomorrowName = JS_TO_PT[(safeNow.getDay() + 1) % 7];
  const dateStr      = `${dayName}, ${safeNow.getDate()} ${MONTHS_PT[safeNow.getMonth()]}`;
  const nowMin       = safeNow.getHours() * 60 + safeNow.getMinutes();

  const todayMeals: MealItem[]    = plan.weekly_menu[dayName] ?? [];
  const tomorrowMeals: MealItem[] = plan.weekly_menu[tomorrowName] ?? [];
  const tomorrowLunch =
    tomorrowMeals.find(m => m.name.toLowerCase().includes("almoço")) ??
    tomorrowMeals[1] ??
    null;

  const nextMeal   = todayMeals.find(m => timeToMin(m.time) > nowMin) ?? null;
  const mealsDone  = todayMeals.filter(m => daily.doneMeals.includes(m.name)).length;
  const mealsTotal = todayMeals.length;
  const pct        = mealsTotal > 0 ? Math.round((mealsDone / mealsTotal) * 100) : 0;

  const essentialSupps = plan.supplements.filter(s => s.priority === "essencial");
  const suppsDone      = daily.takenSupps.filter(n => essentialSupps.some(s => s.name === n)).length;
  const todayTraining  = plan.training_plan.find(t => t.day === dayName) ?? null;

  // ── JSX ───────────────────────────────────────────────────────────────────
  return (
    <div className="flex min-h-screen flex-col" style={{ background: "#0F0A06" }}>

      {/* ── Fixed header ── */}
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
        <span className="text-xs font-semibold text-white/40">{dateStr}</span>
        {profile.avatar_url ? (
          <img
            src={profile.avatar_url}
            alt={profile.name}
            referrerPolicy="no-referrer"
            className="size-9 rounded-full object-cover"
          />
        ) : (
          <div
            className="flex size-9 items-center justify-center rounded-full text-sm font-black text-white"
            style={{ background: "rgba(249,115,22,0.2)" }}
          >
            {profile.name?.[0]?.toUpperCase() ?? "?"}
          </div>
        )}
      </header>

      {/* ── Scrollable main ── */}
      <main className="flex-1 overflow-y-auto pb-20 pt-14">
        <div className="mx-auto flex max-w-[430px] flex-col gap-5 px-4 py-5">

          {/* Hero: greeting + progress ring */}
          <section className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-[22px] font-black leading-snug text-white">
                {greet(safeNow.getHours())}, {(profile.name ?? "Atleta").split(" ")[0]}! 💪
              </h1>
              <p className="mt-0.5 truncate text-xs text-white/35">
                Plano: {GOAL_LABEL[profile.goal] ?? profile.goal}
              </p>
              <p className="mt-3 text-xs text-white/25">
                {mealsDone} em {mealsTotal} refeições hoje
              </p>
            </div>
            <div className="relative shrink-0">
              <ProgressRing pct={pct} size={80} />
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-black leading-none text-white">{pct}%</span>
                <span className="text-[9px] leading-tight text-white/30">feitas</span>
              </div>
            </div>
          </section>

          {/* Quick cards 2×2 */}
          <div className="grid grid-cols-2 gap-3">

            {/* Supplements — taps to supplements page */}
            <Link
              href="/suplementos"
              className="block rounded-2xl border p-4 transition-all active:scale-95"
              style={{ borderColor: "rgba(255,255,255,0.07)", background: "#1C1208" }}
            >
              <span className="text-2xl" aria-hidden>💊</span>
              <p className="mt-2 text-xs text-white/40">Suplementos</p>
              <p
                className="text-lg font-black leading-tight"
                style={{
                  color:
                    essentialSupps.length > 0 && suppsDone >= essentialSupps.length
                      ? "#22C55E"
                      : "#F97316",
                }}
              >
                {suppsDone}/{essentialSupps.length}
              </p>
              <p className="truncate text-[10px] text-white/25">tomados hoje</p>
            </Link>

            {/* Training — tap to toggle done */}
            <button
              onClick={() =>
                todayTraining &&
                updateDaily(s => ({ ...s, trainingDone: !s.trainingDone }))
              }
              className="rounded-2xl border p-4 text-left transition-all active:scale-95"
              style={{ borderColor: "rgba(255,255,255,0.07)", background: "#1C1208" }}
            >
              <span className="text-2xl" aria-hidden>🏋️</span>
              <p className="mt-2 text-xs text-white/40">Treino</p>
              <p
                className="text-lg font-black leading-tight"
                style={{
                  color: daily.trainingDone
                    ? "#22C55E"
                    : todayTraining
                    ? "#F97316"
                    : "rgba(255,255,255,0.2)",
                }}
              >
                {todayTraining
                  ? daily.trainingDone
                    ? "Feito ✓"
                    : "Pendente"
                  : "Descanso"}
              </p>
              <p className="truncate text-[10px] text-white/25">
                {todayTraining?.focus ?? "recuperação activa"}
              </p>
            </button>

            {/* Water */}
            <div
              className="rounded-2xl border p-4"
              style={{ borderColor: "rgba(255,255,255,0.07)", background: "#1C1208" }}
            >
              <span className="text-2xl" aria-hidden>💧</span>
              <p className="mt-2 text-xs text-white/40">Água</p>
              <div className="my-1 flex items-center gap-2">
                <button
                  onClick={() =>
                    updateDaily(s => ({ ...s, water: Math.max(0, s.water - 1) }))
                  }
                  className="flex size-6 items-center justify-center rounded-full text-sm font-bold text-white/60 transition-all active:scale-90"
                  style={{ background: "rgba(255,255,255,0.07)" }}
                >
                  −
                </button>
                <span className="text-lg font-black text-blue-400">{daily.water}</span>
                <button
                  onClick={() =>
                    updateDaily(s => ({ ...s, water: Math.min(8, s.water + 1) }))
                  }
                  className="flex size-6 items-center justify-center rounded-full text-sm font-bold text-white/60 transition-all active:scale-90"
                  style={{ background: "rgba(255,255,255,0.07)" }}
                >
                  +
                </button>
              </div>
              <p className="text-[10px] text-white/25">{daily.water}/8 copos</p>
            </div>

            {/* Sleep */}
            <div
              className="rounded-2xl border p-4"
              style={{ borderColor: "rgba(255,255,255,0.07)", background: "#1C1208" }}
            >
              <span className="text-2xl" aria-hidden>😴</span>
              <p className="mt-2 text-xs text-white/40">Sono</p>
              <div className="my-1 flex items-center gap-2">
                <button
                  onClick={() =>
                    updateDaily(s => ({ ...s, sleep: Math.max(3, +(s.sleep - 0.5).toFixed(1)) }))
                  }
                  className="flex size-6 items-center justify-center rounded-full text-sm font-bold text-white/60 transition-all active:scale-90"
                  style={{ background: "rgba(255,255,255,0.07)" }}
                >
                  −
                </button>
                <span className="text-lg font-black text-purple-400">{daily.sleep}h</span>
                <button
                  onClick={() =>
                    updateDaily(s => ({ ...s, sleep: Math.min(12, +(s.sleep + 0.5).toFixed(1)) }))
                  }
                  className="flex size-6 items-center justify-center rounded-full text-sm font-bold text-white/60 transition-all active:scale-90"
                  style={{ background: "rgba(255,255,255,0.07)" }}
                >
                  +
                </button>
              </div>
              <p className="text-[10px] text-white/25">horas ontem</p>
            </div>
          </div>

          {/* Next meal — highlighted card */}
          {nextMeal && (
            <div
              className="rounded-2xl p-4"
              style={{
                background: "rgba(249,115,22,0.07)",
                border: "1px solid rgba(249,115,22,0.3)",
                boxShadow: "0 0 30px rgba(249,115,22,0.07)",
              }}
            >
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-widest text-orange-500/70">
                  Próxima refeição
                </p>
                <span className="text-xs font-bold text-orange-400">{nextMeal.time}</span>
              </div>

              <div className="mb-4 flex items-start gap-3">
                <span className="shrink-0 text-3xl" aria-hidden>{nextMeal.emoji}</span>
                <div className="min-w-0">
                  <p className="mb-1 font-bold text-white">{nextMeal.name}</p>
                  <ul className="flex flex-col gap-1">
                    {nextMeal.items.map((item, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-xs text-white/45">
                        <span
                          className="mt-1.5 size-1 shrink-0 rounded-full"
                          style={{ background: "rgba(249,115,22,0.55)" }}
                          aria-hidden
                        />
                        {item}
                      </li>
                    ))}
                  </ul>
                  {nextMeal.tip && (
                    <p className="mt-2 text-xs italic text-white/25">💡 {nextMeal.tip}</p>
                  )}
                </div>
              </div>

              <button
                onClick={() => toggleMeal(nextMeal.name)}
                className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold transition-all active:scale-[0.98]"
                style={
                  daily.doneMeals.includes(nextMeal.name)
                    ? {
                        background: "rgba(34,197,94,0.12)",
                        color: "#22C55E",
                        border: "1px solid rgba(34,197,94,0.28)",
                      }
                    : { background: "linear-gradient(135deg, #F97316, #EA6A0A)", color: "#fff" }
                }
              >
                {daily.doneMeals.includes(nextMeal.name)
                  ? "✓ Refeição feita!"
                  : "Marcar como feita ✓"}
              </button>
            </div>
          )}

          {/* All meals of the day */}
          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-white/20">
              Refeições de hoje
            </p>
            <div className="flex flex-col gap-2">
              {todayMeals.length === 0 ? (
                <p className="py-6 text-center text-sm text-white/25">
                  Sem refeições para hoje no plano.
                </p>
              ) : (
                todayMeals.map((meal, i) => {
                  const done   = daily.doneMeals.includes(meal.name);
                  const isNext = nextMeal?.name === meal.name;
                  return (
                    <button
                      key={i}
                      onClick={() => toggleMeal(meal.name)}
                      className="flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all active:scale-[0.98]"
                      style={{
                        borderColor: isNext
                          ? "rgba(249,115,22,0.35)"
                          : done
                          ? "rgba(34,197,94,0.2)"
                          : "rgba(255,255,255,0.06)",
                        background: done
                          ? "rgba(34,197,94,0.05)"
                          : isNext
                          ? "rgba(249,115,22,0.04)"
                          : "rgba(255,255,255,0.025)",
                        opacity: done && !isNext ? 0.6 : 1,
                      }}
                    >
                      <span className="shrink-0 text-xl" aria-hidden>{meal.emoji}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-white">{meal.name}</p>
                        <p className="text-xs text-white/30">{meal.time}</p>
                      </div>
                      <div
                        className="flex size-6 shrink-0 items-center justify-center rounded-full"
                        style={{
                          background: done
                            ? "rgba(34,197,94,0.2)"
                            : "rgba(255,255,255,0.05)",
                        }}
                      >
                        {done && (
                          <span className="text-xs font-bold text-green-400">✓</span>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Marmita alert (after 19 h) */}
          {safeNow.getHours() >= 19 && tomorrowLunch && (
            <div
              className="rounded-2xl p-4"
              style={{
                background: "rgba(249,115,22,0.07)",
                border: "1px solid rgba(249,115,22,0.2)",
              }}
            >
              <p className="mb-2 text-sm font-bold text-orange-400">
                🍱 Prepara a marmita para amanhã!
              </p>
              <p className="mb-3 text-xs text-white/35">
                {tomorrowLunch.name} · {tomorrowLunch.time} · {tomorrowName}
              </p>
              <ul className="flex flex-col gap-1">
                {tomorrowLunch.items.map((item, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-xs text-white/45">
                    <span
                      className="mt-1.5 size-1 shrink-0 rounded-full"
                      style={{ background: "rgba(249,115,22,0.55)" }}
                      aria-hidden
                    />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

        </div>
      </main>

      <BottomNav />
    </div>
  );
}

// ── Progress Ring ─────────────────────────────────────────────────────────────

function ProgressRing({ pct, size }: { pct: number; size: number }) {
  const r    = size / 2 - 8;
  const circ = 2 * Math.PI * r;
  const dash = circ * (1 - Math.min(pct, 100) / 100);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="6"
      />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none"
        stroke={pct >= 100 ? "#22C55E" : "#F97316"}
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={dash}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dashoffset 0.5s ease" }}
      />
    </svg>
  );
}

// ── No-plan screen ────────────────────────────────────────────────────────────

function NoPlanScreen({ name }: { name: string }) {
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center px-6 text-center"
      style={{ background: "#0F0A06" }}
    >
      <span className="mb-6 text-6xl" aria-hidden>🍽️</span>
      <h2 className="mb-2 text-xl font-bold text-white">Ainda não tens plano</h2>
      <p className="mb-8 text-sm leading-relaxed text-white/35">
        Olá {name.split(" ")[0]}! Gera o teu plano personalizado com IA para começares a
        acompanhar as tuas refeições.
      </p>
      <Link
        href="/gerar-plano"
        className="rounded-2xl px-8 py-4 text-base font-bold text-white transition-all active:scale-95"
        style={{
          background: "linear-gradient(135deg, #F97316, #EA6A0A)",
          boxShadow: "0 8px 32px rgba(249,115,22,0.3)",
        }}
      >
        Gerar o meu plano 🚀
      </Link>
    </div>
  );
}

// ── Loading screen ────────────────────────────────────────────────────────────

function LoadingScreen() {
  return (
    <div
      className="flex min-h-screen items-center justify-center"
      style={{ background: "#0F0A06" }}
    >
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
