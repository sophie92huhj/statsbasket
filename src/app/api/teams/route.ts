import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiSession } from "@/lib/auth/session";
import { createOpponent, listTeams } from "@/lib/repositories/team";

// Les équipes suivies se créent dans /gestion ; ici on ne crée que des adversaires.
const createTeamSchema = z.object({
  name: z.string().trim().min(1),
});

export async function GET() {
  const auth = await requireApiSession();
  if (auth instanceof NextResponse) return auth;
  const teams = await listTeams(auth.teamId);
  return NextResponse.json(teams);
}

export async function POST(request: Request) {
  const auth = await requireApiSession({ admin: true });
  if (auth instanceof NextResponse) return auth;
  const body = await request.json();
  const parsed = createTeamSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const team = await createOpponent(auth.teamId, parsed.data.name);
  return NextResponse.json(team, { status: 201 });
}
