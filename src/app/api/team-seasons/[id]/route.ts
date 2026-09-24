import { NextResponse } from "next/server";
import { deleteTeamSeason, getTeamSeason } from "@/lib/repositories/team";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const teamSeason = await getTeamSeason(id);
  if (!teamSeason) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  return NextResponse.json(teamSeason);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await deleteTeamSeason(id);
  return new NextResponse(null, { status: 204 });
}
