import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiSession } from "@/lib/auth/session";
import { deleteOpponent, getTeam, renameTeam } from "@/lib/repositories/team";

const updateTeamSchema = z.object({
  name: z.string().trim().min(1),
});

const NOT_FOUND = { error: "Équipe introuvable" };

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiSession();
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  const team = await getTeam(auth.teamId, id);
  if (!team) return NextResponse.json(NOT_FOUND, { status: 404 });
  return NextResponse.json(team);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiSession({ admin: true });
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  const body = await request.json();
  const parsed = updateTeamSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const team = await renameTeam(auth.teamId, id, parsed.data.name);
  if (!team) return NextResponse.json(NOT_FOUND, { status: 404 });
  return NextResponse.json(team);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiSession({ admin: true });
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  if (!(await deleteOpponent(auth.teamId, id))) return NextResponse.json(NOT_FOUND, { status: 404 });
  return new NextResponse(null, { status: 204 });
}
