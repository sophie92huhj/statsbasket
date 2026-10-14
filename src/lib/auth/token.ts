import { jwtVerify, SignJWT } from "jose";

// Jeton de session signé, stocké dans un cookie httpOnly. Sans dépendance à next/headers
// pour pouvoir être vérifié aussi dans src/proxy.ts.

export const SESSION_COOKIE = "statsbasket_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 jours

export interface SessionPayload {
  /** Équipe suivie consultée ; null = admin connecté sans équipe choisie (page /gestion). */
  teamId: string | null;
  isAdmin: boolean;
}

function getSecretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET n'est pas défini (voir .env.example).");
  return new TextEncoder().encode(secret);
}

export function signSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ teamId: payload.teamId, isAdmin: payload.isAdmin })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(getSecretKey());
}

export async function verifySessionToken(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecretKey(), { algorithms: ["HS256"] });
    const teamId = typeof payload.teamId === "string" ? payload.teamId : null;
    return { teamId, isAdmin: payload.isAdmin === true };
  } catch {
    return null;
  }
}
