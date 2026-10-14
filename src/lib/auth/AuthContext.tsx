"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useRouter } from "next/navigation";

// État d'accès côté interface. La source de vérité est le cookie de session vérifié par le
// serveur (src/lib/auth/session.ts) : ces valeurs ne servent qu'à adapter l'affichage.

interface AuthContextValue {
  isAdmin: boolean;
  /** Équipe suivie en cours de consultation (null sur la page d'entrée). */
  teamName: string | null;
  login: (password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  /** Quitte l'équipe en cours et revient à la page d'entrée. */
  leaveTeam: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({
  isAdmin,
  teamName,
  children,
}: {
  isAdmin: boolean;
  teamName: string | null;
  children: ReactNode;
}) {
  const router = useRouter();

  async function login(password: string): Promise<boolean> {
    const res = await fetch("/api/auth/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (!res.ok) return false;
    router.refresh();
    return true;
  }

  async function logout() {
    await fetch("/api/auth/admin", { method: "DELETE" });
    router.refresh();
  }

  async function leaveTeam() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/connexion");
    router.refresh();
  }

  return (
    <AuthContext.Provider value={{ isAdmin, teamName, login, logout, leaveTeam }}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth doit être utilisé à l'intérieur de AuthProvider.");
  return ctx;
}
