import { prisma } from "@/lib/db/client";

const SETTINGS_ID = "singleton";

export function getAppSettings() {
  return prisma.appSettings.upsert({
    where: { id: SETTINGS_ID },
    create: { id: SETTINGS_ID },
    update: {},
  });
}

export interface UpdateAppSettingsInput {
  offensiveReboundTarget?: number;
  turnoverRatioTarget?: number;
}

export function updateAppSettings(input: UpdateAppSettingsInput) {
  return prisma.appSettings.upsert({
    where: { id: SETTINGS_ID },
    create: { id: SETTINGS_ID, ...input },
    update: input,
  });
}
