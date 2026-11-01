import { NextResponse, type NextRequest } from "next/server";

const PUBLIC = ["/login", "/cadastro"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/api/")) {
    // Bloqueia requisições de outros sites (CSRF) em tudo que altera dados.
    if (req.method !== "GET" && req.method !== "HEAD") {
      const origin = req.headers.get("origin");
      const expected = process.env.APP_ORIGIN || req.nextUrl.origin;
      if (!origin || origin !== expected) return NextResponse.json({ error: "Origem não permitida." }, { status: 403 });
      if (!(req.headers.get("content-type") ?? "").includes("application/json") && req.headers.get("content-length") !== "0")
        return NextResponse.json({ error: "Envie JSON." }, { status: 415 });
    }
    return NextResponse.next();
  }

  const hasSession = req.cookies.has("winner_session");
  if (!hasSession && !PUBLIC.includes(pathname)) return NextResponse.redirect(new URL("/login", req.url));
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/|icons/|manifest.webmanifest|sw.js|favicon.ico|robots.txt).*)"],
};
