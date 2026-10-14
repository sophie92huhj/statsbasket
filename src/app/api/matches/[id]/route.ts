import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiSession } from "@/lib/auth/session";
import { deleteMatch, getMatch, matchReferencesBelongToTeam, updateMatch } from "@/lib/repositories/match";

const updateMatchSchema = z.object({
  date: z.coerce.date().optional(),
  competition: z.string().nullish(),
  matchday: z.string().nullish(),
  venue: z.string().nullish(),
  notes: z.string().nullish(),
  isHome: z.boolean().optional(),
  homeTeamId: z.string().min(1).optional(),
  awayTeamId: z.string().min(1).optional(),
  homeScore: z.number().int().min(0).nullish(),
  awayScore: z.number().int().min(0).nullish(),
  overtimeCount: z.number().int().min(0).optional(),
  maxPointDifferentialAdvantage: z.number().int().min(0).nullish(),
  maxPointDifferentialDisadvantage: z.number().int().min(0).nullish(),
});

const NOT_FOUND = { error: "Match introuvable" };

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiSession();
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  const match = await getMatch(auth.teamId, id);
  if (!match) return NextResponse.json(NOT_FOUND, { status: 404 });
  return NextResponse.json(match);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiSession({ admin: true });
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  const body = await request.json();
  const parsed = updateMatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await getMatch(auth.teamId, id);
  if (!existing) return NextResponse.json(NOT_FOUND, { status: 404 });
  if (parsed.data.homeTeamId || parsed.data.awayTeamId) {
    const refsOk = await matchReferencesBelongToTeam(auth.teamId, {
      seasonId: existing.seasonId,
      homeTeamId: parsed.data.homeTeamId ?? existing.homeTeamId,
      awayTeamId: parsed.data.awayTeamId ?? existing.awayTeamId,
    });
    if (!refsOk) return NextResponse.json({ error: "Équipes invalides pour cette équipe." }, { status: 400 });
  }

  const match = await updateMatch(auth.teamId, id, parsed.data);
  if (!match) return NextResponse.json(NOT_FOUND, { status: 404 });
  return NextResponse.json(match);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiSession({ admin: true });
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  if (!(await deleteMatch(auth.teamId, id))) return NextResponse.json(NOT_FOUND, { status: 404 });
  return new NextResponse(null, { status: 204 });
}
