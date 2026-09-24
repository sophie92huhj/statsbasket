import { NextResponse } from "next/server";
import { z } from "zod";
import { deleteTeam, getTeam, updateTeam } from "@/lib/repositories/team";

const updateTeamSchema = z.object({
  name: z.string().min(1).optional(),
  isOwnTeam: z.boolean().optional(),
});

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const team = await getTeam(id);
  if (!team) return NextResponse.json({ error: "Équipe introuvable" }, { status: 404 });
  return NextResponse.json(team);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const parsed = updateTeamSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const team = await updateTeam(id, parsed.data);
  return NextResponse.json(team);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await deleteTeam(id);
  return new NextResponse(null, { status: 204 });
}
