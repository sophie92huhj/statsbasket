"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button, Label, TextInput } from "@/components/ui/Form";
import { apiFetch } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/AuthContext";

export function NewPlayerForm() {
  const router = useRouter();
  const { isAdmin } = useAuth();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await apiFetch("/api/players", { method: "POST", body: JSON.stringify({ firstName, lastName }) });
      setFirstName("");
      setLastName("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setSubmitting(false);
    }
  }

  if (!isAdmin) return null;

  return (
    <Card>
      <form onSubmit={handleCreate} className="flex flex-wrap items-end gap-3">
        <div>
          <Label>Prénom</Label>
          <TextInput value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
        </div>
        <div>
          <Label>Nom</Label>
          <TextInput value={lastName} onChange={(e) => setLastName(e.target.value)} required />
        </div>
        <Button type="submit" disabled={submitting}>
          Ajouter une joueuse
        </Button>
      </form>
      {error && <p className="mt-2 text-sm text-loss">{error}</p>}
    </Card>
  );
}
