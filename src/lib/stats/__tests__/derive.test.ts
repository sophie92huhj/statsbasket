import { describe, expect, it } from "vitest";
import {
  checkPointsConsistency,
  computeDefensiveReboundRatio,
  computeOffensiveReboundRatio,
  computeTurnoverRatio,
  deriveLine,
  isTargetMet,
} from "../derive";
import type { RawPlayerStatLine } from "../types";

function line(overrides: Partial<RawPlayerStatLine> = {}): RawPlayerStatLine {
  return {
    dnp: false,
    secondsPlayed: null,
    fg2Made: null,
    fg2Att: null,
    fg3Made: null,
    fg3Att: null,
    ftMade: null,
    ftAtt: null,
    reboundsOff: null,
    reboundsDef: null,
    assists: null,
    steals: null,
    turnovers: null,
    blocks: null,
    foulsCommitted: null,
    foulsDrawn: null,
    officialPoints: null,
    ...overrides,
  };
}

describe("deriveLine — points", () => {
  it("calcule les points à partir des tirs (§11)", () => {
    const derived = deriveLine(line({ fg2Made: 6, fg2Att: 10, fg3Made: 3, fg3Att: 8, ftMade: 5, ftAtt: 6 }));
    // 6*2 + 3*3 + 5 = 12 + 9 + 5 = 26
    expect(derived.points).toBe(26);
  });

  it("retourne null si les tirs ne sont pas renseignés (pas de 0 par défaut)", () => {
    const derived = deriveLine(line());
    expect(derived.points).toBeNull();
  });
});

describe("deriveLine — pourcentages de tir", () => {
  it("2PT% = réussis / tentés * 100 (exemple §6 : 6/10 -> 60%)", () => {
    const derived = deriveLine(line({ fg2Made: 6, fg2Att: 10 }));
    expect(derived.fg2.pct).toBe(60);
  });

  it("3PT% exemple §7 : 3/8 -> 37.5%", () => {
    const derived = deriveLine(line({ fg3Made: 3, fg3Att: 8 }));
    expect(derived.fg3.pct).toBeCloseTo(37.5);
  });

  it("LF% exemple §8 : 5/6 -> 83.33%", () => {
    const derived = deriveLine(line({ ftMade: 5, ftAtt: 6 }));
    expect(derived.ft.pct).toBeCloseTo(83.333, 2);
  });

  it("retourne null (pas 0%) quand 0 tentative (§40)", () => {
    const derived = deriveLine(line({ fg2Made: 0, fg2Att: 0 }));
    expect(derived.fg2.pct).toBeNull();
  });

  it("FG% combine 2PT et 3PT (§12)", () => {
    const derived = deriveLine(line({ fg2Made: 4, fg2Att: 8, fg3Made: 2, fg3Att: 4 }));
    // (4+2)/(8+4) = 6/12 = 50%
    expect(derived.fg.pct).toBe(50);
  });
});

describe("deriveLine — rebonds", () => {
  it("REB = RO + RD (§9)", () => {
    const derived = deriveLine(line({ reboundsOff: 3, reboundsDef: 5 }));
    expect(derived.reboundsTotal).toBe(8);
  });

  it("retourne null si l'un des deux composants est inconnu", () => {
    const derived = deriveLine(line({ reboundsOff: 3, reboundsDef: null }));
    expect(derived.reboundsTotal).toBeNull();
  });
});

describe("deriveLine — eFG% (§13)", () => {
  it("eFG% = (FGM + 0.5*3PM) / FGA", () => {
    // 10 FGM (6 2PT + 4 3PT) sur 20 FGA, 4 de ces réussites sont des 3PT
    const derived = deriveLine(line({ fg2Made: 6, fg2Att: 12, fg3Made: 4, fg3Att: 8 }));
    // FGM=10, FGA=20, 3PM=4 -> (10 + 0.5*4)/20 = 12/20 = 60%
    expect(derived.efgPct).toBe(60);
  });
});

describe("deriveLine — TS% (§14)", () => {
  it("TS% = Points / (2*(FGA + 0.44*FTA))", () => {
    const derived = deriveLine(
      line({ fg2Made: 6, fg2Att: 10, fg3Made: 3, fg3Att: 8, ftMade: 5, ftAtt: 6 }),
    );
    // points=26, FGA=18, FTA=6 -> denom = 2*(18+0.44*6)=2*(18+2.64)=41.28
    // TS% = 26/41.28*100 = 62.98...
    expect(derived.tsPct).toBeCloseTo(62.984, 2);
  });
});

describe("deriveLine — répartition des points (§12)", () => {
  it("calcule les points issus de chaque type de tir", () => {
    const derived = deriveLine(line({ fg2Made: 6, fg3Made: 3, ftMade: 5 }));
    expect(derived.pointsFrom2).toBe(12);
    expect(derived.pointsFrom3).toBe(9);
    expect(derived.pointsFromFt).toBe(5);
  });
});

describe("deriveLine — évaluation", () => {
  it("EVAL = (PTS+REB+PD+INT+CTR) - (tirs manqués) - BP, sans fautes", () => {
    const derived = deriveLine(
      line({
        fg2Made: 6,
        fg2Att: 10,
        fg3Made: 3,
        fg3Att: 8,
        ftMade: 5,
        ftAtt: 6,
        reboundsOff: 2,
        reboundsDef: 4,
        assists: 3,
        steals: 2,
        turnovers: 4,
        blocks: 1,
        foulsCommitted: 5,
        foulsDrawn: 5,
      }),
    );
    // points=26, REB=6, missed=(10-6)+(8-3)+(6-5)=4+5+1=10
    // EVAL = 26+6+3+2+1-10-4 = 24
    expect(derived.evaluation).toBe(24);
  });

  it("ignore les fautes et fautes provoquées dans le calcul", () => {
    const base = line({
      fg2Made: 4,
      fg2Att: 4,
      fg3Made: 0,
      fg3Att: 0,
      ftMade: 0,
      ftAtt: 0,
      reboundsOff: 0,
      reboundsDef: 0,
      assists: 0,
      steals: 0,
      turnovers: 0,
      blocks: 0,
    });
    const withoutFouls = deriveLine(base);
    const withFouls = deriveLine({ ...base, foulsCommitted: 10, foulsDrawn: 10 });
    expect(withFouls.evaluation).toBe(withoutFouls.evaluation);
  });

  it("retourne null si une statistique nécessaire est manquante", () => {
    const derived = deriveLine(line({ fg2Made: 6, fg2Att: 10 }));
    expect(derived.evaluation).toBeNull();
  });
});

describe("computeOffensiveReboundRatio", () => {
  it("RO équipe / (tirs ratés équipe + 0.44 × LF tentés équipe) × 100", () => {
    // 10 / (20 + 0.44*10) = 10 / 24.4 = 40.98%
    expect(computeOffensiveReboundRatio(10, 20, 10)).toBeCloseTo(40.98, 2);
  });

  it("retourne null si une valeur est manquante", () => {
    expect(computeOffensiveReboundRatio(10, null, 10)).toBeNull();
  });

  it("retourne null si le dénominateur est nul", () => {
    expect(computeOffensiveReboundRatio(0, 0, 0)).toBeNull();
  });
});

describe("computeDefensiveReboundRatio", () => {
  it("RD équipe / (RD équipe + RO adverse) × 100", () => {
    expect(computeDefensiveReboundRatio(30, 10)).toBe(75);
  });

  it("retourne null si une valeur est manquante", () => {
    expect(computeDefensiveReboundRatio(null, 10)).toBeNull();
  });
});

describe("computeTurnoverRatio", () => {
  it("TO / (FGA + 0.44×FTA + TO) × 100", () => {
    // 10 / (60 + 0.44*20 + 10) = 10 / 78.8 = 12.69%
    expect(computeTurnoverRatio(10, 60, 20)).toBeCloseTo(12.69, 2);
  });

  it("retourne null si une valeur est manquante", () => {
    expect(computeTurnoverRatio(null, 60, 20)).toBeNull();
  });

  it("retourne null si le dénominateur est nul", () => {
    expect(computeTurnoverRatio(0, 0, 0)).toBeNull();
  });
});

describe("isTargetMet", () => {
  it("higher-is-better : atteint si ratio >= cible", () => {
    expect(isTargetMet(55, 50, "higher-is-better")).toBe(true);
    expect(isTargetMet(45, 50, "higher-is-better")).toBe(false);
  });

  it("lower-is-better : atteint si ratio <= cible", () => {
    expect(isTargetMet(15, 20, "lower-is-better")).toBe(true);
    expect(isTargetMet(25, 20, "lower-is-better")).toBe(false);
  });

  it("retourne null si le ratio n'est pas calculable", () => {
    expect(isTargetMet(null, 50, "higher-is-better")).toBeNull();
  });
});

describe("checkPointsConsistency (§11, §29)", () => {
  it("détecte une incohérence entre points calculés et officiels", () => {
    const derived = deriveLine(line({ fg2Made: 6, fg3Made: 3, ftMade: 5 })); // 26 pts
    const result = checkPointsConsistency(derived.points, 24);
    expect(result).toEqual({ consistent: false, diff: 2 });
  });

  it("retourne null si aucune donnée officielle disponible", () => {
    const derived = deriveLine(line({ fg2Made: 6, fg3Made: 3, ftMade: 5 }));
    expect(checkPointsConsistency(derived.points, null)).toBeNull();
  });
});
