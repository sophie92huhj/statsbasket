import { prisma } from "@/lib/db/client";

export interface CreateSeasonInput {
  label: string;
  startDate: Date;
  endDate: Date;
}

export function listSeasons() {
  return prisma.season.findMany({ orderBy: { startDate: "desc" } });
}

export function getSeason(id: string) {
  return prisma.season.findUnique({ where: { id } });
}

export function createSeason(input: CreateSeasonInput) {
  return prisma.season.create({ data: input });
}

export function updateSeason(id: string, input: Partial<CreateSeasonInput>) {
  return prisma.season.update({ where: { id }, data: input });
}

export function deleteSeason(id: string) {
  return prisma.season.delete({ where: { id } });
}
