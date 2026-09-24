import { NextResponse } from "next/server";
import { z } from "zod";
import { createTeam, listTeams } from "@/lib/repositories/team";

const createTeamSchema = z.object({
  name: z.string().min(1),
  isOwnTeam: z.boolean().optional(),
});

export async function GET() {
  const teams = await listTeams();
  return NextResponse.json(teams);
}

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = createTeamSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const team = await createTeam(parsed.data);
  return NextResponse.json(team, { status: 201 });
}
