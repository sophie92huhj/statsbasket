import { prisma } from "@/lib/db/client";
import { matchesOfTeam, ownsMatch, ownsOpponent, ownsSeason } from "./scope";

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

export function listMatches(teamId: string, seasonId?: string) {
  return prisma.match.findMany({
    where: { ...matchesOfTeam(teamId), seasonId },
    include: { homeTeam: true, awayTeam: true, season: true },
    orderBy: { date: "desc" },
  });
}

export function getMatch(teamId: string, id: string) {
  return prisma.match.findFirst({
    where: { AND: [{ id }, matchesOfTeam(teamId)] },
    include: {
      homeTeam: true,
      awayTeam: true,
      season: true,
      playerStats: { include: { player: true } },
      teamStats: { include: { team: true } },
    },
  });
}

/**
 * Vérifie qu'un match ne référence que des données de l'équipe suivie : une de ses saisons,
 * l'équipe elle-même d'un côté et un de ses adversaires de l'autre.
 */
export async function matchReferencesBelongToTeam(
  teamId: string,
  refs: { seasonId: string; homeTeamId: string; awayTeamId: string },
): Promise<boolean> {
  const opponentId =
    refs.homeTeamId === teamId ? refs.awayTeamId : refs.awayTeamId === teamId ? refs.homeTeamId : null;
  if (!opponentId) return false;
  const [seasonOk, opponentOk] = await Promise.all([ownsSeason(teamId, refs.seasonId), ownsOpponent(teamId, opponentId)]);
  return seasonOk && opponentOk;
}

/** Les références doivent avoir été vérifiées avec matchReferencesBelongToTeam. */
export function createMatch(input: CreateMatchInput) {
  return prisma.match.create({ data: input });
}

/** Les références modifiées doivent avoir été vérifiées avec matchReferencesBelongToTeam. */
export async function updateMatch(teamId: string, id: string, input: Partial<CreateMatchInput>) {
  if (!(await ownsMatch(teamId, id))) return null;
  return prisma.match.update({ where: { id }, data: input });
}

export async function deleteMatch(teamId: string, id: string): Promise<boolean> {
  return (await prisma.match.deleteMany({ where: { AND: [{ id }, matchesOfTeam(teamId)] } })).count > 0;
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
