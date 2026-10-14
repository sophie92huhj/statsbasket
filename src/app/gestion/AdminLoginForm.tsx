"use client";

import { useState } from "react";
import { Button, Label, TextInput } from "@/components/ui/Form";
import { useAuth } from "@/lib/auth/AuthContext";

export function AdminLoginForm() {
  const { login } = useAuth();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    if (!(await login(password))) setError("Mot de passe incorrect.");
    setSubmitting(false);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
      <div className="flex-1">
        <Label>Mot de passe admin</Label>
        <TextInput type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      </div>
      <Button type="submit" disabled={submitting}>
        Accéder à la gestion
      </Button>
      {error && <p className="w-full text-sm text-loss">{error}</p>}
    </form>
  );
}
