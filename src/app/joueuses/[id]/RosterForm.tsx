"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button, Label, Select } from "@/components/ui/Form";
import { apiFetch } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/AuthContext";

interface TeamSeasonOption {
  id: string;
  teamName: string;
  seasonLabel: string;
}

export function RosterForm({ playerId, teamSeasons }: { playerId: string; teamSeasons: TeamSeasonOption[] }) {
  const router = useRouter();
  const { isAdmin } = useAuth();
  const [teamSeasonId, setTeamSeasonId] = useState(teamSeasons[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await apiFetch("/api/roster", {
        method: "POST",
        body: JSON.stringify({
          playerId,
          teamSeasonId,
        }),
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setSubmitting(false);
    }
  }

  if (!isAdmin) return null;

  return (
    <Card className="flex flex-col gap-4">
      <h2 className="text-sm font-semibold">Rattacher à une équipe / saison</h2>
      {teamSeasons.length === 0 ? (
        <p className="text-sm text-muted">
          Aucune équipe/saison configurée. Rendez-vous dans Paramètres pour en créer une.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
          <div>
            <Label>Équipe / Saison</Label>
            <Select value={teamSeasonId} onChange={(e) => setTeamSeasonId(e.target.value)}>
              {teamSeasons.map((ts) => (
                <option key={ts.id} value={ts.id}>
                  {ts.teamName} — {ts.seasonLabel}
                </option>
              ))}
            </Select>
          </div>
          <Button type="submit" disabled={submitting}>
            Rattacher
          </Button>
          {error && <p className="text-sm text-loss">{error}</p>}
        </form>
      )}
    </Card>
  );
}
