import { prisma } from "@/lib/db/client";

export function listMatchDocuments(matchId: string) {
  return prisma.matchDocument.findMany({
    where: { matchId },
    select: { id: true, fileName: true, contentType: true, fileSize: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
}

export function getMatchDocument(id: string) {
  return prisma.matchDocument.findUnique({ where: { id } });
}

export interface CreateMatchDocumentInput {
  matchId: string;
  fileName: string;
  contentType: string;
  fileSize: number;
  data: Uint8Array<ArrayBuffer>;
}

export function createMatchDocument(input: CreateMatchDocumentInput) {
  return prisma.matchDocument.create({ data: input });
}

export function deleteMatchDocument(id: string) {
  return prisma.matchDocument.delete({ where: { id } });
}
