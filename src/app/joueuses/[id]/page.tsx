import { notFound } from "next/navigation";
import { getPlayer } from "@/lib/repositories/player";
import { requireTeamSession } from "@/lib/auth/session";
import { listTeamSeasons } from "@/lib/repositories/team";
import { listSeasons } from "@/lib/repositories/season";
import { getPlayerMatchLines } from "@/lib/repositories/playerAnalytics";
import { summarizePlayerSeason } from "@/lib/stats/playerSeasonStats";
import { formatMadeAttempted, formatNumber, formatPct, formatSecondsAsClock, STAT_DECIMALS } from "@/lib/stats/format";
import { Card } from "@/components/ui/Card";
import { PlayerInfoForm } from "./PlayerInfoForm";
import { PlayerTrendCharts } from "./PlayerTrendCharts";
import { RosterForm } from "./RosterForm";
import { RosterTable } from "./RosterTable";
import { SeasonSelector } from "./SeasonSelector";
import Link from "next/link";

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
}

export default async function PlayerDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saison?: string }>;
}) {
  const { id } = await params;
  const { saison: seasonFilter } = await searchParams;

  const { teamId } = await requireTeamSession();
  const [player, teamSeasons, seasons, lines] = await Promise.all([
    getPlayer(teamId, id),
    listTeamSeasons(teamId),
    listSeasons(teamId),
    getPlayerMatchLines(id, { seasonId: seasonFilter, teamId }),
  ]);

  if (!player) notFound();

  const teamSeasonOptions = teamSeasons.map((ts) => ({
    id: ts.id,
    teamName: ts.team.name,
    seasonLabel: ts.season.label,
  }));

  const summary = summarizePlayerSeason(lines);
  const hasGames = summary.gamesPlayed > 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-wide">
            {player.firstName} {player.lastName.toUpperCase()}
          </h1>
          <p className="text-sm text-muted">
            {summary.gamesPlayed} match{summary.gamesPlayed > 1 ? "s" : ""} joué
            {summary.gamesPlayed > 1 ? "s" : ""}
            {summary.gamesInRoster > summary.gamesPlayed
              ? ` (+ ${summary.gamesInRoster - summary.gamesPlayed} non joué${
                  summary.gamesInRoster - summary.gamesPlayed > 1 ? "s" : ""
                })`
              : ""}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <a
            href={`/api/players/${player.id}/export-pdf${seasonFilter ? `?saison=${seasonFilter}` : ""}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-accent-soft"
          >
            Exporter en PDF
          </a>
          <PlayerInfoForm playerId={player.id} firstName={player.firstName} lastName={player.lastName} />
          <SeasonSelector seasons={seasons} currentSeasonId={seasonFilter} />
        </div>
      </div>

      {!hasGames && (
        <Card>
          <p className="text-sm text-muted">
            Aucune statistique de match disponible pour cette sélection. Saisissez des statistiques depuis la page
            d&apos;un match.
          </p>
        </Card>
      )}

      {hasGames && (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            <Card className="flex flex-col gap-1">
              <span className="text-xs font-medium uppercase tracking-wide text-muted">Éval / match</span>
              <span className="text-2xl font-semibold tabular-nums">{formatNumber(summary.perGame.evaluation, STAT_DECIMALS)}</span>
            </Card>
            <Card className="flex flex-col gap-1">
              <span className="text-xs font-medium uppercase tracking-wide text-muted">Points / match</span>
              <span className="text-2xl font-semibold tabular-nums">{formatNumber(summary.perGame.points, STAT_DECIMALS)}</span>
              <span className="text-xs text-muted">{summary.totals.points} pts au total</span>
            </Card>
            <Card className="flex flex-col gap-1">
              <span className="text-xs font-medium uppercase tracking-wide text-muted">Rebonds / match</span>
              <span className="text-2xl font-semibold tabular-nums">
                {formatNumber(summary.perGame.reboundsTotal, STAT_DECIMALS)}
              </span>
            </Card>
            <Card className="flex flex-col gap-1">
              <span className="text-xs font-medium uppercase tracking-wide text-muted">Passes D / match</span>
              <span className="text-2xl font-semibold tabular-nums">{formatNumber(summary.perGame.assists, STAT_DECIMALS)}</span>
            </Card>
            <Card className="flex flex-col gap-1">
              <span className="text-xs font-medium uppercase tracking-wide text-muted">Temps de jeu moyen</span>
              <span className="text-2xl font-semibold tabular-nums">
                {formatSecondsAsClock(summary.perGame.secondsPlayed)}
              </span>
            </Card>
          </div>

          <Card>
            <h2 className="mb-2 text-sm font-semibold">Adresse</h2>
            {(() => {
              const shots = [
                { label: "2PT", pct: summary.shooting.fg2Pct, made: summary.totals.fg2Made, att: summary.totals.fg2Att },
                { label: "3PT", pct: summary.shooting.fg3Pct, made: summary.totals.fg3Made, att: summary.totals.fg3Att },
                { label: "Total tirs", pct: summary.shooting.fgPct, made: summary.totals.fgMade, att: summary.totals.fgAtt },
                { label: "LF", pct: summary.shooting.ftPct, made: summary.totals.ftMade, att: summary.totals.ftAtt },
              ];
              return (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[420px] table-fixed text-sm">
                    <thead>
                      <tr className="border-b border-border text-xs uppercase tracking-wide text-muted">
                        <th className="w-1/4 py-2 text-left font-medium" />
                        {shots.map((shot) => (
                          <th key={shot.label} className="py-2 text-center font-medium">
                            {shot.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-border">
                        <td className="py-2 text-muted">%</td>
                        {shots.map((shot) => (
                          <td key={shot.label} className="py-2 text-center text-base font-semibold tabular-nums">
                            {formatPct(shot.pct)}
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="py-2 text-muted">Réussis / tentés</td>
                        {shots.map((shot) => (
                          <td key={shot.label} className="py-2 text-center tabular-nums text-muted">
                            {formatMadeAttempted(shot.made, shot.att)}
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </Card>

          <PlayerTrendCharts lines={lines} />

          <Card>
            <h2 className="mb-2 text-sm font-semibold">Meilleures performances</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              {[
                { label: "Points", best: summary.bests.points },
                { label: "Rebonds", best: summary.bests.reboundsTotal },
                { label: "Passes D", best: summary.bests.assists },
                { label: "Interceptions", best: summary.bests.steals },
                { label: "Contres", best: summary.bests.blocks },
              ].map(({ label, best }) => (
                <div key={label} className="flex flex-col gap-0.5">
                  <span className="text-xs text-muted">{label}</span>
                  {best ? (
                    <Link href={`/matchs/${best.matchId}`} className="text-sm font-medium hover:underline">
                      {best.value} <span className="text-xs text-muted">({formatDate(best.matchDate)})</span>
                    </Link>
                  ) : (
                    <span className="text-sm text-muted">—</span>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </>
      )}

      <RosterForm playerId={player.id} teamSeasons={teamSeasonOptions} />

      <RosterTable entries={player.rosterEntries} />
    </div>
  );
}
