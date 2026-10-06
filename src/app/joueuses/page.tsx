import Link from "next/link";
import { listPlayers } from "@/lib/repositories/player";
import { Card } from "@/components/ui/Card";
import { NewPlayerForm } from "./NewPlayerForm";

export default async function PlayersPage() {
  const players = await listPlayers();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-wide">Joueuses</h1>
        <p className="text-sm text-muted">Effectif suivi, toutes équipes et saisons confondues.</p>
      </div>

      <NewPlayerForm />

      <Card className="p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-4 py-3">Nom</th>
              <th className="px-4 py-3">Prénom</th>
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
              </tr>
            ))}
            {players.length === 0 && (
              <tr>
                <td colSpan={2} className="px-4 py-6 text-center text-muted">
                  Aucune joueuse enregistrée.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
