"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button, Label, TextInput } from "@/components/ui/Form";
import { apiFetch } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/AuthContext";
import type { PublicTeam as Team } from "@/lib/repositories/team";

/** Adversaires de l'équipe suivie (propres à cette équipe, invisibles des autres). */
export function TeamsPanel({ teams }: { teams: Team[] }) {
  const router = useRouter();
  const { isAdmin } = useAuth();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await apiFetch("/api/teams", { method: "POST", body: JSON.stringify({ name }) });
      setName("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Supprimer cet adversaire ?")) return;
    await apiFetch(`/api/teams/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <Card className="flex flex-col gap-4">
      <h2 className="text-sm font-semibold">Adversaires</h2>

      <ul className="flex flex-col gap-2">
        {teams.map((team) => (
          <li key={team.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm">
            <span className="font-medium">{team.name}</span>
            {isAdmin && (
              <Button variant="danger" onClick={() => handleDelete(team.id)} type="button">
                Supprimer
              </Button>
            )}
          </li>
        ))}
        {teams.length === 0 && <li className="text-sm text-muted">Aucun adversaire enregistré.</li>}
      </ul>

      {isAdmin && (
        <form onSubmit={handleCreate} className="flex flex-wrap items-end gap-3 border-t border-border pt-4">
          <div className="flex-1">
            <Label>Nom de l&apos;adversaire</Label>
            <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: ASVEL" required />
          </div>
          <Button type="submit" disabled={submitting}>
            Ajouter
          </Button>
        </form>
      )}
      {error && <p className="text-sm text-loss">{error}</p>}
    </Card>
  );
}
