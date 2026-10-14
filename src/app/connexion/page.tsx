import Link from "next/link";
import { listTrackedTeams } from "@/lib/repositories/trackedTeam";
import { Card } from "@/components/ui/Card";
import { LoginForm } from "./LoginForm";

export default async function LoginPage() {
  const teams = await listTrackedTeams();

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 py-12">
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent font-display text-2xl font-bold leading-none text-accent-foreground">
          SB
        </span>
        <h1 className="font-display text-3xl font-semibold tracking-wide">StatsBasket</h1>
        <p className="text-sm text-muted">Choisissez l&apos;équipe dont vous voulez consulter les statistiques.</p>
      </div>

      <Card>
        {teams.length === 0 ? (
          <p className="text-sm text-muted">Aucune équipe n&apos;est encore configurée.</p>
        ) : (
          <LoginForm teams={teams.map(({ id, name }) => ({ id, name }))} />
        )}
      </Card>

      <p className="text-center text-xs text-muted">
        <Link href="/gestion" className="hover:underline">
          Gestion des équipes (admin)
        </Link>
      </p>
    </div>
  );
}
