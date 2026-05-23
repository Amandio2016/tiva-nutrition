"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Goal, ActivityLevel } from "@/types";

// ── Local types ───────────────────────────────────────────────────────────────

type JobType = "escritório" | "trabalho_fisico" | "misto";

type FormData = {
  goal: Goal | null;
  name: string;
  age: string;
  weight_kg: string;
  height_cm: string;
  activity_level: ActivityLevel | null;
  job_type: JobType | null;
  sleep_hours: number;
  training_days: number;
  available_foods: string[];
  health_notes: string;
};

const EMPTY: FormData = {
  goal: null,
  name: "",
  age: "",
  weight_kg: "",
  height_cm: "",
  activity_level: null,
  job_type: null,
  sleep_hours: 7,
  training_days: 3,
  available_foods: [],
  health_notes: "",
};

// ── Config data ───────────────────────────────────────────────────────────────

const TOTAL_STEPS = 5;

const STEP_TITLES = [
  "Qual é o teu objetivo?",
  "Fala-nos de ti",
  "O teu dia a dia",
  "O que tens para comer?",
  "Conta-nos mais",
];

const GOALS: { value: Goal; emoji: string; label: string }[] = [
  { value: "ganhar_massa",          emoji: "🏋️", label: "Ganhar massa muscular" },
  { value: "emagrecer",             emoji: "🔥", label: "Emagrecer" },
  { value: "manter_peso",           emoji: "⚖️", label: "Manter o peso" },
  { value: "melhorar_performance",  emoji: "⚡", label: "Melhorar a performance" },
];

const ACTIVITY_LEVELS: { value: ActivityLevel; label: string }[] = [
  { value: "sedentario",  label: "Sedentário" },
  { value: "leve",        label: "Leve" },
  { value: "moderado",    label: "Moderado" },
  { value: "ativo",       label: "Activo" },
  { value: "muito_ativo", label: "Muito activo" },
];

const JOB_TYPES: { value: JobType; emoji: string; label: string }[] = [
  { value: "escritório",      emoji: "💻", label: "Escritório" },
  { value: "trabalho_fisico", emoji: "🔨", label: "Trabalho físico" },
  { value: "misto",           emoji: "🔄", label: "Misto" },
];

const FOODS = [
  { emoji: "🍗", label: "Frango" },
  { emoji: "🐟", label: "Peixe fresco" },
  { emoji: "🥫", label: "Atum em lata" },
  { emoji: "🥚", label: "Ovos" },
  { emoji: "🫘", label: "Feijão" },
  { emoji: "🍚", label: "Arroz" },
  { emoji: "🌽", label: "Xima" },
  { emoji: "🍠", label: "Batata-doce" },
  { emoji: "🥛", label: "Somo/Leite" },
  { emoji: "🥜", label: "Amendoim" },
  { emoji: "🍌", label: "Banana" },
  { emoji: "🍊", label: "Laranja" },
  { emoji: "🥬", label: "Legumes" },
  { emoji: "🥩", label: "Carne vaca" },
  { emoji: "🦐", label: "Camarão" },
  { emoji: "🍎", label: "Maçã" },
  { emoji: "🫐", label: "Matapa" },
  { emoji: "🥑", label: "Abacate" },
  { emoji: "🍅", label: "Tomate" },
  { emoji: "🧅", label: "Cebola" },
];

// ── Validation ────────────────────────────────────────────────────────────────

function isStepValid(step: number, d: FormData): boolean {
  switch (step) {
    case 0: return d.goal !== null;
    case 1:
      return (
        d.name.trim().length > 0 &&
        Number(d.age) >= 15 &&
        Number(d.age) <= 70 &&
        Number(d.weight_kg) > 0 &&
        Number(d.height_cm) > 0 &&
        d.activity_level !== null
      );
    case 2: return d.job_type !== null;
    default: return true; // steps 3 and 4 are optional
  }
}

// ── Shared UI primitives ──────────────────────────────────────────────────────

const inputCls =
  "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white " +
  "placeholder-white/25 outline-none transition-colors focus:border-orange-500/60 " +
  "focus:bg-white/[0.07]";

function StepShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-1/5 overflow-y-auto px-5 py-6" style={{ height: "100%" }}>
      <div className="mx-auto max-w-[400px]">{children}</div>
    </div>
  );
}

function StepTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-2xl font-bold leading-tight text-white">{children}</h2>;
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="mb-2 block text-xs font-semibold uppercase tracking-widest text-white/35">
      {children}
    </span>
  );
}

function SpinnerIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="size-5 animate-spin" aria-hidden>
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<FormData>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const progress = ((step + 1) / TOTAL_STEPS) * 100;

  function next() {
    if (!isStepValid(step, data)) {
      setError("Por favor preenche todos os campos obrigatórios.");
      return;
    }
    setError(null);
    setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
  }

  function back() {
    setError(null);
    setStep((s) => Math.max(s - 1, 0));
  }

  async function handleSubmit() {
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    const { error: dbError } = await supabase
      .from("profiles")
      .upsert({
        id: user.id,
        email: user.email,
        name: data.name,
        goal: data.goal,
        age: Number(data.age),
        weight_kg: Number(data.weight_kg),
        height_cm: Number(data.height_cm),
        activity_level: data.activity_level,
        job_type: data.job_type,
        sleep_hours: data.sleep_hours,
        training_days: data.training_days,
        available_foods: data.available_foods,
        health_notes: data.health_notes,
        onboarding_completed: true,
      }, { onConflict: "id" });

    if (dbError) {
      setError("Erro ao guardar o perfil. Tenta novamente.");
      setLoading(false);
      return;
    }

    // Persist to sessionStorage so /gerar-plano can read it immediately
    sessionStorage.setItem("tiva_onboarding", JSON.stringify(data));
    router.push("/gerar-plano");
  }

  // ── Render ──

  return (
    <div
      className="flex min-h-screen flex-col"
      style={{ background: "linear-gradient(145deg, #0F0A06 0%, #1E1208 100%)" }}
    >
      {/* ── Progress header ── */}
      <header
        className="sticky top-0 z-20 px-5 pb-4 pt-6"
        style={{ background: "rgba(15,10,6,0.96)", backdropFilter: "blur(8px)" }}
      >
        <div className="mx-auto max-w-[400px]">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-widest text-white/30">
              Passo {step + 1} de {TOTAL_STEPS}
            </span>
            <span className="text-xs font-semibold text-orange-500/80">
              {STEP_TITLES[step]}
            </span>
          </div>
          {/* Progress bar */}
          <div className="h-0.5 w-full overflow-hidden rounded-full bg-white/8">
            <div
              className="h-full rounded-full transition-all duration-500 ease-out"
              style={{
                width: `${progress}%`,
                background: "linear-gradient(to right, #F97316, #FBBF24)",
              }}
            />
          </div>
        </div>
      </header>

      {/* ── Sliding steps container ── */}
      {/* overflow-x: clip clips the sliding without breaking y-scroll on each step */}
      <div className="flex-1" style={{ overflowX: "clip" }}>
        <div
          className="flex transition-transform duration-300 ease-in-out"
          style={{
            width: "500%",
            height: "100%",
            transform: `translateX(-${step * 20}%)`,
          }}
        >
          {/* ── Step 1: Goal ── */}
          <StepShell>
            <StepTitle>Qual é o teu objetivo?</StepTitle>
            <p className="mt-1 text-xs text-white/35">Escolhe o que queres alcançar</p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              {GOALS.map((g) => {
                const active = data.goal === g.value;
                return (
                  <button
                    key={g.value}
                    onClick={() => setData((d) => ({ ...d, goal: g.value }))}
                    className={[
                      "flex flex-col items-center gap-2.5 rounded-2xl border p-5 text-center transition-all duration-200 active:scale-[0.97]",
                      active
                        ? "border-orange-500 bg-orange-500/12 shadow-lg shadow-orange-500/10"
                        : "border-white/10 bg-white/4 hover:border-white/20",
                    ].join(" ")}
                  >
                    <span className="text-3xl leading-none">{g.emoji}</span>
                    <span
                      className={[
                        "text-sm font-semibold leading-snug",
                        active ? "text-orange-400" : "text-white/70",
                      ].join(" ")}
                    >
                      {g.label}
                    </span>
                    {active && (
                      <span className="size-2 rounded-full bg-orange-500" aria-hidden />
                    )}
                  </button>
                );
              })}
            </div>
          </StepShell>

          {/* ── Step 2: Physical data ── */}
          <StepShell>
            <StepTitle>Fala-nos de ti</StepTitle>
            <p className="mt-1 text-xs text-white/35">Os teus dados físicos</p>

            <div className="mt-6 flex flex-col gap-5">
              <div>
                <FieldLabel>Nome completo</FieldLabel>
                <input
                  type="text"
                  placeholder="O teu nome"
                  value={data.name}
                  onChange={(e) => setData((d) => ({ ...d, name: e.target.value }))}
                  className={inputCls}
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <FieldLabel>Idade</FieldLabel>
                  <input
                    type="number"
                    placeholder="25"
                    min={15}
                    max={70}
                    value={data.age}
                    onChange={(e) => setData((d) => ({ ...d, age: e.target.value }))}
                    className={inputCls}
                  />
                </div>
                <div>
                  <FieldLabel>Peso kg</FieldLabel>
                  <input
                    type="number"
                    placeholder="70"
                    min={30}
                    value={data.weight_kg}
                    onChange={(e) => setData((d) => ({ ...d, weight_kg: e.target.value }))}
                    className={inputCls}
                  />
                </div>
                <div>
                  <FieldLabel>Altura cm</FieldLabel>
                  <input
                    type="number"
                    placeholder="175"
                    min={100}
                    value={data.height_cm}
                    onChange={(e) => setData((d) => ({ ...d, height_cm: e.target.value }))}
                    className={inputCls}
                  />
                </div>
              </div>

              <div>
                <FieldLabel>Nível de actividade</FieldLabel>
                <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {ACTIVITY_LEVELS.map((a) => {
                    const active = data.activity_level === a.value;
                    return (
                      <button
                        key={a.value}
                        onClick={() => setData((d) => ({ ...d, activity_level: a.value }))}
                        className={[
                          "shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all",
                          active
                            ? "border-orange-500 bg-orange-500 text-white"
                            : "border-white/15 text-white/55 hover:border-white/30 hover:text-white/80",
                        ].join(" ")}
                      >
                        {a.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </StepShell>

          {/* ── Step 3: Lifestyle ── */}
          <StepShell>
            <StepTitle>O teu dia a dia</StepTitle>
            <p className="mt-1 text-xs text-white/35">Estilo de vida e rotina</p>

            <div className="mt-6 flex flex-col gap-6">
              {/* Job type */}
              <div>
                <FieldLabel>Tipo de trabalho</FieldLabel>
                <div className="grid grid-cols-3 gap-3">
                  {JOB_TYPES.map((j) => {
                    const active = data.job_type === j.value;
                    return (
                      <button
                        key={j.value}
                        onClick={() => setData((d) => ({ ...d, job_type: j.value }))}
                        className={[
                          "flex flex-col items-center gap-2 rounded-2xl border py-4 transition-all duration-200",
                          active
                            ? "border-orange-500 bg-orange-500/12"
                            : "border-white/10 bg-white/4 hover:border-white/20",
                        ].join(" ")}
                      >
                        <span className="text-2xl leading-none">{j.emoji}</span>
                        <span
                          className={[
                            "text-center text-xs font-semibold leading-tight",
                            active ? "text-orange-400" : "text-white/60",
                          ].join(" ")}
                        >
                          {j.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Sleep slider */}
              <div>
                <FieldLabel>Horas de sono por noite — {data.sleep_hours}h</FieldLabel>
                <input
                  type="range"
                  min={4}
                  max={10}
                  step={1}
                  value={data.sleep_hours}
                  onChange={(e) =>
                    setData((d) => ({ ...d, sleep_hours: Number(e.target.value) }))
                  }
                  className="w-full cursor-pointer accent-orange-500"
                />
                <div className="mt-1 flex justify-between text-[10px] text-white/25">
                  <span>4h</span>
                  <span>7h</span>
                  <span>10h</span>
                </div>
              </div>

              {/* Training days counter */}
              <div>
                <FieldLabel>Dias de treino por semana</FieldLabel>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() =>
                      setData((d) => ({ ...d, training_days: Math.max(1, d.training_days - 1) }))
                    }
                    className="flex size-11 items-center justify-center rounded-xl border border-white/15 text-xl text-white/60 transition-colors hover:border-orange-500 hover:text-orange-500"
                  >
                    −
                  </button>
                  <span className="min-w-[2.5rem] text-center text-4xl font-black text-orange-500">
                    {data.training_days}
                  </span>
                  <button
                    onClick={() =>
                      setData((d) => ({ ...d, training_days: Math.min(7, d.training_days + 1) }))
                    }
                    className="flex size-11 items-center justify-center rounded-xl border border-white/15 text-xl text-white/60 transition-colors hover:border-orange-500 hover:text-orange-500"
                  >
                    +
                  </button>
                  <span className="text-sm text-white/35">dias / semana</span>
                </div>
              </div>
            </div>
          </StepShell>

          {/* ── Step 4: Foods ── */}
          <StepShell>
            <StepTitle>O que tens para comer?</StepTitle>
            <p className="mt-1 text-xs text-white/35">
              Selecciona o que tens fácil acesso em Moçambique
            </p>

            <div className="mt-4 grid grid-cols-4 gap-2">
              {FOODS.map((food) => {
                const selected = data.available_foods.includes(food.label);
                return (
                  <button
                    key={food.label}
                    onClick={() =>
                      setData((d) => ({
                        ...d,
                        available_foods: selected
                          ? d.available_foods.filter((f) => f !== food.label)
                          : [...d.available_foods, food.label],
                      }))
                    }
                    className={[
                      "flex flex-col items-center gap-1 rounded-xl border px-1 py-2.5 transition-all duration-150 active:scale-95",
                      selected
                        ? "border-orange-500 bg-orange-500/15 shadow-sm shadow-orange-500/20"
                        : "border-white/10 bg-white/4 hover:border-white/20",
                    ].join(" ")}
                  >
                    <span className="text-xl leading-none">{food.emoji}</span>
                    <span
                      className={[
                        "text-center leading-tight",
                        "text-[9px] font-semibold",
                        selected ? "text-orange-400" : "text-white/45",
                      ].join(" ")}
                    >
                      {food.label}
                    </span>
                  </button>
                );
              })}
            </div>

            {data.available_foods.length > 0 && (
              <p className="mt-4 text-center text-xs text-orange-500/60">
                {data.available_foods.length} alimentos seleccionados
              </p>
            )}
          </StepShell>

          {/* ── Step 5: Context + Submit ── */}
          <StepShell>
            <StepTitle>Conta-nos mais</StepTitle>
            <p className="mt-1 text-xs text-white/35">Opcional — para personalizar ainda mais</p>

            <div className="mt-6 flex flex-col gap-5">
              <textarea
                rows={6}
                placeholder="Ex: tenho dores no joelho esquerdo, sou intolerante à lactose, trabalho em turnos, acordo às 5h..."
                value={data.health_notes}
                onChange={(e) => setData((d) => ({ ...d, health_notes: e.target.value }))}
                className={[inputCls, "resize-none leading-relaxed"].join(" ")}
              />

              <div className="flex items-start gap-3 rounded-xl border border-white/8 bg-white/4 px-4 py-3.5">
                <span className="mt-0.5 shrink-0 text-sm text-orange-500">✦</span>
                <p className="text-xs leading-relaxed text-white/45">
                  A IA vai usar estas informações para personalizar o teu plano completo
                  de nutrição, treino e rotina diária.
                </p>
              </div>

              {/* Submit */}
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="mt-1 flex w-full items-center justify-center gap-2.5 rounded-2xl py-4 text-base font-bold text-white transition-all duration-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                style={{
                  background: "linear-gradient(135deg, #F97316 0%, #EA6A0A 100%)",
                  boxShadow: "0 8px 32px rgba(249,115,22,0.35)",
                }}
              >
                {loading ? (
                  <>
                    <SpinnerIcon />
                    A guardar perfil…
                  </>
                ) : (
                  "✨ Gerar o meu plano com IA"
                )}
              </button>

              <p className="text-center text-xs text-white/25">
                Demora cerca de 30 segundos
              </p>
            </div>
          </StepShell>
        </div>
      </div>

      {/* ── Navigation footer ── */}
      <nav
        className="sticky bottom-0 z-20 px-5 pb-6 pt-4"
        style={{ background: "rgba(15,10,6,0.96)", backdropFilter: "blur(8px)" }}
      >
        <div className="mx-auto max-w-[400px]">
          {error && (
            <p className="mb-3 text-center text-xs font-medium text-red-400">{error}</p>
          )}

          <div className="flex gap-3">
            {/* Back button */}
            {step > 0 && (
              <button
                onClick={back}
                className="flex-1 rounded-2xl border border-white/15 py-3.5 text-sm font-semibold text-white/60 transition-all hover:border-white/30 hover:text-white"
              >
                ← Anterior
              </button>
            )}

            {/* Next button — hidden on last step (submit is inside step 5) */}
            {step < TOTAL_STEPS - 1 && (
              <button
                onClick={next}
                className="flex-1 rounded-2xl py-3.5 text-sm font-bold text-white transition-all hover:opacity-90 active:scale-[0.98]"
                style={{
                  background: "linear-gradient(135deg, #F97316 0%, #EA6A0A 100%)",
                  boxShadow: "0 4px 20px rgba(249,115,22,0.25)",
                }}
              >
                Próximo →
              </button>
            )}
          </div>
        </div>
      </nav>
    </div>
  );
}
