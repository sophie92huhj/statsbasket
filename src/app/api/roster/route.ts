import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiSession } from "@/lib/auth/session";
import { removeRosterEntry, upsertRosterEntry } from "@/lib/repositories/team";

const STATUSES = ["ACTIVE", "BLESSEE", "SUSPENDUE", "PARTIE"] as const;

const upsertSchema = z.object({
  playerId: z.string().min(1),
  teamSeasonId: z.string().min(1),
  status: z.enum(STATUSES).optional(),
});

export async function POST(request: Request) {
  const auth = await requireApiSession({ admin: true });
  if (auth instanceof NextResponse) return auth;
  const body = await request.json();
  const parsed = upsertSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const entry = await upsertRosterEntry(auth.teamId, parsed.data);
  if (!entry) return NextResponse.json({ error: "Joueuse ou équipe/saison introuvable" }, { status: 404 });
  return NextResponse.json(entry, { status: 201 });
}

export async function DELETE(request: Request) {
  const auth = await requireApiSession({ admin: true });
  if (auth instanceof NextResponse) return auth;
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id requis" }, { status: 400 });
  if (!(await removeRosterEntry(auth.teamId, id))) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  return new NextResponse(null, { status: 204 });
}
