import { describe, expect, it } from "vitest";
import { validatePlayerStatLine } from "../validate";
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

describe("validatePlayerStatLine (§29)", () => {
  it("détecte tirs réussis > tentés", () => {
    const issues = validatePlayerStatLine(line({ fg2Made: 8, fg2Att: 5 }));
    expect(issues.some((i) => i.severity === "error" && i.field === "2PT")).toBe(true);
  });

  it("détecte lancers francs réussis > tentés", () => {
    const issues = validatePlayerStatLine(line({ ftMade: 4, ftAtt: 2 }));
    expect(issues.some((i) => i.severity === "error" && i.field === "LF")).toBe(true);
  });

  it("détecte des rebonds négatifs", () => {
    const issues = validatePlayerStatLine(line({ reboundsOff: -1 }));
    expect(issues.some((i) => i.field === "reboundsOff")).toBe(true);
  });

  it("n'émet aucune erreur pour une ligne cohérente", () => {
    const issues = validatePlayerStatLine(
      line({ fg2Made: 6, fg2Att: 10, fg3Made: 3, fg3Att: 8, ftMade: 5, ftAtt: 6, reboundsOff: 2, reboundsDef: 4 }),
    );
    expect(issues.filter((i) => i.severity === "error")).toHaveLength(0);
  });

  it("avertit si points calculés diffèrent des points officiels", () => {
    const issues = validatePlayerStatLine(line({ fg2Made: 6, fg3Made: 3, ftMade: 5, officialPoints: 24 }));
    expect(issues.some((i) => i.field === "officialPoints" && i.severity === "warning")).toBe(true);
  });

  it("avertit si DNP mais des statistiques sont renseignées", () => {
    const issues = validatePlayerStatLine(line({ dnp: true, fg2Made: 2 }));
    expect(issues.some((i) => i.field === "dnp")).toBe(true);
  });

  it("n'émet rien pour une joueuse DNP sans statistiques", () => {
    const issues = validatePlayerStatLine(line({ dnp: true }));
    expect(issues).toHaveLength(0);
  });
});
