import { prisma } from "@/lib/db/client";

export interface CreatePlayerInput {
  firstName: string;
  lastName: string;
  birthDate?: Date | null;
}

export function listPlayers(search?: string) {
  return prisma.player.findMany({
    where: search
      ? {
          OR: [
            { firstName: { contains: search, mode: "insensitive" } },
            { lastName: { contains: search, mode: "insensitive" } },
          ],
        }
      : undefined,
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });
}

export function getPlayer(id: string) {
  return prisma.player.findUnique({
    where: { id },
    include: {
      rosterEntries: {
        include: { teamSeason: { include: { team: true, season: true } } },
        orderBy: { teamSeason: { season: { startDate: "desc" } } },
      },
    },
  });
}

export function createPlayer(input: CreatePlayerInput) {
  return prisma.player.create({ data: input });
}

export function updatePlayer(id: string, input: Partial<CreatePlayerInput>) {
  return prisma.player.update({ where: { id }, data: input });
}

export function deletePlayer(id: string) {
  return prisma.player.delete({ where: { id } });
}
