import { NextResponse } from "next/server";
import { getTeam } from "@/lib/repositories/team";
import { requireApiSession } from "@/lib/auth/session";
import { getSeason } from "@/lib/repositories/season";
import { getPlayerPointsForTeamSeason, getTeamMatchAggregateInputs } from "@/lib/repositories/teamAnalytics";
import { summarizeTeamSeason } from "@/lib/stats/teamSeasonStats";
import { generateTeamStatsPdf } from "@/lib/export/teamStatsPdf";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiSession();
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  const seasonId = new URL(request.url).searchParams.get("saison") ?? undefined;

  const [team, season] = await Promise.all([
    id === auth.teamId ? getTeam(auth.teamId, id) : null,
    seasonId ? getSeason(auth.teamId, seasonId) : null,
  ]);
  if (!team) return NextResponse.json({ error: "Équipe introuvable" }, { status: 404 });

  const [matches, playerPoints] = await Promise.all([
    getTeamMatchAggregateInputs(id, { seasonId }),
    getPlayerPointsForTeamSeason(id, { seasonId }),
  ]);
  const summary = summarizeTeamSeason(matches);

  const subtitle = `${summary.gamesPlayed} match${summary.gamesPlayed > 1 ? "s" : ""} · ${
    season ? `Saison ${season.label}` : "Toutes les saisons"
  }`;

  const pdfBytes = await generateTeamStatsPdf({ title: team.name, subtitle, summary, matches, playerPoints });

  const fileName = `stats-${team.name}${season ? `-${season.label}` : ""}.pdf`.replace(/\s+/g, "-");

  return new NextResponse(new Uint8Array(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${fileName}"`,
    },
  });
}
