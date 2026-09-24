// Agrégation des statistiques d'une joueuse sur un ensemble de matchs (§18, §19, §20, §21).
// Combine les lignes brutes de plusieurs matchs pour produire totaux, moyennes,
// médianes, écart-type et ratios /40min — toujours en respectant null vs 0 (§30).

import { distribution, mean, per40, perGame, sum } from "./aggregate";
import { deriveLine, isKnown } from "./derive";
import type { Distribution } from "./aggregate";
import type { Maybe, RawPlayerStatLine } from "./types";

export interface PlayerMatchInput extends RawPlayerStatLine {
  matchId: string;
  matchDate: Date;
}

export interface PlayerSeasonSummary {
  gamesPlayed: number; // matchs où dnp = false
  gamesInRoster: number; // total de lignes fournies (dnp inclus)

  totals: {
    points: number | null;
    fg2Made: number | null;
    fg2Att: number | null;
    fg3Made: number | null;
    fg3Att: number | null;
    ftMade: number | null;
    ftAtt: number | null;
    reboundsOff: number | null;
    reboundsDef: number | null;
    reboundsTotal: number | null;
    assists: number | null;
    steals: number | null;
    turnovers: number | null;
    blocks: number | null;
    foulsCommitted: number | null;
    foulsDrawn: number | null;
    secondsPlayed: number | null;
  };

  perGame: {
    points: number | null;
    reboundsTotal: number | null;
    assists: number | null;
    steals: number | null;
    turnovers: number | null;
    blocks: number | null;
    foulsCommitted: number | null;
    foulsDrawn: number | null;
    secondsPlayed: number | null;
  };

  per40: {
    points: number | null;
    reboundsTotal: number | null;
    assists: number | null;
    steals: number | null;
    turnovers: number | null;
    blocks: number | null;
    foulsCommitted: number | null;
    foulsDrawn: number | null;
  };

  shooting: {
    fg2Pct: number | null;
    fg3Pct: number | null;
    ftPct: number | null;
    fgPct: number | null;
    efgPct: number | null;
    tsPct: number | null;
  };

  distributions: {
    points: Distribution;
    reboundsTotal: Distribution;
    assists: Distribution;
    secondsPlayed: Distribution;
  };

  bests: {
    points: { value: number; matchId: string; matchDate: Date } | null;
    reboundsTotal: { value: number; matchId: string; matchDate: Date } | null;
    assists: { value: number; matchId: string; matchDate: Date } | null;
    steals: { value: number; matchId: string; matchDate: Date } | null;
    blocks: { value: number; matchId: string; matchDate: Date } | null;
    secondsPlayed: { value: number; matchId: string; matchDate: Date } | null;
  };
}

function findBest(
  lines: PlayerMatchInput[],
  getValue: (l: PlayerMatchInput) => Maybe<number>,
): { value: number; matchId: string; matchDate: Date } | null {
  let best: { value: number; matchId: string; matchDate: Date } | null = null;
  for (const line of lines) {
    const value = getValue(line);
    if (!isKnown(value)) continue;
    if (best === null || value > best.value) {
      best = { value, matchId: line.matchId, matchDate: line.matchDate };
    }
  }
  return best;
}

/** Calcule le résumé de saison d'une joueuse à partir de ses lignes de match brutes. */
export function summarizePlayerSeason(lines: PlayerMatchInput[]): PlayerSeasonSummary {
  const played = lines.filter((l) => !l.dnp);
  const derivedLines = played.map((l) => ({ line: l, derived: deriveLine(l) }));

  const totalPoints = sum(derivedLines.map((d) => d.derived.points));
  const totalFg2Made = sum(played.map((l) => l.fg2Made));
  const totalFg2Att = sum(played.map((l) => l.fg2Att));
  const totalFg3Made = sum(played.map((l) => l.fg3Made));
  const totalFg3Att = sum(played.map((l) => l.fg3Att));
  const totalFtMade = sum(played.map((l) => l.ftMade));
  const totalFtAtt = sum(played.map((l) => l.ftAtt));
  const totalReboundsOff = sum(played.map((l) => l.reboundsOff));
  const totalReboundsDef = sum(played.map((l) => l.reboundsDef));
  const totalReboundsTotal = sum(derivedLines.map((d) => d.derived.reboundsTotal));
  const totalAssists = sum(played.map((l) => l.assists));
  const totalSteals = sum(played.map((l) => l.steals));
  const totalTurnovers = sum(played.map((l) => l.turnovers));
  const totalBlocks = sum(played.map((l) => l.blocks));
  const totalFoulsCommitted = sum(played.map((l) => l.foulsCommitted));
  const totalFoulsDrawn = sum(played.map((l) => l.foulsDrawn));
  const totalSeconds = sum(played.map((l) => l.secondsPlayed));

  const gamesPlayed = played.length;

  const seasonAggregateShooting = deriveLine({
    dnp: false,
    secondsPlayed: null,
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
    officialPoints: null,
  });

  return {
    gamesPlayed,
    gamesInRoster: lines.length,
    totals: {
      points: totalPoints,
      fg2Made: totalFg2Made,
      fg2Att: totalFg2Att,
      fg3Made: totalFg3Made,
      fg3Att: totalFg3Att,
      ftMade: totalFtMade,
      ftAtt: totalFtAtt,
      reboundsOff: totalReboundsOff,
      reboundsDef: totalReboundsDef,
      reboundsTotal: totalReboundsTotal,
      assists: totalAssists,
      steals: totalSteals,
      turnovers: totalTurnovers,
      blocks: totalBlocks,
      foulsCommitted: totalFoulsCommitted,
      foulsDrawn: totalFoulsDrawn,
      secondsPlayed: totalSeconds,
    },
    perGame: {
      points: perGame(totalPoints, gamesPlayed),
      reboundsTotal: perGame(totalReboundsTotal, gamesPlayed),
      assists: perGame(totalAssists, gamesPlayed),
      steals: perGame(totalSteals, gamesPlayed),
      turnovers: perGame(totalTurnovers, gamesPlayed),
      blocks: perGame(totalBlocks, gamesPlayed),
      foulsCommitted: perGame(totalFoulsCommitted, gamesPlayed),
      foulsDrawn: perGame(totalFoulsDrawn, gamesPlayed),
      secondsPlayed: perGame(totalSeconds, gamesPlayed),
    },
    per40: {
      points: per40(totalPoints, totalSeconds),
      reboundsTotal: per40(totalReboundsTotal, totalSeconds),
      assists: per40(totalAssists, totalSeconds),
      steals: per40(totalSteals, totalSeconds),
      turnovers: per40(totalTurnovers, totalSeconds),
      blocks: per40(totalBlocks, totalSeconds),
      foulsCommitted: per40(totalFoulsCommitted, totalSeconds),
      foulsDrawn: per40(totalFoulsDrawn, totalSeconds),
    },
    shooting: {
      fg2Pct: seasonAggregateShooting.fg2.pct,
      fg3Pct: seasonAggregateShooting.fg3.pct,
      ftPct: seasonAggregateShooting.ft.pct,
      fgPct: seasonAggregateShooting.fg.pct,
      efgPct: seasonAggregateShooting.efgPct,
      tsPct: seasonAggregateShooting.tsPct,
    },
    distributions: {
      points: distribution(derivedLines.map((d) => d.derived.points)),
      reboundsTotal: distribution(derivedLines.map((d) => d.derived.reboundsTotal)),
      assists: distribution(played.map((l) => l.assists)),
      secondsPlayed: distribution(played.map((l) => l.secondsPlayed)),
    },
    bests: {
      points: findBest(played, (l) => deriveLine(l).points),
      reboundsTotal: findBest(played, (l) => deriveLine(l).reboundsTotal),
      assists: findBest(played, (l) => l.assists),
      steals: findBest(played, (l) => l.steals),
      blocks: findBest(played, (l) => l.blocks),
      secondsPlayed: findBest(played, (l) => l.secondsPlayed),
    },
  };
}

export { mean };
