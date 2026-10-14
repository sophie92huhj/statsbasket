import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  signSessionToken,
  verifySessionToken,
  type SessionPayload,
} from "./token";

// Session côté serveur : c'est ICI que se fait le contrôle d'accès (le proxy n'est qu'un
// filtre optimiste). Toute page ou route API qui lit/modifie des données passe par
// requireTeamSession() ou requireApiSession().

export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  return verifySessionToken(store.get(SESSION_COOKIE)?.value);
}

/** À appeler uniquement depuis une route API (écriture de cookie). */
export async function setSession(payload: SessionPayload): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, await signSessionToken(payload), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function clearSession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export interface TeamSession {
  teamId: string;
  isAdmin: boolean;
}

/** Pour les pages : redirige vers la page d'entrée si aucune équipe n'est choisie. */
export async function requireTeamSession(): Promise<TeamSession> {
  const session = await getSession();
  if (!session?.teamId) redirect("/connexion");
  return { teamId: session.teamId, isAdmin: session.isAdmin };
}

/**
 * Pour les routes API : renvoie la session de l'équipe, ou une réponse 401/403 à retourner telle quelle.
 * `admin: true` pour toute route qui modifie des données.
 */
export async function requireApiSession(options: { admin?: boolean } = {}): Promise<TeamSession | NextResponse> {
  const session = await getSession();
  if (!session?.teamId) {
    return NextResponse.json({ error: "Session expirée : choisissez une équipe." }, { status: 401 });
  }
  if (options.admin && !session.isAdmin) {
    return NextResponse.json({ error: "Mode admin requis." }, { status: 403 });
  }
  return { teamId: session.teamId, isAdmin: session.isAdmin };
}

/** Pour les routes de gestion des équipes (/api/admin/*) : admin global requis, équipe facultative. */
export async function requireGlobalAdmin(): Promise<SessionPayload | NextResponse> {
  const session = await getSession();
  if (!session?.isAdmin) return NextResponse.json({ error: "Mode admin requis." }, { status: 403 });
  return session;
}
