-- Feuilles de match scannées (PDF), stockées en base.
CREATE TABLE "MatchDocument" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MatchDocument_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MatchDocument_matchId_idx" ON "MatchDocument"("matchId");

ALTER TABLE "MatchDocument" ADD CONSTRAINT "MatchDocument_matchId_fkey"
  FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;
