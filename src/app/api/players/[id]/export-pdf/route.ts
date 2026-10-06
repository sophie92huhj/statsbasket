import { NextResponse } from "next/server";
import { getPlayer } from "@/lib/repositories/player";
import { getPlayerMatchLines } from "@/lib/repositories/playerAnalytics";
import { summarizePlayerSeason } from "@/lib/stats/playerSeasonStats";
import { generatePlayerStatsPdf } from "@/lib/export/playerStatsPdf";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const seasonId = new URL(request.url).searchParams.get("saison") ?? undefined;

  const player = await getPlayer(id);
  if (!player) return NextResponse.json({ error: "Joueuse introuvable" }, { status: 404 });

  const lines = await getPlayerMatchLines(id, { seasonId });
  const summary = summarizePlayerSeason(lines);

  const subtitle = `${summary.gamesPlayed} match${summary.gamesPlayed > 1 ? "s" : ""} joué${summary.gamesPlayed > 1 ? "s" : ""}${
    summary.gamesInRoster > summary.gamesPlayed
      ? ` (+ ${summary.gamesInRoster - summary.gamesPlayed} non joué${summary.gamesInRoster - summary.gamesPlayed > 1 ? "s" : ""})`
      : ""
  }`;

  const pdfBytes = await generatePlayerStatsPdf({
    title: `${player.firstName} ${player.lastName.toUpperCase()}`,
    subtitle,
    summary,
    lines,
  });

  const fileName = `stats-${player.firstName}-${player.lastName}.pdf`.replace(/\s+/g, "-");

  return new NextResponse(new Uint8Array(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${fileName}"`,
    },
  });
}
