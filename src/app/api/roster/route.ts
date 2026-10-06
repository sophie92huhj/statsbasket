import { NextResponse } from "next/server";
import { z } from "zod";
import { removeRosterEntry, upsertRosterEntry } from "@/lib/repositories/team";

const STATUSES = ["ACTIVE", "BLESSEE", "SUSPENDUE", "PARTIE"] as const;

const upsertSchema = z.object({
  playerId: z.string().min(1),
  teamSeasonId: z.string().min(1),
  status: z.enum(STATUSES).optional(),
});

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = upsertSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const entry = await upsertRosterEntry(parsed.data);
  return NextResponse.json(entry, { status: 201 });
}

export async function DELETE(request: Request) {
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id requis" }, { status: 400 });
  await removeRosterEntry(id);
  return new NextResponse(null, { status: 204 });
}
