import { prisma } from "@/lib/db/client";

export interface PlayerMatchStatInput {
  matchId: string;
  playerId: string;
  jerseyNumber?: number | null;
  starter?: boolean;
  secondsPlayed?: number | null;
  fg2Made?: number | null;
  fg2Att?: number | null;
  fg3Made?: number | null;
  fg3Att?: number | null;
  ftMade?: number | null;
  ftAtt?: number | null;
  reboundsOff?: number | null;
  reboundsDef?: number | null;
  assists?: number | null;
  steals?: number | null;
  turnovers?: number | null;
  blocks?: number | null;
  foulsCommitted?: number | null;
  foulsDrawn?: number | null;
  officialPoints?: number | null;
}

export function listPlayerStatsForMatch(matchId: string) {
  return prisma.playerMatchStat.findMany({
    where: { matchId },
    include: { player: true },
  });
}

export function upsertPlayerMatchStat(input: PlayerMatchStatInput) {
  const { matchId, playerId, ...rest } = input;
  return prisma.playerMatchStat.upsert({
    where: { matchId_playerId: { matchId, playerId } },
    create: { matchId, playerId, ...rest },
    update: rest,
  });
}

/** Saisie en grille : upsert de plusieurs lignes joueuse/match en une transaction (§42). */
export function upsertPlayerMatchStatsBatch(inputs: PlayerMatchStatInput[]) {
  return prisma.$transaction(
    inputs.map(({ matchId, playerId, ...rest }) =>
      prisma.playerMatchStat.upsert({
        where: { matchId_playerId: { matchId, playerId } },
        create: { matchId, playerId, ...rest },
        update: rest,
      }),
    ),
  );
}

export function deletePlayerMatchStat(id: string) {
  return prisma.playerMatchStat.delete({ where: { id } });
}

/** Retire des joueuses de la feuille de match (elles ne sont plus convoquées à ce match). */
export function removePlayersFromMatch(matchId: string, playerIds: string[]) {
  if (playerIds.length === 0) return Promise.resolve();
  return prisma.playerMatchStat.deleteMany({ where: { matchId, playerId: { in: playerIds } } });
}

export interface TeamMatchStatInput {
  matchId: string;
  teamId: string;
  fg2Made?: number | null;
  fg2Att?: number | null;
  fg3Made?: number | null;
  fg3Att?: number | null;
  ftMade?: number | null;
  ftAtt?: number | null;
  reboundsOff?: number | null;
  reboundsDef?: number | null;
  assists?: number | null;
  steals?: number | null;
  turnovers?: number | null;
  blocks?: number | null;
  foulsCommitted?: number | null;
  foulsDrawn?: number | null;
}

export function listTeamStatsForMatch(matchId: string) {
  return prisma.teamMatchStat.findMany({ where: { matchId }, include: { team: true } });
}

export function upsertTeamMatchStat(input: TeamMatchStatInput) {
  const { matchId, teamId, ...rest } = input;
  return prisma.teamMatchStat.upsert({
    where: { matchId_teamId: { matchId, teamId } },
    create: { matchId, teamId, ...rest },
    update: rest,
  });
}
