"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Form";
import { useAuth } from "@/lib/auth/AuthContext";

export function NewMatchButton() {
  const { isAdmin } = useAuth();
  if (!isAdmin) return null;

  return (
    <Link href="/matchs/nouveau">
      <Button type="button">Nouveau match</Button>
    </Link>
  );
}
