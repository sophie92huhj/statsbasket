import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiSession } from "@/lib/auth/session";
import { createSeason, listSeasons } from "@/lib/repositories/season";

const createSeasonSchema = z.object({
  label: z.string().min(1),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
});

export async function GET() {
  const auth = await requireApiSession();
  if (auth instanceof NextResponse) return auth;
  const seasons = await listSeasons(auth.teamId);
  return NextResponse.json(seasons);
}

export async function POST(request: Request) {
  const auth = await requireApiSession({ admin: true });
  if (auth instanceof NextResponse) return auth;
  const body = await request.json();
  const parsed = createSeasonSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const season = await createSeason(auth.teamId, parsed.data);
  return NextResponse.json(season, { status: 201 });
}
