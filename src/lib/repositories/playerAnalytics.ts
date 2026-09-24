import { prisma } from "@/lib/db/client";
import type { PlayerMatchInput } from "@/lib/stats/playerSeasonStats";

export interface PlayerAnalyticsFilters {
  seasonId?: string;
  teamId?: string;
}

/** Récupère les lignes de statistiques brutes d'une joueuse, prêtes pour le moteur de calcul. */
export async function getPlayerMatchLines(
  playerId: string,
  filters: PlayerAnalyticsFilters = {},
): Promise<PlayerMatchInput[]> {
  const stats = await prisma.playerMatchStat.findMany({
    where: {
      playerId,
      match: {
        seasonId: filters.seasonId,
        ...(filters.teamId
          ? { OR: [{ homeTeamId: filters.teamId }, { awayTeamId: filters.teamId }] }
          : {}),
      },
    },
    include: { match: true },
    orderBy: { match: { date: "asc" } },
  });

  return stats.map((s) => ({
    matchId: s.matchId,
    matchDate: s.match.date,
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
  }));
}
