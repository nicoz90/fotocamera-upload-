import { createServerClient } from "@supabase/ssr";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/supabase/config";
import { NextResponse, type NextRequest } from "next/server";

// Rinnova la sessione a ogni richiesta (cookie da 400 giorni) e blocca chi non ha fatto l'accesso.
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const sb = createServerClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (list) => {
          list.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  const { data: { user } } = await sb.auth.getUser();
  const path = request.nextUrl.pathname;
  const pubblica = path === "/login" || path === "/primo-avvio" || path === "/api/primo-avvio";

  if (!user && !pubblica) {
    if (path.startsWith("/api/")) return NextResponse.json({ errore: "Non autenticato" }, { status: 401 });
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }
  if (user && path === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|sw.js|manifest.webmanifest|icons/|robots.txt|favicon.ico).*)"],
};
