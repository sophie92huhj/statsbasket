"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button, Label, TextInput } from "@/components/ui/Form";
import { apiFetch } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/AuthContext";
import type { Team } from "@prisma/client";

export function TeamsPanel({ teams }: { teams: Team[] }) {
  const router = useRouter();
  const { isAdmin } = useAuth();
  const [name, setName] = useState("");
  const [isOwnTeam, setIsOwnTeam] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await apiFetch("/api/teams", { method: "POST", body: JSON.stringify({ name, isOwnTeam }) });
      setName("");
      setIsOwnTeam(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Supprimer cette équipe ?")) return;
    await apiFetch(`/api/teams/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <Card className="flex flex-col gap-4">
      <h2 className="text-sm font-semibold">Équipes</h2>

      <ul className="flex flex-col gap-2">
        {teams.map((team) => (
          <li key={team.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="font-medium">{team.name}</span>
              {team.isOwnTeam && <Badge className="bg-accent/10 text-accent">Notre équipe</Badge>}
            </div>
            {isAdmin && (
              <Button variant="danger" onClick={() => handleDelete(team.id)} type="button">
                Supprimer
              </Button>
            )}
          </li>
        ))}
        {teams.length === 0 && <li className="text-sm text-muted">Aucune équipe enregistrée.</li>}
      </ul>

      {isAdmin && (
        <form onSubmit={handleCreate} className="flex flex-wrap items-end gap-3 border-t border-border pt-4">
          <div className="flex-1">
            <Label>Nom de l&apos;équipe</Label>
            <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: ASVEL" required />
          </div>
          <label className="flex items-center gap-2 pb-1.5 text-sm">
            <input type="checkbox" checked={isOwnTeam} onChange={(e) => setIsOwnTeam(e.target.checked)} />
            Notre équipe
          </label>
          <Button type="submit" disabled={submitting}>
            Ajouter
          </Button>
        </form>
      )}
      {error && <p className="text-sm text-loss">{error}</p>}
    </Card>
  );
}
