import { NextResponse } from "next/server";
import { z } from "zod";
import { createSeason, listSeasons } from "@/lib/repositories/season";

const createSeasonSchema = z.object({
  label: z.string().min(1),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
});

export async function GET() {
  const seasons = await listSeasons();
  return NextResponse.json(seasons);
}

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = createSeasonSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const season = await createSeason(parsed.data);
  return NextResponse.json(season, { status: 201 });
}
