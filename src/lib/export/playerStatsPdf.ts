import { deriveLine } from "@/lib/stats/derive";
import { formatNumber, formatPct, formatSecondsAsClock } from "@/lib/stats/format";
import type { PlayerMatchInput, PlayerSeasonSummary } from "@/lib/stats/playerSeasonStats";
import {
  CHART_COLORS,
  CONTENT_WIDTH,
  MARGIN,
  PdfLayout,
  SECTION_GAP,
  SECTION_TITLE_HEIGHT,
  type Chart,
} from "./pdfLayout";

export interface PlayerStatsPdfInput {
  title: string; // ex: "Prénom NOM"
  subtitle: string; // ex: "12 matchs joués · Saison 2025-2026"
  summary: PlayerSeasonSummary;
  lines: PlayerMatchInput[]; // lignes brutes (déjà filtrées par saison), triées par date croissante
}

function formatOrDash(value: number | null, suffix = ""): string {
  return value !== null ? `${value}${suffix}` : "—";
}

export async function generatePlayerStatsPdf(input: PlayerStatsPdfInput): Promise<Uint8Array> {
  const pdf = await PdfLayout.create();

  pdf.drawHeader(input.title, input.subtitle);

  // ---------------------------------------------------------------------------
  // KPIs principaux.
  // ---------------------------------------------------------------------------
  pdf.drawSectionTitle("Vue d'ensemble");
  pdf.drawTileGrid(
    [
      {
        label: "Points / match",
        value: formatNumber(input.summary.perGame.points, 1),
        sublabel: `${formatOrDash(input.summary.totals.points)} pts au total`,
      },
      { label: "Rebonds / match", value: formatNumber(input.summary.perGame.reboundsTotal, 1) },
      { label: "Passes D / match", value: formatNumber(input.summary.perGame.assists, 1) },
      { label: "Temps de jeu moyen", value: formatSecondsAsClock(input.summary.perGame.secondsPlayed) },
    ],
    4,
    64,
  );

  // ---------------------------------------------------------------------------
  // Adresse / Régularité : deux vrais tableaux côte à côte (en-tête coloré, zebra).
  // ---------------------------------------------------------------------------
  pdf.ensureSpace(140);
  pdf.y -= SECTION_GAP;
  const colGap = 20;
  const colWidth = (CONTENT_WIDTH - colGap) / 2;
  const colStartY = pdf.y;
  const leftBottom = pdf.drawStatTable("Adresse", MARGIN, colWidth, colStartY, [
    { label: "2PT%", value: formatPct(input.summary.shooting.fg2Pct) },
    { label: "3PT%", value: formatPct(input.summary.shooting.fg3Pct) },
    { label: "LF%", value: formatPct(input.summary.shooting.ftPct) },
    { label: "% au tir", value: formatPct(input.summary.shooting.fgPct) },
  ]);
  const rightBottom = pdf.drawStatTable("Régularité", MARGIN + colWidth + colGap, colWidth, colStartY, [
    {
      label: "Points : médiane",
      value: formatNumber(input.summary.distributions.points.median, 1),
      sublabel: `min ${formatNumber(input.summary.distributions.points.min)} · max ${formatNumber(input.summary.distributions.points.max)}`,
    },
    { label: "Points : écart-type", value: formatNumber(input.summary.distributions.points.stdDev, 1) },
    { label: "Rebonds : médiane", value: formatNumber(input.summary.distributions.reboundsTotal.median, 1) },
    { label: "Passes D : médiane", value: formatNumber(input.summary.distributions.assists.median, 1) },
  ]);
  pdf.y = Math.min(leftBottom, rightBottom);

  // ---------------------------------------------------------------------------
  // Graphiques d'évolution par journée jouée.
  // ---------------------------------------------------------------------------
  const playedLines = input.lines.filter((l) => !l.dnp);
  if (playedLines.length >= 2) {
    pdf.drawSectionTitle("Évolution par journée jouée");

    const chartData = playedLines.map((line) => {
      const derived = deriveLine(line);
      return {
        points: derived.points,
        rebonds: derived.reboundsTotal,
        passes: line.assists ?? null,
        fg2: derived.fg2.pct !== null ? Math.round(derived.fg2.pct * 10) / 10 : null,
        fg3: derived.fg3.pct !== null ? Math.round(derived.fg3.pct * 10) / 10 : null,
        ft: derived.ft.pct !== null ? Math.round(derived.ft.pct * 10) / 10 : null,
      };
    });

    const charts: Chart[] = [
      {
        title: "Points · Rebonds · Passes D",
        series: [
          { label: "Points", color: CHART_COLORS[0], points: chartData.map((d) => d.points) },
          { label: "Rebonds", color: CHART_COLORS[1], points: chartData.map((d) => d.rebonds) },
          { label: "Passes D", color: CHART_COLORS[2], points: chartData.map((d) => d.passes) },
        ],
      },
      {
        title: "Adresse (2PT% · 3PT% · LF%)",
        unit: "%",
        domainMin: 0,
        domainMax: 100,
        series: [
          { label: "2PT%", color: CHART_COLORS[0], points: chartData.map((d) => d.fg2) },
          { label: "3PT%", color: CHART_COLORS[1], points: chartData.map((d) => d.fg3) },
          { label: "LF%", color: CHART_COLORS[2], points: chartData.map((d) => d.ft) },
        ],
      },
    ];

    const chartGap = 20;
    const chartWidth = (CONTENT_WIDTH - chartGap) / 2;

    // Hauteur fixe réservée pour la section "Meilleures performances" qui suit
    // (titre + ligne bleue + une rangée de tuiles), afin que les graphiques
    // puissent s'étirer pour occuper tout l'espace restant de la page.
    const bestPerfTileHeight = 54;
    const bestPerfTileGap = 10;
    const bestPerfSectionHeight = SECTION_GAP + SECTION_TITLE_HEIGHT + bestPerfTileHeight + bestPerfTileGap;
    const minChartHeight = 150;
    const availableHeight = pdf.y - MARGIN - bestPerfSectionHeight - SECTION_GAP;
    const chartHeight = Math.max(minChartHeight, availableHeight);

    pdf.ensureSpace(Math.min(chartHeight, minChartHeight) + SECTION_GAP);

    charts.forEach((chart, index) => {
      const chartX = MARGIN + index * (chartWidth + chartGap);
      pdf.drawLineChart(chart, chartX, chartWidth, chartHeight, pdf.y);
    });

    pdf.y -= chartHeight + SECTION_GAP;
  }

  // ---------------------------------------------------------------------------
  // Meilleures performances.
  // ---------------------------------------------------------------------------
  function formatDate(date: Date): string {
    return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
  }

  pdf.drawSectionTitle("Meilleures performances");
  pdf.drawTileGrid(
    [
      { label: "Points", best: input.summary.bests.points },
      { label: "Rebonds", best: input.summary.bests.reboundsTotal },
      { label: "Passes D", best: input.summary.bests.assists },
      { label: "Interceptions", best: input.summary.bests.steals },
      { label: "Contres", best: input.summary.bests.blocks },
    ].map(({ label, best }) => ({
      label,
      value: best ? String(best.value) : "—",
      sublabel: best ? formatDate(best.matchDate) : undefined,
    })),
    5,
    54,
  );

  return pdf.save();
}
