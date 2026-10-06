import { NextResponse } from "next/server";
import { getMatch } from "@/lib/repositories/match";
import { generateMatchStatsPdf } from "@/lib/export/matchStatsPdf";

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "long", year: "numeric" }).format(date);
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const match = await getMatch(id);
  if (!match) return NextResponse.json({ error: "Match introuvable" }, { status: 404 });

  const ownScore = match.isHome ? match.homeScore : match.awayScore;
  const opponentScore = match.isHome ? match.awayScore : match.homeScore;
  const opponent = match.isHome ? match.awayTeam : match.homeTeam;

  const pdfBytes = await generateMatchStatsPdf({
    title: `vs ${opponent.name}`,
    subtitle: `${formatDate(match.date)}${match.competition ? ` · ${match.competition}` : ""} · ${match.season.label}`,
    score: `${ownScore ?? "—"} – ${opponentScore ?? "—"}`,
    players: match.playerStats.map((s) => ({
      jerseyNumber: s.jerseyNumber,
      starter: s.starter,
      firstName: s.player.firstName,
      lastName: s.player.lastName,
      dnp: s.dnp,
      secondsPlayed: s.secondsPlayed,
      fg2Made: s.fg2Made,
      fg2Att: s.fg2Att,
      fg3Made: s.fg3Made,
      fg3Att: s.fg3Att,
      ftMade: s.ftMade,
      ftAtt: s.ftAtt,
      reboundsOff: s.reboundsOff,
      reboundsDef: s.reboundsDef,
      assists: s.assists,
      steals: s.steals,
      turnovers: s.turnovers,
      blocks: s.blocks,
      foulsCommitted: s.foulsCommitted,
      foulsDrawn: s.foulsDrawn,
      officialPoints: s.officialPoints,
    })),
  });

  return new NextResponse(new Uint8Array(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="stats-${opponent.name.replace(/\s+/g, "-")}-${match.date.toISOString().slice(0, 10)}.pdf"`,
    },
  });
}
