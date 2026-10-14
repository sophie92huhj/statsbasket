import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminPassword, verifyPassword } from "@/lib/auth/password";
import { setSession } from "@/lib/auth/session";
import { getTrackedTeamPasswordHash, getTrackedTeam } from "@/lib/repositories/trackedTeam";

const loginSchema = z.object({
  teamId: z.string().min(1),
  password: z.string().min(1),
});

/** Entrée sur une équipe : mot de passe de l'équipe (consultation) ou mot de passe admin global. */
export async function POST(request: Request) {
  const parsed = loginSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Requête invalide." }, { status: 400 });

  const { teamId, password } = parsed.data;
  const team = await getTrackedTeam(teamId);
  if (!team) return NextResponse.json({ error: "Équipe introuvable." }, { status: 404 });

  if (isAdminPassword(password)) {
    await setSession({ teamId, isAdmin: true });
    return NextResponse.json({ ok: true });
  }
  if (await verifyPassword(password, await getTrackedTeamPasswordHash(teamId))) {
    await setSession({ teamId, isAdmin: false });
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "Mot de passe incorrect." }, { status: 401 });
}
