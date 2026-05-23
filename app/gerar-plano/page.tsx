"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { GeneratedPlan, MealItem, Supplement, TrainingDay, AvoidItem } from "@/types";

// ── Constants ─────────────────────────────────────────────────────────────────

const LOADING_MESSAGES = [
  "A analisar o teu perfil...",
  "A calcular as tuas necessidades calóricas...",
  "A criar o teu menu semanal...",
  "A seleccionar os melhores suplementos...",
  "A estruturar a tua rotina diária...",
  "A montar o teu plano de treino...",
  "A finalizar o teu plano completo...",
];

const TABS = [
  { icon: "🎯", label: "Resumo" },
  { icon: "🍽️", label: "Menu" },
  { icon: "💊", label: "Suplementos" },
  { icon: "⏰", label: "Rotina" },
  { icon: "🏋️", label: "Treino" },
  { icon: "🚫", label: "Evitar" },
];

const DAY_ORDER = [
  "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo",
];
const DAY_SHORT: Record<string, string> = {
  Segunda: "Seg", Terça: "Ter", Quarta: "Qua",
  Quinta: "Qui", Sexta: "Sex", Sábado: "Sáb", Domingo: "Dom",
};

// ── Page ──────────────────────────────────────────────────────────────────────

type Phase = "loading" | "success" | "error";

export default function GerarPlanoPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("loading");
  const [plan, setPlan] = useState<GeneratedPlan | null>(null);
  const [msgIndex, setMsgIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const generate = useCallback(async () => {
    setPhase("loading");
    setProgress(0);
    setMsgIndex(0);
    setErrMsg(null);

    try {
      const raw = sessionStorage.getItem("tiva_onboarding");
      const body = raw ? JSON.parse(raw) : {};

      const res = await fetch("/api/generate-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Erro ${res.status}`);
      }

      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? "Erro ao gerar plano");
      setPlan(data.plan);
      setProgress(100);
      setPhase("success");
    } catch (e) {
      setErrMsg(e instanceof Error ? e.message : "Erro desconhecido");
      setPhase("error");
    }
  }, []);

  // Start on mount
  useEffect(() => { generate(); }, [generate]);

  // Rotate messages every 3 s
  useEffect(() => {
    if (phase !== "loading") return;
    const id = setInterval(
      () => setMsgIndex((i) => (i + 1) % LOADING_MESSAGES.length),
      3000
    );
    return () => clearInterval(id);
  }, [phase]);

  // Advance progress bar (~90 % over ~54 s)
  useEffect(() => {
    if (phase !== "loading") return;
    const id = setInterval(
      () => setProgress((p) => (p >= 90 ? p : +(p + 1).toFixed(1))),
      600
    );
    return () => clearInterval(id);
  }, [phase]);

  async function savePlan() {
    if (saving) return;
    setSaving(true);
    router.push("/dashboard");
  }

  if (phase === "loading") return <LoadingPhase index={msgIndex} progress={progress} />;
  if (phase === "error")   return <ErrorPhase msg={errMsg} onRetry={generate} />;
  if (!plan)               return null;
  return <PlanDisplay plan={plan} saving={saving} onSave={savePlan} />;
}

// ── Phase: Loading ────────────────────────────────────────────────────────────

function LoadingPhase({ index, progress }: { index: number; progress: number }) {
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center px-6 text-center"
      style={{ background: "linear-gradient(145deg, #0F0A06 0%, #1E1208 100%)" }}
    >
      {/* Pulsing rings */}
      <div className="relative mb-12 flex items-center justify-center">
        <div
          className="absolute size-56 rounded-full bg-orange-500/5 animate-ping"
          style={{ animationDuration: "2.5s" }}
          aria-hidden
        />
        <div
          className="absolute size-40 rounded-full bg-orange-500/8 animate-ping"
          style={{ animationDuration: "2s", animationDelay: "0.4s" }}
          aria-hidden
        />
        <div
          className="absolute size-28 rounded-full bg-orange-500/12 animate-ping"
          style={{ animationDuration: "1.5s", animationDelay: "0.8s" }}
          aria-hidden
        />
        <div
          className="relative z-10 flex size-20 items-center justify-center rounded-full"
          style={{
            background: "linear-gradient(135deg, #F97316, #EA6A0A)",
            boxShadow: "0 0 60px rgba(249,115,22,0.5)",
          }}
        >
          <span className="text-3xl" aria-hidden>💪</span>
        </div>
      </div>

      {/* Rotating message */}
      <p className="mb-1 text-lg font-semibold text-white transition-all duration-500">
        {LOADING_MESSAGES[index]}
      </p>
      <p className="mb-10 text-xs text-white/25">
        Powered by Claude AI · cerca de 30 segundos
      </p>

      {/* Progress bar */}
      <div className="w-full max-w-xs">
        <div className="mb-2 flex justify-between text-xs text-white/25">
          <span>A gerar o teu plano</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full transition-all duration-700 ease-out"
            style={{
              width: `${progress}%`,
              background: "linear-gradient(to right, #F97316, #FBBF24)",
            }}
          />
        </div>
      </div>
    </div>
  );
}

// ── Phase: Error ──────────────────────────────────────────────────────────────

function ErrorPhase({ msg, onRetry }: { msg: string | null; onRetry: () => void }) {
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center px-6 text-center"
      style={{ background: "#0F0A06" }}
    >
      <span className="mb-4 text-5xl" aria-hidden>😔</span>
      <h2 className="mb-2 text-xl font-bold text-white">Algo correu mal</h2>
      <p className="mb-1 text-sm text-white/40">
        {msg ?? "Não foi possível gerar o plano."}
      </p>
      <p className="mb-10 text-xs text-white/25">
        Verifica a tua ligação e tenta novamente.
      </p>
      <button
        onClick={onRetry}
        className="rounded-2xl px-8 py-3.5 text-sm font-bold text-white transition-all active:scale-95"
        style={{
          background: "linear-gradient(135deg, #F97316, #EA6A0A)",
          boxShadow: "0 4px 20px rgba(249,115,22,0.3)",
        }}
      >
        🔄 Tentar novamente
      </button>
    </div>
  );
}

// ── Phase: Plan display ───────────────────────────────────────────────────────

function PlanDisplay({
  plan,
  saving,
  onSave,
}: {
  plan: GeneratedPlan;
  saving: boolean;
  onSave: () => void;
}) {
  const [activeTab, setActiveTab] = useState(0);
  const [selectedDay, setSelectedDay] = useState(
    () => DAY_ORDER.find((d) => plan.weekly_menu[d]) ?? DAY_ORDER[0]
  );
  const [expandedDay, setExpandedDay] = useState<string | null>(null);

  return (
    <div className="flex min-h-screen flex-col" style={{ background: "#0F0A06" }}>
      {/* Header */}
      <header
        className="sticky top-0 z-20 border-b px-5 py-4"
        style={{
          borderColor: "rgba(255,255,255,0.06)",
          background: "rgba(15,10,6,0.96)",
          backdropFilter: "blur(10px)",
        }}
      >
        <div className="mx-auto max-w-[480px]">
          <p className="text-xs font-semibold uppercase tracking-widest text-orange-500/70">
            O teu plano está pronto ✨
          </p>
          <h1 className="text-lg font-bold leading-tight text-white">
            Plano Personalizado
          </h1>
        </div>
      </header>

      {/* Tab bar */}
      <div
        className="sticky top-[65px] z-10 border-b"
        style={{
          borderColor: "rgba(255,255,255,0.06)",
          background: "rgba(15,10,6,0.95)",
          backdropFilter: "blur(10px)",
        }}
      >
        <div className="mx-auto max-w-[480px]">
          <div className="flex overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {TABS.map((tab, i) => (
              <button
                key={i}
                onClick={() => setActiveTab(i)}
                className={[
                  "flex shrink-0 flex-col items-center gap-0.5 border-b-2 px-4 py-3 text-center transition-all",
                  activeTab === i
                    ? "border-orange-500 text-orange-400"
                    : "border-transparent text-white/30 hover:text-white/55",
                ].join(" ")}
              >
                <span className="text-lg leading-none" aria-hidden>{tab.icon}</span>
                <span className="text-[10px] font-semibold">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 pb-28">
        <div className="mx-auto max-w-[480px] px-5 py-5">
          {activeTab === 0 && <TabResumo plan={plan} />}
          {activeTab === 1 && (
            <TabMenu
              plan={plan}
              selectedDay={selectedDay}
              setSelectedDay={setSelectedDay}
            />
          )}
          {activeTab === 2 && <TabSupplementos plan={plan} />}
          {activeTab === 3 && <TabRotina plan={plan} />}
          {activeTab === 4 && (
            <TabTreino
              plan={plan}
              expandedDay={expandedDay}
              setExpandedDay={setExpandedDay}
            />
          )}
          {activeTab === 5 && <TabEvitar plan={plan} />}
        </div>
      </main>

      {/* Fixed save button */}
      <div
        className="fixed bottom-0 left-0 right-0 px-5 pb-6 pt-4"
        style={{
          background: "rgba(15,10,6,0.97)",
          backdropFilter: "blur(10px)",
          borderTop: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div className="mx-auto max-w-[480px]">
          <button
            onClick={onSave}
            disabled={saving}
            className="flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-base font-bold text-white transition-all disabled:cursor-not-allowed disabled:opacity-60 active:scale-[0.98]"
            style={{
              background: "linear-gradient(135deg, #F97316, #EA6A0A)",
              boxShadow: "0 8px 32px rgba(249,115,22,0.3)",
            }}
          >
            {saving ? (
              <><SpinnerIcon /> A guardar...</>
            ) : (
              "Guardar e ir para o Dashboard →"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Tab 1: Resumo ─────────────────────────────────────────────────────────────

function TabResumo({ plan }: { plan: GeneratedPlan }) {
  return (
    <div className="flex flex-col gap-4">
      {/* Coach message */}
      <div
        className="rounded-2xl border p-5"
        style={{ borderColor: "rgba(249,115,22,0.2)", background: "rgba(249,115,22,0.07)" }}
      >
        <p className="mb-2 text-xs font-bold uppercase tracking-widest text-orange-500/70">
          Coach IA
        </p>
        <p className="text-sm leading-relaxed text-white/80">{plan.coach_message}</p>
      </div>

      {/* Goal summary */}
      <p className="text-sm leading-relaxed text-white/45">{plan.user_goal_summary}</p>

      {/* Metrics */}
      <div className="grid grid-cols-3 gap-3">
        <MetricCard label="Calorias/dia" value={String(plan.weekly_calories)} unit="kcal" />
        <MetricCard label="Proteína/dia" value={String(plan.daily_protein_g)} unit="g" />
        <MetricCard label="Dias treino" value={String(plan.training_plan.length)} unit="dias/sem" />
      </div>

      {/* CTA */}
      <div
        className="rounded-2xl border p-5 text-center"
        style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.03)" }}
      >
        <p className="text-base font-bold text-white">🚀 Começa hoje</p>
        <p className="mt-1 text-xs text-white/35">
          Vai ao tab Menu e acompanha as tuas refeições do dia
        </p>
      </div>
    </div>
  );
}

function MetricCard({
  label, value, unit,
}: {
  label: string; value: string; unit: string;
}) {
  return (
    <div
      className="rounded-xl border p-3 text-center"
      style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)" }}
    >
      <p className="text-2xl font-black text-orange-500">{value}</p>
      <p className="text-[10px] text-white/30">{unit}</p>
      <p className="mt-0.5 text-[10px] font-semibold text-white/45">{label}</p>
    </div>
  );
}

// ── Tab 2: Menu da Semana ─────────────────────────────────────────────────────

function TabMenu({
  plan,
  selectedDay,
  setSelectedDay,
}: {
  plan: GeneratedPlan;
  selectedDay: string;
  setSelectedDay: (d: string) => void;
}) {
  const availableDays = DAY_ORDER.filter((d) => plan.weekly_menu[d]);
  const meals: MealItem[] = plan.weekly_menu[selectedDay] ?? [];

  return (
    <div className="flex flex-col gap-4">
      {/* Day selector */}
      <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {availableDays.map((day) => {
          const active = selectedDay === day;
          return (
            <button
              key={day}
              onClick={() => setSelectedDay(day)}
              className={[
                "flex shrink-0 flex-col items-center rounded-2xl border px-3.5 py-2.5 transition-all",
                active
                  ? "border-orange-500 bg-orange-500/15 text-orange-400"
                  : "border-white/10 bg-white/4 text-white/45 hover:border-white/20",
              ].join(" ")}
            >
              <span className="text-xs font-bold">{DAY_SHORT[day] ?? day}</span>
            </button>
          );
        })}
      </div>

      {/* Meals */}
      <div className="flex flex-col gap-3">
        {meals.map((meal, i) => (
          <DarkMealCard key={i} meal={meal} />
        ))}
        {meals.length === 0 && (
          <p className="py-8 text-center text-sm text-white/25">
            Sem refeições para este dia.
          </p>
        )}
      </div>
    </div>
  );
}

function DarkMealCard({ meal }: { meal: MealItem }) {
  return (
    <div
      className="rounded-2xl border p-4"
      style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)" }}
    >
      <div className="mb-3 flex items-center gap-3">
        <span
          className="flex size-11 shrink-0 items-center justify-center rounded-xl text-2xl"
          style={{ background: "rgba(249,115,22,0.1)" }}
          aria-hidden
        >
          {meal.emoji}
        </span>
        <div>
          <p className="font-semibold text-white">{meal.name}</p>
          <p className="text-sm font-medium text-orange-500">{meal.time}</p>
        </div>
      </div>

      <ul className="flex flex-col gap-1.5">
        {meal.items.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-xs text-white/50">
            <span
              className="mt-1.5 size-1 shrink-0 rounded-full"
              style={{ background: "rgba(249,115,22,0.6)" }}
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
  );
}

// ── Tab 3: Suplementos ────────────────────────────────────────────────────────

const PRIORITY_CFG = {
  essencial:    { label: "Essencial",    color: "#F97316", bg: "rgba(249,115,22,0.12)" },
  recomendado:  { label: "Recomendado",  color: "#3B82F6", bg: "rgba(59,130,246,0.12)" },
  opcional:     { label: "Opcional",     color: "#78716C", bg: "rgba(120,113,108,0.12)" },
} as const;

function TabSupplementos({ plan }: { plan: GeneratedPlan }) {
  const groups: Record<string, Supplement[]> = {
    essencial: [], recomendado: [], opcional: [],
  };
  plan.supplements.forEach((s) => {
    if (s.priority in groups) groups[s.priority].push(s);
  });

  return (
    <div className="flex flex-col gap-6">
      {(["essencial", "recomendado", "opcional"] as const).map((priority) => {
        const items = groups[priority];
        if (!items.length) return null;
        const cfg = PRIORITY_CFG[priority];
        return (
          <div key={priority}>
            <div className="mb-3 flex items-center gap-3">
              <span
                className="rounded-full px-2.5 py-0.5 text-xs font-bold"
                style={{ color: cfg.color, background: cfg.bg }}
              >
                {cfg.label}
              </span>
              <div className="h-px flex-1" style={{ background: "rgba(255,255,255,0.07)" }} />
            </div>
            <div className="flex flex-col gap-3">
              {items.map((s, i) => (
                <div
                  key={i}
                  className="rounded-2xl border p-4"
                  style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)" }}
                >
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="text-2xl" aria-hidden>{s.emoji}</span>
                      <div>
                        <p className="font-semibold text-white">{s.name}</p>
                        <p className="text-xs text-orange-400">{s.dose}</p>
                      </div>
                    </div>
                    <span
                      className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold"
                      style={{ color: cfg.color, background: cfg.bg }}
                    >
                      {cfg.label}
                    </span>
                  </div>
                  <p className="text-xs text-white/40">⏰ {s.timing}</p>
                  <p className="mt-1 text-xs leading-relaxed text-white/30">{s.reason}</p>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Tab 4: Rotina Diária ──────────────────────────────────────────────────────

function activityColor(activity: string): string {
  const a = activity.toLowerCase();
  if (["treino", "exerc", "ginás", "corrida", "fitness"].some((k) => a.includes(k)))
    return "#F97316";
  if (["refeição", "almoço", "jantar", "matabicho", "lanche", "snack", "comer", "coma"].some((k) => a.includes(k)))
    return "#22C55E";
  if (["sono", "dormir", "descanso", "cama", "deitar"].some((k) => a.includes(k)))
    return "#A855F7";
  if (["trabalho", "escritório", "reunião", "trabalhar"].some((k) => a.includes(k)))
    return "#3B82F6";
  return "#78716C";
}

function TabRotina({ plan }: { plan: GeneratedPlan }) {
  const { daily_routine } = plan;
  return (
    <div>
      <div className="mb-5 flex items-center justify-between text-xs text-white/25">
        <span>⏰ {daily_routine.wake_time} — acordar</span>
        <span>🌙 {daily_routine.sleep_time} — dormir</span>
      </div>

      <div className="relative">
        {/* Vertical guide line */}
        <div
          className="absolute left-5 top-0 h-full w-px"
          style={{ background: "rgba(255,255,255,0.06)" }}
          aria-hidden
        />

        <div className="flex flex-col gap-4">
          {daily_routine.schedule.map((item, i) => {
            const color = activityColor(item.activity);
            return (
              <div key={i} className="relative flex gap-4">
                {/* Dot */}
                <div
                  className="relative z-10 flex size-10 shrink-0 items-center justify-center rounded-full border"
                  style={{ background: "#0F0A06", borderColor: `${color}40` }}
                >
                  <span className="text-base leading-none" aria-hidden>{item.emoji}</span>
                </div>

                <div
                  className="flex-1 rounded-xl border px-4 py-3"
                  style={{
                    borderColor: "rgba(255,255,255,0.07)",
                    background: "rgba(255,255,255,0.04)",
                    borderLeft: `3px solid ${color}`,
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-white">{item.activity}</p>
                    <span className="shrink-0 text-xs font-bold" style={{ color }}>
                      {item.time}
                    </span>
                  </div>
                  {item.tip && (
                    <p className="mt-1 text-xs leading-relaxed text-white/30">{item.tip}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Tab 5: Treino ─────────────────────────────────────────────────────────────

function TabTreino({
  plan,
  expandedDay,
  setExpandedDay,
}: {
  plan: GeneratedPlan;
  expandedDay: string | null;
  setExpandedDay: (d: string | null) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      {plan.training_plan.map((day: TrainingDay) => {
        const open = expandedDay === day.day;
        return (
          <div
            key={day.day}
            className="overflow-hidden rounded-2xl border"
            style={{ borderColor: "rgba(255,255,255,0.09)", background: "rgba(255,255,255,0.04)" }}
          >
            <button
              onClick={() => setExpandedDay(open ? null : day.day)}
              className="flex w-full items-center justify-between p-4 text-left"
            >
              <div>
                <p className="font-bold text-white">{day.day}</p>
                <p className="text-xs text-orange-400">{day.focus}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-white/25">
                  {day.exercises.length} exercícios
                </span>
                <span className="text-xs text-white/35">{open ? "▲" : "▼"}</span>
              </div>
            </button>

            {open && (
              <div
                className="border-t px-4 pb-4 pt-3"
                style={{ borderColor: "rgba(255,255,255,0.06)" }}
              >
                <div className="flex flex-col gap-2.5">
                  {day.exercises.map((ex, i) => (
                    <div
                      key={i}
                      className="rounded-xl border px-4 py-3"
                      style={{ borderColor: "rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.04)" }}
                    >
                      <div className="mb-1.5 flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold text-white">{ex.name}</p>
                        <span
                          className="shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold text-orange-400"
                          style={{ background: "rgba(249,115,22,0.12)" }}
                        >
                          {ex.sets}×{ex.reps}
                        </span>
                      </div>
                      <p className="text-xs text-white/35">⏸ Descanso: {ex.rest}</p>
                      {ex.tip && (
                        <p className="mt-1 text-xs italic text-white/25">{ex.tip}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Tab 6: Evitar ─────────────────────────────────────────────────────────────

const AVOID_LABELS: Record<string, string> = {
  alimento:      "🍔 Alimentos",
  habito:        "📵 Hábitos",
  comportamento: "🧠 Comportamentos",
};

function TabEvitar({ plan }: { plan: GeneratedPlan }) {
  const groups: Record<string, AvoidItem[]> = {
    alimento: [], habito: [], comportamento: [],
  };
  plan.avoid_list.forEach((item) => {
    if (item.category in groups) groups[item.category].push(item);
  });

  return (
    <div className="flex flex-col gap-6">
      {(["alimento", "habito", "comportamento"] as const).map((cat) => {
        const items = groups[cat];
        if (!items.length) return null;
        return (
          <div key={cat}>
            <h3 className="mb-3 text-sm font-bold text-white/50">
              {AVOID_LABELS[cat]}
            </h3>
            <div className="flex flex-col gap-2">
              {items.map((item: AvoidItem, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 rounded-xl border px-4 py-3"
                  style={{
                    borderColor: "rgba(239,68,68,0.18)",
                    background: "rgba(239,68,68,0.07)",
                  }}
                >
                  <span className="shrink-0 text-xl" aria-hidden>{item.emoji}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white">{item.item}</p>
                    <p className="text-xs leading-relaxed text-white/35">{item.reason}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Shared UI ─────────────────────────────────────────────────────────────────

function SpinnerIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="size-5 animate-spin" aria-hidden>
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}
