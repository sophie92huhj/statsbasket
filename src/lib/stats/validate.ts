// Validation de cohérence des statistiques brutes (§29).
// Utilisé à la fois par la saisie manuelle (grille) et par l'import (CSV/Excel).

import { checkPointsConsistency, deriveLine, isKnown } from "./derive";
import type { Maybe, RawPlayerStatLine } from "./types";
import { parseMinutesSeconds } from "./format";

export interface ValidationIssue {
  field: string;
  severity: "error" | "warning";
  message: string;
}

function checkShootingSplit(
  made: Maybe<number>,
  attempted: Maybe<number>,
  label: string,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (isKnown(made) && made < 0) {
    issues.push({ field: label, severity: "error", message: `${label} réussis ne peut pas être négatif.` });
  }
  if (isKnown(attempted) && attempted < 0) {
    issues.push({ field: label, severity: "error", message: `${label} tentés ne peut pas être négatif.` });
  }
  if (isKnown(made) && isKnown(attempted) && made > attempted) {
    issues.push({
      field: label,
      severity: "error",
      message: `${label} réussis (${made}) > ${label} tentés (${attempted}).`,
    });
  }
  return issues;
}

/** Valide une ligne de statistiques individuelles pour un match (§29, §40). */
export function validatePlayerStatLine(line: RawPlayerStatLine): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (line.dnp) {
    // Une joueuse qui n'a pas joué ne devrait pas avoir de statistiques renseignées.
    const hasAnyStat = [
      line.secondsPlayed,
      line.fg2Made,
      line.fg2Att,
      line.fg3Made,
      line.fg3Att,
      line.ftMade,
      line.ftAtt,
      line.reboundsOff,
      line.reboundsDef,
      line.assists,
      line.steals,
      line.turnovers,
      line.blocks,
      line.foulsCommitted,
      line.foulsDrawn,
    ].some(isKnown);
    if (hasAnyStat) {
      issues.push({
        field: "dnp",
        severity: "warning",
        message: "Joueuse marquée comme n'ayant pas joué (DNP) mais des statistiques sont renseignées.",
      });
    }
    return issues;
  }

  issues.push(...checkShootingSplit(line.fg2Made, line.fg2Att, "2PT"));
  issues.push(...checkShootingSplit(line.fg3Made, line.fg3Att, "3PT"));
  issues.push(...checkShootingSplit(line.ftMade, line.ftAtt, "LF"));

  if (isKnown(line.reboundsOff) && line.reboundsOff < 0) {
    issues.push({ field: "reboundsOff", severity: "error", message: "Rebonds offensifs négatifs." });
  }
  if (isKnown(line.reboundsDef) && line.reboundsDef < 0) {
    issues.push({ field: "reboundsDef", severity: "error", message: "Rebonds défensifs négatifs." });
  }

  for (const [field, label] of [
    ["assists", "Passes décisives"],
    ["steals", "Interceptions"],
    ["turnovers", "Balles perdues"],
    ["blocks", "Contres"],
    ["foulsCommitted", "Fautes"],
    ["foulsDrawn", "Fautes provoquées"],
  ] as const) {
    const value = line[field];
    if (isKnown(value) && value < 0) {
      issues.push({ field, severity: "error", message: `${label} ne peut pas être négatif.` });
    }
  }

  if (isKnown(line.secondsPlayed) && line.secondsPlayed < 0) {
    issues.push({ field: "secondsPlayed", severity: "error", message: "Temps de jeu invalide (négatif)." });
  }
  if (isKnown(line.secondsPlayed) && line.secondsPlayed > 60 * 60) {
    issues.push({
      field: "secondsPlayed",
      severity: "warning",
      message: "Temps de jeu supérieur à 60 minutes : vérifier la saisie (prolongations incluses ?).",
    });
  }

  const derived = deriveLine(line);
  const pointsCheck = checkPointsConsistency(derived.points, line.officialPoints);
  if (pointsCheck && !pointsCheck.consistent) {
    issues.push({
      field: "officialPoints",
      severity: "warning",
      message: `Points calculés (${derived.points}) différents des points officiels renseignés (écart de ${pointsCheck.diff}).`,
    });
  }

  return issues;
}

/** Détecte les doublons de joueuse dans un ensemble de lignes pour un même match (§29). */
export function findDuplicatePlayers(playerIds: string[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const id of playerIds) {
    if (seen.has(id)) duplicates.add(id);
    seen.add(id);
  }
  return [...duplicates];
}

export { parseMinutesSeconds };
