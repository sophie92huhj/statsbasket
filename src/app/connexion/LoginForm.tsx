"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Label, Select, TextInput } from "@/components/ui/Form";
import { apiFetch } from "@/lib/api/client";

export function LoginForm({ teams }: { teams: { id: string; name: string }[] }) {
  const router = useRouter();
  const [teamId, setTeamId] = useState(teams[0]?.id ?? "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await apiFetch("/api/auth/login", { method: "POST", body: JSON.stringify({ teamId, password }) });
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <Label>Équipe</Label>
        <Select value={teamId} onChange={(e) => setTeamId(e.target.value)}>
          {teams.map((team) => (
            <option key={team.id} value={team.id}>
              {team.name}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label>Mot de passe</Label>
        <TextInput
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
        />
      </div>
      <Button type="submit" disabled={submitting}>
        Accéder aux statistiques
      </Button>
      {error && <p className="text-sm text-loss">{error}</p>}
    </form>
  );
}
