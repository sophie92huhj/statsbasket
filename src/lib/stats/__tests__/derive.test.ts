import { describe, expect, it } from "vitest";
import { checkPointsConsistency, deriveLine } from "../derive";
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
