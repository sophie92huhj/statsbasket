// Constantes configurables du moteur de calcul statistique.
// Modifier ici plutôt que dans les formules elles-mêmes (voir CLAUDE.md).

export const STATS_CONFIG = {
  // Durée de référence pour les statistiques normalisées ("par 40 minutes").
  // Certaines compétitions utilisent 36 min ; ajuster ici si besoin.
  normalizationMinutes: 40,

  // Coefficient utilisé dans la formule du True Shooting % :
  // TS% = Points / (2 * (FGA + tsFreeThrowCoefficient * FTA))
  tsFreeThrowCoefficient: 0.44,
} as const;
