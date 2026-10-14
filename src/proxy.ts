import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/token";

// Filtre optimiste : sans équipe choisie, on renvoie vers la page d'entrée. Le vrai contrôle
// d'accès (cloisonnement par équipe, mode admin) est fait côté serveur dans chaque page et
// route API via src/lib/auth/session.ts.

const PUBLIC_PATHS = ["/connexion", "/gestion", "/api/auth/", "/api/admin/"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(path))) {
    return NextResponse.next();
  }

  const session = await verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value);
  if (session?.teamId) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Session expirée : choisissez une équipe." }, { status: 401 });
  }
  return NextResponse.redirect(new URL("/connexion", request.url));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
