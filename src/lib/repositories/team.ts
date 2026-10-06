import { prisma } from "@/lib/db/client";
import type { Position, PlayerStatus } from "@prisma/client";

export interface CreateTeamInput {
  name: string;
  isOwnTeam?: boolean;
}

export function listTeams() {
  return prisma.team.findMany({ orderBy: { name: "asc" } });
}

export function getTeam(id: string) {
  return prisma.team.findUnique({ where: { id } });
}

export function createTeam(input: CreateTeamInput) {
  return prisma.team.create({ data: input });
}

export function updateTeam(id: string, input: Partial<CreateTeamInput>) {
  return prisma.team.update({ where: { id }, data: input });
}

export function deleteTeam(id: string) {
  return prisma.team.delete({ where: { id } });
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

export function listTeamSeasons(seasonId?: string) {
  return prisma.teamSeason.findMany({
    where: seasonId ? { seasonId } : undefined,
    include: { team: true, season: true },
    orderBy: { team: { name: "asc" } },
  });
}

export function getTeamSeason(id: string) {
  return prisma.teamSeason.findUnique({
    where: { id },
    include: {
      team: true,
      season: true,
      rosterEntries: { include: { player: true } },
    },
  });
}

export function upsertTeamSeason(input: UpsertTeamSeasonInput) {
  const { teamId, seasonId, ...rest } = input;
  return prisma.teamSeason.upsert({
    where: { teamId_seasonId: { teamId, seasonId } },
    create: { teamId, seasonId, ...rest },
    update: rest,
  });
}

export function deleteTeamSeason(id: string) {
  return prisma.teamSeason.delete({ where: { id } });
}

// ---------------------------------------------------------------------------
// Roster — rattachement joueuse/équipe-saison (numéro, poste, statut)
// ---------------------------------------------------------------------------

export interface UpsertRosterEntryInput {
  playerId: string;
  teamSeasonId: string;
  position?: Position | null;
  status?: PlayerStatus;
}

export function upsertRosterEntry(input: UpsertRosterEntryInput) {
  const { playerId, teamSeasonId, ...rest } = input;
  return prisma.playerTeamSeason.upsert({
    where: { playerId_teamSeasonId: { playerId, teamSeasonId } },
    create: { playerId, teamSeasonId, ...rest },
    update: rest,
  });
}

export function removeRosterEntry(id: string) {
  return prisma.playerTeamSeason.delete({ where: { id } });
}

export function listRosterForTeamSeason(teamSeasonId: string) {
  return prisma.playerTeamSeason.findMany({
    where: { teamSeasonId },
    include: { player: true },
    orderBy: { player: { lastName: "asc" } },
  });
}
