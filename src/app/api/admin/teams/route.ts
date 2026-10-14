import { NextResponse } from "next/server";
import { z } from "zod";
import { requireGlobalAdmin } from "@/lib/auth/session";
import { createTrackedTeam, listTrackedTeams } from "@/lib/repositories/trackedTeam";

const createSchema = z.object({
  name: z.string().trim().min(1),
  password: z.string().min(4, "Le mot de passe doit contenir au moins 4 caractères."),
});

export async function GET() {
  const auth = await requireGlobalAdmin();
  if (auth instanceof NextResponse) return auth;
  return NextResponse.json(await listTrackedTeams());
}

export async function POST(request: Request) {
  const auth = await requireGlobalAdmin();
  if (auth instanceof NextResponse) return auth;

  const parsed = createSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Requête invalide." }, { status: 400 });
  }
  const team = await createTrackedTeam(parsed.data.name, parsed.data.password);
  return NextResponse.json(team, { status: 201 });
}
