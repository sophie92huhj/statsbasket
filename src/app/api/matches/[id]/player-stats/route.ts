import { NextResponse } from "next/server";
import { z } from "zod";
import { listPlayerStatsForMatch, upsertPlayerMatchStatsBatch } from "@/lib/repositories/matchStat";
import { validatePlayerStatLine, findDuplicatePlayers } from "@/lib/stats/validate";

const statLineSchema = z.object({
  playerId: z.string().min(1),
  dnp: z.boolean().optional(),
  secondsPlayed: z.number().int().min(0).nullish(),
  fg2Made: z.number().int().min(0).nullish(),
  fg2Att: z.number().int().min(0).nullish(),
  fg3Made: z.number().int().min(0).nullish(),
  fg3Att: z.number().int().min(0).nullish(),
  ftMade: z.number().int().min(0).nullish(),
  ftAtt: z.number().int().min(0).nullish(),
  reboundsOff: z.number().int().min(0).nullish(),
  reboundsDef: z.number().int().min(0).nullish(),
  assists: z.number().int().min(0).nullish(),
  steals: z.number().int().min(0).nullish(),
  turnovers: z.number().int().min(0).nullish(),
  blocks: z.number().int().min(0).nullish(),
  foulsCommitted: z.number().int().min(0).nullish(),
  foulsDrawn: z.number().int().min(0).nullish(),
  officialPoints: z.number().int().min(0).nullish(),
});

const batchSchema = z.object({
  lines: z.array(statLineSchema),
  // Si true, sauvegarde même en présence d'avertissements (mais jamais d'erreurs bloquantes).
  force: z.boolean().optional(),
});

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const stats = await listPlayerStatsForMatch(id);
  return NextResponse.json(stats);
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: matchId } = await params;
  const body = await request.json();
  const parsed = batchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { lines, force } = parsed.data;

  const duplicates = findDuplicatePlayers(lines.map((l) => l.playerId));
  if (duplicates.length > 0) {
    return NextResponse.json(
      { error: "Doublon de joueuse détecté dans la saisie.", duplicatePlayerIds: duplicates },
      { status: 400 },
    );
  }

  const validation = lines.map((line) => ({
    playerId: line.playerId,
    issues: validatePlayerStatLine({
      dnp: line.dnp ?? false,
      secondsPlayed: line.secondsPlayed ?? null,
      fg2Made: line.fg2Made ?? null,
      fg2Att: line.fg2Att ?? null,
      fg3Made: line.fg3Made ?? null,
      fg3Att: line.fg3Att ?? null,
      ftMade: line.ftMade ?? null,
      ftAtt: line.ftAtt ?? null,
      reboundsOff: line.reboundsOff ?? null,
      reboundsDef: line.reboundsDef ?? null,
      assists: line.assists ?? null,
      steals: line.steals ?? null,
      turnovers: line.turnovers ?? null,
      blocks: line.blocks ?? null,
      foulsCommitted: line.foulsCommitted ?? null,
      foulsDrawn: line.foulsDrawn ?? null,
      officialPoints: line.officialPoints ?? null,
    }),
  }));

  const hasErrors = validation.some((v) => v.issues.some((i) => i.severity === "error"));
  const hasWarnings = validation.some((v) => v.issues.some((i) => i.severity === "warning"));

  if (hasErrors) {
    return NextResponse.json({ error: "Incohérences bloquantes détectées.", validation }, { status: 400 });
  }
  if (hasWarnings && !force) {
    return NextResponse.json({ warning: "Avertissements détectés.", validation }, { status: 422 });
  }

  const saved = await upsertPlayerMatchStatsBatch(lines.map((line) => ({ matchId, ...line })));
  return NextResponse.json(saved);
}
