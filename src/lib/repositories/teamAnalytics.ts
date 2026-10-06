import { prisma } from "@/lib/db/client";
import { computeMatchOutcome } from "@/lib/repositories/match";
import type { TeamMatchAggregateInput } from "@/lib/stats/teamSeasonStats";
import { perGame } from "@/lib/stats/aggregate";

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
      matchDate: match.date,
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

export interface PlayerSeasonPoints {
  playerId: string;
  firstName: string;
  lastName: string;
  pointsPerGame: number | null;
}

interface PlayerPointsAccumulator {
  playerId: string;
  firstName: string;
  lastName: string;
  totalPoints: number;
  gamesPlayed: number;
}

/** Points de moyenne par match joué sur la saison, par joueuse de l'équipe (pour le graphique "points par joueuse"). */
export async function getPlayerPointsForTeamSeason(
  teamId: string,
  filters: TeamAnalyticsFilters = {},
): Promise<PlayerSeasonPoints[]> {
  const stats = await prisma.playerMatchStat.findMany({
    where: {
      dnp: false,
      match: {
        seasonId: filters.seasonId,
        OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }],
      },
    },
    include: { player: true },
  });

  const totals = new Map<string, PlayerPointsAccumulator>();
  for (const s of stats) {
    const points =
      s.fg2Made !== null && s.fg3Made !== null && s.ftMade !== null
        ? s.fg2Made * 2 + s.fg3Made * 3 + s.ftMade
        : null;
    if (points === null) continue;
    const existing = totals.get(s.playerId);
    if (existing) {
      existing.totalPoints += points;
      existing.gamesPlayed += 1;
    } else {
      totals.set(s.playerId, {
        playerId: s.playerId,
        firstName: s.player.firstName,
        lastName: s.player.lastName,
        totalPoints: points,
        gamesPlayed: 1,
      });
    }
  }

  return [...totals.values()]
    .map((t) => ({
      playerId: t.playerId,
      firstName: t.firstName,
      lastName: t.lastName,
      pointsPerGame: perGame(t.totalPoints, t.gamesPlayed),
    }))
    .sort((a, b) => (b.pointsPerGame ?? 0) - (a.pointsPerGame ?? 0));
}
