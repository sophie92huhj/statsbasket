import { NextResponse } from "next/server";
import { z } from "zod";
import { requireGlobalAdmin, setSession } from "@/lib/auth/session";
import { getTrackedTeam } from "@/lib/repositories/trackedTeam";

const switchSchema = z.object({ teamId: z.string().min(1) });

/** Admin global : ouvre directement une équipe suivie, sans son mot de passe. */
export async function POST(request: Request) {
  const auth = await requireGlobalAdmin();
  if (auth instanceof NextResponse) return auth;

  const parsed = switchSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  if (!(await getTrackedTeam(parsed.data.teamId))) {
    return NextResponse.json({ error: "Équipe introuvable." }, { status: 404 });
  }

  await setSession({ teamId: parsed.data.teamId, isAdmin: true });
  return NextResponse.json({ ok: true });
}
