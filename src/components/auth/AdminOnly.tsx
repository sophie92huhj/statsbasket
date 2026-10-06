"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/AuthContext";
import { Card } from "@/components/ui/Card";

/**
 * Protège une page entière : n'affiche `children` qu'en mode admin.
 * Protection côté interface uniquement (voir CLAUDE.md) — à renforcer côté
 * serveur avant une mise en ligne publique.
 */
export function AdminOnly({ children }: { children: ReactNode }) {
  const { isAdmin } = useAuth();

  if (!isAdmin) {
    return (
      <Card className="flex flex-col gap-2">
        <h1 className="text-lg font-semibold">Accès réservé</h1>
        <p className="text-sm text-muted">
          Cette page nécessite le mode admin. Activez-le depuis{" "}
          <Link href="/parametres" className="text-accent-text hover:underline">
            Paramètres
          </Link>
          .
        </p>
      </Card>
    );
  }

  return <>{children}</>;
}
