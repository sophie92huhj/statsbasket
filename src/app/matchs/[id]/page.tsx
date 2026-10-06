import { notFound } from "next/navigation";
import { getMatch, computeMatchOutcome, computePointDifferential } from "@/lib/repositories/match";
import { listTeams } from "@/lib/repositories/team";
import { listMatchDocuments } from "@/lib/repositories/matchDocument";
import { getAppSettings } from "@/lib/repositories/appSettings";
import { prisma } from "@/lib/db/client";
import { Card, KpiCard } from "@/components/ui/Card";
import { OutcomeBadge } from "@/components/ui/Badge";
import { EditMatchPanel } from "./EditMatchPanel";
import { MatchDocumentsPanel } from "./MatchDocumentsPanel";
import { MatchPointsChart } from "./MatchPointsChart";
import { OpponentReboundsPanel } from "./OpponentReboundsPanel";
import { StatsGrid } from "./StatsGrid";
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

export default async function MatchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [match, teams, documents, appSettings] = await Promise.all([
    getMatch(id),
    listTeams(),
    listMatchDocuments(id),
    getAppSettings(),
  ]);
  if (!match) notFound();

  const ownTeamId = match.isHome ? match.homeTeamId : match.awayTeamId;
  const ownScore = match.isHome ? match.homeScore : match.awayScore;
  const opponentScore = match.isHome ? match.awayScore : match.homeScore;
  const opponent = match.isHome ? match.awayTeam : match.homeTeam;
  const outcome = computeMatchOutcome(ownScore, opponentScore);
  const diff = computePointDifferential(ownScore, opponentScore);

  const teamSeason = await prisma.teamSeason.findUnique({
    where: { teamId_seasonId: { teamId: ownTeamId, seasonId: match.seasonId } },
    include: {
      rosterEntries: { include: { player: true }, orderBy: { player: { lastName: "asc" } } },
    },
  });

  const roster = (teamSeason?.rosterEntries ?? []).map((entry) => ({
    playerId: entry.playerId,
    firstName: entry.player.firstName,
    lastName: entry.player.lastName,
  }));

  const existingStats = match.playerStats.map((s) => ({
    playerId: s.playerId,
    jerseyNumber: s.jerseyNumber,
    starter: s.starter,
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
  }));

  // Statistiques d'équipe agrégées à partir des lignes individuelles (§16).
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

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">vs {opponent.name}</h1>
          <p className="text-sm text-muted">
            {formatDate(match.date)} {match.competition ? `· ${match.competition}` : ""} · {match.season.label}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <a
            href={`/api/matches/${match.id}/export-pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md border border-border bg-surface px-3 py-1.5 text-sm font-medium hover:bg-background"
          >
            Exporter en PDF
          </a>
          <OutcomeBadge outcome={outcome} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <KpiCard label="Score" value={`${match.homeScore ?? "—"} – ${match.awayScore ?? "—"}`} />
        <KpiCard
          label="Différentiel"
          value={diff !== null ? (diff > 0 ? `+${diff}` : diff) : "—"}
          sublabel={
            match.maxPointDifferentialAdvantage !== null || match.maxPointDifferentialDisadvantage !== null ? (
              <>
                Avantage max : {match.maxPointDifferentialAdvantage !== null ? `+${match.maxPointDifferentialAdvantage} pts` : "—"}
                <br />
                Désavantage max : {match.maxPointDifferentialDisadvantage !== null ? `-${match.maxPointDifferentialDisadvantage} pts` : "—"}
              </>
            ) : undefined
          }
        />
        <KpiCard
          label="Pourcentage au tir"
          value={formatPct(teamAggregate.fg.pct)}
          sublabel={`${teamAggregate.fg.made ?? "—"}/${teamAggregate.fg.attempted ?? "—"}`}
        />
        <KpiCard
          label="Lancers francs"
          value={formatPct(teamAggregate.ft.pct)}
          sublabel={`${teamAggregate.ft.made ?? "—"}/${teamAggregate.ft.attempted ?? "—"}`}
        />
        <KpiCard
          label="Rebonds"
          value={teamAggregate.reboundsTotal ?? "—"}
          sublabel={`${teamAggregate.reboundsOff ?? "—"} off · ${teamAggregate.reboundsDef ?? "—"} def`}
        />
        <KpiCard label="Interceptions" value={teamSteals ?? "—"} />
        <KpiCard label="Balles perdues" value={teamTurnovers ?? "—"} />
        <KpiCard
          label="Ratio rebonds off."
          value={formatPct(offensiveReboundRatio)}
          status={offensiveReboundStatus === null ? undefined : offensiveReboundStatus ? "success" : "danger"}
          sublabel={`Objectif : ≥${appSettings.offensiveReboundTarget}%`}
        />
        <KpiCard label="Ratio rebonds def." value={formatPct(defensiveReboundRatio)} />
        <KpiCard
          label="Ratio balles perdues"
          value={formatPct(turnoverRatio)}
          status={turnoverRatioStatus === null ? undefined : turnoverRatioStatus ? "success" : "danger"}
          sublabel={`Objectif : ≤${appSettings.turnoverRatioTarget}%`}
        />
      </div>

      <OpponentReboundsPanel
        matchId={match.id}
        opponentTeamId={opponent.id}
        opponentName={opponent.name}
        initialReboundsOff={opponentReboundsOff}
        initialMaxAdvantage={match.maxPointDifferentialAdvantage}
        initialMaxDisadvantage={match.maxPointDifferentialDisadvantage}
      />

      <EditMatchPanel
        matchId={match.id}
        teams={teams}
        ownTeamId={ownTeamId}
        opponentName={opponent.name}
        isHome={match.isHome}
        date={match.date}
        competition={match.competition}
        homeScore={match.homeScore}
        awayScore={match.awayScore}
      />

      <MatchDocumentsPanel matchId={match.id} documents={documents} />

      <Card>
        <h2 className="mb-3 text-sm font-semibold">Statistiques individuelles</h2>
        <StatsGrid matchId={match.id} roster={roster} existingStats={existingStats} />
      </Card>

      <MatchPointsChart
        playerStats={match.playerStats.map((s) => ({
          playerId: s.playerId,
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
        }))}
      />
    </div>
  );
}
