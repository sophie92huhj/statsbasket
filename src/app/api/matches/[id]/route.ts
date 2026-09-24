import { NextResponse } from "next/server";
import { z } from "zod";
import { deleteMatch, getMatch, updateMatch } from "@/lib/repositories/match";

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
});

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const match = await getMatch(id);
  if (!match) return NextResponse.json({ error: "Match introuvable" }, { status: 404 });
  return NextResponse.json(match);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const parsed = updateMatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const match = await updateMatch(id, parsed.data);
  return NextResponse.json(match);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await deleteMatch(id);
  return new NextResponse(null, { status: 204 });
}
