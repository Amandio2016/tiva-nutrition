"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGoogleLogin() {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin + "/auth/callback",
      },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    }
    // Se não houver erro, a página redireciona para o Google
  }

  return (
    <div
      className="flex min-h-screen items-center justify-center px-5 py-12"
      style={{ background: "linear-gradient(145deg, #0F0A06 0%, #1E1208 60%, #150E05 100%)" }}
    >
      {/* Ambient glow */}
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 40% at 50% 20%, rgba(249,115,22,0.08) 0%, transparent 70%)",
        }}
        aria-hidden
      />

      <main className="relative w-full max-w-[400px]">

        {/* ── Logo ── */}
        <div className="mb-8 text-center">
          <span className="mb-3 block text-7xl leading-none">💪</span>
          <h1
            className="text-5xl font-black tracking-widest"
            style={{ color: "#F97316", letterSpacing: "0.2em" }}
          >
            TIVA
          </h1>
          <p className="mt-2 text-sm font-semibold uppercase tracking-[0.25em] text-stone-400">
            Nutrition &amp; Performance
          </p>
        </div>

        {/* ── Golden separator ── */}
        <div className="mb-8 flex items-center gap-3">
          <div className="h-px flex-1" style={{ background: "linear-gradient(to right, transparent, #FBBF24)" }} />
          <span style={{ color: "#FBBF24" }} className="text-xs">✦</span>
          <div className="h-px flex-1" style={{ background: "linear-gradient(to left, transparent, #FBBF24)" }} />
        </div>

        {/* ── Hero text ── */}
        <div className="mb-8 text-center">
          <p className="text-xl font-bold leading-snug text-white">
            O teu coach de saúde
            <br />
            <span style={{ color: "#FBBF24" }}>personalizado por IA</span>
          </p>
        </div>

        {/* ── Bullets ── */}
        <ul className="mb-10 space-y-3 px-2">
          {[
            "Menu semanal com alimentos locais",
            "Plano de treino personalizado",
            "Rotina diária optimizada",
          ].map((text) => (
            <li key={text} className="flex items-center gap-3">
              <span
                className="shrink-0 text-sm font-bold"
                style={{ color: "#F97316" }}
                aria-hidden
              >
                ✦
              </span>
              <span className="text-sm text-stone-300">{text}</span>
            </li>
          ))}
        </ul>

        {/* ── Erro ── */}
        {error && (
          <p className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-center text-sm text-red-400">
            {error}
          </p>
        )}

        {/* ── Google button ── */}
        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="flex w-full items-center justify-center gap-3 rounded-2xl bg-white px-6 py-4 text-base font-semibold text-stone-800 shadow-lg transition-all duration-200 hover:bg-stone-50 hover:shadow-xl active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <SpinnerIcon />
              A redirecionar…
            </>
          ) : (
            <>
              <GoogleIcon />
              Continuar com Google
            </>
          )}
        </button>

        {/* ── Divider ── */}
        <div className="my-8 h-px w-full" style={{ background: "rgba(255,255,255,0.06)" }} />

        {/* ── Footer ── */}
        <p className="text-center text-xs text-stone-500">
          Feito em Moçambique 🇲🇿 para atletas africanos
        </p>
      </main>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      className="size-5 shrink-0"
      aria-hidden
    >
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      className="size-5 shrink-0 animate-spin"
      aria-hidden
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}
