import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { listTrackedTeams } from "@/lib/repositories/trackedTeam";
import { Card } from "@/components/ui/Card";
import { AdminLoginForm } from "./AdminLoginForm";
import { TrackedTeamsManager } from "./TrackedTeamsManager";

export default async function TeamManagementPage() {
  const session = await getSession();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 py-12">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-wide">Gestion des équipes</h1>
          <p className="text-sm text-muted">Équipes suivies et mots de passe d&apos;accès.</p>
        </div>
        <Link href="/connexion" className="text-sm text-accent-text hover:underline">
          ← Page d&apos;entrée
        </Link>
      </div>

      {session?.isAdmin ? (
        <TrackedTeamsManager teams={await listTrackedTeams()} />
      ) : (
        <Card>
          <AdminLoginForm />
        </Card>
      )}
    </div>
  );
}
