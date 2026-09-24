import { NextResponse } from "next/server";
import { z } from "zod";
import { deleteSeason, getSeason, updateSeason } from "@/lib/repositories/season";

const updateSeasonSchema = z.object({
  label: z.string().min(1).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const season = await getSeason(id);
  if (!season) return NextResponse.json({ error: "Saison introuvable" }, { status: 404 });
  return NextResponse.json(season);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const parsed = updateSeasonSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const season = await updateSeason(id, parsed.data);
  return NextResponse.json(season);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await deleteSeason(id);
  return new NextResponse(null, { status: 204 });
}
