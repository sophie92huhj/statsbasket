import { describe, expect, it } from "vitest";
import { formatPct, formatSecondsAsClock, formatSplit, parseMinutesSeconds } from "../format";

describe("formatPct (§40 — N/A plutôt que 0%)", () => {
  it("formate un pourcentage connu", () => {
    expect(formatPct(60)).toBe("60,0 %");
  });

  it("affiche — quand non calculable", () => {
    expect(formatPct(null)).toBe("—");
  });
});

describe("formatSplit (§6, §7, §8)", () => {
  it("formate un split tirs comme dans le cahier des charges", () => {
    expect(formatSplit(6, 10, 60)).toBe("6 / 10 — 60,0 %");
  });
});

describe("temps de jeu (§41)", () => {
  it("parse MM:SS en secondes", () => {
    expect(parseMinutesSeconds("28:32")).toBe(28 * 60 + 32);
  });

  it("rejette un format invalide", () => {
    expect(parseMinutesSeconds("abc")).toBeNull();
    expect(parseMinutesSeconds("28:65")).toBeNull();
  });

  it("formate des secondes en MM:SS, jamais en minutes décimales", () => {
    expect(formatSecondsAsClock(28 * 60 + 32)).toBe("28:32");
    expect(formatSecondsAsClock(1654)).toBe("27:34");
  });
});
