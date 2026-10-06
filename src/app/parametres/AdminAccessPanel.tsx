"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button, Label, TextInput } from "@/components/ui/Form";
import { useAuth } from "@/lib/auth/AuthContext";

export function AdminAccessPanel() {
  const { isAdmin, login, logout } = useAuth();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const success = login(password);
    if (!success) {
      setError("Mot de passe incorrect.");
      return;
    }
    setPassword("");
  }

  if (isAdmin) {
    return (
      <Card className="flex flex-col gap-3 lg:col-span-2">
        <h2 className="text-sm font-semibold">Accès admin</h2>
        <p className="text-sm text-muted">
          Vous êtes en <strong className="text-win">mode admin</strong> pour cette session de navigateur. Vous
          pouvez ajouter, modifier et supprimer des données.
        </p>
        <div>
          <Button type="button" variant="secondary" onClick={logout}>
            Repasser en mode invité
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col gap-3 lg:col-span-2">
      <h2 className="text-sm font-semibold">Accès admin</h2>
      <p className="text-sm text-muted">
        Vous êtes en <strong>mode invité</strong> (lecture seule). Entrez le mot de passe pour passer en mode admin
        et pouvoir modifier les données.
      </p>
      <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
        <div>
          <Label>Mot de passe</Label>
          <TextInput
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-48"
          />
        </div>
        <Button type="submit">Activer le mode admin</Button>
      </form>
      {error && <p className="text-sm text-loss">{error}</p>}
    </Card>
  );
}
