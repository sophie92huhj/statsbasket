"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { ADMIN_PASSWORD } from "./constants";

const STORAGE_KEY = "statsbasket_role";
const STORAGE_VALUE = "admin";

interface AuthContextValue {
  isAdmin: boolean;
  login: (password: string) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    try {
      setIsAdmin(sessionStorage.getItem(STORAGE_KEY) === STORAGE_VALUE);
    } catch {
      // sessionStorage indisponible (navigation privée stricte) : reste en mode invité.
    }
  }, []);

  function login(password: string): boolean {
    if (password !== ADMIN_PASSWORD) return false;
    try {
      sessionStorage.setItem(STORAGE_KEY, STORAGE_VALUE);
    } catch {
      // ignore
    }
    setIsAdmin(true);
    return true;
  }

  function logout() {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    setIsAdmin(false);
  }

  return <AuthContext.Provider value={{ isAdmin, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth doit être utilisé à l'intérieur de AuthProvider.");
  return ctx;
}
