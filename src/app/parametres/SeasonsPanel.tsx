"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button, Label, TextInput } from "@/components/ui/Form";
import { apiFetch } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/AuthContext";
import type { Season } from "@prisma/client";

function toDateInputValue(date: Date | string): string {
  return new Date(date).toISOString().slice(0, 10);
}

export function SeasonsPanel({ seasons }: { seasons: Season[] }) {
  const router = useRouter();
  const { isAdmin } = useAuth();
  const [label, setLabel] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await apiFetch("/api/seasons", {
        method: "POST",
        body: JSON.stringify({ label, startDate, endDate }),
      });
      setLabel("");
      setStartDate("");
      setEndDate("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Supprimer cette saison ? Tous les matchs et statistiques associés seront supprimés.")) return;
    await apiFetch(`/api/seasons/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <Card className="flex flex-col gap-4">
      <h2 className="text-sm font-semibold">Saisons</h2>

      <ul className="flex flex-col gap-2">
        {seasons.map((season) => (
          <li key={season.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm">
            <div>
              <span className="font-medium">{season.label}</span>
              <span className="ml-2 text-xs text-muted">
                {toDateInputValue(season.startDate)} → {toDateInputValue(season.endDate)}
              </span>
            </div>
            {isAdmin && (
              <Button variant="danger" onClick={() => handleDelete(season.id)} type="button">
                Supprimer
              </Button>
            )}
          </li>
        ))}
        {seasons.length === 0 && <li className="text-sm text-muted">Aucune saison enregistrée.</li>}
      </ul>

      {isAdmin && (
        <form onSubmit={handleCreate} className="grid grid-cols-1 gap-3 border-t border-border pt-4 sm:grid-cols-4">
          <div>
            <Label>Libellé</Label>
            <TextInput value={label} onChange={(e) => setLabel(e.target.value)} placeholder="2025-2026" required />
          </div>
          <div>
            <Label>Début</Label>
            <TextInput type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
          </div>
          <div>
            <Label>Fin</Label>
            <TextInput type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
          </div>
          <div className="flex items-end">
            <Button type="submit" disabled={submitting}>
              Ajouter
            </Button>
          </div>
        </form>
      )}
      {error && <p className="text-sm text-loss">{error}</p>}
    </Card>
  );
}
