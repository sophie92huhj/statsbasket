import { NextResponse } from "next/server";
import { z } from "zod";
import { listTeamStatsForMatch, upsertTeamMatchStat } from "@/lib/repositories/matchStat";

const teamStatSchema = z.object({
  teamId: z.string().min(1),
  fg2Made: z.number().int().min(0).nullish(),
  fg2Att: z.number().int().min(0).nullish(),
  fg3Made: z.number().int().min(0).nullish(),
  fg3Att: z.number().int().min(0).nullish(),
  ftMade: z.number().int().min(0).nullish(),
  ftAtt: z.number().int().min(0).nullish(),
  reboundsOff: z.number().int().min(0).nullish(),
  reboundsDef: z.number().int().min(0).nullish(),
  assists: z.number().int().min(0).nullish(),
  steals: z.number().int().min(0).nullish(),
  turnovers: z.number().int().min(0).nullish(),
  blocks: z.number().int().min(0).nullish(),
  foulsCommitted: z.number().int().min(0).nullish(),
  foulsDrawn: z.number().int().min(0).nullish(),
});

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const stats = await listTeamStatsForMatch(id);
  return NextResponse.json(stats);
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: matchId } = await params;
  const body = await request.json();
  const parsed = teamStatSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const saved = await upsertTeamMatchStat({ matchId, ...parsed.data });
  return NextResponse.json(saved);
}
