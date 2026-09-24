import Link from "next/link";
import { listMatches, computeMatchOutcome } from "@/lib/repositories/match";
import { listSeasons } from "@/lib/repositories/season";
import { KpiCard } from "@/components/ui/Card";
import { Button } from "@/components/ui/Form";
import { mean } from "@/lib/stats/aggregate";
import { formatNumber } from "@/lib/stats/format";

export default async function Home() {
  const [seasons, matches] = await Promise.all([listSeasons(), listMatches()]);

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

  const playedMatches = matches.filter((m) => m.homeScore !== null && m.awayScore !== null);
  const outcomes = playedMatches.map((m) => {
    const ownScore = m.isHome ? m.homeScore : m.awayScore;
    const opponentScore = m.isHome ? m.awayScore : m.homeScore;
    return computeMatchOutcome(ownScore, opponentScore);
  });
  const wins = outcomes.filter((o) => o === "WIN").length;
  const losses = outcomes.filter((o) => o === "LOSS").length;

  const avgPointsFor = mean(
    playedMatches.map((m) => (m.isHome ? m.homeScore : m.awayScore)),
  );
  const avgPointsAgainst = mean(
    playedMatches.map((m) => (m.isHome ? m.awayScore : m.homeScore)),
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted">Vue d&apos;ensemble de la saison en cours.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard label="Matchs" value={playedMatches.length} />
        <KpiCard label="Victoires" value={wins} />
        <KpiCard label="Défaites" value={losses} />
        <KpiCard label="Pts / match" value={formatNumber(avgPointsFor, 1)} />
        <KpiCard label="Pts encaissés / match" value={formatNumber(avgPointsAgainst, 1)} />
      </div>

      <p className="text-sm text-muted">
        Le dashboard détaillé (graphiques d&apos;évolution, répartition par joueuse) arrive en Phase 4. Pour
        l&apos;instant, consultez les{" "}
        <Link href="/matchs" className="text-accent hover:underline">
          matchs
        </Link>{" "}
        pour saisir vos statistiques.
      </p>
    </div>
  );
}
