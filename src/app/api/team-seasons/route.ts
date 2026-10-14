import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiSession } from "@/lib/auth/session";
import { listTeamSeasons, upsertTeamSeason } from "@/lib/repositories/team";

const upsertSchema = z.object({
  teamId: z.string().min(1),
  seasonId: z.string().min(1),
  category: z.string().nullish(),
  league: z.string().nullish(),
  coachName: z.string().nullish(),
});

export async function GET(request: Request) {
  const auth = await requireApiSession();
  if (auth instanceof NextResponse) return auth;
  const seasonId = new URL(request.url).searchParams.get("seasonId") ?? undefined;
  const teamSeasons = await listTeamSeasons(auth.teamId, seasonId);
  return NextResponse.json(teamSeasons);
}

export async function POST(request: Request) {
  const auth = await requireApiSession({ admin: true });
  if (auth instanceof NextResponse) return auth;
  const body = await request.json();
  const parsed = upsertSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const teamSeason = await upsertTeamSeason(auth.teamId, parsed.data);
  if (!teamSeason) return NextResponse.json({ error: "Équipe ou saison introuvable" }, { status: 404 });
  return NextResponse.json(teamSeason, { status: 201 });
}
