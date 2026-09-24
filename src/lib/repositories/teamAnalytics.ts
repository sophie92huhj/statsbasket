import { prisma } from "@/lib/db/client";
import { computeMatchOutcome } from "@/lib/repositories/match";
import type { TeamMatchAggregateInput } from "@/lib/stats/teamSeasonStats";

export interface TeamAnalyticsFilters {
  seasonId?: string;
}

/** Récupère les matchs joués (score connu) d'une équipe avec les lignes joueuses associées. */
export async function getTeamMatchAggregateInputs(
  teamId: string,
  filters: TeamAnalyticsFilters = {},
): Promise<TeamMatchAggregateInput[]> {
  const matches = await prisma.match.findMany({
    where: {
      seasonId: filters.seasonId,
      OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }],
      homeScore: { not: null },
      awayScore: { not: null },
    },
    include: { playerStats: true },
    orderBy: { date: "asc" },
  });

  return matches.map((match) => {
    const isHome = match.homeTeamId === teamId;
    const ownScore = isHome ? match.homeScore : match.awayScore;
    const opponentScore = isHome ? match.awayScore : match.homeScore;

    return {
      matchId: match.id,
      outcome: computeMatchOutcome(ownScore, opponentScore),
      isHome,
      ownScore,
      opponentScore,
      playerLines: match.playerStats.map((s) => ({
        dnp: s.dnp,
        secondsPlayed: s.secondsPlayed,
        fg2Made: s.fg2Made,
        fg2Att: s.fg2Att,
        fg3Made: s.fg3Made,
        fg3Att: s.fg3Att,
        ftMade: s.ftMade,
        ftAtt: s.ftAtt,
        reboundsOff: s.reboundsOff,
        reboundsDef: s.reboundsDef,
        assists: s.assists,
        steals: s.steals,
        turnovers: s.turnovers,
        blocks: s.blocks,
        foulsCommitted: s.foulsCommitted,
        foulsDrawn: s.foulsDrawn,
        officialPoints: s.officialPoints,
      })),
    };
  });
}
