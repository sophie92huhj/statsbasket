import { NextResponse } from "next/server";
import { z } from "zod";
import { getAppSettings, updateAppSettings } from "@/lib/repositories/appSettings";

const updateSettingsSchema = z.object({
  offensiveReboundTarget: z.number().min(0).max(100).optional(),
  turnoverRatioTarget: z.number().min(0).max(100).optional(),
});

export async function GET() {
  const settings = await getAppSettings();
  return NextResponse.json(settings);
}

export async function PATCH(request: Request) {
  const body = await request.json();
  const parsed = updateSettingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const settings = await updateAppSettings(parsed.data);
  return NextResponse.json(settings);
}
