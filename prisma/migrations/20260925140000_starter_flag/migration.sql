-- Indique si une joueuse fait partie du 5 de départ pour ce match précis.
ALTER TABLE "PlayerMatchStat" ADD COLUMN "starter" BOOLEAN NOT NULL DEFAULT false;
