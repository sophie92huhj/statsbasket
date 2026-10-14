import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiSession } from "@/lib/auth/session";
import { deletePlayer, getPlayer, updatePlayer } from "@/lib/repositories/player";

const updatePlayerSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  birthDate: z.coerce.date().nullish(),
});

const NOT_FOUND = { error: "Joueur introuvable" };

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiSession();
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  const player = await getPlayer(auth.teamId, id);
  if (!player) return NextResponse.json(NOT_FOUND, { status: 404 });
  return NextResponse.json(player);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiSession({ admin: true });
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  const body = await request.json();
  const parsed = updatePlayerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const player = await updatePlayer(auth.teamId, id, parsed.data);
  if (!player) return NextResponse.json(NOT_FOUND, { status: 404 });
  return NextResponse.json(player);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiSession({ admin: true });
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  if (!(await deletePlayer(auth.teamId, id))) return NextResponse.json(NOT_FOUND, { status: 404 });
  return new NextResponse(null, { status: 204 });
}
