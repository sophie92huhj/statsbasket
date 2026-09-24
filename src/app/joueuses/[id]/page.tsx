import { notFound } from "next/navigation";
import { getPlayer } from "@/lib/repositories/player";
import { listTeamSeasons } from "@/lib/repositories/team";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { RosterForm } from "./RosterForm";

const POSITION_LABEL: Record<string, string> = {
  MENEUSE: "Meneuse",
  ARRIERE: "Arrière",
  AILIERE: "Ailière",
  AILIERE_FORTE: "Ailière forte",
  PIVOT: "Pivot",
};

export default async function PlayerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [player, teamSeasons] = await Promise.all([getPlayer(id), listTeamSeasons()]);

  if (!player) notFound();

  const teamSeasonOptions = teamSeasons.map((ts) => ({
    id: ts.id,
    teamName: ts.team.name,
    seasonLabel: ts.season.label,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">
          {player.firstName} {player.lastName.toUpperCase()}
        </h1>
        <p className="text-sm text-muted">Historique par saison (§37) et rattachement à une équipe.</p>
      </div>

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
