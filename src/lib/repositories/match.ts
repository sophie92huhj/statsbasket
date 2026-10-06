import { prisma } from "@/lib/db/client";

export interface CreateMatchInput {
  seasonId: string;
  date: Date;
  competition?: string | null;
  matchday?: string | null;
  venue?: string | null;
  notes?: string | null;
  isHome: boolean;
  homeTeamId: string;
  awayTeamId: string;
  homeScore?: number | null;
  awayScore?: number | null;
  overtimeCount?: number;
  maxPointDifferentialAdvantage?: number | null;
  maxPointDifferentialDisadvantage?: number | null;
}

export function listMatches(seasonId?: string) {
  return prisma.match.findMany({
    where: seasonId ? { seasonId } : undefined,
    include: { homeTeam: true, awayTeam: true, season: true },
    orderBy: { date: "desc" },
  });
}

export function getMatch(id: string) {
  return prisma.match.findUnique({
    where: { id },
    include: {
      homeTeam: true,
      awayTeam: true,
      season: true,
      playerStats: { include: { player: true } },
      teamStats: { include: { team: true } },
    },
  });
}

export function createMatch(input: CreateMatchInput) {
  return prisma.match.create({ data: input });
}

export function updateMatch(id: string, input: Partial<CreateMatchInput>) {
  return prisma.match.update({ where: { id }, data: input });
}

export function deleteMatch(id: string) {
  return prisma.match.delete({ where: { id } });
}

/** Résultat d'un match du point de vue de "notre" équipe (§4). Null si score(s) non renseigné. */
export type MatchOutcome = "WIN" | "LOSS" | "DRAW" | null;

export function computeMatchOutcome(
  ownScore: number | null | undefined,
  opponentScore: number | null | undefined,
): MatchOutcome {
  if (ownScore === null || ownScore === undefined || opponentScore === null || opponentScore === undefined) {
    return null;
  }
  if (ownScore > opponentScore) return "WIN";
  if (ownScore < opponentScore) return "LOSS";
  return "DRAW";
}

export function computePointDifferential(
  ownScore: number | null | undefined,
  opponentScore: number | null | undefined,
): number | null {
  if (ownScore === null || ownScore === undefined || opponentScore === null || opponentScore === undefined) {
    return null;
  }
  return ownScore - opponentScore;
}
