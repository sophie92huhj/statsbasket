import { prisma } from "@/lib/db/client";
import { ownsPlayer } from "./scope";

export interface CreatePlayerInput {
  firstName: string;
  lastName: string;
  birthDate?: Date | null;
}

export function listPlayers(teamId: string, search?: string) {
  return prisma.player.findMany({
    where: {
      teamId,
      ...(search
        ? {
            OR: [
              { firstName: { contains: search, mode: "insensitive" } },
              { lastName: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });
}

export function getPlayer(teamId: string, id: string) {
  return prisma.player.findFirst({
    where: { id, teamId },
    include: {
      rosterEntries: {
        include: { teamSeason: { include: { team: true, season: true } } },
        orderBy: { teamSeason: { season: { startDate: "desc" } } },
      },
    },
  });
}

export function createPlayer(teamId: string, input: CreatePlayerInput) {
  return prisma.player.create({ data: { ...input, teamId } });
}

export async function updatePlayer(teamId: string, id: string, input: Partial<CreatePlayerInput>) {
  if (!(await ownsPlayer(teamId, id))) return null;
  return prisma.player.update({ where: { id }, data: input });
}

export async function deletePlayer(teamId: string, id: string): Promise<boolean> {
  return (await prisma.player.deleteMany({ where: { id, teamId } })).count > 0;
}
