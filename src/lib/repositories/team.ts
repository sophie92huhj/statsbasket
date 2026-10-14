import { prisma } from "@/lib/db/client";
import type { PlayerStatus, Team } from "@prisma/client";
import { ownsPlayer, ownsSeason, ownsTeam, ownsTeamSeason, teamsOfTeam } from "./scope";

/** Équipe telle que renvoyée par les requêtes (sans le hash du mot de passe, voir src/lib/db/client.ts). */
export type PublicTeam = Omit<Team, "accessPasswordHash">;

/** L'équipe suivie et ses adversaires. */
export function listTeams(teamId: string) {
  return prisma.team.findMany({ where: teamsOfTeam(teamId), orderBy: { name: "asc" } });
}

/** L'équipe suivie elle-même ou un de ses adversaires. */
export function getTeam(teamId: string, id: string) {
  return prisma.team.findFirst({ where: { AND: [{ id }, teamsOfTeam(teamId)] } });
}

export function createOpponent(teamId: string, name: string) {
  return prisma.team.create({ data: { name, ownerTeamId: teamId } });
}

export async function renameTeam(teamId: string, id: string, name: string) {
  if (!(await ownsTeam(teamId, id))) return null;
  return prisma.team.update({ where: { id }, data: { name } });
}

/** Seuls les adversaires peuvent être supprimés ici (l'équipe suivie se gère dans /gestion). */
export async function deleteOpponent(teamId: string, id: string): Promise<boolean> {
  return (await prisma.team.deleteMany({ where: { id, ownerTeamId: teamId } })).count > 0;
}

// ---------------------------------------------------------------------------
// TeamSeason — rattachement équipe/saison (catégorie, championnat, coach)
// ---------------------------------------------------------------------------

export interface UpsertTeamSeasonInput {
  teamId: string;
  seasonId: string;
  category?: string | null;
  league?: string | null;
  coachName?: string | null;
}

export function listTeamSeasons(teamId: string, seasonId?: string) {
  return prisma.teamSeason.findMany({
    where: { season: { teamId }, seasonId },
    include: { team: true, season: true },
    orderBy: { team: { name: "asc" } },
  });
}

export function getTeamSeason(teamId: string, id: string) {
  return prisma.teamSeason.findFirst({
    where: { id, season: { teamId } },
    include: {
      team: true,
      season: true,
      rosterEntries: { include: { player: true } },
    },
  });
}

export async function upsertTeamSeason(ownerTeamId: string, input: UpsertTeamSeasonInput) {
  const { teamId, seasonId, ...rest } = input;
  const [teamOk, seasonOk] = await Promise.all([ownsTeam(ownerTeamId, teamId), ownsSeason(ownerTeamId, seasonId)]);
  if (!teamOk || !seasonOk) return null;
  return prisma.teamSeason.upsert({
    where: { teamId_seasonId: { teamId, seasonId } },
    create: { teamId, seasonId, ...rest },
    update: rest,
  });
}

export async function deleteTeamSeason(teamId: string, id: string): Promise<boolean> {
  return (await prisma.teamSeason.deleteMany({ where: { id, season: { teamId } } })).count > 0;
}

// ---------------------------------------------------------------------------
// Roster — rattachement joueuse/équipe-saison (numéro, statut)
// ---------------------------------------------------------------------------

export interface UpsertRosterEntryInput {
  playerId: string;
  teamSeasonId: string;
  status?: PlayerStatus;
}

export async function upsertRosterEntry(teamId: string, input: UpsertRosterEntryInput) {
  const { playerId, teamSeasonId, ...rest } = input;
  const [playerOk, teamSeasonOk] = await Promise.all([
    ownsPlayer(teamId, playerId),
    ownsTeamSeason(teamId, teamSeasonId),
  ]);
  if (!playerOk || !teamSeasonOk) return null;
  return prisma.playerTeamSeason.upsert({
    where: { playerId_teamSeasonId: { playerId, teamSeasonId } },
    create: { playerId, teamSeasonId, ...rest },
    update: rest,
  });
}

export async function removeRosterEntry(teamId: string, id: string): Promise<boolean> {
  return (await prisma.playerTeamSeason.deleteMany({ where: { id, player: { teamId } } })).count > 0;
}

export function listRosterForTeamSeason(teamId: string, teamSeasonId: string) {
  return prisma.playerTeamSeason.findMany({
    where: { teamSeasonId, player: { teamId } },
    include: { player: true },
    orderBy: { player: { lastName: "asc" } },
  });
}
