import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=missing_code", origin));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("[auth/callback] exchangeCodeForSession error:", error.message);
    return NextResponse.redirect(new URL("/login?error=auth_failed", origin));
  }

  // Fetch authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login?error=no_user", origin));
  }

  // Garante que existe um perfil (caso o trigger tenha falhado)
  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_completed")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
    await supabase.from("profiles").upsert({
      id: user.id,
      email: user.email,
      name: user.user_metadata?.full_name ?? "Utilizador",
      avatar_url: user.user_metadata?.avatar_url ?? "",
      onboarding_completed: false,
    }, { onConflict: "id" });
  }

  const destination = profile?.onboarding_completed ? "/dashboard" : "/onboarding";
  return NextResponse.redirect(new URL(destination, origin));
}
