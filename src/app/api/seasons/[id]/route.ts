import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiSession } from "@/lib/auth/session";
import { deleteSeason, getSeason, updateSeason } from "@/lib/repositories/season";

const updateSeasonSchema = z.object({
  label: z.string().min(1).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

const NOT_FOUND = { error: "Saison introuvable" };

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiSession();
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  const season = await getSeason(auth.teamId, id);
  if (!season) return NextResponse.json(NOT_FOUND, { status: 404 });
  return NextResponse.json(season);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiSession({ admin: true });
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  const body = await request.json();
  const parsed = updateSeasonSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const season = await updateSeason(auth.teamId, id, parsed.data);
  if (!season) return NextResponse.json(NOT_FOUND, { status: 404 });
  return NextResponse.json(season);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiSession({ admin: true });
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  if (!(await deleteSeason(auth.teamId, id))) return NextResponse.json(NOT_FOUND, { status: 404 });
  return new NextResponse(null, { status: 204 });
}
