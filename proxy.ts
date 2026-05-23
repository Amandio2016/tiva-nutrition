import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PROTECTED_ROUTES = [
  "/dashboard",
  "/semana",
  "/suplementos",
  "/perfil",
  "/plano",
  "/onboarding",
  "/gerar-plano",
];

const AUTH_ROUTES = ["/login", "/signup", "/auth"];

function isProtected(pathname: string) {
  return PROTECTED_ROUTES.some(r => pathname === r || pathname.startsWith(`${r}/`));
}

function isAuthRoute(pathname: string) {
  return AUTH_ROUTES.some(r => pathname === r || pathname.startsWith(`${r}/`));
}

export async function proxy(request: NextRequest) {
  // Supabase SSR requires starting from NextResponse.next() so cookies propagate.
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Do NOT add logic between createServerClient and getUser().
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Authenticated → skip login/signup
  if (user && isAuthRoute(pathname)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Unauthenticated → redirect protected routes to /login
  if (!user && isProtected(pathname)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Authenticated but onboarding incomplete → force /onboarding
  if (user && isProtected(pathname) && pathname !== "/onboarding") {
    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarding_completed")
      .eq("id", user.id)
      .single();

    if (profile && !profile.onboarding_completed) {
      return NextResponse.redirect(new URL("/onboarding", request.url));
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static, _next/image  (Next.js internals)
     * - favicon.ico, sw.js, manifest.json, icons/  (public assets)
     */
    "/((?!_next/static|_next/image|favicon\\.ico|sw\\.js|manifest\\.json|icons/).*)",
  ],
};
