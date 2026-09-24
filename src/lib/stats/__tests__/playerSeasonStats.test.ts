import { describe, expect, it } from "vitest";
import { summarizePlayerSeason } from "../playerSeasonStats";
import type { PlayerMatchInput } from "../playerSeasonStats";

function match(overrides: Partial<PlayerMatchInput> = {}): PlayerMatchInput {
  return {
    matchId: "m1",
    matchDate: new Date("2025-10-01"),
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

describe("summarizePlayerSeason (§18, §19)", () => {
  it("cumule les points sur plusieurs matchs et calcule la moyenne par match", () => {
    const lines = [
      match({ matchId: "m1", fg2Made: 6, fg3Made: 0, ftMade: 0 }), // 12 pts
      match({ matchId: "m2", fg2Made: 4, fg3Made: 2, ftMade: 2 }), // 8+6+2=16 pts
    ];
    const summary = summarizePlayerSeason(lines);
    expect(summary.gamesPlayed).toBe(2);
    expect(summary.totals.points).toBe(28);
    expect(summary.perGame.points).toBe(14);
  });

  it("ignore les matchs DNP dans les moyennes mais les compte dans gamesInRoster", () => {
    const lines = [
      match({ matchId: "m1", fg2Made: 10, fg3Made: 0, ftMade: 0 }), // 20 pts
      match({ matchId: "m2", dnp: true }),
    ];
    const summary = summarizePlayerSeason(lines);
    expect(summary.gamesPlayed).toBe(1);
    expect(summary.gamesInRoster).toBe(2);
    expect(summary.perGame.points).toBe(20);
  });

  it("calcule les statistiques /40min à partir des totaux cumulés", () => {
    const lines = [
      match({ matchId: "m1", secondsPlayed: 1200, fg2Made: 10, fg3Made: 0, ftMade: 0 }), // 20 pts en 20min
      match({ matchId: "m2", secondsPlayed: 1200, fg2Made: 10, fg3Made: 0, ftMade: 0 }), // 20 pts en 20min
    ];
    const summary = summarizePlayerSeason(lines);
    // 40 pts en 40min cumulées -> 40 pts /40min
    expect(summary.per40.points).toBe(40);
  });

  it("calcule l'adresse cumulée sur la saison (pas la moyenne des pourcentages match par match)", () => {
    const lines = [
      match({ matchId: "m1", fg2Made: 5, fg2Att: 10 }), // 50%
      match({ matchId: "m2", fg2Made: 8, fg2Att: 10 }), // 80%
    ];
    const summary = summarizePlayerSeason(lines);
    // Cumulé : 13/20 = 65%, pas (50+80)/2 = 65% ici par coincidence -> testons un cas asymétrique
    expect(summary.shooting.fg2Pct).toBeCloseTo(65, 5);
  });

  it("l'adresse cumulée diffère de la moyenne simple des pourcentages quand les volumes diffèrent", () => {
    const lines = [
      match({ matchId: "m1", fg2Made: 1, fg2Att: 1 }), // 100% sur 1 tir
      match({ matchId: "m2", fg2Made: 4, fg2Att: 10 }), // 40% sur 10 tirs
    ];
    const summary = summarizePlayerSeason(lines);
    // Cumulé : 5/11 = 45.45%, alors que la moyenne simple des % serait (100+40)/2=70%
    expect(summary.shooting.fg2Pct).toBeCloseTo((5 / 11) * 100, 5);
  });

  it("trouve le meilleur match en points avec la référence du match", () => {
    const lines = [
      match({ matchId: "m1", matchDate: new Date("2025-10-01"), fg2Made: 5, fg3Made: 0, ftMade: 0 }), // 10
      match({ matchId: "m2", matchDate: new Date("2025-10-08"), fg2Made: 12, fg3Made: 0, ftMade: 0 }), // 24
    ];
    const summary = summarizePlayerSeason(lines);
    expect(summary.bests.points).toEqual({ value: 24, matchId: "m2", matchDate: new Date("2025-10-08") });
  });

  it("fournit une distribution (médiane, écart-type) sur les points", () => {
    const lines = [
      match({ matchId: "m1", fg2Made: 5, fg3Made: 0, ftMade: 0 }), // 10
      match({ matchId: "m2", fg2Made: 10, fg3Made: 0, ftMade: 0 }), // 20
      match({ matchId: "m3", fg2Made: 15, fg3Made: 0, ftMade: 0 }), // 30
    ];
    const summary = summarizePlayerSeason(lines);
    expect(summary.distributions.points.median).toBe(20);
    expect(summary.distributions.points.count).toBe(3);
  });
});
