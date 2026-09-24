import { listSeasons } from "@/lib/repositories/season";
import { listTeams } from "@/lib/repositories/team";
import { NewMatchForm } from "./NewMatchForm";

export default async function NewMatchPage() {
  const [seasons, teams] = await Promise.all([listSeasons(), listTeams()]);
  const ownTeam = teams.find((t) => t.isOwnTeam);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Nouveau match</h1>
        <p className="text-sm text-muted">Enregistrer un match. Les statistiques se saisissent ensuite.</p>
      </div>

      {!ownTeam && (
        <p className="rounded-md border border-loss bg-loss-bg px-3 py-2 text-sm text-loss">
          Aucune équipe n&apos;est marquée comme « Notre équipe ». Rendez-vous dans Paramètres pour le configurer.
        </p>
      )}
      {seasons.length === 0 && (
        <p className="rounded-md border border-loss bg-loss-bg px-3 py-2 text-sm text-loss">
          Aucune saison configurée. Rendez-vous dans Paramètres pour en créer une.
        </p>
      )}

      <NewMatchForm seasons={seasons} teams={teams} ownTeamId={ownTeam?.id ?? null} />
    </div>
  );
}
