"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Form";
import { apiFetch } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/AuthContext";

export function DeletePlayerButton({ playerId, playerName }: { playerId: string; playerName: string }) {
  const router = useRouter();
  const { isAdmin } = useAuth();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (
      !confirm(
        `Supprimer ${playerName} ? Ses statistiques de match et ses rattachements équipe/saison seront aussi supprimés.`,
      )
    ) {
      return;
    }
    setDeleting(true);
    try {
      await apiFetch(`/api/players/${playerId}`, { method: "DELETE" });
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erreur inconnue");
      setDeleting(false);
    }
  }

  if (!isAdmin) return null;

  return (
    <Button variant="danger" type="button" onClick={handleDelete} disabled={deleting}>
      Supprimer
    </Button>
  );
}
