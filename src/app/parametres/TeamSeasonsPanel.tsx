"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button, Label, Select, TextInput } from "@/components/ui/Form";
import { apiFetch } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/AuthContext";
import type { Season, Team } from "@prisma/client";

interface TeamSeasonRow {
  id: string;
  team: Team;
  season: Season;
  category: string | null;
  league: string | null;
  coachName: string | null;
}

export function TeamSeasonsPanel({
  teamSeasons,
  teams,
  seasons,
}: {
  teamSeasons: TeamSeasonRow[];
  teams: Team[];
  seasons: Season[];
}) {
  const router = useRouter();
  const { isAdmin } = useAuth();
  const [teamId, setTeamId] = useState(teams[0]?.id ?? "");
  const [seasonId, setSeasonId] = useState(seasons[0]?.id ?? "");
  const [category, setCategory] = useState("");
  const [league, setLeague] = useState("");
  const [coachName, setCoachName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await apiFetch("/api/team-seasons", {
        method: "POST",
        body: JSON.stringify({ teamId, seasonId, category, league, coachName }),
      });
      setCategory("");
      setLeague("");
      setCoachName("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Retirer ce rattachement équipe/saison ?")) return;
    await apiFetch(`/api/team-seasons/${id}`, { method: "DELETE" });
    router.refresh();
  }

  if (teams.length === 0 || seasons.length === 0) {
    return (
      <Card className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold">Équipes par saison</h2>
        <p className="text-sm text-muted">Créez d&apos;abord au moins une équipe et une saison ci-dessus.</p>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col gap-4 lg:col-span-2">
      <h2 className="text-sm font-semibold">Équipes par saison (catégorie, championnat, coach)</h2>

      <ul className="flex flex-col gap-2">
        {teamSeasons.map((ts) => (
          <li key={ts.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm">
            <div>
              <span className="font-medium">{ts.team.name}</span>
              <span className="ml-2 text-xs text-muted">{ts.season.label}</span>
              {ts.category && <span className="ml-2 text-xs text-muted">· {ts.category}</span>}
              {ts.league && <span className="ml-2 text-xs text-muted">· {ts.league}</span>}
              {ts.coachName && <span className="ml-2 text-xs text-muted">· Coach: {ts.coachName}</span>}
            </div>
            {isAdmin && (
              <Button variant="danger" onClick={() => handleDelete(ts.id)} type="button">
                Retirer
              </Button>
            )}
          </li>
        ))}
        {teamSeasons.length === 0 && <li className="text-sm text-muted">Aucun rattachement.</li>}
      </ul>

      {isAdmin && (
        <form
          onSubmit={handleCreate}
          className="grid grid-cols-1 gap-3 border-t border-border pt-4 sm:grid-cols-3 lg:grid-cols-5"
        >
          <div>
            <Label>Équipe</Label>
            <Select value={teamId} onChange={(e) => setTeamId(e.target.value)}>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Saison</Label>
            <Select value={seasonId} onChange={(e) => setSeasonId(e.target.value)}>
              {seasons.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Catégorie</Label>
            <TextInput value={category} onChange={(e) => setCategory(e.target.value)} placeholder="U18F" />
          </div>
          <div>
            <Label>Championnat</Label>
            <TextInput value={league} onChange={(e) => setLeague(e.target.value)} placeholder="Régionale 1" />
          </div>
          <div>
            <Label>Coach</Label>
            <TextInput value={coachName} onChange={(e) => setCoachName(e.target.value)} />
          </div>
          <div className="sm:col-span-3 lg:col-span-5">
            <Button type="submit" disabled={submitting}>
              Rattacher
            </Button>
          </div>
        </form>
      )}
      {error && <p className="text-sm text-loss">{error}</p>}
    </Card>
  );
}
