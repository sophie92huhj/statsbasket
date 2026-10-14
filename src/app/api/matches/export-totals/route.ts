import { NextResponse } from "next/server";
import { getTeam } from "@/lib/repositories/team";
import { requireApiSession } from "@/lib/auth/session";
import { getAppSettings } from "@/lib/repositories/appSettings";
import { getSelectedMatchesData } from "@/lib/repositories/matchTotals";
import { generateStatsTablePdf, type StatsTableColumn } from "@/lib/export/matchStatsPdf";
import { summarizePlayerSeason, type PlayerSeasonSummary } from "@/lib/stats/playerSeasonStats";
import {
  cumulativeDefensiveReboundRatio,
  summarizeTeamSeason,
  teamMatchLine,
} from "@/lib/stats/teamSeasonStats";
import { computeOffensiveReboundRatio, computeTurnoverRatio, isTargetMet } from "@/lib/stats/derive";
import { formatMadeAttempted, formatNumber, formatPct, formatSecondsAsClock, STAT_DECIMALS } from "@/lib/stats/format";

// Pas de colonne N° : le numéro d'une joueuse peut changer d'un match à l'autre.
const COLUMNS = [
  { key: "name", label: "Joueuse", width: 130, align: "left" },
  { key: "gp", label: "MJ", width: 32, align: "center" },
  { key: "min", label: "MIN", width: 46, align: "center" },
  { key: "pts", label: "PTS", width: 40, align: "center" },
  { key: "fg2", label: "2PT", width: 50, align: "center" },
  { key: "fg3", label: "3PT", width: 50, align: "center" },
  { key: "ft", label: "LF", width: 50, align: "center" },
  { key: "ro", label: "RO", width: 34, align: "center" },
  { key: "rd", label: "RD", width: 34, align: "center" },
  { key: "reb", label: "REB", width: 36, align: "center" },
  { key: "ast", label: "PD", width: 34, align: "center" },
  { key: "stl", label: "INT", width: 34, align: "center" },
  { key: "ctr", label: "CTR", width: 34, align: "center" },
  { key: "bp", label: "BP", width: 34, align: "center" },
  { key: "fp", label: "F", width: 34, align: "center" },
  { key: "fr", label: "FP", width: 34, align: "center" },
  { key: "eval", label: "ÉVAL", width: 44, align: "center" },
] as const satisfies readonly StatsTableColumn[];

function formatSigned(value: number | null): string {
  if (value === null) return "—";
  const text = formatNumber(value, STAT_DECIMALS);
  return value > 0 ? `+${text}` : text;
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
}

/** Ligne du tableau : moyennes par match joué, tirs en cumul (réussis/tentés). */
function rowValues(name: string, summary: PlayerSeasonSummary): Record<string, string> {
  const { perGame, totals } = summary;
  return {
    name,
    gp: String(summary.gamesPlayed),
    min: formatSecondsAsClock(perGame.secondsPlayed),
    pts: formatNumber(perGame.points, STAT_DECIMALS),
    fg2: formatMadeAttempted(totals.fg2Made, totals.fg2Att),
    fg3: formatMadeAttempted(totals.fg3Made, totals.fg3Att),
    ft: formatMadeAttempted(totals.ftMade, totals.ftAtt),
    ro: formatNumber(perGame.reboundsOff, STAT_DECIMALS),
    rd: formatNumber(perGame.reboundsDef, STAT_DECIMALS),
    reb: formatNumber(perGame.reboundsTotal, STAT_DECIMALS),
    ast: formatNumber(perGame.assists, STAT_DECIMALS),
    stl: formatNumber(perGame.steals, STAT_DECIMALS),
    ctr: formatNumber(perGame.blocks, STAT_DECIMALS),
    bp: formatNumber(perGame.turnovers, STAT_DECIMALS),
    fp: formatNumber(perGame.foulsCommitted, STAT_DECIMALS),
    fr: formatNumber(perGame.foulsDrawn, STAT_DECIMALS),
    eval: formatNumber(perGame.evaluation, STAT_DECIMALS),
  };
}

export async function GET(request: Request) {
  const auth = await requireApiSession();
  if (auth instanceof NextResponse) return auth;
  const matchIds = (new URL(request.url).searchParams.get("ids") ?? "").split(",").filter(Boolean);
  if (matchIds.length === 0) {
    return NextResponse.json({ error: "Aucun match sélectionné" }, { status: 400 });
  }

  const [ownTeam, appSettings] = await Promise.all([getTeam(auth.teamId, auth.teamId), getAppSettings(auth.teamId)]);
  if (!ownTeam) return NextResponse.json({ error: "Équipe introuvable" }, { status: 404 });

  const { matches, players, opponentReboundsOff } = await getSelectedMatchesData(ownTeam.id, matchIds);
  if (matches.length === 0) return NextResponse.json({ error: "Matchs introuvables" }, { status: 404 });

  const playerRows = players
    .map((p) => ({ player: p, summary: summarizePlayerSeason(p.lines) }))
    .filter(({ summary }) => summary.gamesPlayed > 0)
    // Classement par éval moyenne décroissante ; éval non calculable en fin de tableau.
    .sort((a, b) => {
      const evalA = a.summary.perGame.evaluation;
      const evalB = b.summary.perGame.evaluation;
      if (evalA === null || evalB === null) return (evalA === null ? 1 : 0) - (evalB === null ? 1 : 0);
      return evalB - evalA;
    })
    .map(({ player, summary }) => rowValues(`${player.firstName} ${player.lastName}`, summary));

  // Ligne "équipe" : chaque match devient une ligne cumulant les joueuses, puis on
  // applique le même résumé que pour une joueuse (moyennes / match, tirs cumulés).
  const teamLines = matches.map((m) => ({ ...teamMatchLine(m), matchId: m.matchId, matchDate: m.matchDate }));
  const team = summarizePlayerSeason(teamLines);
  const results = summarizeTeamSeason(matches);

  const fgMade = team.totals.fg2Made !== null && team.totals.fg3Made !== null ? team.totals.fg2Made + team.totals.fg3Made : null;
  const fgAtt = team.totals.fg2Att !== null && team.totals.fg3Att !== null ? team.totals.fg2Att + team.totals.fg3Att : null;
  const offensiveReboundRatio = computeOffensiveReboundRatio(
    team.totals.reboundsOff,
    fgMade !== null && fgAtt !== null ? fgAtt - fgMade : null,
    team.totals.ftAtt,
  );
  const turnoverRatio = computeTurnoverRatio(team.totals.turnovers, fgAtt, team.totals.ftAtt);
  const defensiveReboundRatio = cumulativeDefensiveReboundRatio(
    teamLines.map((l) => ({
      teamReboundsDef: l.reboundsDef ?? null,
      opponentReboundsOff: opponentReboundsOff.get(l.matchId) ?? null,
    })),
  );

  const record = `${results.wins}V – ${results.losses}D`;
  const first = matches[0].matchDate;
  const last = matches[matches.length - 1].matchDate;

  const pdfBytes = await generateStatsTablePdf({
    title: `Stats totaux · ${ownTeam.name}`,
    subtitle: `${matches.length} match${matches.length > 1 ? "s" : ""} sélectionné${matches.length > 1 ? "s" : ""} · du ${formatDate(first)} au ${formatDate(last)} · moyennes par match joué, tirs en cumul`,
    headerRight: record,
    columns: COLUMNS,
    rows: playerRows,
    totalsRow: { ...rowValues("Moyenne équipe", team), gp: String(matches.length) },
    teamStatsTitle: "Statistiques d'équipe (moyennes par match)",
    teamStats: [
      { label: "Bilan", value: record, sublabel: `${matches.length} match${matches.length > 1 ? "s" : ""}` },
      {
        label: "Différentiel",
        value: formatSigned(results.pointDifferential.perGame),
        sublabel: `${formatNumber(results.pointsFor.perGame, STAT_DECIMALS)} pour · ${formatNumber(results.pointsAgainst.perGame, STAT_DECIMALS)} contre`,
      },
      { label: "Pourcentage au tir", value: formatPct(team.shooting.fgPct), sublabel: formatMadeAttempted(fgMade, fgAtt) },
      {
        label: "Lancers francs",
        value: formatPct(team.shooting.ftPct),
        sublabel: formatMadeAttempted(team.totals.ftMade, team.totals.ftAtt),
      },
      {
        label: "Rebonds",
        value: formatNumber(team.perGame.reboundsTotal, STAT_DECIMALS),
        sublabel: `${formatNumber(team.perGame.reboundsOff, STAT_DECIMALS)} off · ${formatNumber(team.perGame.reboundsDef, STAT_DECIMALS)} def`,
      },
      { label: "Interceptions", value: formatNumber(team.perGame.steals, STAT_DECIMALS) },
      { label: "Balles perdues", value: formatNumber(team.perGame.turnovers, STAT_DECIMALS) },
      { label: "Fautes", value: formatNumber(team.perGame.foulsCommitted, STAT_DECIMALS) },
      { label: "Fautes provoquées", value: formatNumber(team.perGame.foulsDrawn, STAT_DECIMALS) },
      { label: "Ratio rebonds def.", value: formatPct(defensiveReboundRatio) },
      {
        label: "Ratio rebonds off.",
        value: formatPct(offensiveReboundRatio),
        sublabel: `Objectif : ≥${appSettings.offensiveReboundTarget}%`,
        status: isTargetMet(offensiveReboundRatio, appSettings.offensiveReboundTarget, "higher-is-better"),
      },
      {
        label: "Ratio balles perdues",
        value: formatPct(turnoverRatio),
        sublabel: `Objectif : ≤${appSettings.turnoverRatioTarget}%`,
        status: isTargetMet(turnoverRatio, appSettings.turnoverRatioTarget, "lower-is-better"),
      },
    ],
  });

  return new NextResponse(new Uint8Array(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="stats-totaux-${first.toISOString().slice(0, 10)}-${last.toISOString().slice(0, 10)}.pdf"`,
    },
  });
}
