import { NextResponse } from "next/server";
import { z } from "zod";
import { deletePlayer, getPlayer, updatePlayer } from "@/lib/repositories/player";

const updatePlayerSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  birthDate: z.coerce.date().nullish(),
});

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const player = await getPlayer(id);
  if (!player) return NextResponse.json({ error: "Joueuse introuvable" }, { status: 404 });
  return NextResponse.json(player);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const parsed = updatePlayerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const player = await updatePlayer(id, parsed.data);
  return NextResponse.json(player);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await deletePlayer(id);
  return new NextResponse(null, { status: 204 });
}
