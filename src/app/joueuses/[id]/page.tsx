import { notFound } from "next/navigation";
import { getPlayer } from "@/lib/repositories/player";
import { listTeamSeasons } from "@/lib/repositories/team";
import { listSeasons } from "@/lib/repositories/season";
import { getPlayerMatchLines } from "@/lib/repositories/playerAnalytics";
import { summarizePlayerSeason } from "@/lib/stats/playerSeasonStats";
import { formatNumber, formatPct, formatSecondsAsClock } from "@/lib/stats/format";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { StatRow } from "@/components/stats/StatsTable";
import { RosterForm } from "./RosterForm";
import { SeasonSelector } from "./SeasonSelector";
import Link from "next/link";

const POSITION_LABEL: Record<string, string> = {
  MENEUSE: "Meneuse",
  ARRIERE: "Arrière",
  AILIERE: "Ailière",
  AILIERE_FORTE: "Ailière forte",
  PIVOT: "Pivot",
};

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

  const [player, teamSeasons, seasons, lines] = await Promise.all([
    getPlayer(id),
    listTeamSeasons(),
    listSeasons(),
    getPlayerMatchLines(id, { seasonId: seasonFilter }),
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
          <h1 className="text-xl font-semibold">
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
        <SeasonSelector seasons={seasons} currentSeasonId={seasonFilter} />
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
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Card className="flex flex-col gap-1">
              <span className="text-xs font-medium uppercase tracking-wide text-muted">Points / match</span>
              <span className="text-2xl font-semibold tabular-nums">{formatNumber(summary.perGame.points, 1)}</span>
              <span className="text-xs text-muted">{summary.totals.points} pts au total</span>
            </Card>
            <Card className="flex flex-col gap-1">
              <span className="text-xs font-medium uppercase tracking-wide text-muted">Rebonds / match</span>
              <span className="text-2xl font-semibold tabular-nums">
                {formatNumber(summary.perGame.reboundsTotal, 1)}
              </span>
            </Card>
            <Card className="flex flex-col gap-1">
              <span className="text-xs font-medium uppercase tracking-wide text-muted">Passes / match</span>
              <span className="text-2xl font-semibold tabular-nums">{formatNumber(summary.perGame.assists, 1)}</span>
            </Card>
            <Card className="flex flex-col gap-1">
              <span className="text-xs font-medium uppercase tracking-wide text-muted">Temps de jeu moyen</span>
              <span className="text-2xl font-semibold tabular-nums">
                {formatSecondsAsClock(summary.perGame.secondsPlayed)}
              </span>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Card>
              <h2 className="mb-2 text-sm font-semibold">Adresse (§18)</h2>
              <StatRow label="2PT%" value={formatPct(summary.shooting.fg2Pct)} />
              <StatRow label="3PT%" value={formatPct(summary.shooting.fg3Pct)} />
              <StatRow label="LF%" value={formatPct(summary.shooting.ftPct)} />
              <StatRow label="FG%" value={formatPct(summary.shooting.fgPct)} />
              <StatRow label="eFG%" value={formatPct(summary.shooting.efgPct)} />
              <StatRow label="TS%" value={formatPct(summary.shooting.tsPct)} />
            </Card>

            <Card>
              <h2 className="mb-2 text-sm font-semibold">Statistiques /40 min (§15)</h2>
              <StatRow label="Points" value={formatNumber(summary.per40.points, 1)} />
              <StatRow label="Rebonds" value={formatNumber(summary.per40.reboundsTotal, 1)} />
              <StatRow label="Passes" value={formatNumber(summary.per40.assists, 1)} />
              <StatRow label="Interceptions" value={formatNumber(summary.per40.steals, 1)} />
              <StatRow label="Contres" value={formatNumber(summary.per40.blocks, 1)} />
              <StatRow label="Balles perdues" value={formatNumber(summary.per40.turnovers, 1)} />
            </Card>

            <Card>
              <h2 className="mb-2 text-sm font-semibold">Régularité (§20)</h2>
              <StatRow
                label="Points : médiane"
                value={formatNumber(summary.distributions.points.median, 1)}
                sublabel={`min ${formatNumber(summary.distributions.points.min)} · max ${formatNumber(
                  summary.distributions.points.max,
                )}`}
              />
              <StatRow label="Points : écart-type" value={formatNumber(summary.distributions.points.stdDev, 1)} />
              <StatRow
                label="Rebonds : médiane"
                value={formatNumber(summary.distributions.reboundsTotal.median, 1)}
              />
              <StatRow label="Passes : médiane" value={formatNumber(summary.distributions.assists.median, 1)} />
            </Card>
          </div>

          <Card>
            <h2 className="mb-2 text-sm font-semibold">Meilleures performances (§18)</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              {[
                { label: "Points", best: summary.bests.points },
                { label: "Rebonds", best: summary.bests.reboundsTotal },
                { label: "Passes", best: summary.bests.assists },
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

      <Card className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold">Rattacher à une équipe / saison</h2>
        <RosterForm playerId={player.id} teamSeasons={teamSeasonOptions} />
      </Card>

      <Card className="p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-4 py-3">Saison</th>
              <th className="px-4 py-3">Équipe</th>
              <th className="px-4 py-3">N°</th>
              <th className="px-4 py-3">Poste</th>
              <th className="px-4 py-3">Statut</th>
            </tr>
          </thead>
          <tbody>
            {player.rosterEntries.map((entry) => (
              <tr key={entry.id} className="border-b border-border last:border-0">
                <td className="px-4 py-2">{entry.teamSeason.season.label}</td>
                <td className="px-4 py-2">{entry.teamSeason.team.name}</td>
                <td className="px-4 py-2">{entry.jerseyNumber ?? "—"}</td>
                <td className="px-4 py-2">{entry.position ? POSITION_LABEL[entry.position] : "—"}</td>
                <td className="px-4 py-2">
                  <Badge>{entry.status}</Badge>
                </td>
              </tr>
            ))}
            {player.rosterEntries.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-muted">
                  Pas encore rattachée à une équipe.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
