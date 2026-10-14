import Link from "next/link";
import { listPlayers } from "@/lib/repositories/player";
import { requireTeamSession } from "@/lib/auth/session";
import { Card } from "@/components/ui/Card";
import { NewPlayerForm } from "./NewPlayerForm";
import { DeletePlayerButton } from "./DeletePlayerButton";

export default async function PlayersPage() {
  const { teamId } = await requireTeamSession();
  const players = await listPlayers(teamId);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-wide">Joueurs</h1>
        <p className="text-sm text-muted">Effectif suivi, toutes saisons confondues.</p>
      </div>

      <NewPlayerForm />

      <Card className="p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-4 py-3">Nom</th>
              <th className="px-4 py-3">Prénom</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {players.map((player) => (
              <tr key={player.id} className="border-b border-border last:border-0 hover:bg-background">
                <td className="px-4 py-2">
                  <Link href={`/joueuses/${player.id}`} className="font-medium hover:underline">
                    {player.lastName}
                  </Link>
                </td>
                <td className="px-4 py-2">{player.firstName}</td>
                <td className="px-4 py-2 text-right">
                  <DeletePlayerButton playerId={player.id} playerName={`${player.firstName} ${player.lastName}`} />
                </td>
              </tr>
            ))}
            {players.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-muted">
                  Aucun joueur enregistré.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
