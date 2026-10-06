import { NextResponse } from "next/server";
import { getMatch, computeMatchOutcome, computePointDifferential } from "@/lib/repositories/match";
import { getAppSettings } from "@/lib/repositories/appSettings";
import { generateMatchStatsPdf } from "@/lib/export/matchStatsPdf";
import {
  computeDefensiveReboundRatio,
  computeOffensiveReboundRatio,
  computeTurnoverRatio,
  deriveLine,
  isTargetMet,
} from "@/lib/stats/derive";
import { sum } from "@/lib/stats/aggregate";
import { formatPct } from "@/lib/stats/format";

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "long", year: "numeric" }).format(date);
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [match, appSettings] = await Promise.all([getMatch(id), getAppSettings()]);
  if (!match) return NextResponse.json({ error: "Match introuvable" }, { status: 404 });

  const opponent = match.isHome ? match.awayTeam : match.homeTeam;
  const ownScore = match.isHome ? match.homeScore : match.awayScore;
  const opponentScore = match.isHome ? match.awayScore : match.homeScore;
  const outcome = computeMatchOutcome(ownScore, opponentScore);
  const outcomeLabel =
    outcome === "WIN" ? "Victoire" : outcome === "LOSS" ? "Défaite" : outcome === "DRAW" ? "Match nul" : null;
  const diff = computePointDifferential(ownScore, opponentScore);

  // Statistiques d'équipe agrégées à partir des lignes individuelles (même calcul que la page match).
  const teamAggregate = deriveLine({
    fg2Made: sum(match.playerStats.map((s) => s.fg2Made)),
    fg2Att: sum(match.playerStats.map((s) => s.fg2Att)),
    fg3Made: sum(match.playerStats.map((s) => s.fg3Made)),
    fg3Att: sum(match.playerStats.map((s) => s.fg3Att)),
    ftMade: sum(match.playerStats.map((s) => s.ftMade)),
    ftAtt: sum(match.playerStats.map((s) => s.ftAtt)),
    reboundsOff: sum(match.playerStats.map((s) => s.reboundsOff)),
    reboundsDef: sum(match.playerStats.map((s) => s.reboundsDef)),
    assists: null,
    steals: null,
    turnovers: null,
    blocks: null,
    foulsCommitted: null,
    foulsDrawn: null,
  });
  const teamSteals = sum(match.playerStats.map((s) => s.steals));
  const teamTurnovers = sum(match.playerStats.map((s) => s.turnovers));
  const teamFoulsCommitted = sum(match.playerStats.map((s) => s.foulsCommitted));
  const teamFoulsDrawn = sum(match.playerStats.map((s) => s.foulsDrawn));

  const opponentTeamStat = match.teamStats.find((t) => t.teamId === opponent.id);
  const opponentReboundsOff = opponentTeamStat?.reboundsOff ?? null;

  const teamFgMissed =
    teamAggregate.fg.made !== null && teamAggregate.fg.attempted !== null
      ? teamAggregate.fg.attempted - teamAggregate.fg.made
      : null;

  const offensiveReboundRatio = computeOffensiveReboundRatio(
    teamAggregate.reboundsOff,
    teamFgMissed,
    teamAggregate.ft.attempted,
  );
  const defensiveReboundRatio = computeDefensiveReboundRatio(teamAggregate.reboundsDef, opponentReboundsOff);
  const turnoverRatio = computeTurnoverRatio(teamTurnovers, teamAggregate.fg.attempted, teamAggregate.ft.attempted);

  const offensiveReboundStatus = isTargetMet(offensiveReboundRatio, appSettings.offensiveReboundTarget, "higher-is-better");
  const turnoverRatioStatus = isTargetMet(turnoverRatio, appSettings.turnoverRatioTarget, "lower-is-better");

  const pdfBytes = await generateMatchStatsPdf({
    title: `${outcomeLabel ? `${outcomeLabel} ` : ""}vs ${opponent.name}`,
    subtitle: `${formatDate(match.date)}${match.competition ? ` · ${match.competition}` : ""} · ${match.season.label}`,
    score: `${match.homeScore ?? "—"} – ${match.awayScore ?? "—"}`,
    players: match.playerStats.map((s) => ({
      jerseyNumber: s.jerseyNumber,
      starter: s.starter,
      firstName: s.player.firstName,
      lastName: s.player.lastName,
      dnp: s.dnp,
      secondsPlayed: s.secondsPlayed,
      fg2Made: s.fg2Made,
      fg2Att: s.fg2Att,
      fg3Made: s.fg3Made,
      fg3Att: s.fg3Att,
      ftMade: s.ftMade,
      ftAtt: s.ftAtt,
      reboundsOff: s.reboundsOff,
      reboundsDef: s.reboundsDef,
      assists: s.assists,
      steals: s.steals,
      turnovers: s.turnovers,
      blocks: s.blocks,
      foulsCommitted: s.foulsCommitted,
      foulsDrawn: s.foulsDrawn,
      officialPoints: s.officialPoints,
    })),
    teamStats: [
      { label: "Score", value: `${match.homeScore ?? "—"} – ${match.awayScore ?? "—"}` },
      { label: "Différentiel", value: diff !== null ? (diff > 0 ? `+${diff}` : String(diff)) : "—" },
      {
        label: "Pourcentage au tir",
        value: formatPct(teamAggregate.fg.pct),
        sublabel: `${teamAggregate.fg.made ?? "—"}/${teamAggregate.fg.attempted ?? "—"}`,
      },
      {
        label: "Lancers francs",
        value: formatPct(teamAggregate.ft.pct),
        sublabel: `${teamAggregate.ft.made ?? "—"}/${teamAggregate.ft.attempted ?? "—"}`,
      },
      {
        label: "Rebonds",
        value: teamAggregate.reboundsTotal !== null ? String(teamAggregate.reboundsTotal) : "—",
        sublabel: `${teamAggregate.reboundsOff ?? "—"} off · ${teamAggregate.reboundsDef ?? "—"} def`,
      },
      { label: "Interceptions", value: teamSteals !== null ? String(teamSteals) : "—" },
      { label: "Balles perdues", value: teamTurnovers !== null ? String(teamTurnovers) : "—" },
      { label: "Fautes", value: teamFoulsCommitted !== null ? String(teamFoulsCommitted) : "—" },
      { label: "Fautes provoquées", value: teamFoulsDrawn !== null ? String(teamFoulsDrawn) : "—" },
      { label: "Ratio rebonds def.", value: formatPct(defensiveReboundRatio) },
      {
        label: "Ratio rebonds off.",
        value: formatPct(offensiveReboundRatio),
        sublabel: `Objectif : ≥${appSettings.offensiveReboundTarget}%`,
        status: offensiveReboundStatus,
      },
      {
        label: "Ratio balles perdues",
        value: formatPct(turnoverRatio),
        sublabel: `Objectif : ≤${appSettings.turnoverRatioTarget}%`,
        status: turnoverRatioStatus,
      },
    ],
  });

  return new NextResponse(new Uint8Array(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="stats-${opponent.name.replace(/\s+/g, "-")}-${match.date.toISOString().slice(0, 10)}.pdf"`,
    },
  });
}
