"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Form";
import { useAuth } from "@/lib/auth/AuthContext";

export function TeamAccessPanel() {
  const { teamName, leaveTeam } = useAuth();
  const [leaving, setLeaving] = useState(false);

  async function handleLeave() {
    setLeaving(true);
    await leaveTeam();
  }

  return (
    <Card className="flex flex-col gap-3 lg:col-span-2">
      <h2 className="text-sm font-semibold">Équipe</h2>
      <p className="text-sm text-muted">
        Vous consultez les statistiques de <strong className="text-foreground">{teamName}</strong>.
      </p>
      <div>
        <Button type="button" variant="secondary" onClick={handleLeave} disabled={leaving}>
          Quitter / changer d&apos;équipe
        </Button>
      </div>
    </Card>
  );
}
