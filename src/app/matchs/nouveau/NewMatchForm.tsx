"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button, Label, Select, TextInput } from "@/components/ui/Form";
import { apiFetch, ApiError } from "@/lib/api/client";
import type { Season, Team } from "@prisma/client";

const NEW_TEAM_VALUE = "__new__";

export function NewMatchForm({
  seasons,
  teams,
  ownTeamId,
}: {
  seasons: Season[];
  teams: Team[];
  ownTeamId: string | null;
}) {
  const router = useRouter();
  const [seasonId, setSeasonId] = useState(seasons[0]?.id ?? "");
  const [opponentTeamId, setOpponentTeamId] = useState(teams[0]?.id ?? "");
  const [newOpponentName, setNewOpponentName] = useState("");
  const [date, setDate] = useState("");
  const [isHome, setIsHome] = useState(true);
  const [competition, setCompetition] = useState("");
  const [homeScore, setHomeScore] = useState("");
  const [awayScore, setAwayScore] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!ownTeamId) {
      setError("Aucune équipe n'est marquée comme « Notre équipe » dans Paramètres.");
      return;
    }

    setSubmitting(true);
    try {
      let finalOpponentId = opponentTeamId;
      if (opponentTeamId === NEW_TEAM_VALUE) {
        if (!newOpponentName.trim()) {
          setError("Indiquez le nom du nouvel adversaire.");
          setSubmitting(false);
          return;
        }
        const created = await apiFetch<Team>("/api/teams", {
          method: "POST",
          body: JSON.stringify({ name: newOpponentName.trim() }),
        });
        finalOpponentId = created.id;
      }

      const homeTeamId = isHome ? ownTeamId : finalOpponentId;
      const awayTeamId = isHome ? finalOpponentId : ownTeamId;

      const match = await apiFetch<{ id: string }>("/api/matches", {
        method: "POST",
        body: JSON.stringify({
          seasonId,
          date,
          isHome,
          homeTeamId,
          awayTeamId,
          competition: competition || null,
          homeScore: homeScore ? Number(homeScore) : null,
          awayScore: awayScore ? Number(awayScore) : null,
        }),
      });
      router.push(`/matchs/${match.id}`);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setError("Un match identique existe déjà (même date, mêmes équipes, même saison).");
      } else {
        setError(err instanceof Error ? err.message : "Erreur inconnue");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label>Saison</Label>
          <Select value={seasonId} onChange={(e) => setSeasonId(e.target.value)} required>
            {seasons.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Date</Label>
          <TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </div>

        <div>
          <Label>Domicile / Extérieur</Label>
          <Select value={isHome ? "home" : "away"} onChange={(e) => setIsHome(e.target.value === "home")}>
            <option value="home">Domicile</option>
            <option value="away">Extérieur</option>
          </Select>
        </div>
        <div>
          <Label>Compétition</Label>
          <TextInput value={competition} onChange={(e) => setCompetition(e.target.value)} placeholder="Championnat" />
        </div>

        <div>
          <Label>Adversaire</Label>
          <Select value={opponentTeamId} onChange={(e) => setOpponentTeamId(e.target.value)}>
            {teams
              .filter((t) => t.id !== ownTeamId)
              .map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            <option value={NEW_TEAM_VALUE}>+ Nouvel adversaire…</option>
          </Select>
        </div>
        {opponentTeamId === NEW_TEAM_VALUE && (
          <div>
            <Label>Nom du nouvel adversaire</Label>
            <TextInput value={newOpponentName} onChange={(e) => setNewOpponentName(e.target.value)} />
          </div>
        )}

        <div>
          <Label>Score domicile (optionnel)</Label>
          <TextInput type="number" min={0} value={homeScore} onChange={(e) => setHomeScore(e.target.value)} />
        </div>
        <div>
          <Label>Score extérieur (optionnel)</Label>
          <TextInput type="number" min={0} value={awayScore} onChange={(e) => setAwayScore(e.target.value)} />
        </div>

        <div className="sm:col-span-2">
          <Button type="submit" disabled={submitting}>
            Créer le match
          </Button>
        </div>
        {error && <p className="text-sm text-loss sm:col-span-2">{error}</p>}
      </form>
    </Card>
  );
}
