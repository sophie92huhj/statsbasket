// Types du moteur de calcul statistique.
//
// `null`/`undefined` = donnée non renseignée. `0` = statistique connue et nulle.
// Voir CLAUDE.md, principe #3.

export type Maybe<T> = T | null | undefined;

/** Statistiques brutes d'une joueuse pour un match (reflète PlayerMatchStat). */
export interface RawPlayerStatLine {
  dnp: boolean;
  secondsPlayed: Maybe<number>;

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
  foulsCommitted: Maybe<number>;
  foulsDrawn: Maybe<number>;

  officialPoints: Maybe<number>;
}

/** Statistiques brutes d'une équipe pour un match (reflète TeamMatchStat). */
export interface RawTeamStatLine {
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
  foulsCommitted: Maybe<number>;
  foulsDrawn: Maybe<number>;
}

/** Un ratio réussi/tenté avec le pourcentage dérivé (null si tentatives = 0 ou inconnues). */
export interface ShootingSplit {
  made: number | null;
  attempted: number | null;
  pct: number | null; // 0-100, null si non calculable
}

/** Statistiques dérivées d'une ligne de match (joueuse ou équipe). */
export interface DerivedStatLine {
  points: number | null;
  fg2: ShootingSplit;
  fg3: ShootingSplit;
  ft: ShootingSplit;
  fg: ShootingSplit; // 2PT + 3PT combinés
  reboundsOff: number | null;
  reboundsDef: number | null;
  reboundsTotal: number | null;
  efgPct: number | null;
  tsPct: number | null;
  pointsFrom2: number | null;
  pointsFrom3: number | null;
  pointsFromFt: number | null;
  /**
   * Évaluation FFBB : (PTS + REB + PD + INT + CTR) − (tirs manqués 2PT/3PT/LF) − BP.
   * Les fautes et fautes provoquées ne sont volontairement pas prises en compte.
   */
  evaluation: number | null;
}
