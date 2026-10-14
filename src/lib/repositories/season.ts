import { prisma } from "@/lib/db/client";
import { ownsSeason } from "./scope";

export interface CreateSeasonInput {
  label: string;
  startDate: Date;
  endDate: Date;
}

export function listSeasons(teamId: string) {
  return prisma.season.findMany({ where: { teamId }, orderBy: { startDate: "desc" } });
}

export function getSeason(teamId: string, id: string) {
  return prisma.season.findFirst({ where: { id, teamId } });
}

export function createSeason(teamId: string, input: CreateSeasonInput) {
  return prisma.season.create({ data: { ...input, teamId } });
}

export async function updateSeason(teamId: string, id: string, input: Partial<CreateSeasonInput>) {
  if (!(await ownsSeason(teamId, id))) return null;
  return prisma.season.update({ where: { id }, data: input });
}

export async function deleteSeason(teamId: string, id: string): Promise<boolean> {
  return (await prisma.season.deleteMany({ where: { id, teamId } })).count > 0;
}
