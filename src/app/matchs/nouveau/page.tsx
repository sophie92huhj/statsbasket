import { listSeasons } from "@/lib/repositories/season";
import { listTeams } from "@/lib/repositories/team";
import { requireTeamSession } from "@/lib/auth/session";
import { AdminOnly } from "@/components/auth/AdminOnly";
import { NewMatchForm } from "./NewMatchForm";

export default async function NewMatchPage() {
  const { teamId } = await requireTeamSession();
  const [seasons, teams] = await Promise.all([listSeasons(teamId), listTeams(teamId)]);

  return (
    <AdminOnly>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-wide">Nouveau match</h1>
          <p className="text-sm text-muted">Enregistrer un match. Les statistiques se saisissent ensuite.</p>
        </div>

        {seasons.length === 0 && (
          <p className="rounded-md border border-loss bg-loss-bg px-3 py-2 text-sm text-loss">
            Aucune saison configurée. Rendez-vous dans Paramètres pour en créer une.
          </p>
        )}

        <NewMatchForm seasons={seasons} teams={teams} ownTeamId={teamId} />
      </div>
    </AdminOnly>
  );
}
