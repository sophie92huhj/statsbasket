import { NextResponse } from "next/server";
import { z } from "zod";
import { listTeamSeasons, upsertTeamSeason } from "@/lib/repositories/team";

const upsertSchema = z.object({
  teamId: z.string().min(1),
  seasonId: z.string().min(1),
  category: z.string().nullish(),
  league: z.string().nullish(),
  coachName: z.string().nullish(),
});

export async function GET(request: Request) {
  const seasonId = new URL(request.url).searchParams.get("seasonId") ?? undefined;
  const teamSeasons = await listTeamSeasons(seasonId);
  return NextResponse.json(teamSeasons);
}

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = upsertSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const teamSeason = await upsertTeamSeason(parsed.data);
  return NextResponse.json(teamSeason, { status: 201 });
}
