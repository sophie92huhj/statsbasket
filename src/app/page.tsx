import Link from "next/link";
import { listTeams } from "@/lib/repositories/team";
import { listSeasons } from "@/lib/repositories/season";
import { getPlayerPointsForTeamSeason, getTeamMatchAggregateInputs } from "@/lib/repositories/teamAnalytics";
import { summarizeTeamSeason } from "@/lib/stats/teamSeasonStats";
import { KpiCard } from "@/components/ui/Card";
import { Button } from "@/components/ui/Form";
import { formatNumber } from "@/lib/stats/format";
import { TeamTrendCharts } from "@/app/equipe/TeamTrendCharts";

export default async function Home() {
  const [seasons, teams] = await Promise.all([listSeasons(), listTeams()]);

  if (seasons.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-24 text-center">
        <h1 className="text-2xl font-semibold">Bienvenue sur StatsBasket</h1>
        <p className="max-w-md text-sm text-muted">
          Commencez par créer une saison et votre équipe dans les Paramètres, puis ajoutez vos joueuses et vos
          matchs.
        </p>
        <Link href="/parametres">
          <Button type="button">Aller aux Paramètres</Button>
        </Link>
      </div>
    );
  }

  const ownTeam = teams.find((t) => t.isOwnTeam);

  if (!ownTeam) {
    return (
      <div className="flex flex-col items-center gap-4 py-24 text-center">
        <h1 className="text-2xl font-semibold">Bienvenue sur StatsBasket</h1>
        <p className="max-w-md text-sm text-muted">
          Aucune équipe n&apos;est marquée comme « Notre équipe ». Rendez-vous dans Paramètres pour le configurer.
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
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted">Vue d&apos;ensemble de la saison en cours.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <KpiCard label="Matchs" value={summary.gamesPlayed} />
        <KpiCard label="Victoires" value={summary.wins} />
        <KpiCard label="Défaites" value={summary.losses} />
        <KpiCard label="Pts / match" value={formatNumber(summary.pointsFor.perGame, 1)} />
        <KpiCard label="Pts encaissés / match" value={formatNumber(summary.pointsAgainst.perGame, 1)} />
      </div>

      {summary.gamesPlayed === 0 ? (
        <p className="text-sm text-muted">
          Aucun match avec score renseigné. Consultez les{" "}
          <Link href="/matchs" className="text-accent hover:underline">
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
