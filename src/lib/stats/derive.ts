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

/**
 * Évaluation FFBB = (PTS + REB + PD + INT + CTR) − (tirs manqués 2PT/3PT/LF) − BP.
 * Les fautes commises et provoquées ne sont volontairement pas prises en compte.
 * Retourne null si une des statistiques nécessaires n'est pas renseignée.
 */
function computeEvaluation(input: {
  points: number | null;
  fg2: ShootingSplit;
  fg3: ShootingSplit;
  ft: ShootingSplit;
  reboundsTotal: number | null;
  assists: Maybe<number>;
  steals: Maybe<number>;
  turnovers: Maybe<number>;
  blocks: Maybe<number>;
}): number | null {
  const { points, fg2, fg3, ft, reboundsTotal } = input;
  if (
    points === null ||
    fg2.made === null ||
    fg2.attempted === null ||
    fg3.made === null ||
    fg3.attempted === null ||
    ft.made === null ||
    ft.attempted === null ||
    reboundsTotal === null ||
    !isKnown(input.assists) ||
    !isKnown(input.steals) ||
    !isKnown(input.turnovers) ||
    !isKnown(input.blocks)
  ) {
    return null;
  }

  const missed =
    (fg2.attempted - fg2.made) + (fg3.attempted - fg3.made) + (ft.attempted - ft.made);

  return (
    points +
    reboundsTotal +
    input.assists +
    input.steals +
    input.blocks -
    missed -
    input.turnovers
  );
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
  assists: Maybe<number>;
  steals: Maybe<number>;
  turnovers: Maybe<number>;
  blocks: Maybe<number>;
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

  const evaluation = computeEvaluation({
    points,
    fg2,
    fg3,
    ft,
    reboundsTotal,
    assists: input.assists,
    steals: input.steals,
    turnovers: input.turnovers,
    blocks: input.blocks,
  });

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
    evaluation,
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

/**
 * Ratio de rebonds offensifs = RO équipe / (tirs ratés équipe + 0.44 × LF tentés équipe) × 100.
 * Approxime la part des rebonds offensifs captés parmi les occasions de rebond disponibles.
 * Retourne null si une des valeurs n'est pas renseignée ou si le dénominateur est nul.
 */
export function computeOffensiveReboundRatio(
  teamReboundsOff: Maybe<number>,
  teamFgMissed: Maybe<number>,
  teamFtAttempted: Maybe<number>,
): number | null {
  if (!isKnown(teamReboundsOff) || !isKnown(teamFgMissed) || !isKnown(teamFtAttempted)) return null;
  const denominator = teamFgMissed + STATS_CONFIG.tsFreeThrowCoefficient * teamFtAttempted;
  if (denominator <= 0) return null;
  return (teamReboundsOff / denominator) * 100;
}

/**
 * Ratio de rebonds défensifs = RD équipe / (RD équipe + RO adversaire) × 100.
 * Mesure la part des rebonds défensifs disponibles captés par l'équipe.
 * Retourne null si une des deux valeurs n'est pas renseignée ou si le total est nul.
 */
export function computeDefensiveReboundRatio(
  teamReboundsDef: Maybe<number>,
  opponentReboundsOff: Maybe<number>,
): number | null {
  if (!isKnown(teamReboundsDef) || !isKnown(opponentReboundsOff)) return null;
  const total = teamReboundsDef + opponentReboundsOff;
  if (total <= 0) return null;
  return (teamReboundsDef / total) * 100;
}

/**
 * Ratio de balles perdues (Four Factors) = TO / (FGA + 0.44 × FTA + TO) × 100.
 * Approxime la part des possessions terminées par une perte de balle.
 * Retourne null si une des valeurs n'est pas renseignée ou si le dénominateur est nul.
 */
export function computeTurnoverRatio(
  turnovers: Maybe<number>,
  fgAttempted: Maybe<number>,
  ftAttempted: Maybe<number>,
): number | null {
  if (!isKnown(turnovers) || !isKnown(fgAttempted) || !isKnown(ftAttempted)) return null;
  const denominator = fgAttempted + STATS_CONFIG.tsFreeThrowCoefficient * ftAttempted + turnovers;
  if (denominator <= 0) return null;
  return (turnovers / denominator) * 100;
}

/**
 * Un ratio atteint son objectif s'il est supérieur ou égal au seuil ("plus haut = mieux",
 * ex: rebonds offensifs) ou inférieur ou égal au seuil ("plus bas = mieux", ex: balles perdues).
 * Retourne null si le ratio n'est pas calculable.
 */
export function isTargetMet(
  ratio: number | null,
  target: number,
  direction: "higher-is-better" | "lower-is-better",
): boolean | null {
  if (ratio === null) return null;
  return direction === "higher-is-better" ? ratio >= target : ratio <= target;
}

export { isKnown };
