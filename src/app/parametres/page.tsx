import { listSeasons } from "@/lib/repositories/season";
import { listTeams, listTeamSeasons } from "@/lib/repositories/team";
import { getAppSettings } from "@/lib/repositories/appSettings";
import { requireTeamSession } from "@/lib/auth/session";
import { AdminAccessPanel } from "./AdminAccessPanel";
import { TeamAccessPanel } from "./TeamAccessPanel";
import { PerformanceTargetsPanel } from "./PerformanceTargetsPanel";
import { SeasonsPanel } from "./SeasonsPanel";
import { TeamsPanel } from "./TeamsPanel";
import { TeamSeasonsPanel } from "./TeamSeasonsPanel";

export default async function ParametresPage() {
  const { teamId } = await requireTeamSession();
  const [seasons, teams, teamSeasons, appSettings] = await Promise.all([
    listSeasons(teamId),
    listTeams(teamId),
    listTeamSeasons(teamId),
    getAppSettings(teamId),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-wide">Paramètres</h1>
        <p className="text-sm text-muted">Accès, saisons, adversaires et objectifs de l&apos;équipe.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <TeamAccessPanel />
        <AdminAccessPanel />
        <PerformanceTargetsPanel settings={appSettings} />
        <SeasonsPanel seasons={seasons} />
        <TeamsPanel teams={teams.filter((t) => t.id !== teamId)} />
        <TeamSeasonsPanel teamSeasons={teamSeasons} teams={teams} seasons={seasons} />
      </div>
    </div>
  );
}
