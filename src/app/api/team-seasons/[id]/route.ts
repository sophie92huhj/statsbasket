import { NextResponse } from "next/server";
import { requireApiSession } from "@/lib/auth/session";
import { deleteTeamSeason, getTeamSeason } from "@/lib/repositories/team";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiSession();
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  const teamSeason = await getTeamSeason(auth.teamId, id);
  if (!teamSeason) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  return NextResponse.json(teamSeason);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiSession({ admin: true });
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  if (!(await deleteTeamSeason(auth.teamId, id))) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  return new NextResponse(null, { status: 204 });
}
