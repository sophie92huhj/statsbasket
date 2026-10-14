import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminPassword } from "@/lib/auth/password";
import { clearSession, getSession, setSession } from "@/lib/auth/session";

const adminSchema = z.object({ password: z.string().min(1) });

/** Active le mode admin (mot de passe admin global), en gardant l'équipe en cours s'il y en a une. */
export async function POST(request: Request) {
  const parsed = adminSchema.safeParse(await request.json());
  if (!parsed.success || !isAdminPassword(parsed.data.password)) {
    return NextResponse.json({ error: "Mot de passe incorrect." }, { status: 401 });
  }
  const session = await getSession();
  await setSession({ teamId: session?.teamId ?? null, isAdmin: true });
  return NextResponse.json({ ok: true });
}

/** Repasse en mode invité sur l'équipe en cours. */
export async function DELETE() {
  const session = await getSession();
  if (session?.teamId) {
    await setSession({ teamId: session.teamId, isAdmin: false });
  } else {
    await clearSession();
  }
  return new NextResponse(null, { status: 204 });
}
