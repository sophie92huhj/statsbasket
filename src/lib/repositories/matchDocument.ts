import { prisma } from "@/lib/db/client";
import { matchesOfTeam } from "./scope";

export function listMatchDocuments(teamId: string, matchId: string) {
  return prisma.matchDocument.findMany({
    where: { matchId, match: matchesOfTeam(teamId) },
    select: { id: true, fileName: true, contentType: true, fileSize: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
}

export function getMatchDocument(teamId: string, matchId: string, id: string) {
  return prisma.matchDocument.findFirst({ where: { id, matchId, match: matchesOfTeam(teamId) } });
}

export interface CreateMatchDocumentInput {
  matchId: string;
  fileName: string;
  contentType: string;
  fileSize: number;
  data: Uint8Array<ArrayBuffer>;
}

/** Le match doit appartenir à l'équipe (vérifié par l'appelant via ownsMatch). */
export function createMatchDocument(input: CreateMatchDocumentInput) {
  return prisma.matchDocument.create({ data: input });
}

export async function deleteMatchDocument(teamId: string, matchId: string, id: string): Promise<boolean> {
  return (await prisma.matchDocument.deleteMany({ where: { id, matchId, match: matchesOfTeam(teamId) } })).count > 0;
}
