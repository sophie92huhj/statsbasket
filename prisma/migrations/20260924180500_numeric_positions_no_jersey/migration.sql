-- Retrait du numéro de maillot (non utilisé)
ALTER TABLE "PlayerTeamSeason" DROP COLUMN "jerseyNumber";

-- Renommage de l'enum Position en valeurs numériques (1 à 5).
ALTER TYPE "Position" RENAME TO "Position_old";
CREATE TYPE "Position" AS ENUM ('POSTE_1', 'POSTE_2', 'POSTE_3', 'POSTE_4', 'POSTE_5');
ALTER TABLE "PlayerTeamSeason" ALTER COLUMN "position" DROP DEFAULT;
ALTER TABLE "PlayerTeamSeason" ALTER COLUMN "position" TYPE "Position" USING (
  CASE "position"::text
    WHEN 'MENEUSE' THEN 'POSTE_1'
    WHEN 'ARRIERE' THEN 'POSTE_2'
    WHEN 'AILIERE' THEN 'POSTE_3'
    WHEN 'AILIERE_FORTE' THEN 'POSTE_4'
    WHEN 'PIVOT' THEN 'POSTE_5'
    ELSE NULL
  END::"Position"
);
DROP TYPE "Position_old";
