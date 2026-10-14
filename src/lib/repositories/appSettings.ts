import { prisma } from "@/lib/db/client";

export function getAppSettings(teamId: string) {
  return prisma.appSettings.upsert({
    where: { teamId },
    create: { teamId },
    update: {},
  });
}

export interface UpdateAppSettingsInput {
  offensiveReboundTarget?: number;
  turnoverRatioTarget?: number;
}

export function updateAppSettings(teamId: string, input: UpdateAppSettingsInput) {
  return prisma.appSettings.upsert({
    where: { teamId },
    create: { teamId, ...input },
    update: input,
  });
}
