import Link from "next/link";
import { notFound } from "next/navigation";
import { getTeam } from "@/lib/repositories/team";
import { requireTeamSession } from "@/lib/auth/session";
import { listSeasons } from "@/lib/repositories/season";
import { getPlayerPointsForTeamSeason, getTeamMatchAggregateInputs } from "@/lib/repositories/teamAnalytics";
import { summarizeTeamSeason } from "@/lib/stats/teamSeasonStats";
import { KpiCard } from "@/components/ui/Card";
import { Button } from "@/components/ui/Form";
import { formatNumber, STAT_DECIMALS } from "@/lib/stats/format";
import { TeamTrendCharts } from "@/app/equipe/TeamTrendCharts";

export default async function Home() {
  const { teamId } = await requireTeamSession();
  const [seasons, ownTeam] = await Promise.all([listSeasons(teamId), getTeam(teamId, teamId)]);

  if (!ownTeam) notFound();

  if (seasons.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-24 text-center">
        <h1 className="text-2xl font-semibold">Bienvenue sur StatsBasket</h1>
        <p className="max-w-md text-sm text-muted">
          Commencez par créer une saison dans les Paramètres, puis ajoutez vos joueurs et vos
          matchs.
        </p>
        <Link href="/parametres">
          <Button type="button">Aller aux Paramètres</Button>
        </Link>
      </div>
    );
  }

  const [matches, playerPoints] = await Promise.all([
    getTeamMatchAggregateInputs(ownTeam.id),
    getPlayerPointsForTeamSeason(ownTeam.id),
  ]);
  const summary = summarizeTeamSeason(matches);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-wide">Dashboard</h1>
        <p className="text-sm text-muted">Vue d&apos;ensemble de la saison en cours.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <KpiCard label="Matchs" value={summary.gamesPlayed} />
        <KpiCard label="Victoires" value={summary.wins} />
        <KpiCard label="Défaites" value={summary.losses} />
        <KpiCard label="Pts / match" value={formatNumber(summary.pointsFor.perGame, STAT_DECIMALS)} />
        <KpiCard label="Pts encaissés / match" value={formatNumber(summary.pointsAgainst.perGame, STAT_DECIMALS)} />
      </div>

      {summary.gamesPlayed === 0 ? (
        <p className="text-sm text-muted">
          Aucun match avec score renseigné. Consultez les{" "}
          <Link href="/matchs" className="text-accent-text hover:underline">
            matchs
          </Link>{" "}
          pour saisir vos statistiques.
        </p>
      ) : (
        <TeamTrendCharts matches={matches} playerPoints={playerPoints} />
      )}
    </div>
  );
}
