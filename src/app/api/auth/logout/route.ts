import { NextResponse } from "next/server";
import { clearSession } from "@/lib/auth/session";

/** Quitter l'équipe (et le mode admin) : retour à la page d'entrée. */
export async function POST() {
  await clearSession();
  return new NextResponse(null, { status: 204 });
}
