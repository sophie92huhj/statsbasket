import { listTeams } from "@/lib/repositories/team";
import { listSeasons } from "@/lib/repositories/season";
import { getPlayerPointsForTeamSeason, getTeamMatchAggregateInputs } from "@/lib/repositories/teamAnalytics";
import { splitTeamMatches, summarizeTeamSeason } from "@/lib/stats/teamSeasonStats";
import type { TeamSeasonSummary } from "@/lib/stats/teamSeasonStats";
import { formatNumber, formatPct } from "@/lib/stats/format";
import { Card, KpiCard } from "@/components/ui/Card";
import { StatRow } from "@/components/stats/StatsTable";
import { SeasonSelector } from "./SeasonSelector";
import { TeamTrendCharts } from "./TeamTrendCharts";
import { ComingSoon } from "@/components/ui/ComingSoon";

function SummaryCard({ title, summary }: { title: string; summary: TeamSeasonSummary }) {
  return (
    <Card>
      <h2 className="mb-2 text-sm font-semibold">{title}</h2>
      <StatRow label="Matchs" value={summary.gamesPlayed} sublabel={`${summary.wins}V - ${summary.losses}D`} />
      <StatRow label="Points marqués / match" value={formatNumber(summary.pointsFor.perGame, 1)} />
      <StatRow label="Points encaissés / match" value={formatNumber(summary.pointsAgainst.perGame, 1)} />
      <StatRow label="Différentiel / match" value={formatNumber(summary.pointDifferential.perGame, 1)} />
      <StatRow label="% au tir" value={formatPct(summary.shooting.fgPct)} />
      <StatRow label="3PT%" value={formatPct(summary.shooting.fg3Pct)} />
      <StatRow label="Rebonds / match" value={formatNumber(summary.perGameStats.reboundsTotal, 1)} />
      <StatRow label="Passes D / match" value={formatNumber(summary.perGameStats.assists, 1)} />
      <StatRow label="Balles perdues / match" value={formatNumber(summary.perGameStats.turnovers, 1)} />
    </Card>
  );
}

export default async function TeamPage({
  searchParams,
}: {
  searchParams: Promise<{ saison?: string }>;
}) {
  const { saison: seasonFilter } = await searchParams;
  const [teams, seasons] = await Promise.all([listTeams(), listSeasons()]);
  const ownTeam = teams.find((t) => t.isOwnTeam);

  if (!ownTeam) {
    return (
      <ComingSoon
        title="Équipe"
        description="Aucune équipe n'est marquée comme « Notre équipe ». Rendez-vous dans Paramètres pour le configurer."
      />
    );
  }

  const [matches, playerPoints] = await Promise.all([
    getTeamMatchAggregateInputs(ownTeam.id, { seasonId: seasonFilter }),
    getPlayerPointsForTeamSeason(ownTeam.id, { seasonId: seasonFilter }),
  ]);
  const overall = summarizeTeamSeason(matches);
  const { wins, losses, home, away } = splitTeamMatches(matches);

  if (overall.gamesPlayed === 0) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <h1 className="font-display text-3xl font-semibold tracking-wide">{ownTeam.name}</h1>
          <SeasonSelector seasons={seasons} currentSeasonId={seasonFilter} />
        </div>
        <Card>
          <p className="text-sm text-muted">
            Aucun match avec score renseigné pour cette sélection. Créez un match et saisissez son score.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <h1 className="font-display text-3xl font-semibold tracking-wide">{ownTeam.name}</h1>
        <SeasonSelector seasons={seasons} currentSeasonId={seasonFilter} />
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard label="Matchs" value={overall.gamesPlayed} />
        <KpiCard label="Victoires" value={overall.wins} />
        <KpiCard label="Défaites" value={overall.losses} />
        <KpiCard label="Diff. / match" value={formatNumber(overall.pointDifferential.perGame, 1)} />
      </div>

      <SummaryCard title="Saison complète" summary={overall} />

      <TeamTrendCharts matches={matches} playerPoints={playerPoints} />

      <div>
        <h2 className="mb-3 text-sm font-semibold text-muted">Victoires vs Défaites</h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <SummaryCard title="Sur les victoires" summary={wins} />
          <SummaryCard title="Sur les défaites" summary={losses} />
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-muted">Domicile vs Extérieur</h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <SummaryCard title="À domicile" summary={home} />
          <SummaryCard title="À l'extérieur" summary={away} />
        </div>
      </div>
    </div>
  );
}
