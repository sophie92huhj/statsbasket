import { notFound } from "next/navigation";
import { getMatch, computeMatchOutcome, computePointDifferential } from "@/lib/repositories/match";
import { prisma } from "@/lib/db/client";
import { Card, KpiCard } from "@/components/ui/Card";
import { OutcomeBadge } from "@/components/ui/Badge";
import { StatsGrid } from "./StatsGrid";
import { deriveLine } from "@/lib/stats/derive";
import { sum } from "@/lib/stats/aggregate";
import { formatPct } from "@/lib/stats/format";

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "long", year: "numeric" }).format(date);
}

export default async function MatchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const match = await getMatch(id);
  if (!match) notFound();

  const ownTeamId = match.isHome ? match.homeTeamId : match.awayTeamId;
  const ownScore = match.isHome ? match.homeScore : match.awayScore;
  const opponentScore = match.isHome ? match.awayScore : match.homeScore;
  const opponent = match.isHome ? match.awayTeam : match.homeTeam;
  const outcome = computeMatchOutcome(ownScore, opponentScore);
  const diff = computePointDifferential(ownScore, opponentScore);

  const teamSeason = await prisma.teamSeason.findUnique({
    where: { teamId_seasonId: { teamId: ownTeamId, seasonId: match.seasonId } },
    include: { rosterEntries: { include: { player: true }, orderBy: { jerseyNumber: "asc" } } },
  });

  const roster = (teamSeason?.rosterEntries ?? []).map((entry) => ({
    playerId: entry.playerId,
    jerseyNumber: entry.jerseyNumber,
    firstName: entry.player.firstName,
    lastName: entry.player.lastName,
  }));

  const existingStats = match.playerStats.map((s) => ({
    playerId: s.playerId,
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

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">
            {match.isHome ? "vs" : "@"} {opponent.name}
          </h1>
          <p className="text-sm text-muted">
            {formatDate(match.date)} {match.competition ? `· ${match.competition}` : ""} · {match.season.label}
          </p>
        </div>
        <OutcomeBadge outcome={outcome} />
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard label="Score" value={`${ownScore ?? "—"} – ${opponentScore ?? "—"}`} />
        <KpiCard label="Différentiel" value={diff !== null ? (diff > 0 ? `+${diff}` : diff) : "—"} />
        <KpiCard label="FG%" value={formatPct(teamAggregate.fg.pct)} sublabel="Tirs cumulés des joueuses" />
        <KpiCard label="Rebonds" value={teamAggregate.reboundsTotal ?? "—"} />
      </div>

      <Card>
        <h2 className="mb-3 text-sm font-semibold">Statistiques individuelles</h2>
        <StatsGrid matchId={match.id} roster={roster} existingStats={existingStats} />
      </Card>
    </div>
  );
}
