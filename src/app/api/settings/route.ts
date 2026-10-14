import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiSession } from "@/lib/auth/session";
import { getAppSettings, updateAppSettings } from "@/lib/repositories/appSettings";

const updateSettingsSchema = z.object({
  offensiveReboundTarget: z.number().min(0).max(100).optional(),
  turnoverRatioTarget: z.number().min(0).max(100).optional(),
});

export async function GET() {
  const auth = await requireApiSession();
  if (auth instanceof NextResponse) return auth;
  const settings = await getAppSettings(auth.teamId);
  return NextResponse.json(settings);
}

export async function PATCH(request: Request) {
  const auth = await requireApiSession({ admin: true });
  if (auth instanceof NextResponse) return auth;
  const body = await request.json();
  const parsed = updateSettingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const settings = await updateAppSettings(auth.teamId, parsed.data);
  return NextResponse.json(settings);
}
