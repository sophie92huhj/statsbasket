"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Label, TextInput } from "@/components/ui/Form";
import { apiFetch } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/AuthContext";

export function OpponentReboundsPanel({
  matchId,
  opponentTeamId,
  opponentName,
  initialReboundsOff,
  initialMaxAdvantage,
  initialMaxDisadvantage,
}: {
  matchId: string;
  opponentTeamId: string;
  opponentName: string;
  initialReboundsOff: number | null;
  initialMaxAdvantage: number | null;
  initialMaxDisadvantage: number | null;
}) {
  const router = useRouter();
  const { isAdmin } = useAuth();
  const [editing, setEditing] = useState(false);
  const [reboundsOff, setReboundsOff] = useState(initialReboundsOff !== null ? String(initialReboundsOff) : "");
  const [maxAdvantage, setMaxAdvantage] = useState(initialMaxAdvantage !== null ? String(initialMaxAdvantage) : "");
  const [maxDisadvantage, setMaxDisadvantage] = useState(
    initialMaxDisadvantage !== null ? String(initialMaxDisadvantage) : "",
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (!isAdmin) return null;

  function toNullableInt(value: string): number | null {
    return value.trim() === "" ? null : Math.trunc(Number(value));
  }

  async function handleSave() {
    setError(null);
    setSaving(true);
    try {
      await Promise.all([
        apiFetch(`/api/matches/${matchId}/team-stats`, {
          method: "PUT",
          body: JSON.stringify({
            teamId: opponentTeamId,
            reboundsOff: toNullableInt(reboundsOff),
          }),
        }),
        apiFetch(`/api/matches/${matchId}`, {
          method: "PATCH",
          body: JSON.stringify({
            maxPointDifferentialAdvantage: toNullableInt(maxAdvantage),
            maxPointDifferentialDisadvantage: toNullableInt(maxDisadvantage),
          }),
        }),
      ]);
      setEditing(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <div className="flex flex-wrap items-center gap-3 text-sm text-muted">
        <span>
          Rebonds offensifs adverses ({opponentName}) :{" "}
          <strong className="text-foreground">{initialReboundsOff ?? "non renseignés"}</strong>
        </span>
        <span>
          Avantage max : <strong className="text-foreground">{initialMaxAdvantage ?? "non renseigné"}</strong>
        </span>
        <span>
          Désavantage max : <strong className="text-foreground">{initialMaxDisadvantage ?? "non renseigné"}</strong>
        </span>
        <Button type="button" variant="secondary" onClick={() => setEditing(true)}>
          Modifier
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div>
        <Label>Rebonds offensifs adverses ({opponentName})</Label>
        <TextInput
          type="number"
          min={0}
          value={reboundsOff}
          onChange={(e) => setReboundsOff(e.target.value)}
          className="w-24"
        />
      </div>
      <div>
        <Label>Avantage max (pts)</Label>
        <TextInput
          type="number"
          min={0}
          value={maxAdvantage}
          onChange={(e) => setMaxAdvantage(e.target.value)}
          className="w-24"
        />
      </div>
      <div>
        <Label>Désavantage max (pts)</Label>
        <TextInput
          type="number"
          min={0}
          value={maxDisadvantage}
          onChange={(e) => setMaxDisadvantage(e.target.value)}
          className="w-24"
        />
      </div>
      <Button type="button" onClick={handleSave} disabled={saving}>
        Enregistrer
      </Button>
      <Button type="button" variant="secondary" onClick={() => setEditing(false)} disabled={saving}>
        Annuler
      </Button>
      {error && <p className="text-sm text-loss">{error}</p>}
    </div>
  );
}
