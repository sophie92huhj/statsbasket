// Agrégation des statistiques d'équipe sur un ensemble de matchs (§17, §24, §25).
// À partir des lignes individuelles cumulées (les stats d'équipe "officielles"
// quand disponibles sont gérées séparément, voir TeamMatchStat).

import { deriveLine, isKnown } from "./derive";
import { perGame, sum } from "./aggregate";
import type { RawPlayerStatLine } from "./types";
import type { MatchOutcome } from "@/lib/repositories/match";

export interface TeamMatchAggregateInput {
  matchId: string;
  matchDate: Date;
  outcome: MatchOutcome;
  isHome: boolean;
  ownScore: number | null;
  opponentScore: number | null;
  playerLines: RawPlayerStatLine[]; // toutes les lignes joueuses de ce match (dnp inclus)
}

export interface TeamSeasonSummary {
  gamesPlayed: number;
  wins: number;
  losses: number;
  draws: number;

  pointsFor: { total: number | null; perGame: number | null };
  pointsAgainst: { total: number | null; perGame: number | null };
  pointDifferential: { total: number | null; perGame: number | null };

  shooting: {
    fg2Pct: number | null;
    fg3Pct: number | null;
    ftPct: number | null;
    fgPct: number | null;
    efgPct: number | null;
    tsPct: number | null;
  };

  perGameStats: {
    reboundsOff: number | null;
    reboundsDef: number | null;
    reboundsTotal: number | null;
    assists: number | null;
    steals: number | null;
    turnovers: number | null;
    blocks: number | null;
    foulsCommitted: number | null;
    foulsDrawn: number | null;
  };
}

function aggregateMatches(matches: TeamMatchAggregateInput[]): TeamSeasonSummary {
  const gamesPlayed = matches.length;
  const wins = matches.filter((m) => m.outcome === "WIN").length;
  const losses = matches.filter((m) => m.outcome === "LOSS").length;
  const draws = matches.filter((m) => m.outcome === "DRAW").length;

  const pointsForTotal = sum(matches.map((m) => m.ownScore));
  const pointsAgainstTotal = sum(matches.map((m) => m.opponentScore));
  const diffTotal =
    pointsForTotal !== null && pointsAgainstTotal !== null ? pointsForTotal - pointsAgainstTotal : null;

  const allLines = matches.flatMap((m) => m.playerLines.filter((l) => !l.dnp));

  const totalFg2Made = sum(allLines.map((l) => l.fg2Made));
  const totalFg2Att = sum(allLines.map((l) => l.fg2Att));
  const totalFg3Made = sum(allLines.map((l) => l.fg3Made));
  const totalFg3Att = sum(allLines.map((l) => l.fg3Att));
  const totalFtMade = sum(allLines.map((l) => l.ftMade));
  const totalFtAtt = sum(allLines.map((l) => l.ftAtt));
  const totalReboundsOff = sum(allLines.map((l) => l.reboundsOff));
  const totalReboundsDef = sum(allLines.map((l) => l.reboundsDef));
  const totalAssists = sum(allLines.map((l) => l.assists));
  const totalSteals = sum(allLines.map((l) => l.steals));
  const totalTurnovers = sum(allLines.map((l) => l.turnovers));
  const totalBlocks = sum(allLines.map((l) => l.blocks));
  const totalFoulsCommitted = sum(allLines.map((l) => l.foulsCommitted));
  const totalFoulsDrawn = sum(allLines.map((l) => l.foulsDrawn));

  const aggregateShooting = deriveLine({
    fg2Made: totalFg2Made,
    fg2Att: totalFg2Att,
    fg3Made: totalFg3Made,
    fg3Att: totalFg3Att,
    ftMade: totalFtMade,
    ftAtt: totalFtAtt,
    reboundsOff: totalReboundsOff,
    reboundsDef: totalReboundsDef,
    assists: null,
    steals: null,
    turnovers: null,
    blocks: null,
    foulsCommitted: null,
    foulsDrawn: null,
  });

  return {
    gamesPlayed,
    wins,
    losses,
    draws,
    pointsFor: { total: pointsForTotal, perGame: perGame(pointsForTotal, gamesPlayed) },
    pointsAgainst: { total: pointsAgainstTotal, perGame: perGame(pointsAgainstTotal, gamesPlayed) },
    pointDifferential: { total: diffTotal, perGame: perGame(diffTotal, gamesPlayed) },
    shooting: {
      fg2Pct: aggregateShooting.fg2.pct,
      fg3Pct: aggregateShooting.fg3.pct,
      ftPct: aggregateShooting.ft.pct,
      fgPct: aggregateShooting.fg.pct,
      efgPct: aggregateShooting.efgPct,
      tsPct: aggregateShooting.tsPct,
    },
    perGameStats: {
      reboundsOff: perGame(totalReboundsOff, gamesPlayed),
      reboundsDef: perGame(totalReboundsDef, gamesPlayed),
      reboundsTotal:
        totalReboundsOff !== null && totalReboundsDef !== null
          ? perGame(totalReboundsOff + totalReboundsDef, gamesPlayed)
          : null,
      assists: perGame(totalAssists, gamesPlayed),
      steals: perGame(totalSteals, gamesPlayed),
      turnovers: perGame(totalTurnovers, gamesPlayed),
      blocks: perGame(totalBlocks, gamesPlayed),
      foulsCommitted: perGame(totalFoulsCommitted, gamesPlayed),
      foulsDrawn: perGame(totalFoulsDrawn, gamesPlayed),
    },
  };
}

export function summarizeTeamSeason(matches: TeamMatchAggregateInput[]): TeamSeasonSummary {
  return aggregateMatches(matches);
}

/** Découpe les matchs selon un critère pour des vues comparatives (victoires vs défaites, domicile vs extérieur). */
export function splitTeamMatches(matches: TeamMatchAggregateInput[]) {
  return {
    wins: aggregateMatches(matches.filter((m) => m.outcome === "WIN")),
    losses: aggregateMatches(matches.filter((m) => m.outcome === "LOSS")),
    home: aggregateMatches(matches.filter((m) => m.isHome)),
    away: aggregateMatches(matches.filter((m) => !m.isHome)),
  };
}

export { isKnown };
