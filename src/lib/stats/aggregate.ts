// Moteur de calcul — agrégation de statistiques sur plusieurs matchs
// (totaux, moyennes, médianes, écart-type, ratios /40min).
//
// Toute agrégation de l'application doit passer par ici (voir CLAUDE.md #2).

import { STATS_CONFIG } from "./config";
import { isKnown } from "./derive";
import type { Maybe } from "./types";

/** Filtre les valeurs non renseignées ; ignore null/undefined plutôt que de les traiter comme 0. */
function knownValues(values: Maybe<number>[]): number[] {
  return values.filter(isKnown);
}

export function sum(values: Maybe<number>[]): number | null {
  const known = knownValues(values);
  if (known.length === 0) return null;
  return known.reduce((acc, v) => acc + v, 0);
}

export function mean(values: Maybe<number>[]): number | null {
  const known = knownValues(values);
  if (known.length === 0) return null;
  return sum(known)! / known.length;
}

export function median(values: Maybe<number>[]): number | null {
  const known = knownValues(values).slice().sort((a, b) => a - b);
  if (known.length === 0) return null;
  const mid = Math.floor(known.length / 2);
  return known.length % 2 === 0 ? (known[mid - 1] + known[mid]) / 2 : known[mid];
}

export function min(values: Maybe<number>[]): number | null {
  const known = knownValues(values);
  if (known.length === 0) return null;
  return Math.min(...known);
}

export function max(values: Maybe<number>[]): number | null {
  const known = knownValues(values);
  if (known.length === 0) return null;
  return Math.max(...known);
}

/** Écart-type (population). */
export function stdDev(values: Maybe<number>[]): number | null {
  const known = knownValues(values);
  if (known.length === 0) return null;
  const m = mean(known)!;
  const variance = known.reduce((acc, v) => acc + (v - m) ** 2, 0) / known.length;
  return Math.sqrt(variance);
}

/** Quartiles (Q1, médiane, Q3) par interpolation linéaire simple. */
export function quartiles(values: Maybe<number>[]): { q1: number; q2: number; q3: number } | null {
  const known = knownValues(values).slice().sort((a, b) => a - b);
  if (known.length === 0) return null;

  const quantile = (arr: number[], q: number): number => {
    const pos = (arr.length - 1) * q;
    const base = Math.floor(pos);
    const rest = pos - base;
    if (arr[base + 1] !== undefined) {
      return arr[base] + rest * (arr[base + 1] - arr[base]);
    }
    return arr[base];
  };

  return {
    q1: quantile(known, 0.25),
    q2: quantile(known, 0.5),
    q3: quantile(known, 0.75),
  };
}

/**
 * Ratio "par 40 minutes" (ou durée configurée) à partir d'un total de statistique
 * et d'un total de secondes jouées. Retourne null si le temps de jeu total est nul/inconnu.
 */
export function per40(totalStat: number | null, totalSecondsPlayed: number | null): number | null {
  if (totalStat === null || totalSecondsPlayed === null || totalSecondsPlayed === 0) return null;
  const totalMinutes = totalSecondsPlayed / 60;
  return (totalStat / totalMinutes) * STATS_CONFIG.normalizationMinutes;
}

/** Statistique par match joué (moyenne simple, alias explicite pour la lisibilité des pages). */
export function perGame(totalStat: number | null, gamesPlayed: number): number | null {
  if (totalStat === null || gamesPlayed === 0) return null;
  return totalStat / gamesPlayed;
}

/** Statistique par minute jouée. */
export function perMinute(totalStat: number | null, totalSecondsPlayed: number | null): number | null {
  if (totalStat === null || totalSecondsPlayed === null || totalSecondsPlayed === 0) return null;
  return totalStat / (totalSecondsPlayed / 60);
}

/** Résumé statistique complet d'une série de valeurs (utilisé pour les pages de régularité). */
export interface Distribution {
  count: number; // nombre de valeurs connues (dénominateur réel)
  sum: number | null;
  mean: number | null;
  median: number | null;
  min: number | null;
  max: number | null;
  stdDev: number | null;
}

export function distribution(values: Maybe<number>[]): Distribution {
  const known = knownValues(values);
  return {
    count: known.length,
    sum: sum(values),
    mean: mean(values),
    median: median(values),
    min: min(values),
    max: max(values),
    stdDev: stdDev(values),
  };
}
