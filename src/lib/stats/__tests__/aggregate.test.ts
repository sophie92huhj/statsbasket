import { describe, expect, it } from "vitest";
import { distribution, max, mean, median, min, per40, perGame, stdDev, sum } from "../aggregate";

describe("agrégats — distinction null vs 0 (§30)", () => {
  it("ignore les valeurs null dans la moyenne plutôt que de les compter comme 0", () => {
    // Une joueuse absente (null) ne doit pas faire baisser la moyenne des autres.
    expect(mean([10, null, 20])).toBe(15);
  });

  it("un 0 renseigné compte bien dans la moyenne", () => {
    expect(mean([10, 0, 20])).toBeCloseTo(10);
  });

  it("retourne null si aucune valeur connue", () => {
    expect(mean([null, undefined])).toBeNull();
    expect(sum([null, undefined])).toBeNull();
  });
});

describe("agrégats — sum/mean/median/min/max", () => {
  const values = [12, 8, 20, 4, 16];

  it("sum", () => expect(sum(values)).toBe(60));
  it("mean", () => expect(mean(values)).toBe(12));
  it("median (nombre impair)", () => expect(median(values)).toBe(12));
  it("median (nombre pair)", () => expect(median([1, 2, 3, 4])).toBe(2.5));
  it("min/max", () => {
    expect(min(values)).toBe(4);
    expect(max(values)).toBe(20);
  });
});

describe("écart-type (§20)", () => {
  it("calcule l'écart-type de population", () => {
    // valeurs constantes -> écart-type nul
    expect(stdDev([10, 10, 10])).toBe(0);
    // [2,4,4,4,5,5,7,9] -> stddev population = 2
    expect(stdDev([2, 4, 4, 4, 5, 5, 7, 9])).toBeCloseTo(2, 5);
  });
});

describe("per40 (§15)", () => {
  it("normalise une statistique sur 40 minutes", () => {
    // 20 points en 20 minutes (1200s) -> 40 points /40min
    expect(per40(20, 1200)).toBe(40);
  });

  it("retourne null si le temps de jeu est nul ou inconnu", () => {
    expect(per40(20, 0)).toBeNull();
    expect(per40(20, null)).toBeNull();
  });
});

describe("perGame (§19)", () => {
  it("moyenne par match jouée", () => {
    expect(perGame(152, 12)).toBeCloseTo(12.667, 2);
  });

  it("retourne null si 0 match joué", () => {
    expect(perGame(0, 0)).toBeNull();
  });
});

describe("distribution (§20)", () => {
  it("fournit un résumé complet ignorant les valeurs manquantes", () => {
    const d = distribution([10, null, 20, 30]);
    expect(d.count).toBe(3);
    expect(d.mean).toBe(20);
    expect(d.min).toBe(10);
    expect(d.max).toBe(30);
  });
});
