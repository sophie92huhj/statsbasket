import { prisma } from "@/lib/db/client";
import { computeMatchOutcome } from "@/lib/repositories/match";
import type { PlayerMatchInput } from "@/lib/stats/playerSeasonStats";
import type { TeamMatchAggregateInput } from "@/lib/stats/teamSeasonStats";

export interface SelectedPlayer {
  playerId: string;
  firstName: string;
  lastName: string;
  lines: PlayerMatchInput[];
}

export interface SelectedMatchesData {
  matches: TeamMatchAggregateInput[]; // triés par date croissante
  players: SelectedPlayer[];
  /** Rebonds offensifs adverses par match (null si non saisis), pour le ratio de rebonds défensifs. */
  opponentReboundsOff: Map<string, number | null>;
}

/** Charge une sélection de matchs de notre équipe avec les lignes joueuses, regroupées par joueuse. */
export async function getSelectedMatchesData(ownTeamId: string, matchIds: string[]): Promise<SelectedMatchesData> {
  const rows = await prisma.match.findMany({
    where: { id: { in: matchIds }, OR: [{ homeTeamId: ownTeamId }, { awayTeamId: ownTeamId }] },
    include: { playerStats: { include: { player: true } }, teamStats: true },
    orderBy: { date: "asc" },
  });

  const players = new Map<string, SelectedPlayer>();
  const opponentReboundsOff = new Map<string, number | null>();

  const matches = rows.map((match) => {
    const isHome = match.homeTeamId === ownTeamId;
    const ownScore = isHome ? match.homeScore : match.awayScore;
    const opponentScore = isHome ? match.awayScore : match.homeScore;
    const opponentTeamId = isHome ? match.awayTeamId : match.homeTeamId;
    opponentReboundsOff.set(match.id, match.teamStats.find((t) => t.teamId === opponentTeamId)?.reboundsOff ?? null);

    const playerLines = match.playerStats.map((s) => {
      const line: PlayerMatchInput = {
        matchId: match.id,
        matchDate: match.date,
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
      };
      const player = players.get(s.playerId) ?? {
        playerId: s.playerId,
        firstName: s.player.firstName,
        lastName: s.player.lastName,
        lines: [],
      };
      player.lines.push(line);
      players.set(s.playerId, player);
      return line;
    });

    return {
      matchId: match.id,
      matchDate: match.date,
      outcome: computeMatchOutcome(ownScore, opponentScore),
      isHome,
      ownScore,
      opponentScore,
      playerLines,
    };
  });

  return { matches, players: [...players.values()], opponentReboundsOff };
}
