-- Accès multi-équipes : chaque équipe suivie possède ses saisons, joueuses, adversaires
-- et réglages. Les données existantes sont rattachées à l'équipe suivie actuelle
-- (la plus ancienne marquée « Notre équipe » ; créée si aucune n'existe).

-- DropIndex
DROP INDEX "Player_lastName_firstName_idx";
DROP INDEX "Season_label_key";
DROP INDEX "Team_name_key";

-- AlterTable (colonnes d'abord nullable, remplies ci-dessous, puis NOT NULL)
ALTER TABLE "Team" ADD COLUMN "accessPasswordHash" TEXT,
ADD COLUMN "ownerTeamId" TEXT;
ALTER TABLE "AppSettings" ADD COLUMN "teamId" TEXT,
ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "Player" ADD COLUMN "teamId" TEXT;
ALTER TABLE "Season" ADD COLUMN "teamId" TEXT;

-- Backfill
DO $$
DECLARE
  own_id TEXT;
BEGIN
  SELECT "id" INTO own_id FROM "Team" WHERE "isOwnTeam" ORDER BY "createdAt" ASC LIMIT 1;

  IF own_id IS NULL AND (EXISTS (SELECT 1 FROM "Season") OR EXISTS (SELECT 1 FROM "Player")) THEN
    own_id := 'migrated-own-team';
    INSERT INTO "Team" ("id", "name", "isOwnTeam", "createdAt") VALUES (own_id, 'Mon équipe', true, NOW());
  END IF;

  IF own_id IS NOT NULL THEN
    UPDATE "Team" SET "ownerTeamId" = own_id WHERE NOT "isOwnTeam";
    UPDATE "Season" SET "teamId" = own_id;
    UPDATE "Player" SET "teamId" = own_id;
    UPDATE "AppSettings" SET "teamId" = own_id, "id" = own_id WHERE "id" = 'singleton';
  END IF;

  DELETE FROM "AppSettings" WHERE "teamId" IS NULL;
END $$;

ALTER TABLE "AppSettings" ALTER COLUMN "teamId" SET NOT NULL;
ALTER TABLE "Player" ALTER COLUMN "teamId" SET NOT NULL;
ALTER TABLE "Season" ALTER COLUMN "teamId" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "AppSettings_teamId_key" ON "AppSettings"("teamId");
CREATE INDEX "Player_teamId_lastName_firstName_idx" ON "Player"("teamId", "lastName", "firstName");
CREATE UNIQUE INDEX "Season_teamId_label_key" ON "Season"("teamId", "label");
CREATE UNIQUE INDEX "Team_ownerTeamId_name_key" ON "Team"("ownerTeamId", "name");

-- AddForeignKey
ALTER TABLE "Season" ADD CONSTRAINT "Season_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Team" ADD CONSTRAINT "Team_ownerTeamId_fkey" FOREIGN KEY ("ownerTeamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Player" ADD CONSTRAINT "Player_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AppSettings" ADD CONSTRAINT "AppSettings_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
