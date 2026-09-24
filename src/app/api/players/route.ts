import { NextResponse } from "next/server";
import { z } from "zod";
import { createPlayer, listPlayers } from "@/lib/repositories/player";

const createPlayerSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  birthDate: z.coerce.date().nullish(),
});

export async function GET(request: Request) {
  const search = new URL(request.url).searchParams.get("q") ?? undefined;
  const players = await listPlayers(search);
  return NextResponse.json(players);
}

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = createPlayerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const player = await createPlayer(parsed.data);
  return NextResponse.json(player, { status: 201 });
}
