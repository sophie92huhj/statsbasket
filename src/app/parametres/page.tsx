import { listSeasons } from "@/lib/repositories/season";
import { listTeams, listTeamSeasons } from "@/lib/repositories/team";
import { getAppSettings } from "@/lib/repositories/appSettings";
import { AdminAccessPanel } from "./AdminAccessPanel";
import { PerformanceTargetsPanel } from "./PerformanceTargetsPanel";
import { SeasonsPanel } from "./SeasonsPanel";
import { TeamsPanel } from "./TeamsPanel";
import { TeamSeasonsPanel } from "./TeamSeasonsPanel";

export default async function ParametresPage() {
  const [seasons, teams, teamSeasons, appSettings] = await Promise.all([
    listSeasons(),
    listTeams(),
    listTeamSeasons(),
    getAppSettings(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Paramètres</h1>
        <p className="text-sm text-muted">Gérer les saisons et les équipes suivies.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <AdminAccessPanel />
        <PerformanceTargetsPanel settings={appSettings} />
        <SeasonsPanel seasons={seasons} />
        <TeamsPanel teams={teams} />
        <TeamSeasonsPanel teamSeasons={teamSeasons} teams={teams} seasons={seasons} />
      </div>
    </div>
  );
}
