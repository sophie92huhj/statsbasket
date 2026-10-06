import { PDFDocument, StandardFonts, LineCapStyle, rgb, type RGB } from "pdf-lib";
import { deriveLine } from "@/lib/stats/derive";
import { formatNumber, formatPct, formatSecondsAsClock } from "@/lib/stats/format";
import type { PlayerMatchInput, PlayerSeasonSummary } from "@/lib/stats/playerSeasonStats";

export interface PlayerStatsPdfInput {
  title: string; // ex: "Prénom NOM"
  subtitle: string; // ex: "12 matchs joués · Saison 2025-2026"
  summary: PlayerSeasonSummary;
  lines: PlayerMatchInput[]; // lignes brutes (déjà filtrées par saison), triées par date croissante
}

function toWinAnsiSafe(text: string): string {
  return text.replace(/≥/g, ">=").replace(/≤/g, "<=").replace(/✓/g, "X");
}

function formatOrDash(value: number | null, suffix = ""): string {
  return value !== null ? `${value}${suffix}` : "—";
}

/**
 * Chemin SVG en courbe lisse (interpolation cubique monotone, façon Recharts
 * `type="monotone"`) pour une suite de points CONTIGUS (pas de valeur manquante
 * au milieu). Les tangentes sont calculées par la méthode de Fritsch-Carlson :
 * la courbe ne dépasse jamais les valeurs des points qu'elle relie.
 */
function monotoneCubicPath(points: { x: number; y: number }[]): string {
  const n = points.length;
  if (n < 2) return "";
  if (n === 2) {
    return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
  }

  const dx: number[] = [];
  const slope: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    dx[i] = points[i + 1].x - points[i].x;
    slope[i] = dx[i] === 0 ? 0 : (points[i + 1].y - points[i].y) / dx[i];
  }

  const tangent: number[] = new Array(n).fill(0);
  tangent[0] = slope[0];
  tangent[n - 1] = slope[n - 2];
  for (let i = 1; i < n - 1; i++) {
    if (slope[i - 1] * slope[i] <= 0) {
      tangent[i] = 0;
    } else {
      tangent[i] = (slope[i - 1] + slope[i]) / 2;
    }
  }
  // Contrainte de Fritsch-Carlson : empêche tout dépassement entre points voisins.
  for (let i = 0; i < n - 1; i++) {
    if (slope[i] === 0) {
      tangent[i] = 0;
      tangent[i + 1] = 0;
      continue;
    }
    const a = tangent[i] / slope[i];
    const b = tangent[i + 1] / slope[i];
    const h = Math.hypot(a, b);
    if (h > 3) {
      const t = 3 / h;
      tangent[i] = t * a * slope[i];
      tangent[i + 1] = t * b * slope[i];
    }
  }

  let path = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < n - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const cp1x = p0.x + dx[i] / 3;
    const cp1y = p0.y + tangent[i] * (dx[i] / 3);
    const cp2x = p1.x - dx[i] / 3;
    const cp2y = p1.y - tangent[i + 1] * (dx[i] / 3);
    path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p1.x} ${p1.y}`;
  }
  return path;
}

interface Tile {
  label: string;
  value: string;
  sublabel?: string;
}

interface ChartSeries {
  label: string;
  color: RGB;
  points: (number | null)[];
}

interface Chart {
  title: string;
  series: ChartSeries[];
  unit?: string;
  domainMin?: number;
  domainMax?: number;
}

export async function generatePlayerStatsPdf(input: PlayerStatsPdfInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);

  // A4 portrait.
  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const margin = 32;
  const contentWidth = pageWidth - margin * 2;

  const headerBg: RGB = rgb(0.067, 0.133, 0.302); // bleu foncé, cohérent avec l'export match
  const black: RGB = rgb(0.08, 0.09, 0.12);
  const white: RGB = rgb(1, 1, 1);
  const gray: RGB = rgb(0.42, 0.45, 0.49);
  const borderGray: RGB = rgb(0.9, 0.91, 0.89);
  const tileBg: RGB = rgb(0.98, 0.98, 0.99);
  const zebraBg: RGB = rgb(0.97, 0.97, 0.98);
  const chartColors: RGB[] = [rgb(0.165, 0.471, 0.839), rgb(0.922, 0.408, 0.204), rgb(0.106, 0.686, 0.478)];

  let page = doc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  function ensureSpace(neededHeight: number) {
    if (y - neededHeight < margin) {
      page = doc.addPage([pageWidth, pageHeight]);
      y = pageHeight - margin;
    }
  }

  // ---------------------------------------------------------------------------
  // En-tête : titre + sous-titre + ligne de séparation sobre.
  // ---------------------------------------------------------------------------
  const titleSize = 20;
  page.drawText(toWinAnsiSafe(input.title), { x: margin, y: y - titleSize * 0.8, size: titleSize, font: boldFont, color: black });
  y -= titleSize + 8;
  page.drawText(toWinAnsiSafe(input.subtitle), { x: margin, y, size: 10, font, color: gray });
  y -= 2;

  // ---------------------------------------------------------------------------
  // Section générique : titre de section + ligne bleue.
  // sectionGap est l'espacement homogène utilisé avant/après chaque section.
  // ---------------------------------------------------------------------------
  const sectionGap = 22;

  function drawSectionTitle(title: string) {
    ensureSpace(40);
    y -= sectionGap;
    page.drawLine({ start: { x: margin, y }, end: { x: pageWidth - margin, y }, thickness: 2, color: headerBg });
    y -= 20;
    page.drawText(toWinAnsiSafe(title), { x: margin, y: y - 2, size: 12, font: boldFont, color: black });
    y -= 22;
  }

  // ---------------------------------------------------------------------------
  // Grille de tuiles (réutilisée pour les KPIs principaux et les meilleures perfs).
  // ---------------------------------------------------------------------------
  function drawTileGrid(tiles: Tile[], tilesPerRow: number, tileHeight: number) {
    const tileGap = 10;
    const tileWidth = (contentWidth - tileGap * (tilesPerRow - 1)) / tilesPerRow;
    const rows = Math.ceil(tiles.length / tilesPerRow);

    ensureSpace(rows * (tileHeight + tileGap));

    tiles.forEach((tile, index) => {
      const col = index % tilesPerRow;
      const row = Math.floor(index / tilesPerRow);
      const tileX = margin + col * (tileWidth + tileGap);
      const tileY = y - row * (tileHeight + tileGap) - tileHeight;

      page.drawRectangle({
        x: tileX,
        y: tileY,
        width: tileWidth,
        height: tileHeight,
        color: tileBg,
        borderColor: borderGray,
        borderWidth: 1,
      });

      page.drawText(toWinAnsiSafe(tile.label.toUpperCase()), {
        x: tileX + 8,
        y: tileY + tileHeight - 16,
        size: 7,
        font: boldFont,
        color: gray,
      });

      page.drawText(toWinAnsiSafe(tile.value), {
        x: tileX + 8,
        y: tileY + (tile.sublabel ? tileHeight - 36 : tileHeight / 2 - 6),
        size: 15,
        font: boldFont,
        color: black,
      });

      if (tile.sublabel) {
        page.drawText(toWinAnsiSafe(tile.sublabel), {
          x: tileX + 8,
          y: tileY + 8,
          size: 6.5,
          font,
          color: gray,
        });
      }
    });

    y -= rows * (tileHeight + tileGap);
  }

  // ---------------------------------------------------------------------------
  // KPIs principaux.
  // ---------------------------------------------------------------------------
  drawSectionTitle("Vue d'ensemble");
  drawTileGrid(
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
  interface TableRow {
    label: string;
    value: string;
    sublabel?: string;
  }

  function drawStatTable(title: string, x: number, width: number, startY: number, rows: TableRow[]): number {
    const headerHeight = 24;
    const rowHeight = 22;
    let rowY = startY;

    page.drawRectangle({ x, y: rowY - headerHeight, width, height: headerHeight, color: headerBg });
    page.drawText(toWinAnsiSafe(title.toUpperCase()), { x: x + 10, y: rowY - headerHeight / 2 - 3, size: 8, font: boldFont, color: white });
    rowY -= headerHeight;

    rows.forEach((row, index) => {
      if (index % 2 === 1) {
        page.drawRectangle({ x, y: rowY - rowHeight, width, height: rowHeight, color: zebraBg });
      }
      page.drawText(toWinAnsiSafe(row.label), { x: x + 10, y: rowY - 14, size: 9, font, color: black });

      const valueText = toWinAnsiSafe(row.value);
      const valueWidth = boldFont.widthOfTextAtSize(valueText, 10);
      const valueX = x + width - 10 - valueWidth;
      page.drawText(valueText, { x: valueX, y: rowY - 14, size: 10, font: boldFont, color: black });

      if (row.sublabel) {
        const sublabelText = toWinAnsiSafe(row.sublabel);
        const sublabelWidth = font.widthOfTextAtSize(sublabelText, 6.5);
        page.drawText(sublabelText, { x: valueX - 8 - sublabelWidth, y: rowY - 13, size: 6.5, font, color: gray });
      }

      rowY -= rowHeight;
      page.drawLine({ start: { x, y: rowY }, end: { x: x + width, y: rowY }, thickness: 0.5, color: borderGray });
    });

    // Bordure extérieure du tableau (haut déjà fermé par le fond coloré de l'en-tête).
    page.drawLine({ start: { x, y: startY }, end: { x: x + width, y: startY }, thickness: 0.5, color: borderGray });
    page.drawLine({ start: { x, y: startY }, end: { x, y: rowY }, thickness: 0.5, color: borderGray });
    page.drawLine({ start: { x: x + width, y: startY }, end: { x: x + width, y: rowY }, thickness: 0.5, color: borderGray });

    return rowY;
  }

  ensureSpace(140);
  y -= sectionGap;
  const colGap = 20;
  const colWidth = (contentWidth - colGap) / 2;
  const colStartY = y;
  const leftBottom = drawStatTable("Adresse", margin, colWidth, colStartY, [
    { label: "2PT%", value: formatPct(input.summary.shooting.fg2Pct) },
    { label: "3PT%", value: formatPct(input.summary.shooting.fg3Pct) },
    { label: "LF%", value: formatPct(input.summary.shooting.ftPct) },
    { label: "% au tir", value: formatPct(input.summary.shooting.fgPct) },
  ]);
  const rightBottom = drawStatTable("Régularité", margin + colWidth + colGap, colWidth, colStartY, [
    {
      label: "Points : médiane",
      value: formatNumber(input.summary.distributions.points.median, 1),
      sublabel: `min ${formatNumber(input.summary.distributions.points.min)} · max ${formatNumber(input.summary.distributions.points.max)}`,
    },
    { label: "Points : écart-type", value: formatNumber(input.summary.distributions.points.stdDev, 1) },
    { label: "Rebonds : médiane", value: formatNumber(input.summary.distributions.reboundsTotal.median, 1) },
    { label: "Passes D : médiane", value: formatNumber(input.summary.distributions.assists.median, 1) },
  ]);
  y = Math.min(leftBottom, rightBottom);

  // ---------------------------------------------------------------------------
  // Graphiques d'évolution : séries superposées sur un même graphique (une
  // courbe par donnée), axe X en journées jouées (J1, J2, J3...) plutôt qu'en
  // dates, pour ne jamais avoir de "trou" visuel quand une journée n'a pas été
  // jouée.
  // ---------------------------------------------------------------------------
  // topY est le sommet du bloc complet (titre inclus) ; height est la hauteur totale
  // réservée au bloc (titre + zone de tracé + légende + libellés d'axe X).
  function drawChart(chart: Chart, x: number, width: number, height: number, topY: number) {
    const allKnown = chart.series.flatMap((s) => s.points.filter((v): v is number => v !== null));
    if (allKnown.length === 0) return;

    const titleHeight = 18;
    const legendHeight = 14;
    const xAxisLabelHeight = 12;

    const domainMin = chart.domainMin ?? Math.min(0, ...allKnown);
    const domainMax = chart.domainMax ?? (Math.max(...allKnown) * 1.2 || 1);
    const plotTop = topY - titleHeight;
    const plotBottom = topY - height + xAxisLabelHeight + legendHeight;
    const plotLeft = x + 26;
    const plotRight = x + width;
    const plotWidth = plotRight - plotLeft;
    const n = chart.series[0]?.points.length ?? 0;

    page.drawText(toWinAnsiSafe(chart.title), { x, y: topY - 11, size: 10, font: boldFont, color: black });

    // Gridlines hairline, recessives — jamais en pointillés (cf. marks-and-anatomy).
    [0, 0.5, 1].forEach((t) => {
      const value = domainMin + (domainMax - domainMin) * t;
      const gy = plotBottom + (plotTop - plotBottom) * t;
      page.drawLine({ start: { x: plotLeft, y: gy }, end: { x: plotRight, y: gy }, thickness: 0.75, color: borderGray });
      const label = `${Math.round(value)}${chart.unit ?? ""}`;
      page.drawText(label, { x, y: gy - 3, size: 6.5, font, color: gray });
    });

    function toXY(index: number, value: number): { x: number; y: number } {
      const px = n > 1 ? plotLeft + (plotWidth * index) / (n - 1) : plotLeft + plotWidth / 2;
      const py = plotBottom + ((value - domainMin) / (domainMax - domainMin)) * (plotTop - plotBottom);
      return { x: px, y: py };
    }

    const markerRadius = 3.2; // ~6.4px de diamètre, lisible sans alourdir une courbe à 9+ points
    const markerRing = 1.1;

    chart.series.forEach((series) => {
      // Regroupe les points en tronçons contigus (une valeur manquante coupe le tronçon),
      // puis trace chacun en courbe lisse (interpolation monotone, jamais de segment droit).
      let segment: { x: number; y: number }[] = [];
      const flushSegment = () => {
        if (segment.length >= 2) {
          // drawSvgPath inverse l'axe Y en interne (convention SVG) ; on compense
          // en inversant déjà nos y, et on fixe x/y à l'origine pour dessiner en
          // coordonnées absolues de page plutôt qu'en coordonnées relatives au curseur.
          const flipped = segment.map((p) => ({ x: p.x, y: -p.y }));
          page.drawSvgPath(monotoneCubicPath(flipped), {
            x: 0,
            y: 0,
            borderColor: series.color,
            borderWidth: 2,
            borderLineCap: LineCapStyle.Round,
          });
        }
        segment = [];
      };
      series.points.forEach((value, index) => {
        if (value === null) {
          flushSegment();
          return;
        }
        segment.push(toXY(index, value));
      });
      flushSegment();

      // Marqueurs (anneau de surface blanc) dessinés après les courbes pour rester au premier plan.
      series.points.forEach((value, index) => {
        if (value === null) return;
        const point = toXY(index, value);
        page.drawCircle({ x: point.x, y: point.y, size: markerRadius, color: series.color, borderColor: white, borderWidth: markerRing });
      });
    });

    // Légende : toujours présente pour >= 2 séries, texte en encre neutre (jamais la couleur de série).
    const legendY = plotBottom - xAxisLabelHeight - 10;
    let legendX = plotLeft;
    chart.series.forEach((series) => {
      page.drawLine({
        start: { x: legendX, y: legendY + 3 },
        end: { x: legendX + 14, y: legendY + 3 },
        thickness: 2,
        color: series.color,
        lineCap: LineCapStyle.Round,
      });
      const label = toWinAnsiSafe(series.label);
      page.drawText(label, { x: legendX + 18, y: legendY, size: 7.5, font, color: black });
      legendX += 18 + font.widthOfTextAtSize(label, 7.5) + 16;
    });

    // Axe X : toutes les journées jouées, "J1" à "Jn".
    const xLabelSize = n > 14 ? 5 : 6.5;
    for (let index = 0; index < n; index++) {
      const point = toXY(index, domainMin);
      const label = `J${index + 1}`;
      const labelWidth = font.widthOfTextAtSize(label, xLabelSize);
      page.drawText(label, { x: point.x - labelWidth / 2, y: plotBottom - 9, size: xLabelSize, font, color: gray });
    }
  }

  const playedLines = input.lines.filter((l) => !l.dnp);
  if (playedLines.length >= 2) {
    drawSectionTitle("Évolution par journée jouée");

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
          { label: "Points", color: chartColors[0], points: chartData.map((d) => d.points) },
          { label: "Rebonds", color: chartColors[1], points: chartData.map((d) => d.rebonds) },
          { label: "Passes D", color: chartColors[2], points: chartData.map((d) => d.passes) },
        ],
      },
      {
        title: "Adresse (2PT% · 3PT% · LF%)",
        unit: "%",
        domainMin: 0,
        domainMax: 100,
        series: [
          { label: "2PT%", color: chartColors[0], points: chartData.map((d) => d.fg2) },
          { label: "3PT%", color: chartColors[1], points: chartData.map((d) => d.fg3) },
          { label: "LF%", color: chartColors[2], points: chartData.map((d) => d.ft) },
        ],
      },
    ];

    const chartGap = 20;
    const chartWidth = (contentWidth - chartGap) / 2;

    // Hauteur fixe réservée pour la section "Meilleures performances" qui suit
    // (titre + ligne bleue + une rangée de tuiles), afin que les graphiques
    // puissent s'étirer pour occuper tout l'espace restant de la page.
    const bestPerfTileHeight = 54;
    const bestPerfTileGap = 10;
    const bestPerfSectionHeight = sectionGap + 20 + 22 + bestPerfTileHeight + bestPerfTileGap;
    const minChartHeight = 150;
    const availableHeight = y - margin - bestPerfSectionHeight - sectionGap;
    const chartHeight = Math.max(minChartHeight, availableHeight);

    ensureSpace(Math.min(chartHeight, minChartHeight) + sectionGap);

    charts.forEach((chart, index) => {
      const chartX = margin + index * (chartWidth + chartGap);
      drawChart(chart, chartX, chartWidth, chartHeight, y);
    });

    y -= chartHeight + sectionGap;
  }

  // ---------------------------------------------------------------------------
  // Meilleures performances.
  // ---------------------------------------------------------------------------
  function formatDate(date: Date): string {
    return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
  }

  drawSectionTitle("Meilleures performances");
  drawTileGrid(
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

  return doc.save();
}
