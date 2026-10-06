"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button, Label, Select, TextInput } from "@/components/ui/Form";
import { apiFetch, ApiError } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/AuthContext";
import type { Team } from "@prisma/client";

function toDateInputValue(date: Date | string): string {
  return new Date(date).toISOString().slice(0, 10);
}

interface EditMatchPanelProps {
  matchId: string;
  teams: Team[];
  ownTeamId: string;
  opponentName: string;
  isHome: boolean;
  date: Date;
  competition: string | null;
  homeScore: number | null;
  awayScore: number | null;
}

export function EditMatchPanel({
  matchId,
  teams,
  ownTeamId,
  opponentName: initialOpponentName,
  isHome: initialIsHome,
  date: initialDate,
  competition: initialCompetition,
  homeScore: initialHomeScore,
  awayScore: initialAwayScore,
}: EditMatchPanelProps) {
  const router = useRouter();
  const { isAdmin } = useAuth();
  const [editing, setEditing] = useState(false);

  const [opponentName, setOpponentName] = useState(initialOpponentName);
  const [isHome, setIsHome] = useState(initialIsHome);
  const [date, setDate] = useState(toDateInputValue(initialDate));
  const [competition, setCompetition] = useState(initialCompetition ?? "");
  // Le score se saisit du point de vue de "notre" équipe puis de l'adversaire, quel que soit domicile/extérieur.
  const [ownScore, setOwnScore] = useState(String((initialIsHome ? initialHomeScore : initialAwayScore) ?? ""));
  const [opponentScore, setOpponentScore] = useState(
    String((initialIsHome ? initialAwayScore : initialHomeScore) ?? ""),
  );
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!isAdmin) return null;

  if (!editing) {
    return (
      <div>
        <Button type="button" variant="secondary" onClick={() => setEditing(true)}>
          Modifier le match
        </Button>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmedOpponentName = opponentName.trim();
    if (!trimmedOpponentName) {
      setError("Indiquez le nom de l'adversaire.");
      return;
    }

    setSubmitting(true);
    try {
      const existing = teams.find(
        (t) => t.id !== ownTeamId && t.name.toLowerCase() === trimmedOpponentName.toLowerCase(),
      );
      const finalOpponentId =
        existing?.id ??
        (await apiFetch<Team>("/api/teams", { method: "POST", body: JSON.stringify({ name: trimmedOpponentName }) }))
          .id;

      const homeTeamId = isHome ? ownTeamId : finalOpponentId;
      const awayTeamId = isHome ? finalOpponentId : ownTeamId;
      const homeScoreValue = isHome ? ownScore : opponentScore;
      const awayScoreValue = isHome ? opponentScore : ownScore;

      await apiFetch(`/api/matches/${matchId}`, {
        method: "PATCH",
        body: JSON.stringify({
          date,
          isHome,
          homeTeamId,
          awayTeamId,
          competition: competition || null,
          homeScore: homeScoreValue ? Number(homeScoreValue) : null,
          awayScore: awayScoreValue ? Number(awayScoreValue) : null,
        }),
      });
      setEditing(false);
      router.refresh();
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
      <h2 className="mb-3 text-sm font-semibold">Modifier le match</h2>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
          <Label>Adversaire</Label>
          <TextInput
            value={opponentName}
            onChange={(e) => setOpponentName(e.target.value)}
            list="edit-opponent-suggestions"
            required
          />
          <datalist id="edit-opponent-suggestions">
            {teams
              .filter((t) => t.id !== ownTeamId)
              .map((t) => (
                <option key={t.id} value={t.name} />
              ))}
          </datalist>
        </div>
        <div>
          <Label>Compétition</Label>
          <TextInput value={competition} onChange={(e) => setCompetition(e.target.value)} placeholder="Championnat" />
        </div>

        <div>
          <Label>Notre score</Label>
          <TextInput type="number" min={0} value={ownScore} onChange={(e) => setOwnScore(e.target.value)} />
        </div>
        <div>
          <Label>Score adversaire</Label>
          <TextInput type="number" min={0} value={opponentScore} onChange={(e) => setOpponentScore(e.target.value)} />
        </div>

        <div className="flex gap-3 sm:col-span-2">
          <Button type="submit" disabled={submitting}>
            Enregistrer
          </Button>
          <Button type="button" variant="secondary" onClick={() => setEditing(false)} disabled={submitting}>
            Annuler
          </Button>
        </div>
        {error && <p className="text-sm text-loss sm:col-span-2">{error}</p>}
      </form>
    </Card>
  );
}
