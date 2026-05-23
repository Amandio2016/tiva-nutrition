"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { GeneratedPlan, Supplement } from "@/types";
import BottomNav from "@/components/BottomNav";
import { cachePlan, getCachedPlan } from "@/lib/planCache";

// ── Helpers ───────────────────────────────────────────────────────────────────

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function dateISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function loadTakenSupps(): string[] {
  try {
    const raw = localStorage.getItem(`tiva_daily_${todayISO()}`);
    if (raw) return JSON.parse(raw).takenSupps ?? [];
  } catch {}
  return [];
}

function saveTakenSupps(supps: string[]): void {
  try {
    const key = `tiva_daily_${todayISO()}`;
    const raw = localStorage.getItem(key);
    const data = raw ? JSON.parse(raw) : {};
    localStorage.setItem(key, JSON.stringify({ ...data, takenSupps: supps }));
  } catch {}
}

function calcStreak(todayTakenCount: number, essentialCount: number): number {
  const todayDone = todayTakenCount >= Math.max(1, essentialCount);
  let streak = todayDone ? 1 : 0;
  const today = new Date();
  for (let i = 1; i <= 90; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    try {
      const raw = localStorage.getItem(`tiva_daily_${dateISO(d)}`);
      if (!raw) break;
      const data = JSON.parse(raw);
      if ((data.takenSupps?.length ?? 0) > 0) streak++;
      else break;
    } catch { break; }
  }
  return streak;
}

const PRIORITY_CFG = {
  essencial:   { label: "Essencial",   color: "#F97316", bg: "rgba(249,115,22,0.12)" },
  recomendado: { label: "Recomendado", color: "#3B82F6", bg: "rgba(59,130,246,0.12)" },
  opcional:    { label: "Opcional",    color: "#78716C", bg: "rgba(120,113,108,0.12)" },
} as const;

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SuplementosPage() {
  const router = useRouter();
  const [loading,    setLoading]    = useState(true);
  const [plan,       setPlan]       = useState<GeneratedPlan | null>(null);
  const [takenSupps, setTakenSupps] = useState<string[]>([]);
  const [mounted,    setMounted]    = useState(false);

  useEffect(() => {
    setMounted(true);
    setTakenSupps(loadTakenSupps());
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

  const toggle = useCallback((name: string) => {
    setTakenSupps(prev => {
      const next = prev.includes(name)
        ? prev.filter(n => n !== name)
        : [...prev, name];
      saveTakenSupps(next);
      return next;
    });
  }, []);

  if (!mounted || loading) return <LoadingScreen />;

  if (!plan) {
    return (
      <div
        className="flex min-h-screen flex-col items-center justify-center px-6 text-center"
        style={{ background: "#0F0A06" }}
      >
        <span className="mb-6 text-6xl" aria-hidden>💊</span>
        <h2 className="mb-2 text-xl font-bold text-white">Sem plano gerado</h2>
        <p className="mb-8 text-sm text-white/35">
          Gera o teu plano para ver os suplementos recomendados.
        </p>
        <a
          href="/gerar-plano"
          className="rounded-2xl px-8 py-4 text-base font-bold text-white transition-all active:scale-95"
          style={{ background: "linear-gradient(135deg, #F97316, #EA6A0A)" }}
        >
          Gerar plano 🚀
        </a>
        <BottomNav />
      </div>
    );
  }

  const essentialSupps   = plan.supplements.filter(s => s.priority === "essencial");
  const totalTaken       = takenSupps.filter(n => plan.supplements.some(s => s.name === n)).length;
  const streak           = calcStreak(takenSupps.filter(n => essentialSupps.some(s => s.name === n)).length, essentialSupps.length);

  const groups: Record<"essencial" | "recomendado" | "opcional", Supplement[]> = {
    essencial:   plan.supplements.filter(s => s.priority === "essencial"),
    recomendado: plan.supplements.filter(s => s.priority === "recomendado"),
    opcional:    plan.supplements.filter(s => s.priority === "opcional"),
  };

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
        <span className="text-sm font-bold text-white">Suplementos</span>
        <div className="w-20" aria-hidden />
      </header>

      <main className="flex-1 overflow-y-auto pb-20 pt-14">
        <div className="mx-auto flex max-w-[430px] flex-col gap-5 px-4 py-5">

          {/* Daily summary + streak */}
          <div className="grid grid-cols-2 gap-3">
            <div
              className="rounded-2xl border p-4"
              style={{ borderColor: "rgba(255,255,255,0.07)", background: "#1C1208" }}
            >
              <p className="text-xs text-white/40">Hoje</p>
              <p
                className="text-2xl font-black leading-tight"
                style={{
                  color:
                    essentialSupps.length > 0 && totalTaken >= essentialSupps.length
                      ? "#22C55E"
                      : "#F97316",
                }}
              >
                {totalTaken}/{plan.supplements.length}
              </p>
              <p className="text-[10px] text-white/25">tomados</p>
            </div>
            <div
              className="rounded-2xl border p-4"
              style={{ borderColor: "rgba(255,255,255,0.07)", background: "#1C1208" }}
            >
              <p className="text-xs text-white/40">Streak 🔥</p>
              <p className="text-2xl font-black text-orange-400">{streak}</p>
              <p className="text-[10px] text-white/25">
                {streak === 1 ? "dia seguido" : "dias seguidos"}
              </p>
            </div>
          </div>

          {/* Supplements grouped by priority */}
          {(["essencial", "recomendado", "opcional"] as const).map(priority => {
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
                  {items.map((supp, i) => {
                    const taken = takenSupps.includes(supp.name);
                    return (
                      <div
                        key={i}
                        className="rounded-2xl border p-4 transition-all"
                        style={{
                          borderColor: taken
                            ? "rgba(34,197,94,0.22)"
                            : "rgba(255,255,255,0.07)",
                          background: taken
                            ? "rgba(34,197,94,0.06)"
                            : "rgba(255,255,255,0.025)",
                        }}
                      >
                        {/* Top row */}
                        <div className="mb-3 flex items-start justify-between gap-2">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl" aria-hidden>{supp.emoji}</span>
                            <div>
                              <p className="font-semibold text-white">{supp.name}</p>
                              <p className="text-xs font-bold" style={{ color: cfg.color }}>
                                {supp.dose}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => toggle(supp.name)}
                            className="flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all active:scale-95"
                            style={
                              taken
                                ? { background: "rgba(34,197,94,0.15)", color: "#22C55E" }
                                : { background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.45)" }
                            }
                          >
                            {taken ? "✓ Tomado" : "Marcar"}
                          </button>
                        </div>

                        {/* Details */}
                        <div className="flex flex-col gap-1.5">
                          <p className="text-xs text-white/35">
                            <span className="font-semibold text-white/50">⏰ Quando: </span>
                            {supp.timing}
                          </p>
                          <p className="text-xs leading-relaxed text-white/30">{supp.reason}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

        </div>
      </main>

      <BottomNav />
    </div>
  );
}

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
