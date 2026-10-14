import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

// Singleton Prisma pour éviter d'épuiser les connexions en dev (hot-reload Next.js).
const globalForPrisma = globalThis as unknown as { prisma?: ReturnType<typeof createPrismaClient> };

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL n'est pas défini (voir .env.example).");
  }
  const adapter = new PrismaPg({ connectionString });
  // Le hash du mot de passe d'équipe n'est jamais renvoyé par défaut (il partirait sinon dans
  // les réponses API et les props des composants) ; seul src/lib/repositories/trackedTeam.ts le lit.
  return new PrismaClient({ adapter, omit: { team: { accessPasswordHash: true } } });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
