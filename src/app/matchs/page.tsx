import Link from "next/link";
import { listMatches } from "@/lib/repositories/match";
import { computeMatchOutcome, computePointDifferential } from "@/lib/repositories/match";
import { Card } from "@/components/ui/Card";
import { OutcomeBadge } from "@/components/ui/Badge";
import { formatNumber } from "@/lib/stats/format";
import { NewMatchButton } from "./NewMatchButton";

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
}

export default async function MatchesPage() {
  const matches = await listMatches();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Matchs</h1>
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
            {matches.map((match) => {
              const ownScore = match.isHome ? match.homeScore : match.awayScore;
              const opponentScore = match.isHome ? match.awayScore : match.homeScore;
              const opponent = match.isHome ? match.awayTeam : match.homeTeam;
              const outcome = computeMatchOutcome(ownScore, opponentScore);
              const diff = computePointDifferential(ownScore, opponentScore);

              return (
                <tr key={match.id} className="border-b border-border last:border-0 hover:bg-background">
                  <td className="px-4 py-2">
                    <Link href={`/matchs/${match.id}`} className="font-medium hover:underline">
                      {formatDate(match.date)}
                    </Link>
                  </td>
                  <td className="px-4 py-2">{opponent.name}</td>
                  <td className="px-4 py-2 text-muted">{match.isHome ? "Domicile" : "Extérieur"}</td>
                  <td className="px-4 py-2 tabular-nums">
                    {ownScore ?? "—"} – {opponentScore ?? "—"}
                  </td>
                  <td className="px-4 py-2 tabular-nums">
                    {diff !== null ? (diff > 0 ? `+${diff}` : formatNumber(diff)) : "—"}
                  </td>
                  <td className="px-4 py-2">
                    <OutcomeBadge outcome={outcome} />
                  </td>
                </tr>
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
