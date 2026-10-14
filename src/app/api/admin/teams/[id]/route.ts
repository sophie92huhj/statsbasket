import { NextResponse } from "next/server";
import { z } from "zod";
import { requireGlobalAdmin } from "@/lib/auth/session";
import { updateTrackedTeam } from "@/lib/repositories/trackedTeam";

const updateSchema = z.object({
  name: z.string().trim().min(1).optional(),
  password: z.string().min(4, "Le mot de passe doit contenir au moins 4 caractères.").optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireGlobalAdmin();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const parsed = updateSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Requête invalide." }, { status: 400 });
  }
  if (!(await updateTrackedTeam(id, parsed.data))) {
    return NextResponse.json({ error: "Équipe introuvable." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
