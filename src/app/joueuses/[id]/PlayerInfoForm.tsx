"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button, Label, TextInput } from "@/components/ui/Form";
import { apiFetch } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/AuthContext";

export function PlayerInfoForm({
  playerId,
  firstName,
  lastName,
}: {
  playerId: string;
  firstName: string;
  lastName: string;
}) {
  const router = useRouter();
  const { isAdmin } = useAuth();
  const [editing, setEditing] = useState(false);
  const [firstNameValue, setFirstNameValue] = useState(firstName);
  const [lastNameValue, setLastNameValue] = useState(lastName);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!isAdmin) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await apiFetch(`/api/players/${playerId}`, {
        method: "PATCH",
        body: JSON.stringify({ firstName: firstNameValue.trim(), lastName: lastNameValue.trim() }),
      });
      setEditing(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setSubmitting(false);
    }
  }

  if (!editing) {
    return (
      <div>
        <Button type="button" variant="secondary" onClick={() => setEditing(true)}>
          Modifier le nom
        </Button>
      </div>
    );
  }

  return (
    <Card className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold">Modifier les informations</h2>
      <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
        <div>
          <Label>Prénom</Label>
          <TextInput value={firstNameValue} onChange={(e) => setFirstNameValue(e.target.value)} required />
        </div>
        <div>
          <Label>Nom</Label>
          <TextInput value={lastNameValue} onChange={(e) => setLastNameValue(e.target.value)} required />
        </div>
        <Button type="submit" disabled={submitting}>
          Enregistrer
        </Button>
        <Button type="button" variant="secondary" onClick={() => setEditing(false)} disabled={submitting}>
          Annuler
        </Button>
      </form>
      {error && <p className="text-sm text-loss">{error}</p>}
    </Card>
  );
}
