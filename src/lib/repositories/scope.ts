import { prisma } from "@/lib/db/client";
import type { Prisma } from "@prisma/client";

// Cloisonnement entre équipes suivies : chaque donnée appartient à une équipe suivie
// (directement via teamId/ownerTeamId, ou via les équipes d'un match). Ces helpers sont
// la seule définition de "appartient à l'équipe" ; les repositories s'appuient dessus.

/** Matchs de l'équipe suivie (elle joue à domicile ou à l'extérieur). */
export function matchesOfTeam(teamId: string): Prisma.MatchWhereInput {
  return { OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }] };
}

/** L'équipe suivie elle-même et ses adversaires. */
export function teamsOfTeam(teamId: string): Prisma.TeamWhereInput {
  return { OR: [{ id: teamId }, { ownerTeamId: teamId }] };
}

export async function ownsMatch(teamId: string, matchId: string): Promise<boolean> {
  return (await prisma.match.count({ where: { AND: [{ id: matchId }, matchesOfTeam(teamId)] } })) > 0;
}

export async function ownsSeason(teamId: string, seasonId: string): Promise<boolean> {
  return (await prisma.season.count({ where: { id: seasonId, teamId } })) > 0;
}

export async function ownsPlayer(teamId: string, playerId: string): Promise<boolean> {
  return (await prisma.player.count({ where: { id: playerId, teamId } })) > 0;
}

export async function ownsPlayers(teamId: string, playerIds: string[]): Promise<boolean> {
  const unique = [...new Set(playerIds)];
  if (unique.length === 0) return true;
  return (await prisma.player.count({ where: { id: { in: unique }, teamId } })) === unique.length;
}

export async function ownsOpponent(teamId: string, opponentId: string): Promise<boolean> {
  return (await prisma.team.count({ where: { id: opponentId, ownerTeamId: teamId } })) > 0;
}

/** L'équipe suivie elle-même ou un de ses adversaires. */
export async function ownsTeam(teamId: string, id: string): Promise<boolean> {
  return (await prisma.team.count({ where: { AND: [{ id }, teamsOfTeam(teamId)] } })) > 0;
}

export async function ownsTeamSeason(teamId: string, teamSeasonId: string): Promise<boolean> {
  return (await prisma.teamSeason.count({ where: { id: teamSeasonId, season: { teamId } } })) > 0;
}
