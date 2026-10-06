import { describe, expect, it } from "vitest";
import { splitTeamMatches, summarizeTeamSeason } from "../teamSeasonStats";
import type { TeamMatchAggregateInput } from "../teamSeasonStats";
import type { RawPlayerStatLine } from "../types";

function playerLine(overrides: Partial<RawPlayerStatLine> = {}): RawPlayerStatLine {
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

function teamMatch(overrides: Partial<TeamMatchAggregateInput>): TeamMatchAggregateInput {
  return {
    matchId: "m1",
    matchDate: new Date("2025-10-01"),
    outcome: "WIN",
    isHome: true,
    ownScore: 70,
    opponentScore: 60,
    playerLines: [],
    ...overrides,
  };
}

describe("summarizeTeamSeason (§17)", () => {
  it("calcule victoires/défaites et moyennes de points", () => {
    const matches = [
      teamMatch({ matchId: "m1", outcome: "WIN", ownScore: 70, opponentScore: 60 }),
      teamMatch({ matchId: "m2", outcome: "LOSS", ownScore: 55, opponentScore: 65 }),
    ];
    const summary = summarizeTeamSeason(matches);
    expect(summary.gamesPlayed).toBe(2);
    expect(summary.wins).toBe(1);
    expect(summary.losses).toBe(1);
    expect(summary.pointsFor.perGame).toBeCloseTo(62.5);
    expect(summary.pointsAgainst.perGame).toBeCloseTo(62.5);
  });

  it("agrège les rebonds/passes à partir des lignes joueuses", () => {
    const matches = [
      teamMatch({
        matchId: "m1",
        playerLines: [
          playerLine({ reboundsOff: 3, reboundsDef: 10, assists: 8 }),
          playerLine({ reboundsOff: 2, reboundsDef: 5, assists: 4 }),
        ],
      }),
    ];
    const summary = summarizeTeamSeason(matches);
    expect(summary.perGameStats.reboundsTotal).toBe(20);
    expect(summary.perGameStats.assists).toBe(12);
  });
});

describe("splitTeamMatches (§24, §25)", () => {
  it("sépare victoires et défaites", () => {
    const matches = [
      teamMatch({ matchId: "m1", outcome: "WIN", ownScore: 80, opponentScore: 60 }),
      teamMatch({ matchId: "m2", outcome: "LOSS", ownScore: 50, opponentScore: 70 }),
    ];
    const { wins, losses } = splitTeamMatches(matches);
    expect(wins.gamesPlayed).toBe(1);
    expect(wins.pointsFor.perGame).toBe(80);
    expect(losses.gamesPlayed).toBe(1);
    expect(losses.pointsFor.perGame).toBe(50);
  });

  it("sépare domicile et extérieur", () => {
    const matches = [
      teamMatch({ matchId: "m1", isHome: true, ownScore: 75 }),
      teamMatch({ matchId: "m2", isHome: false, ownScore: 60 }),
    ];
    const { home, away } = splitTeamMatches(matches);
    expect(home.gamesPlayed).toBe(1);
    expect(home.pointsFor.perGame).toBe(75);
    expect(away.gamesPlayed).toBe(1);
    expect(away.pointsFor.perGame).toBe(60);
  });
});
