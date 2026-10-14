"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button, Label, TextInput } from "@/components/ui/Form";
import { apiFetch } from "@/lib/api/client";

interface TrackedTeam {
  id: string;
  name: string;
  hasPassword: boolean;
}

function TeamRow({ team }: { team: TrackedTeam }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(team.name);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleOpen() {
    setSubmitting(true);
    await apiFetch("/api/auth/switch", { method: "POST", body: JSON.stringify({ teamId: team.id }) });
    router.push("/");
    router.refresh();
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await apiFetch(`/api/admin/teams/${team.id}`, {
        method: "PATCH",
        body: JSON.stringify({ name: name.trim(), ...(password ? { password } : {}) }),
      });
      setPassword("");
      setEditing(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <li className="flex flex-col gap-3 rounded-md border border-border px-3 py-2 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-medium">{team.name}</span>
          {!team.hasPassword && <Badge className="bg-loss-bg text-loss">Sans mot de passe</Badge>}
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="secondary" onClick={() => setEditing((v) => !v)}>
            {editing ? "Annuler" : "Modifier"}
          </Button>
          <Button type="button" onClick={handleOpen} disabled={submitting}>
            Ouvrir
          </Button>
        </div>
      </div>

      {editing && (
        <form onSubmit={handleSave} className="flex flex-wrap items-end gap-3 border-t border-border pt-3">
          <div className="flex-1">
            <Label>Nom</Label>
            <TextInput value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="flex-1">
            <Label>{team.hasPassword ? "Nouveau mot de passe (facultatif)" : "Mot de passe"}</Label>
            <TextInput
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              required={!team.hasPassword}
            />
          </div>
          <Button type="submit" disabled={submitting}>
            Enregistrer
          </Button>
          {error && <p className="w-full text-sm text-loss">{error}</p>}
        </form>
      )}
    </li>
  );
}

export function TrackedTeamsManager({ teams }: { teams: TrackedTeam[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await apiFetch("/api/admin/teams", { method: "POST", body: JSON.stringify({ name, password }) });
      setName("");
      setPassword("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/connexion");
    router.refresh();
  }

  return (
    <>
      <Card className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold">Équipes suivies</h2>
        <ul className="flex flex-col gap-2">
          {teams.map((team) => (
            <TeamRow key={team.id} team={team} />
          ))}
          {teams.length === 0 && <li className="text-sm text-muted">Aucune équipe suivie.</li>}
        </ul>

        <form onSubmit={handleCreate} className="flex flex-wrap items-end gap-3 border-t border-border pt-4">
          <div className="flex-1">
            <Label>Nouvelle équipe</Label>
            <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: U15F" required />
          </div>
          <div className="flex-1">
            <Label>Mot de passe d&apos;accès</Label>
            <TextInput
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              required
            />
          </div>
          <Button type="submit" disabled={submitting}>
            Créer l&apos;équipe
          </Button>
        </form>
        {error && <p className="text-sm text-loss">{error}</p>}
      </Card>

      <div>
        <Button type="button" variant="secondary" onClick={handleLogout}>
          Quitter le mode admin
        </Button>
      </div>
    </>
  );
}
