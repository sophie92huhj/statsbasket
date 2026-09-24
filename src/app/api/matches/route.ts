import { NextResponse } from "next/server";
import { z } from "zod";
import { createMatch, listMatches } from "@/lib/repositories/match";
import { prisma } from "@/lib/db/client";

const createMatchSchema = z.object({
  seasonId: z.string().min(1),
  date: z.coerce.date(),
  competition: z.string().nullish(),
  matchday: z.string().nullish(),
  venue: z.string().nullish(),
  notes: z.string().nullish(),
  isHome: z.boolean(),
  homeTeamId: z.string().min(1),
  awayTeamId: z.string().min(1),
  homeScore: z.number().int().min(0).nullish(),
  awayScore: z.number().int().min(0).nullish(),
  overtimeCount: z.number().int().min(0).optional(),
});

export async function GET(request: Request) {
  const seasonId = new URL(request.url).searchParams.get("seasonId") ?? undefined;
  const matches = await listMatches(seasonId);
  return NextResponse.json(matches);
}

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = createMatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  // Détection de doublon (§29) : même saison, mêmes équipes, même date.
  const duplicate = await prisma.match.findFirst({
    where: {
      seasonId: parsed.data.seasonId,
      homeTeamId: parsed.data.homeTeamId,
      awayTeamId: parsed.data.awayTeamId,
      date: parsed.data.date,
    },
  });
  if (duplicate) {
    return NextResponse.json(
      { error: "Un match identique (même date, mêmes équipes, même saison) existe déjà.", duplicateId: duplicate.id },
      { status: 409 },
    );
  }

  const match = await createMatch(parsed.data);
  return NextResponse.json(match, { status: 201 });
}
