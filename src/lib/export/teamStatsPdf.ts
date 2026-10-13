import { formatNumber, formatPct, STAT_DECIMALS, roundStat } from "@/lib/stats/format";
import { teamMatchShooting, type TeamMatchAggregateInput, type TeamSeasonSummary } from "@/lib/stats/teamSeasonStats";
import type { PlayerSeasonPoints } from "@/lib/repositories/teamAnalytics";
import { CHART_COLORS, CONTENT_WIDTH, MARGIN, PdfLayout, SECTION_GAP, type Chart } from "./pdfLayout";

export interface TeamStatsPdfInput {
  title: string; // nom de l'équipe
  subtitle: string; // ex: "12 matchs · Saison 2025-2026"
  summary: TeamSeasonSummary;
  matches: TeamMatchAggregateInput[]; // triés par date croissante
  playerPoints: PlayerSeasonPoints[]; // triés par points / match décroissants
}

export async function generateTeamStatsPdf(input: TeamStatsPdfInput): Promise<Uint8Array> {
  const { summary } = input;
  const pdf = await PdfLayout.create();

  pdf.drawHeader(input.title, input.subtitle);

  // ---------------------------------------------------------------------------
  // KPIs principaux.
  // ---------------------------------------------------------------------------
  pdf.drawSectionTitle("Vue d'ensemble");
  pdf.drawTileGrid(
    [
      { label: "Matchs", value: String(summary.gamesPlayed) },
      { label: "Victoires", value: String(summary.wins) },
      { label: "Défaites", value: String(summary.losses) },
      { label: "Diff. / match", value: formatNumber(summary.pointDifferential.perGame, STAT_DECIMALS) },
    ],
    4,
    64,
  );

  // ---------------------------------------------------------------------------
  // Saison complète : deux tableaux côte à côte.
  // ---------------------------------------------------------------------------
  pdf.ensureSpace(160);
  pdf.y -= SECTION_GAP;
  const colGap = 20;
  const colWidth = (CONTENT_WIDTH - colGap) / 2;
  const colStartY = pdf.y;
  const leftBottom = pdf.drawStatTable("Résultats", MARGIN, colWidth, colStartY, [
    { label: "Matchs", value: String(summary.gamesPlayed), sublabel: `${summary.wins}V - ${summary.losses}D` },
    { label: "Points marqués / match", value: formatNumber(summary.pointsFor.perGame, STAT_DECIMALS) },
    { label: "Points encaissés / match", value: formatNumber(summary.pointsAgainst.perGame, STAT_DECIMALS) },
    { label: "Différentiel / match", value: formatNumber(summary.pointDifferential.perGame, STAT_DECIMALS) },
  ]);
  const rightBottom = pdf.drawStatTable("Adresse & jeu", MARGIN + colWidth + colGap, colWidth, colStartY, [
    { label: "% au tir", value: formatPct(summary.shooting.fgPct) },
    { label: "3PT%", value: formatPct(summary.shooting.fg3Pct) },
    { label: "Rebonds / match", value: formatNumber(summary.perGameStats.reboundsTotal, STAT_DECIMALS) },
    { label: "Passes D / match", value: formatNumber(summary.perGameStats.assists, STAT_DECIMALS) },
    { label: "Balles perdues / match", value: formatNumber(summary.perGameStats.turnovers, STAT_DECIMALS) },
  ]);
  pdf.y = Math.min(leftBottom, rightBottom);

  // ---------------------------------------------------------------------------
  // Évolution par journée + points par joueuse : les graphiques se partagent
  // tout l'espace restant de la page.
  // ---------------------------------------------------------------------------
  const hasTrends = input.matches.length >= 2;
  const bars = input.playerPoints.slice(0, 12).map((p) => ({
    label: p.firstName,
    value: roundStat(p.pointsPerGame),
    display: formatNumber(p.pointsPerGame, STAT_DECIMALS),
  }));
  const hasBars = bars.some((b) => b.value !== null);
  if (!hasTrends && !hasBars) return pdf.save();

  pdf.drawSectionTitle("Évolution par journée");

  const minChartHeight = 150;
  const blockCount = (hasTrends ? 1 : 0) + (hasBars ? 1 : 0);
  const availableHeight = pdf.y - MARGIN - SECTION_GAP * (blockCount - 1);
  const chartHeight = Math.max(minChartHeight, Math.min(280, availableHeight / blockCount));

  if (hasTrends) {
    const trend = input.matches.map((m) => {
      const shooting = teamMatchShooting(m);
      return {
        diff: m.ownScore !== null && m.opponentScore !== null ? m.ownScore - m.opponentScore : null,
        fg2: roundStat(shooting.fg2.pct),
        fg3: roundStat(shooting.fg3.pct),
        ft: roundStat(shooting.ft.pct),
      };
    });

    // Échelle symétrique autour de 0 : la gridline du milieu sert de ligne de référence.
    const maxAbsDiff = Math.max(0, ...trend.map((t) => Math.abs(t.diff ?? 0)));
    const diffBound = Math.ceil(maxAbsDiff * 1.2) || 1;

    const charts: Chart[] = [
      {
        title: "Évolution du différentiel",
        domainMin: -diffBound,
        domainMax: diffBound,
        series: [{ label: "Différentiel", color: CHART_COLORS[0], points: trend.map((t) => t.diff) }],
      },
      {
        title: "Évolution de l'adresse",
        unit: "%",
        domainMin: 0,
        domainMax: 100,
        series: [
          { label: "LF%", color: CHART_COLORS[0], points: trend.map((t) => t.ft) },
          { label: "2PT%", color: CHART_COLORS[1], points: trend.map((t) => t.fg2) },
          { label: "3PT%", color: CHART_COLORS[2], points: trend.map((t) => t.fg3) },
        ],
      },
    ];

    const chartGap = 20;
    const chartWidth = (CONTENT_WIDTH - chartGap) / 2;
    pdf.ensureSpace(chartHeight);
    charts.forEach((chart, index) => {
      pdf.drawLineChart(chart, MARGIN + index * (chartWidth + chartGap), chartWidth, chartHeight, pdf.y);
    });
    pdf.y -= chartHeight + SECTION_GAP;
  }

  if (hasBars) {
    pdf.ensureSpace(chartHeight);
    pdf.drawBarChart(
      { title: "Points par joueuse (moyenne / match)", color: CHART_COLORS[0], bars },
      MARGIN,
      CONTENT_WIDTH,
      chartHeight,
      pdf.y,
    );
    pdf.y -= chartHeight;
  }

  return pdf.save();
}
