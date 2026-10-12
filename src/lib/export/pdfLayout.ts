// Briques de mise en page partagées par les fiches PDF de synthèse (joueuse, équipe) :
// en-tête, titres de section, tuiles, tableaux à en-tête coloré, courbes et barres.
// Une seule définition du visuel pour que toutes les fiches aient le même rendu.

import { PDFDocument, StandardFonts, LineCapStyle, rgb, type PDFFont, type PDFPage, type RGB } from "pdf-lib";

export function toWinAnsiSafe(text: string): string {
  return text.replace(/≥/g, ">=").replace(/≤/g, "<=").replace(/✓/g, "X");
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

export interface Tile {
  label: string;
  value: string;
  sublabel?: string;
}

export interface TableRow {
  label: string;
  value: string;
  sublabel?: string;
}

export interface ChartSeries {
  label: string;
  color: RGB;
  points: (number | null)[];
}

export interface Chart {
  title: string;
  series: ChartSeries[];
  unit?: string;
  domainMin?: number;
  domainMax?: number;
}

export interface BarChart {
  title: string;
  color: RGB;
  bars: { label: string; value: number | null; display: string }[];
}

// A4 portrait.
export const PAGE_WIDTH = 595.28;
export const PAGE_HEIGHT = 841.89;
export const MARGIN = 32;
export const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
/** Espacement homogène utilisé avant/après chaque section. */
export const SECTION_GAP = 22;
/** Hauteur consommée par drawSectionTitle (hors SECTION_GAP). */
export const SECTION_TITLE_HEIGHT = 20 + 22;

const headerBg: RGB = rgb(0.067, 0.133, 0.302); // bleu foncé, cohérent avec l'export match
const black: RGB = rgb(0.08, 0.09, 0.12);
const white: RGB = rgb(1, 1, 1);
const gray: RGB = rgb(0.42, 0.45, 0.49);
const borderGray: RGB = rgb(0.9, 0.91, 0.89);
const tileBg: RGB = rgb(0.98, 0.98, 0.99);
const zebraBg: RGB = rgb(0.97, 0.97, 0.98);
export const CHART_COLORS: RGB[] = [rgb(0.165, 0.471, 0.839), rgb(0.922, 0.408, 0.204), rgb(0.106, 0.686, 0.478)];

/**
 * Document PDF avec un curseur vertical `y` (en points, origine en bas de page)
 * qui descend au fil des sections ; une nouvelle page est ajoutée si besoin.
 */
export class PdfLayout {
  page: PDFPage;
  y: number;

  private constructor(
    private readonly doc: PDFDocument,
    private readonly font: PDFFont,
    private readonly boldFont: PDFFont,
  ) {
    this.page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    this.y = PAGE_HEIGHT - MARGIN;
  }

  static async create(): Promise<PdfLayout> {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);
    return new PdfLayout(doc, font, boldFont);
  }

  save(): Promise<Uint8Array> {
    return this.doc.save();
  }

  ensureSpace(neededHeight: number) {
    if (this.y - neededHeight < MARGIN) {
      this.page = this.doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      this.y = PAGE_HEIGHT - MARGIN;
    }
  }

  /** En-tête : titre + sous-titre. */
  drawHeader(title: string, subtitle: string) {
    const titleSize = 20;
    this.page.drawText(toWinAnsiSafe(title), {
      x: MARGIN,
      y: this.y - titleSize * 0.8,
      size: titleSize,
      font: this.boldFont,
      color: black,
    });
    this.y -= titleSize + 8;
    this.page.drawText(toWinAnsiSafe(subtitle), { x: MARGIN, y: this.y, size: 10, font: this.font, color: gray });
    this.y -= 2;
  }

  /** Titre de section + ligne bleue. */
  drawSectionTitle(title: string) {
    this.ensureSpace(40);
    this.y -= SECTION_GAP;
    this.page.drawLine({
      start: { x: MARGIN, y: this.y },
      end: { x: PAGE_WIDTH - MARGIN, y: this.y },
      thickness: 2,
      color: headerBg,
    });
    this.y -= 20;
    this.page.drawText(toWinAnsiSafe(title), { x: MARGIN, y: this.y - 2, size: 12, font: this.boldFont, color: black });
    this.y -= 22;
  }

  drawTileGrid(tiles: Tile[], tilesPerRow: number, tileHeight: number) {
    const tileGap = 10;
    const tileWidth = (CONTENT_WIDTH - tileGap * (tilesPerRow - 1)) / tilesPerRow;
    const rows = Math.ceil(tiles.length / tilesPerRow);

    this.ensureSpace(rows * (tileHeight + tileGap));

    tiles.forEach((tile, index) => {
      const col = index % tilesPerRow;
      const row = Math.floor(index / tilesPerRow);
      const tileX = MARGIN + col * (tileWidth + tileGap);
      const tileY = this.y - row * (tileHeight + tileGap) - tileHeight;

      this.page.drawRectangle({
        x: tileX,
        y: tileY,
        width: tileWidth,
        height: tileHeight,
        color: tileBg,
        borderColor: borderGray,
        borderWidth: 1,
      });

      this.page.drawText(toWinAnsiSafe(tile.label.toUpperCase()), {
        x: tileX + 8,
        y: tileY + tileHeight - 16,
        size: 7,
        font: this.boldFont,
        color: gray,
      });

      this.page.drawText(toWinAnsiSafe(tile.value), {
        x: tileX + 8,
        y: tileY + (tile.sublabel ? tileHeight - 36 : tileHeight / 2 - 6),
        size: 15,
        font: this.boldFont,
        color: black,
      });

      if (tile.sublabel) {
        this.page.drawText(toWinAnsiSafe(tile.sublabel), {
          x: tileX + 8,
          y: tileY + 8,
          size: 6.5,
          font: this.font,
          color: gray,
        });
      }
    });

    this.y -= rows * (tileHeight + tileGap);
  }

  /** Tableau libellé / valeur (en-tête coloré, zebra). Renvoie l'ordonnée du bas du tableau. */
  drawStatTable(title: string, x: number, width: number, startY: number, rows: TableRow[]): number {
    const { page, font, boldFont } = this;
    const headerHeight = 24;
    const rowHeight = 22;
    let rowY = startY;

    page.drawRectangle({ x, y: rowY - headerHeight, width, height: headerHeight, color: headerBg });
    page.drawText(toWinAnsiSafe(title.toUpperCase()), {
      x: x + 10,
      y: rowY - headerHeight / 2 - 3,
      size: 8,
      font: boldFont,
      color: white,
    });
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

  /**
   * Graphique d'évolution : séries superposées (une courbe par donnée), axe X en
   * journées jouées (J1, J2, J3...) plutôt qu'en dates, pour ne jamais avoir de
   * "trou" visuel quand une journée n'a pas été jouée.
   * topY est le sommet du bloc complet (titre inclus) ; height est la hauteur totale
   * réservée au bloc (titre + zone de tracé + légende + libellés d'axe X).
   */
  drawLineChart(chart: Chart, x: number, width: number, height: number, topY: number) {
    const { page, font, boldFont } = this;
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

    // Légende : texte en encre neutre (jamais la couleur de série).
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

  /**
   * Histogramme vertical, même anatomie que drawLineChart (titre, gridlines hairline,
   * graduations à gauche) ; la valeur est inscrite au-dessus de chaque barre pour
   * rester lisible une fois imprimé.
   */
  drawBarChart(chart: BarChart, x: number, width: number, height: number, topY: number) {
    const { page, font, boldFont } = this;
    const known = chart.bars.map((b) => b.value).filter((v): v is number => v !== null);
    if (known.length === 0) return;

    const titleHeight = 18;
    const valueLabelHeight = 10;
    const xAxisLabelHeight = 14;

    const domainMax = Math.max(...known) * 1.15 || 1;
    const plotTop = topY - titleHeight - valueLabelHeight;
    const plotBottom = topY - height + xAxisLabelHeight;
    const plotLeft = x + 26;
    const plotRight = x + width;
    const plotWidth = plotRight - plotLeft;
    const n = chart.bars.length;

    page.drawText(toWinAnsiSafe(chart.title), { x, y: topY - 11, size: 10, font: boldFont, color: black });

    [0, 0.5, 1].forEach((t) => {
      const value = domainMax * t;
      const gy = plotBottom + (plotTop - plotBottom) * t;
      page.drawLine({ start: { x: plotLeft, y: gy }, end: { x: plotRight, y: gy }, thickness: 0.75, color: borderGray });
      page.drawText(`${Math.round(value)}`, { x, y: gy - 3, size: 6.5, font, color: gray });
    });

    const slotWidth = plotWidth / n;
    const barWidth = Math.min(slotWidth * 0.6, 36);
    const labelSize = 7;

    chart.bars.forEach((bar, index) => {
      const centerX = plotLeft + slotWidth * (index + 0.5);

      if (bar.value !== null) {
        const barHeight = (bar.value / domainMax) * (plotTop - plotBottom);
        page.drawRectangle({ x: centerX - barWidth / 2, y: plotBottom, width: barWidth, height: barHeight, color: chart.color });

        const valueText = toWinAnsiSafe(bar.display);
        const valueWidth = boldFont.widthOfTextAtSize(valueText, labelSize);
        page.drawText(valueText, {
          x: centerX - valueWidth / 2,
          y: plotBottom + barHeight + 3,
          size: labelSize,
          font: boldFont,
          color: black,
        });
      }

      let label = toWinAnsiSafe(bar.label);
      while (label.length > 1 && font.widthOfTextAtSize(label, labelSize) > slotWidth - 2) {
        label = label.slice(0, -1);
      }
      const labelWidth = font.widthOfTextAtSize(label, labelSize);
      page.drawText(label, { x: centerX - labelWidth / 2, y: plotBottom - 10, size: labelSize, font, color: gray });
    });
  }
}
