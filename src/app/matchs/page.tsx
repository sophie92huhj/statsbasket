import { listMatches } from "@/lib/repositories/match";
import { computeMatchOutcome, computePointDifferential } from "@/lib/repositories/match";
import { Card } from "@/components/ui/Card";
import { NewMatchButton } from "./NewMatchButton";
import { MatchRow } from "./MatchRow";

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
}

export default async function MatchesPage() {
  const matches = await listMatches();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-wide">Matchs</h1>
          <p className="text-sm text-muted">Historique des matchs, toutes saisons.</p>
        </div>
        <NewMatchButton />
      </div>

      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Adversaire</th>
              <th className="px-4 py-3">Lieu</th>
              <th className="px-4 py-3">Score</th>
              <th className="px-4 py-3">Diff.</th>
              <th className="px-4 py-3">Résultat</th>
            </tr>
          </thead>
          <tbody>
            {matches.map((match, index) => {
              const ownScore = match.isHome ? match.homeScore : match.awayScore;
              const opponentScore = match.isHome ? match.awayScore : match.homeScore;
              const opponent = match.isHome ? match.awayTeam : match.homeTeam;
              const outcome = computeMatchOutcome(ownScore, opponentScore);
              const diff = computePointDifferential(ownScore, opponentScore);

              return (
                <MatchRow
                  key={match.id}
                  matchId={match.id}
                  date={formatDate(match.date)}
                  opponentName={opponent.name}
                  location={match.isHome ? "Domicile" : "Extérieur"}
                  homeScore={match.homeScore}
                  awayScore={match.awayScore}
                  diff={diff}
                  outcome={outcome}
                  zebra={index % 2 === 1}
                />
              );
            })}
            {matches.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-muted">
                  Aucun match enregistré.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
