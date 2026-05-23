"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/types";
import BottomNav from "@/components/BottomNav";

// ── Helpers ───────────────────────────────────────────────────────────────────

function dateISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function calcWeeklyMeals(): number {
  const today = new Date();
  const monOffset = (today.getDay() + 6) % 7;
  let total = 0;
  for (let i = 0; i <= monOffset; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    try {
      const raw = localStorage.getItem(`tiva_daily_${dateISO(d)}`);
      if (raw) total += JSON.parse(raw).doneMeals?.length ?? 0;
    } catch {}
  }
  return total;
}

function calcConsistencyStreak(): number {
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 90; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    try {
      const raw = localStorage.getItem(`tiva_daily_${dateISO(d)}`);
      if (!raw) { if (i > 0) break; continue; }
      const data = JSON.parse(raw);
      const active =
        (data.doneMeals?.length ?? 0) > 0 ||
        (data.takenSupps?.length ?? 0) > 0 ||
        data.trainingDone;
      if (active) streak++;
      else if (i > 0) break;
    } catch { break; }
  }
  return streak;
}

const GOAL_LABEL: Record<string, string> = {
  ganhar_massa:         "Ganhar massa muscular",
  emagrecer:            "Emagrecer",
  manter_peso:          "Manter o peso",
  melhorar_performance: "Melhorar performance",
};

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PerfilPage() {
  const router = useRouter();
  const [loading,      setLoading]      = useState(true);
  const [profile,      setProfile]      = useState<Profile | null>(null);
  const [planDays,     setPlanDays]     = useState(0);
  const [weeklyMeals,  setWeeklyMeals]  = useState(0);
  const [streak,       setStreak]       = useState(0);
  const [mounted,      setMounted]      = useState(false);
  const [signingOut,   setSigningOut]   = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  useEffect(() => {
    setMounted(true);
    setWeeklyMeals(calcWeeklyMeals());
    setStreak(calcConsistencyStreak());
  }, []);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const [{ data: prof }, { data: planRow }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).single(),
        supabase
          .from("generated_plans")
          .select("created_at")
          .eq("user_id", user.id)
          .eq("is_active", true)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      if (prof) setProfile(prof as Profile);
      if (planRow?.created_at) {
        const days =
          Math.floor((Date.now() - new Date(planRow.created_at).getTime()) / 86_400_000) + 1;
        setPlanDays(days);
      }
      setLoading(false);
    })();
  }, [router]);

  async function handleSignOut() {
    setSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  function handleRegenerate() {
    setRegenerating(true);
    router.push("/gerar-plano");
  }

  function handleEditData() {
    router.push("/onboarding");
  }

  if (!mounted || loading) return <LoadingScreen />;
  if (!profile) return null;

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
        <span className="text-sm font-bold text-white">Perfil</span>
        <div className="w-20" aria-hidden />
      </header>

      <main className="flex-1 overflow-y-auto pb-20 pt-14">
        <div className="mx-auto flex max-w-[430px] flex-col gap-5 px-4 py-5">

          {/* Avatar + identity */}
          <div className="flex flex-col items-center py-4 text-center">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.name}
                referrerPolicy="no-referrer"
                className="mb-4 size-20 rounded-full object-cover"
                style={{ boxShadow: "0 0 0 3px rgba(249,115,22,0.3)" }}
              />
            ) : (
              <div
                className="mb-4 flex size-20 items-center justify-center rounded-full text-3xl font-black text-white"
                style={{
                  background: "rgba(249,115,22,0.2)",
                  boxShadow: "0 0 30px rgba(249,115,22,0.15)",
                }}
              >
                {profile.name?.[0]?.toUpperCase() ?? "?"}
              </div>
            )}
            <h1 className="text-xl font-black text-white">{profile.name}</h1>
            <p className="mt-0.5 text-sm text-white/40">{profile.email}</p>
            <span
              className="mt-3 rounded-full px-3 py-1 text-xs font-bold"
              style={{ background: "rgba(249,115,22,0.12)", color: "#F97316" }}
            >
              {GOAL_LABEL[profile.goal] ?? profile.goal}
            </span>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-3 gap-3">
            <StatCard
              value={planDays > 0 ? String(planDays) : "—"}
              unit={planDays === 1 ? "dia" : "dias"}
              label="Plano activo"
            />
            <StatCard
              value={String(weeklyMeals)}
              unit="refeições"
              label="Esta semana"
            />
            <StatCard
              value={String(streak)}
              unit={streak === 1 ? "dia" : "dias"}
              label="Streak 🔥"
              accent="#F97316"
            />
          </div>

          {/* Body stats */}
          <div
            className="rounded-2xl border p-4"
            style={{ borderColor: "rgba(255,255,255,0.07)", background: "#1C1208" }}
          >
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-white/25">
              Os teus dados
            </p>
            <div className="grid grid-cols-2 gap-y-3 gap-x-4">
              {[
                { label: "Idade",        value: `${profile.age} anos`         },
                { label: "Peso",         value: `${profile.weight_kg} kg`     },
                { label: "Altura",       value: `${profile.height_cm} cm`     },
                { label: "Treinos/sem",  value: `${profile.training_days}×`   },
                { label: "Sono",         value: `${profile.sleep_hours}h/noite` },
                { label: "Actividade",   value: profile.activity_level        },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-[10px] text-white/30">{label}</p>
                  <p className="text-sm font-bold text-white capitalize">{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-3">
            <button
              onClick={handleRegenerate}
              disabled={regenerating}
              className="flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-sm font-bold text-white transition-all disabled:opacity-60 active:scale-[0.98]"
              style={{
                background: "linear-gradient(135deg, #F97316, #EA6A0A)",
                boxShadow: "0 4px 20px rgba(249,115,22,0.25)",
              }}
            >
              🤖 Regenerar plano com IA
            </button>

            <button
              onClick={handleEditData}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border py-4 text-sm font-semibold text-white/70 transition-all active:scale-[0.98]"
              style={{
                borderColor: "rgba(255,255,255,0.1)",
                background: "rgba(255,255,255,0.04)",
              }}
            >
              ✏️ Editar os meus dados
            </button>

            <button
              onClick={handleSignOut}
              disabled={signingOut}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border py-4 text-sm font-semibold transition-all disabled:opacity-60 active:scale-[0.98]"
              style={{
                borderColor: "rgba(239,68,68,0.28)",
                background: "rgba(239,68,68,0.07)",
                color: "#EF4444",
              }}
            >
              {signingOut ? "A sair..." : "🚪 Terminar sessão"}
            </button>
          </div>

          {/* Footer */}
          <div className="pb-2 pt-4 text-center">
            <p className="text-xs text-white/18">Tiva Nutrition v1.0</p>
            <p className="mt-1 text-xs text-white/18">Feito com ❤️ em Moçambique 🇲🇿</p>
          </div>

        </div>
      </main>

      <BottomNav />
    </div>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({
  value, unit, label, accent = "#F97316",
}: {
  value: string; unit: string; label: string; accent?: string;
}) {
  return (
    <div
      className="rounded-xl border p-3 text-center"
      style={{ borderColor: "rgba(255,255,255,0.07)", background: "#1C1208" }}
    >
      <p className="text-2xl font-black leading-none" style={{ color: accent }}>{value}</p>
      <p className="mt-0.5 text-[10px] text-white/25">{unit}</p>
      <p className="mt-1 text-[10px] font-semibold text-white/40">{label}</p>
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
