// Moteur de calcul — formules dérivées à partir de statistiques brutes.
//
// Toutes les formules de l'application (points, %, eFG%, TS%...) sont définies
// UNIQUEMENT ici. Ne pas dupliquer ces calculs ailleurs (voir CLAUDE.md #2).

import { STATS_CONFIG } from "./config";
import type {
  DerivedStatLine,
  Maybe,
  RawPlayerStatLine,
  RawTeamStatLine,
  ShootingSplit,
} from "./types";

/** true si la valeur est renseignée (ni null ni undefined). */
function isKnown(v: Maybe<number>): v is number {
  return v !== null && v !== undefined;
}

/** Construit un split tirs (réussis/tentés/%) en respectant null = non renseigné. */
function buildSplit(made: Maybe<number>, attempted: Maybe<number>): ShootingSplit {
  if (!isKnown(made) || !isKnown(attempted)) {
    return { made: null, attempted: null, pct: null };
  }
  return {
    made,
    attempted,
    pct: attempted > 0 ? (made / attempted) * 100 : null,
  };
}

function combineSplits(a: ShootingSplit, b: ShootingSplit): ShootingSplit {
  if (a.made === null || b.made === null) {
    return { made: null, attempted: null, pct: null };
  }
  const made = a.made + b.made;
  const attempted = (a.attempted ?? 0) + (b.attempted ?? 0);
  return {
    made,
    attempted,
    pct: attempted > 0 ? (made / attempted) * 100 : null,
  };
}

/**
 * Points = (2PT réussis * 2) + (3PT réussis * 3) + LF réussis.
 * Retourne null si les tirs ne sont pas renseignés (ne jamais utiliser 0 par défaut).
 */
function computePoints(fg2Made: Maybe<number>, fg3Made: Maybe<number>, ftMade: Maybe<number>): number | null {
  if (!isKnown(fg2Made) || !isKnown(fg3Made) || !isKnown(ftMade)) return null;
  return fg2Made * 2 + fg3Made * 3 + ftMade;
}

/** eFG% = (FG réussis + 0.5 * 3PT réussis) / FG tentés. */
function computeEfgPct(fg: ShootingSplit, fg3Made: number | null): number | null {
  if (fg.made === null || fg.attempted === null || fg3Made === null || fg.attempted === 0) {
    return null;
  }
  return ((fg.made + 0.5 * fg3Made) / fg.attempted) * 100;
}

/** TS% = Points / (2 * (FGA + coefficient * FTA)). */
function computeTsPct(points: number | null, fgAttempted: number | null, ftAttempted: number | null): number | null {
  if (points === null || fgAttempted === null || ftAttempted === null) return null;
  const denominator = 2 * (fgAttempted + STATS_CONFIG.tsFreeThrowCoefficient * ftAttempted);
  if (denominator <= 0) return null;
  return (points / denominator) * 100;
}

function deriveCommon(input: {
  fg2Made: Maybe<number>;
  fg2Att: Maybe<number>;
  fg3Made: Maybe<number>;
  fg3Att: Maybe<number>;
  ftMade: Maybe<number>;
  ftAtt: Maybe<number>;
  reboundsOff: Maybe<number>;
  reboundsDef: Maybe<number>;
}): DerivedStatLine {
  const fg2 = buildSplit(input.fg2Made, input.fg2Att);
  const fg3 = buildSplit(input.fg3Made, input.fg3Att);
  const ft = buildSplit(input.ftMade, input.ftAtt);
  const fg = combineSplits(fg2, fg3);

  const points = computePoints(input.fg2Made, input.fg3Made, input.ftMade);
  const efgPct = computeEfgPct(fg, isKnown(input.fg3Made) ? input.fg3Made : null);
  const tsPct = computeTsPct(points, fg.attempted, ft.attempted);

  const reboundsOff = isKnown(input.reboundsOff) ? input.reboundsOff : null;
  const reboundsDef = isKnown(input.reboundsDef) ? input.reboundsDef : null;
  const reboundsTotal =
    reboundsOff !== null && reboundsDef !== null ? reboundsOff + reboundsDef : null;

  return {
    points,
    fg2,
    fg3,
    ft,
    fg,
    reboundsOff,
    reboundsDef,
    reboundsTotal,
    efgPct,
    tsPct,
    pointsFrom2: isKnown(input.fg2Made) ? input.fg2Made * 2 : null,
    pointsFrom3: isKnown(input.fg3Made) ? input.fg3Made * 3 : null,
    pointsFromFt: isKnown(input.ftMade) ? input.ftMade : null,
  };
}

/** Calcule toutes les statistiques dérivées d'une ligne joueuse/match. */
export function deriveLine(input: RawPlayerStatLine): DerivedStatLine;
export function deriveLine(input: RawTeamStatLine): DerivedStatLine;
export function deriveLine(input: RawPlayerStatLine | RawTeamStatLine): DerivedStatLine {
  return deriveCommon(input);
}

/**
 * Vérifie la cohérence entre points calculés (à partir des tirs) et points officiels
 * de la feuille de match, si renseignés. Retourne null si aucune comparaison possible.
 */
export function checkPointsConsistency(
  computedPoints: number | null,
  officialPoints: Maybe<number>,
): { consistent: boolean; diff: number } | null {
  if (computedPoints === null || !isKnown(officialPoints)) return null;
  const diff = computedPoints - officialPoints;
  return { consistent: diff === 0, diff };
}

export { isKnown };
