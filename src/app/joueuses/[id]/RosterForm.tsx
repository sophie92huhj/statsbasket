"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Label, Select, TextInput } from "@/components/ui/Form";
import { apiFetch } from "@/lib/api/client";

const POSITIONS = [
  { value: "", label: "—" },
  { value: "MENEUSE", label: "Meneuse" },
  { value: "ARRIERE", label: "Arrière" },
  { value: "AILIERE", label: "Ailière" },
  { value: "AILIERE_FORTE", label: "Ailière forte" },
  { value: "PIVOT", label: "Pivot" },
];

interface TeamSeasonOption {
  id: string;
  teamName: string;
  seasonLabel: string;
}

export function RosterForm({ playerId, teamSeasons }: { playerId: string; teamSeasons: TeamSeasonOption[] }) {
  const router = useRouter();
  const [teamSeasonId, setTeamSeasonId] = useState(teamSeasons[0]?.id ?? "");
  const [jerseyNumber, setJerseyNumber] = useState("");
  const [position, setPosition] = useState("");
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
          jerseyNumber: jerseyNumber ? Number(jerseyNumber) : null,
          position: position || null,
        }),
      });
      setJerseyNumber("");
      setPosition("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setSubmitting(false);
    }
  }

  if (teamSeasons.length === 0) {
    return (
      <p className="text-sm text-muted">
        Aucune équipe/saison configurée. Rendez-vous dans Paramètres pour en créer une.
      </p>
    );
  }

  return (
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
      <div>
        <Label>Numéro de maillot</Label>
        <TextInput
          type="number"
          min={0}
          max={99}
          value={jerseyNumber}
          onChange={(e) => setJerseyNumber(e.target.value)}
          className="w-24"
        />
      </div>
      <div>
        <Label>Poste</Label>
        <Select value={position} onChange={(e) => setPosition(e.target.value)}>
          {POSITIONS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </Select>
      </div>
      <Button type="submit" disabled={submitting}>
        Rattacher
      </Button>
      {error && <p className="text-sm text-loss">{error}</p>}
    </form>
  );
}
