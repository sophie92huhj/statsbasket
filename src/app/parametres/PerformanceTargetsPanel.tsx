"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button, Label, TextInput } from "@/components/ui/Form";
import { apiFetch } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/AuthContext";
import type { AppSettings } from "@prisma/client";

export function PerformanceTargetsPanel({ settings }: { settings: AppSettings }) {
  const router = useRouter();
  const { isAdmin } = useAuth();
  const [offensiveReboundTarget, setOffensiveReboundTarget] = useState(String(settings.offensiveReboundTarget));
  const [turnoverRatioTarget, setTurnoverRatioTarget] = useState(String(settings.turnoverRatioTarget));
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await apiFetch("/api/settings", {
        method: "PATCH",
        body: JSON.stringify({
          offensiveReboundTarget: Number(offensiveReboundTarget),
          turnoverRatioTarget: Number(turnoverRatioTarget),
        }),
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="flex flex-col gap-4">
      <div>
        <h2 className="text-sm font-semibold">Objectifs de performance</h2>
        <p className="text-sm text-muted">
          Seuils utilisés pour colorer les ratios sur la page des matchs (vert = atteint, rouge = manqué).
        </p>
      </div>

      {isAdmin ? (
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <Label>Ratio rebonds offensifs ≥ (%)</Label>
            <TextInput
              type="number"
              min={0}
              max={100}
              value={offensiveReboundTarget}
              onChange={(e) => setOffensiveReboundTarget(e.target.value)}
              required
            />
          </div>
          <div>
            <Label>Ratio balles perdues ≤ (%)</Label>
            <TextInput
              type="number"
              min={0}
              max={100}
              value={turnoverRatioTarget}
              onChange={(e) => setTurnoverRatioTarget(e.target.value)}
              required
            />
          </div>
          <div className="flex items-end sm:col-span-2">
            <Button type="submit" disabled={submitting}>
              Enregistrer
            </Button>
          </div>
          {error && <p className="text-sm text-loss sm:col-span-2">{error}</p>}
        </form>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-sm">
          <p>
            Ratio rebonds offensifs ≥ <strong>{settings.offensiveReboundTarget}%</strong>
          </p>
          <p>
            Ratio balles perdues ≤ <strong>{settings.turnoverRatioTarget}%</strong>
          </p>
        </div>
      )}
    </Card>
  );
}
