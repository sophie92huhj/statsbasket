import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { deriveLine } from "@/lib/stats/derive";
import { formatPct, formatSecondsAsClock } from "@/lib/stats/format";
import type { RawPlayerStatLine } from "@/lib/stats/types";

export interface MatchStatsPlayerRow extends RawPlayerStatLine {
  jerseyNumber: number | null;
  starter: boolean;
  firstName: string;
  lastName: string;
}

export interface MatchStatsPdfInput {
  title: string; // ex: "vs Équipe Adverse"
  subtitle: string; // ex: "05 octobre 2025 · Championnat · 2025-2026"
  score: string; // ex: "72 – 65"
  players: MatchStatsPlayerRow[];
}

const COLUMNS = [
  { key: "num", label: "N°", width: 20 },
  { key: "name", label: "Joueuse", width: 92 },
  { key: "starter", label: "5D", width: 18 },
  { key: "min", label: "MIN", width: 32 },
  { key: "pts", label: "PTS", width: 24 },
  { key: "fg2", label: "2PT", width: 32 },
  { key: "fg3", label: "3PT", width: 32 },
  { key: "ft", label: "LF", width: 30 },
  { key: "ro", label: "RO", width: 22 },
  { key: "rd", label: "RD", width: 22 },
  { key: "ast", label: "PD", width: 22 },
  { key: "stl", label: "INT", width: 22 },
  { key: "to", label: "BP", width: 22 },
  { key: "blk", label: "CTR", width: 22 },
  { key: "efg", label: "eFG%", width: 34 },
  { key: "ts", label: "TS%", width: 34 },
] as const;

function formatMadeAttempted(made: number | null, attempted: number | null): string {
  if (made === null || attempted === null) return "—";
  return `${made}/${attempted}`;
}

function sortByJerseyThenName(rows: MatchStatsPlayerRow[]): MatchStatsPlayerRow[] {
  return [...rows].sort((a, b) => {
    if (a.jerseyNumber !== null && b.jerseyNumber !== null) return a.jerseyNumber - b.jerseyNumber;
    if (a.jerseyNumber !== null) return -1;
    if (b.jerseyNumber !== null) return 1;
    return a.lastName.localeCompare(b.lastName);
  });
}

export async function generateMatchStatsPdf(input: MatchStatsPdfInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);

  const pageWidth = 595.28; // A4 portrait, points
  const pageHeight = 841.89;
  const margin = 32;
  let page = doc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  const black = rgb(0.05, 0.05, 0.06);
  const gray = rgb(0.4, 0.4, 0.4);
  const lightGray = rgb(0.88, 0.88, 0.86);

  page.drawText(input.title, { x: margin, y, size: 16, font: boldFont, color: black });
  y -= 20;
  page.drawText(input.subtitle, { x: margin, y, size: 10, font, color: gray });
  y -= 16;
  page.drawText(`Score : ${input.score}`, { x: margin, y, size: 11, font: boldFont, color: black });
  y -= 22;

  const sortedPlayers = sortByJerseyThenName(input.players);
  const rowHeight = 16;
  const headerY = y;

  function drawHeader(startY: number): number {
    let x = margin;
    for (const col of COLUMNS) {
      page.drawText(col.label, { x, y: startY, size: 7, font: boldFont, color: gray });
      x += col.width;
    }
    return startY - 4;
  }

  function drawRowSeparator(atY: number) {
    page.drawLine({
      start: { x: margin, y: atY },
      end: { x: margin + COLUMNS.reduce((acc, c) => acc + c.width, 0), y: atY },
      thickness: 0.5,
      color: lightGray,
    });
  }

  y = drawHeader(y);
  drawRowSeparator(y);
  y -= rowHeight;

  for (const player of sortedPlayers) {
    if (y < margin + rowHeight) {
      page = doc.addPage([pageWidth, pageHeight]);
      y = pageHeight - margin;
      y = drawHeader(y);
      drawRowSeparator(y);
      y -= rowHeight;
    }

    const derived = deriveLine(player);
    const values: Record<(typeof COLUMNS)[number]["key"], string> = {
      num: player.jerseyNumber !== null ? String(player.jerseyNumber) : "—",
      name: `${player.firstName} ${player.lastName}`,
      starter: player.starter ? "X" : "",
      min: formatSecondsAsClock(player.secondsPlayed ?? null),
      pts: derived.points !== null ? String(derived.points) : "—",
      fg2: formatMadeAttempted(derived.fg2.made, derived.fg2.attempted),
      fg3: formatMadeAttempted(derived.fg3.made, derived.fg3.attempted),
      ft: formatMadeAttempted(derived.ft.made, derived.ft.attempted),
      ro: derived.reboundsOff !== null ? String(derived.reboundsOff) : "—",
      rd: derived.reboundsDef !== null ? String(derived.reboundsDef) : "—",
      ast: player.assists !== null ? String(player.assists) : "—",
      stl: player.steals !== null ? String(player.steals) : "—",
      to: player.turnovers !== null ? String(player.turnovers) : "—",
      blk: player.blocks !== null ? String(player.blocks) : "—",
      efg: formatPct(derived.efgPct),
      ts: formatPct(derived.tsPct),
    };

    let x = margin;
    for (const col of COLUMNS) {
      page.drawText(values[col.key], { x, y, size: 7.5, font, color: black });
      x += col.width;
    }
    y -= rowHeight;
  }

  return doc.save();
}
