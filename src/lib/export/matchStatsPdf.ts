import { PDFDocument, StandardFonts, rgb, type RGB } from "pdf-lib";
import { deriveLine } from "@/lib/stats/derive";
import { sum } from "@/lib/stats/aggregate";
import { formatSecondsAsClock } from "@/lib/stats/format";
import type { Maybe, RawPlayerStatLine } from "@/lib/stats/types";

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

// Mêmes colonnes et mêmes libellés que le tableau de saisie (StatsGrid.tsx),
// pour que l'export PDF soit identique à l'interface.
const COLUMNS = [
  { key: "num", label: "N°", width: 26, align: "center" },
  { key: "name", label: "Joueuse", width: 118, align: "left" },
  { key: "starter", label: "5D", width: 26, align: "center" },
  { key: "min", label: "MIN", width: 38, align: "center" },
  { key: "pts", label: "PTS", width: 32, align: "center" },
  { key: "fg2", label: "2PT", width: 42, align: "center" },
  { key: "fg3", label: "3PT", width: 42, align: "center" },
  { key: "ft", label: "LF", width: 42, align: "center" },
  { key: "ro", label: "RO", width: 30, align: "center" },
  { key: "rd", label: "RD", width: 30, align: "center" },
  { key: "ast", label: "PD", width: 30, align: "center" },
  { key: "stl", label: "INT", width: 30, align: "center" },
  { key: "ctr", label: "CTR", width: 30, align: "center" },
  { key: "bp", label: "BP", width: 30, align: "center" },
  { key: "fp", label: "FP", width: 30, align: "center" },
  { key: "fr", label: "FR", width: 30, align: "center" },
  { key: "eval", label: "ÉVAL", width: 38, align: "center" },
] as const;

type ColumnKey = (typeof COLUMNS)[number]["key"];

function formatMadeAttempted(made: number | null, attempted: number | null): string {
  if (made === null || attempted === null) return "—";
  return `${made}/${attempted}`;
}

function formatOrDash(value: Maybe<number>): string {
  return value !== null && value !== undefined ? String(value) : "—";
}

function sortByJerseyThenName(rows: MatchStatsPlayerRow[]): MatchStatsPlayerRow[] {
  return [...rows].sort((a, b) => {
    if (a.jerseyNumber !== null && b.jerseyNumber !== null) return a.jerseyNumber - b.jerseyNumber;
    if (a.jerseyNumber !== null) return -1;
    if (b.jerseyNumber !== null) return 1;
    return a.lastName.localeCompare(b.lastName);
  });
}

function rowValues(player: MatchStatsPlayerRow): Record<ColumnKey, string> {
  const derived = deriveLine(player);
  return {
    num: player.jerseyNumber !== null ? String(player.jerseyNumber) : "—",
    name: `${player.firstName} ${player.lastName}`,
    starter: player.starter ? "X" : "",
    min: formatSecondsAsClock(player.secondsPlayed ?? null),
    pts: formatOrDash(derived.points),
    fg2: formatMadeAttempted(derived.fg2.made, derived.fg2.attempted),
    fg3: formatMadeAttempted(derived.fg3.made, derived.fg3.attempted),
    ft: formatMadeAttempted(derived.ft.made, derived.ft.attempted),
    ro: formatOrDash(derived.reboundsOff),
    rd: formatOrDash(derived.reboundsDef),
    ast: formatOrDash(player.assists),
    stl: formatOrDash(player.steals),
    ctr: formatOrDash(player.blocks),
    bp: formatOrDash(player.turnovers),
    fp: formatOrDash(player.foulsCommitted),
    fr: formatOrDash(player.foulsDrawn),
    eval: formatOrDash(derived.evaluation),
  };
}

function totalsRowValues(players: MatchStatsPlayerRow[]): Record<ColumnKey, string> {
  const derived = deriveLine({
    dnp: false,
    secondsPlayed: null,
    fg2Made: sum(players.map((p) => p.fg2Made)),
    fg2Att: sum(players.map((p) => p.fg2Att)),
    fg3Made: sum(players.map((p) => p.fg3Made)),
    fg3Att: sum(players.map((p) => p.fg3Att)),
    ftMade: sum(players.map((p) => p.ftMade)),
    ftAtt: sum(players.map((p) => p.ftAtt)),
    reboundsOff: sum(players.map((p) => p.reboundsOff)),
    reboundsDef: sum(players.map((p) => p.reboundsDef)),
    assists: sum(players.map((p) => p.assists)),
    steals: sum(players.map((p) => p.steals)),
    turnovers: sum(players.map((p) => p.turnovers)),
    blocks: sum(players.map((p) => p.blocks)),
    foulsCommitted: null,
    foulsDrawn: null,
    officialPoints: null,
  });
  const totalSeconds = sum(players.map((p) => p.secondsPlayed));

  return {
    num: "—",
    name: "Total équipe",
    starter: "—",
    min: formatSecondsAsClock(totalSeconds),
    pts: formatOrDash(derived.points),
    fg2: formatMadeAttempted(derived.fg2.made, derived.fg2.attempted),
    fg3: formatMadeAttempted(derived.fg3.made, derived.fg3.attempted),
    ft: formatMadeAttempted(derived.ft.made, derived.ft.attempted),
    ro: formatOrDash(derived.reboundsOff),
    rd: formatOrDash(derived.reboundsDef),
    ast: formatOrDash(sum(players.map((p) => p.assists))),
    stl: formatOrDash(sum(players.map((p) => p.steals))),
    ctr: formatOrDash(sum(players.map((p) => p.blocks))),
    bp: formatOrDash(sum(players.map((p) => p.turnovers))),
    fp: formatOrDash(sum(players.map((p) => p.foulsCommitted))),
    fr: formatOrDash(sum(players.map((p) => p.foulsDrawn))),
    eval: formatOrDash(derived.evaluation),
  };
}

export async function generateMatchStatsPdf(input: MatchStatsPdfInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);

  // A4 paysage.
  const pageWidth = 841.89;
  const pageHeight = 595.28;
  const margin = 28;

  const headerBg: RGB = rgb(0.835, 0.329, 0.102); // accent de l'app (#d5541a)
  const headerText: RGB = rgb(1, 1, 1);
  const black: RGB = rgb(0.08, 0.09, 0.12);
  const gray: RGB = rgb(0.42, 0.45, 0.49);
  const borderGray: RGB = rgb(0.9, 0.91, 0.89);
  const zebraBg: RGB = rgb(0.97, 0.97, 0.98);
  const totalsBg: RGB = rgb(0.93, 0.93, 0.95);

  const tableWidth = COLUMNS.reduce((acc, c) => acc + c.width, 0);
  const tableX = margin;

  let page = doc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  page.drawText(input.title, { x: margin, y, size: 18, font: boldFont, color: black });
  y -= 20;
  page.drawText(input.subtitle, { x: margin, y, size: 10, font, color: gray });
  y -= 16;
  page.drawText(`Score : ${input.score}`, { x: margin, y, size: 12, font: boldFont, color: black });
  y -= 18;

  const sortedPlayers = sortByJerseyThenName(input.players);
  const headerRowHeight = 22;
  const rowHeight = 18;

  function drawHeaderRow(startY: number): number {
    page.drawRectangle({
      x: tableX,
      y: startY - headerRowHeight,
      width: tableWidth,
      height: headerRowHeight,
      color: headerBg,
    });
    let x = tableX;
    for (const col of COLUMNS) {
      const textWidth = boldFont.widthOfTextAtSize(col.label, 8);
      const textX = col.align === "center" ? x + (col.width - textWidth) / 2 : x + 6;
      page.drawText(col.label, {
        x: textX,
        y: startY - headerRowHeight / 2 - 3,
        size: 8,
        font: boldFont,
        color: headerText,
      });
      x += col.width;
    }
    return startY - headerRowHeight;
  }

  function drawDataRow(startY: number, values: Record<ColumnKey, string>, options: { zebra?: boolean; totals?: boolean } = {}) {
    const bg = options.totals ? totalsBg : options.zebra ? zebraBg : null;
    if (bg) {
      page.drawRectangle({ x: tableX, y: startY - rowHeight, width: tableWidth, height: rowHeight, color: bg });
    }
    let x = tableX;
    const rowFont = options.totals ? boldFont : font;
    for (const col of COLUMNS) {
      const text = values[col.key];
      const size = 8.5;
      const textWidth = rowFont.widthOfTextAtSize(text, size);
      const textX = col.align === "center" ? x + (col.width - textWidth) / 2 : x + 6;
      page.drawText(text, {
        x: textX,
        y: startY - rowHeight / 2 - 3,
        size,
        font: rowFont,
        color: black,
      });
      x += col.width;
    }
  }

  function drawHorizontalRule(atY: number) {
    page.drawLine({
      start: { x: tableX, y: atY },
      end: { x: tableX + tableWidth, y: atY },
      thickness: 0.5,
      color: borderGray,
    });
  }

  function drawVerticalRules(topY: number, bottomY: number) {
    let x = tableX;
    for (const col of COLUMNS) {
      page.drawLine({ start: { x, y: topY }, end: { x, y: bottomY }, thickness: 0.5, color: borderGray });
      x += col.width;
    }
    page.drawLine({ start: { x, y: topY }, end: { x, y: bottomY }, thickness: 0.5, color: borderGray });
  }

  // Dessine l'en-tête + toutes les bordures verticales de la page courante
  // (appelé pour la première page et pour chaque page de continuation).
  function startTableOnPage(startY: number): number {
    const afterHeaderY = drawHeaderRow(startY);
    drawHorizontalRule(startY);
    drawHorizontalRule(afterHeaderY);
    return afterHeaderY;
  }

  function finishPage(topY: number, bottomY: number) {
    drawVerticalRules(topY, bottomY);
  }

  let tableTop = y;
  y = startTableOnPage(tableTop);

  const totalRows = sortedPlayers.length + (sortedPlayers.length > 0 ? 1 : 0);
  let rowsDrawnOnPage = 0;

  function drawOneRow(values: Record<ColumnKey, string>, options: { zebra?: boolean; totals?: boolean }) {
    if (y < margin + rowHeight) {
      finishPage(tableTop, y);
      page = doc.addPage([pageWidth, pageHeight]);
      tableTop = pageHeight - margin;
      y = startTableOnPage(tableTop);
      rowsDrawnOnPage = 0;
    }
    drawDataRow(y, values, options);
    y -= rowHeight;
    drawHorizontalRule(y);
    rowsDrawnOnPage += 1;
  }

  sortedPlayers.forEach((player, index) => {
    drawOneRow(rowValues(player), { zebra: index % 2 === 1 });
  });

  if (sortedPlayers.length > 0) {
    drawOneRow(totalsRowValues(sortedPlayers), { totals: true });
  }

  if (totalRows > 0) {
    finishPage(tableTop, y);
  }

  return doc.save();
}
