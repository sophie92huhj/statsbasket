import { prisma } from "@/lib/db/client";
import { hashPassword } from "@/lib/auth/password";

// Équipes suivies (isOwnTeam) : page d'entrée et gestion par l'admin global.
// Le hash du mot de passe ne sort jamais de ce module.

export async function listTrackedTeams() {
  const teams = await prisma.team.findMany({
    where: { isOwnTeam: true },
    select: { id: true, name: true, accessPasswordHash: true },
    orderBy: { name: "asc" },
  });
  return teams.map(({ accessPasswordHash, ...team }) => ({ ...team, hasPassword: accessPasswordHash !== null }));
}

export function getTrackedTeam(id: string) {
  return prisma.team.findFirst({ where: { id, isOwnTeam: true }, select: { id: true, name: true } });
}

export function getTrackedTeamPasswordHash(id: string) {
  return prisma.team
    .findFirst({ where: { id, isOwnTeam: true }, select: { accessPasswordHash: true } })
    .then((team) => team?.accessPasswordHash ?? null);
}

export async function createTrackedTeam(name: string, password: string) {
  return prisma.team.create({
    data: { name, isOwnTeam: true, accessPasswordHash: await hashPassword(password) },
    select: { id: true, name: true },
  });
}

export async function updateTrackedTeam(id: string, input: { name?: string; password?: string }) {
  const data = {
    ...(input.name ? { name: input.name } : {}),
    ...(input.password ? { accessPasswordHash: await hashPassword(input.password) } : {}),
  };
  const result = await prisma.team.updateMany({ where: { id, isOwnTeam: true }, data });
  return result.count > 0;
}
