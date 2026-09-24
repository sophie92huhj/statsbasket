// Moteur de calcul — formatage d'affichage des statistiques.
//
// Toute mise en forme de statistique (temps, %, ratios) doit passer par ici
// pour rester cohérente sur toutes les pages (voir CLAUDE.md #2, #6, #7).

const DASH = "—";

/** Formate un pourcentage : "60,0 %" ou "—" si non calculable (jamais "0 %" par défaut). */
export function formatPct(pct: number | null, decimals = 1): string {
  if (pct === null) return DASH;
  return `${pct.toFixed(decimals).replace(".", ",")} %`;
}

/** Formate un split tirs : "6 / 10 — 60,0 %". */
export function formatSplit(made: number | null, attempted: number | null, pct: number | null): string {
  if (made === null || attempted === null) return DASH;
  return `${made} / ${attempted} — ${formatPct(pct)}`;
}

/** Formate une valeur numérique simple, "—" si null/undefined. */
export function formatNumber(value: number | null | undefined, decimals = 0): string {
  if (value === null || value === undefined) return DASH;
  return value.toFixed(decimals).replace(".", ",");
}

/** Convertit MM:SS (feuille de match) en secondes totales. */
export function parseMinutesSeconds(input: string): number | null {
  const match = input.trim().match(/^(\d+):([0-5]?\d)$/);
  if (!match) return null;
  const minutes = Number(match[1]);
  const seconds = Number(match[2]);
  return minutes * 60 + seconds;
}

/** Formate un nombre de secondes en "MM:SS" (jamais en minutes décimales, voir CLAUDE.md #7). */
export function formatSecondsAsClock(totalSeconds: number | null): string {
  if (totalSeconds === null) return DASH;
  const sign = totalSeconds < 0 ? "-" : "";
  const abs = Math.round(Math.abs(totalSeconds));
  const minutes = Math.floor(abs / 60);
  const seconds = abs % 60;
  return `${sign}${minutes}:${seconds.toString().padStart(2, "0")}`;
}

/** Formate une durée moyenne (secondes) suivie d'un suffixe, ex: "27:34 min/match". */
export function formatClockWithSuffix(totalSeconds: number | null, suffix: string): string {
  const clock = formatSecondsAsClock(totalSeconds);
  return clock === DASH ? DASH : `${clock} ${suffix}`;
}

export { DASH };
