# StatsBasket

Application web d'analyse statistique de matchs de basket (saisie, stockage, calculs, visualisation) pour suivre une équipe et ses joueuses sur une saison.

## Stack

- Next.js (App Router) + TypeScript + Tailwind CSS
- Prisma + PostgreSQL (local via Docker en dev, Neon en production)
- Déploiement : Vercel (front + API routes) + Neon (DB), CI via push GitHub
- Recharts pour les graphiques
- Vitest pour les tests

## Principes d'architecture (ne pas dévier)

1. **Aucune statistique dérivée n'est stockée en base.** Seules les statistiques brutes
   (tirs tentés/réussis, rebonds off/def, passes, interceptions, balles perdues, contres,
   fautes, minutes) sont persistées. Points, %, eFG%, TS%, ratios /40min, etc. sont
   TOUJOURS calculés à la demande.
2. **Moteur de calcul centralisé** dans `src/lib/stats/`. Toute formule (FG%, eFG%, TS%,
   points, agrégats, ratios /40min...) est définie une seule fois et réutilisée partout
   (pages match/joueuse/équipe/dashboard/exports/comparaisons). Ne jamais dupliquer une
   formule ailleurs dans le code.
3. **Distinction `null` vs `0`** : `null` = donnée non renseignée, `0` = statistique
   connue et nulle. Les agrégats (moyennes, %) doivent ignorer les `null`, jamais les
   traiter comme des zéros.
4. **Pas de statistiques avancées inventées.** Si les données nécessaires à une métrique
   (possessions, ratings, usage rate...) ne sont pas disponibles, afficher clairement
   "Données insuffisantes pour calculer cette statistique." plutôt que d'approximer.
5. **Identifiants stables** : une joueuse/équipe/match/saison a un id unique qui ne
   change jamais. Les rattachements (joueuse ↔ équipe ↔ saison) passent par des tables
   de liaison (`PlayerTeamSeason`, `TeamSeason`) pour permettre transferts et changements
   de numéro sans dupliquer l'entité.
6. **Percentages non calculables** (0 tentative) doivent afficher `—` ou `N/A`, jamais `0%`.
7. **Temps de jeu** stocké en secondes (Int), jamais en minutes décimales, pour éviter les
   erreurs d'arrondi. Affichage toujours reformaté en `MM:SS`.

## Développement progressif (phases)

Suivre l'ordre du cahier des charges : Phase 1 (base : équipes/saisons/joueuses/matchs/saisie)
→ Phase 2 (calculs de base) → Phase 3 (pages d'analyse) → Phase 4 (dashboard/graphiques)
→ Phase 5 (import/export) → Phase 6 (stats avancées type eFG%/TS%/Four Factors).
Ne pas anticiper les phases suivantes avec du code mort ou des abstractions prématurées.

## Commandes utiles

- `npm run dev` — serveur de dev
- `npx prisma migrate dev` — appliquer les migrations en local
- `npx prisma studio` — explorer la base
- `npm run test` — tests (moteur de calcul en priorité)

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
