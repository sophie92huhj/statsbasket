"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, TextInput } from "@/components/ui/Form";
import { apiFetch, ApiError } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/AuthContext";
import { deriveLine, formatPct, formatSecondsAsClock, parseMinutesSeconds, sum } from "@/lib/stats";

interface RosterPlayer {
  playerId: string;
  firstName: string;
  lastName: string;
}

interface ExistingStat {
  playerId: string;
  jerseyNumber: number | null;
  starter: boolean;
  secondsPlayed: number | null;
  fg2Made: number | null;
  fg2Att: number | null;
  fg3Made: number | null;
  fg3Att: number | null;
  ftMade: number | null;
  ftAtt: number | null;
  reboundsOff: number | null;
  reboundsDef: number | null;
  assists: number | null;
  steals: number | null;
  turnovers: number | null;
  blocks: number | null;
  foulsCommitted: number | null;
  foulsDrawn: number | null;
}

type EditableField =
  | "fg2Made"
  | "fg2Att"
  | "fg3Made"
  | "fg3Att"
  | "ftMade"
  | "ftAtt"
  | "reboundsOff"
  | "reboundsDef"
  | "assists"
  | "steals"
  | "turnovers"
  | "blocks"
  | "foulsCommitted"
  | "foulsDrawn";

const EDITABLE_COLUMNS: { field: EditableField; label: string; group: string }[] = [
  { field: "fg2Made", label: "2PM", group: "2 points" },
  { field: "fg2Att", label: "2PA", group: "2 points" },
  { field: "fg3Made", label: "3PM", group: "3 points" },
  { field: "fg3Att", label: "3PA", group: "3 points" },
  { field: "ftMade", label: "LFM", group: "Lancers francs" },
  { field: "ftAtt", label: "LFA", group: "Lancers francs" },
  { field: "reboundsOff", label: "RO", group: "Rebonds" },
  { field: "reboundsDef", label: "RD", group: "Rebonds" },
  { field: "assists", label: "PD", group: "Autres" },
  { field: "steals", label: "INT", group: "Autres" },
  { field: "blocks", label: "CTR", group: "Autres" },
  { field: "turnovers", label: "BP", group: "Autres" },
  { field: "foulsCommitted", label: "F", group: "Autres" },
  { field: "foulsDrawn", label: "FP", group: "Autres" },
];

type RowState = {
  playerId: string;
  jerseyNumberInput: string;
  starter: boolean;
  minutesInput: string; // format MM:SS
} & Record<EditableField, string>;

function emptyRow(playerId: string): RowState {
  return {
    playerId,
    jerseyNumberInput: "",
    starter: false,
    minutesInput: "",
    fg2Made: "",
    fg2Att: "",
    fg3Made: "",
    fg3Att: "",
    ftMade: "",
    ftAtt: "",
    reboundsOff: "",
    reboundsDef: "",
    assists: "",
    steals: "",
    turnovers: "",
    blocks: "",
    foulsCommitted: "",
    foulsDrawn: "",
  };
}

function rowFromExisting(playerId: string, stat: ExistingStat | undefined): RowState {
  if (!stat) return emptyRow(playerId);
  const toStr = (v: number | null) => (v === null ? "" : String(v));
  return {
    playerId,
    jerseyNumberInput: stat.jerseyNumber !== null ? String(stat.jerseyNumber) : "",
    starter: stat.starter,
    minutesInput: stat.secondsPlayed !== null ? formatSecondsAsClock(stat.secondsPlayed) : "",
    fg2Made: toStr(stat.fg2Made),
    fg2Att: toStr(stat.fg2Att),
    fg3Made: toStr(stat.fg3Made),
    fg3Att: toStr(stat.fg3Att),
    ftMade: toStr(stat.ftMade),
    ftAtt: toStr(stat.ftAtt),
    reboundsOff: toStr(stat.reboundsOff),
    reboundsDef: toStr(stat.reboundsDef),
    assists: toStr(stat.assists),
    steals: toStr(stat.steals),
    turnovers: toStr(stat.turnovers),
    blocks: toStr(stat.blocks),
    foulsCommitted: toStr(stat.foulsCommitted),
    foulsDrawn: toStr(stat.foulsDrawn),
  };
}

function toNullableInt(value: string): number | null {
  if (value.trim() === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

function sortByJerseyThenName<T extends { playerId: string; lastName: string }>(
  players: T[],
  rows: RowState[],
): T[] {
  const rowByPlayer = new Map(rows.map((r) => [r.playerId, r]));
  return [...players].sort((a, b) => {
    const numA = rowByPlayer.get(a.playerId)?.jerseyNumberInput;
    const numB = rowByPlayer.get(b.playerId)?.jerseyNumberInput;
    const parsedA = numA ? Number(numA) : null;
    const parsedB = numB ? Number(numB) : null;
    if (parsedA !== null && parsedB !== null) return parsedA - parsedB;
    if (parsedA !== null) return -1;
    if (parsedB !== null) return 1;
    return a.lastName.localeCompare(b.lastName);
  });
}

export function StatsGrid({
  matchId,
  roster,
  existingStats,
}: {
  matchId: string;
  roster: RosterPlayer[];
  existingStats: ExistingStat[];
}) {
  const router = useRouter();
  const { isAdmin } = useAuth();
  const statsByPlayer = useMemo(() => new Map(existingStats.map((s) => [s.playerId, s])), [existingStats]);
  const calledUpPlayerIds = useMemo(() => new Set(existingStats.map((s) => s.playerId)), [existingStats]);

  // Étape 1 : qui participe à ce match (feuille de match).
  const [editingRoster, setEditingRoster] = useState(false);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<Set<string>>(calledUpPlayerIds);
  const [savingRoster, setSavingRoster] = useState(false);
  const [rosterError, setRosterError] = useState<string | null>(null);

  // Étape 2 : saisie des statistiques (uniquement pour les joueuses convoquées).
  const calledUpPlayers = useMemo(
    () => roster.filter((p) => calledUpPlayerIds.has(p.playerId)),
    [roster, calledUpPlayerIds],
  );

  const initialRows = useMemo(
    () => calledUpPlayers.map((p) => rowFromExisting(p.playerId, statsByPlayer.get(p.playerId))),
    [calledUpPlayers, statsByPlayer],
  );

  const [isEditingStats, setIsEditingStats] = useState(false);
  const [rows, setRows] = useState<RowState[]>(initialRows);

  // Resynchronise les lignes quand la feuille de match change côté serveur
  // (ajout/retrait de joueuses), sauf pendant une saisie en cours.
  useEffect(() => {
    if (!isEditingStats) setRows(initialRows);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialRows]);

  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<Record<string, string[]>>({});
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const sortedCalledUpPlayers = useMemo(() => sortByJerseyThenName(calledUpPlayers, rows), [calledUpPlayers, rows]);

  function togglePlayerSelected(playerId: string) {
    setSelectedPlayerIds((prev) => {
      const next = new Set(prev);
      if (next.has(playerId)) next.delete(playerId);
      else next.add(playerId);
      return next;
    });
  }

  async function handleSaveRoster() {
    setRosterError(null);
    setSavingRoster(true);
    try {
      // Les stats des joueuses retirées de la feuille de match sont supprimées ;
      // les joueuses ajoutées obtiennent une ligne vide prête à être remplie.
      const removedPlayerIds = [...calledUpPlayerIds].filter((id) => !selectedPlayerIds.has(id));
      await apiFetch(`/api/matches/${matchId}/player-stats`, {
        method: "PUT",
        body: JSON.stringify({
          lines: [...selectedPlayerIds].map((playerId) => {
            const existing = statsByPlayer.get(playerId);
            return existing
              ? { playerId, jerseyNumber: existing.jerseyNumber, starter: existing.starter }
              : { playerId, jerseyNumber: null, starter: false };
          }),
          removePlayerIds: removedPlayerIds,
        }),
      });
      setEditingRoster(false);
      router.refresh();
    } catch (err) {
      setRosterError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setSavingRoster(false);
    }
  }

  function updateField(playerId: string, field: EditableField, value: string) {
    setRows((prev) => prev.map((r) => (r.playerId === playerId ? { ...r, [field]: value } : r)));
  }

  function updateMinutes(playerId: string, value: string) {
    setRows((prev) => prev.map((r) => (r.playerId === playerId ? { ...r, minutesInput: value } : r)));
  }

  function updateJerseyNumber(playerId: string, value: string) {
    setRows((prev) => prev.map((r) => (r.playerId === playerId ? { ...r, jerseyNumberInput: value } : r)));
  }

  function toggleStarter(playerId: string) {
    setRows((prev) => prev.map((r) => (r.playerId === playerId ? { ...r, starter: !r.starter } : r)));
  }

  function computeTotals(playerRows: RowState[]) {
    const totalSeconds = sum(playerRows.map((r) => parseMinutesSeconds(r.minutesInput || "")));
    const assists = sum(playerRows.map((r) => toNullableInt(r.assists)));
    const steals = sum(playerRows.map((r) => toNullableInt(r.steals)));
    const turnovers = sum(playerRows.map((r) => toNullableInt(r.turnovers)));
    const blocks = sum(playerRows.map((r) => toNullableInt(r.blocks)));
    const foulsCommitted = sum(playerRows.map((r) => toNullableInt(r.foulsCommitted)));
    const foulsDrawn = sum(playerRows.map((r) => toNullableInt(r.foulsDrawn)));
    const derived = deriveLine({
      dnp: false,
      secondsPlayed: null,
      fg2Made: sum(playerRows.map((r) => toNullableInt(r.fg2Made))),
      fg2Att: sum(playerRows.map((r) => toNullableInt(r.fg2Att))),
      fg3Made: sum(playerRows.map((r) => toNullableInt(r.fg3Made))),
      fg3Att: sum(playerRows.map((r) => toNullableInt(r.fg3Att))),
      ftMade: sum(playerRows.map((r) => toNullableInt(r.ftMade))),
      ftAtt: sum(playerRows.map((r) => toNullableInt(r.ftAtt))),
      reboundsOff: sum(playerRows.map((r) => toNullableInt(r.reboundsOff))),
      reboundsDef: sum(playerRows.map((r) => toNullableInt(r.reboundsDef))),
      assists,
      steals,
      turnovers,
      blocks,
      foulsCommitted: null,
      foulsDrawn: null,
      officialPoints: null,
    });
    return {
      totalSeconds,
      derived,
      assists,
      steals,
      turnovers,
      blocks,
      foulsCommitted,
      foulsDrawn,
    };
  }

  function derivedFor(row: RowState) {
    return deriveLine({
      dnp: false,
      secondsPlayed: parseMinutesSeconds(row.minutesInput || ""),
      fg2Made: toNullableInt(row.fg2Made),
      fg2Att: toNullableInt(row.fg2Att),
      fg3Made: toNullableInt(row.fg3Made),
      fg3Att: toNullableInt(row.fg3Att),
      ftMade: toNullableInt(row.ftMade),
      ftAtt: toNullableInt(row.ftAtt),
      reboundsOff: toNullableInt(row.reboundsOff),
      reboundsDef: toNullableInt(row.reboundsDef),
      assists: toNullableInt(row.assists),
      steals: toNullableInt(row.steals),
      turnovers: toNullableInt(row.turnovers),
      blocks: toNullableInt(row.blocks),
      foulsCommitted: null,
      foulsDrawn: null,
      officialPoints: null,
    });
  }

  function handleStartEditingStats() {
    if (!isAdmin) return;
    setRows(initialRows);
    setError(null);
    setWarnings({});
    setIsEditingStats(true);
  }

  function handleCancel() {
    setRows(initialRows);
    setError(null);
    setWarnings({});
    setIsEditingStats(false);
  }

  async function handleSave(force = false) {
    setError(null);
    setSaving(true);
    try {
      const lines = rows.map((row) => ({
        playerId: row.playerId,
        jerseyNumber: toNullableInt(row.jerseyNumberInput),
        starter: row.starter,
        secondsPlayed: parseMinutesSeconds(row.minutesInput || ""),
        fg2Made: toNullableInt(row.fg2Made),
        fg2Att: toNullableInt(row.fg2Att),
        fg3Made: toNullableInt(row.fg3Made),
        fg3Att: toNullableInt(row.fg3Att),
        ftMade: toNullableInt(row.ftMade),
        ftAtt: toNullableInt(row.ftAtt),
        reboundsOff: toNullableInt(row.reboundsOff),
        reboundsDef: toNullableInt(row.reboundsDef),
        assists: toNullableInt(row.assists),
        steals: toNullableInt(row.steals),
        turnovers: toNullableInt(row.turnovers),
        blocks: toNullableInt(row.blocks),
        foulsCommitted: toNullableInt(row.foulsCommitted),
        foulsDrawn: toNullableInt(row.foulsDrawn),
      }));

      await apiFetch(`/api/matches/${matchId}/player-stats`, {
        method: "PUT",
        body: JSON.stringify({ lines, force }),
      });
      setWarnings({});
      setSavedAt(Date.now());
      setIsEditingStats(false);
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError && (err.status === 422 || err.status === 400)) {
        const validation = (err.details as { validation?: { playerId: string; issues: { message: string }[] }[] })
          ?.validation;
        const warn: Record<string, string[]> = {};
        for (const v of validation ?? []) {
          if (v.issues.length > 0) warn[v.playerId] = v.issues.map((i) => i.message);
        }
        setWarnings(warn);
        setError(
          err.status === 422
            ? "Des avertissements ont été détectés. Vérifiez puis confirmez l'enregistrement."
            : ((err.details as { error?: string })?.error ?? err.message),
        );
      } else {
        setError(err instanceof Error ? err.message : "Erreur inconnue");
      }
    } finally {
      setSaving(false);
    }
  }

  const hasWarnings = Object.keys(warnings).length > 0;

  // ---------------------------------------------------------------------------
  // Feuille de match : qui participe.
  // ---------------------------------------------------------------------------

  const rosterPanel = editingRoster ? (
    <div className="rounded-xl border border-border bg-surface p-4">
      <h3 className="mb-3 text-sm font-semibold">Feuille de match : qui participe ?</h3>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {roster.map((player) => (
          <label key={player.playerId} className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm">
            <input
              type="checkbox"
              checked={selectedPlayerIds.has(player.playerId)}
              onChange={() => togglePlayerSelected(player.playerId)}
              className="h-5 w-5"
            />
            {player.firstName} {player.lastName}
          </label>
        ))}
        {roster.length === 0 && (
          <p className="col-span-full text-sm text-muted">
            Aucune joueuse dans l&apos;effectif de cette équipe/saison. Rattachez des joueuses depuis leur page.
          </p>
        )}
      </div>
      <div className="mt-4 flex items-center gap-3">
        <Button type="button" onClick={handleSaveRoster} disabled={savingRoster}>
          Valider la feuille de match
        </Button>
        <Button type="button" variant="secondary" onClick={() => setEditingRoster(false)} disabled={savingRoster}>
          Annuler
        </Button>
      </div>
      {rosterError && <p className="mt-2 text-sm text-loss">{rosterError}</p>}
    </div>
  ) : (
    <div className="flex items-center justify-between">
      <p className="text-sm text-muted">
        {calledUpPlayerIds.size > 0
          ? `${calledUpPlayerIds.size} joueuse${calledUpPlayerIds.size > 1 ? "s" : ""} sur la feuille de match.`
          : "Aucune joueuse sélectionnée pour ce match."}
      </p>
      {isAdmin && (
        <Button type="button" variant="secondary" onClick={() => setEditingRoster(true)}>
          {calledUpPlayerIds.size > 0 ? "Modifier la feuille de match" : "Établir la feuille de match"}
        </Button>
      )}
    </div>
  );

  if (calledUpPlayerIds.size === 0 && !editingRoster) {
    return <div className="flex flex-col gap-3">{rosterPanel}</div>;
  }

  // ---------------------------------------------------------------------------
  // Saisie des statistiques (uniquement pour les joueuses de la feuille de match).
  // ---------------------------------------------------------------------------

  if (!isEditingStats) {
    return (
      <div className="flex flex-col gap-3">
        {rosterPanel}

        {isAdmin && !editingRoster && (
          <div className="flex justify-end">
            <Button type="button" onClick={handleStartEditingStats}>
              {existingStats.length > 0 ? "Modifier les statistiques" : "Saisir les statistiques"}
            </Button>
          </div>
        )}
        {savedAt && !error && <p className="text-sm text-win">Statistiques enregistrées.</p>}

        <div className="overflow-x-auto rounded-xl border border-border bg-surface">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs font-semibold uppercase tracking-wide text-muted">
                <th className="sticky left-0 z-10 bg-surface px-3 py-3">Joueuse</th>
                <th className="px-3 py-3 text-center">5 de départ</th>
                <th className="px-3 py-3 text-center">MIN</th>
                <th className="px-3 py-3 text-center">PTS</th>
                <th className="px-3 py-3 text-center">2PT</th>
                <th className="px-3 py-3 text-center">3PT</th>
                <th className="px-3 py-3 text-center">LF</th>
                <th className="px-3 py-3 text-center">RO</th>
                <th className="px-3 py-3 text-center">RD</th>
                <th className="px-3 py-3 text-center">PD</th>
                <th className="px-3 py-3 text-center">INT</th>
                <th className="px-3 py-3 text-center">CTR</th>
                <th className="px-3 py-3 text-center">BP</th>
                <th className="px-3 py-3 text-center">F</th>
                <th className="px-3 py-3 text-center">FP</th>
                <th className="px-3 py-3 text-center">ÉVAL</th>
              </tr>
            </thead>
            <tbody>
              {sortedCalledUpPlayers.map((player) => {
                const row = rows.find((r) => r.playerId === player.playerId);
                if (!row) return null;
                const derived = derivedFor(row);
                return (
                  <tr key={player.playerId} className="border-b border-border last:border-0">
                    <td className="sticky left-0 z-10 bg-surface px-3 py-2.5 text-base font-medium whitespace-nowrap">
                      <Link href={`/joueuses/${player.playerId}`} className="flex items-center gap-2 hover:underline">
                        <span className="tabular-nums text-muted">{row.jerseyNumberInput || "—"}</span>
                        <span>{player.firstName}</span>
                      </Link>
                    </td>
                    <td className="px-3 py-2.5 text-center">{row.starter ? "✓" : ""}</td>
                    <td className="px-3 py-2.5 text-center tabular-nums">
                      {formatSecondsAsClock(parseMinutesSeconds(row.minutesInput || ""))}
                    </td>
                    <td className="px-3 py-2.5 text-center text-base font-semibold tabular-nums">
                      {derived.points ?? "—"}
                    </td>
                    <td className="px-3 py-2.5 text-center tabular-nums text-muted">
                      {derived.fg2.made ?? "—"}/{derived.fg2.attempted ?? "—"}
                    </td>
                    <td className="px-3 py-2.5 text-center tabular-nums text-muted">
                      {derived.fg3.made ?? "—"}/{derived.fg3.attempted ?? "—"}
                    </td>
                    <td className="px-3 py-2.5 text-center tabular-nums text-muted">
                      {derived.ft.made ?? "—"}/{derived.ft.attempted ?? "—"}
                    </td>
                    <td className="px-3 py-2.5 text-center tabular-nums text-muted">{derived.reboundsOff ?? "—"}</td>
                    <td className="px-3 py-2.5 text-center tabular-nums text-muted">{derived.reboundsDef ?? "—"}</td>
                    <td className="px-3 py-2.5 text-center tabular-nums text-muted">{row.assists || "—"}</td>
                    <td className="px-3 py-2.5 text-center tabular-nums text-muted">{row.steals || "—"}</td>
                    <td className="px-3 py-2.5 text-center tabular-nums text-muted">{row.blocks || "—"}</td>
                    <td className="px-3 py-2.5 text-center tabular-nums text-muted">{row.turnovers || "—"}</td>
                    <td className="px-3 py-2.5 text-center tabular-nums text-muted">{row.foulsCommitted || "—"}</td>
                    <td className="px-3 py-2.5 text-center tabular-nums text-muted">{row.foulsDrawn || "—"}</td>
                    <td className="px-3 py-2.5 text-center text-base font-semibold tabular-nums text-loss">
                      {derived.evaluation ?? "—"}
                    </td>
                  </tr>
                );
              })}
              {(() => {
                const playerRows = sortedCalledUpPlayers
                  .map((p) => rows.find((r) => r.playerId === p.playerId))
                  .filter((r): r is RowState => r !== undefined);
                if (playerRows.length === 0) return null;
                const totals = computeTotals(playerRows);
                return (
                  <tr className="border-t-2 border-border bg-background font-semibold">
                    <td className="sticky left-0 z-10 bg-background px-3 py-2.5 whitespace-nowrap">Total équipe</td>
                    <td className="px-3 py-2.5 text-center">—</td>
                    <td className="px-3 py-2.5 text-center tabular-nums">
                      {formatSecondsAsClock(totals.totalSeconds)}
                    </td>
                    <td className="px-3 py-2.5 text-center text-base tabular-nums">
                      {totals.derived.points ?? "—"}
                    </td>
                    <td className="px-3 py-2.5 text-center tabular-nums">
                      {totals.derived.fg2.made ?? "—"}/{totals.derived.fg2.attempted ?? "—"}
                    </td>
                    <td className="px-3 py-2.5 text-center tabular-nums">
                      {totals.derived.fg3.made ?? "—"}/{totals.derived.fg3.attempted ?? "—"}
                    </td>
                    <td className="px-3 py-2.5 text-center tabular-nums">
                      {totals.derived.ft.made ?? "—"}/{totals.derived.ft.attempted ?? "—"}
                    </td>
                    <td className="px-3 py-2.5 text-center tabular-nums">{totals.derived.reboundsOff ?? "—"}</td>
                    <td className="px-3 py-2.5 text-center tabular-nums">{totals.derived.reboundsDef ?? "—"}</td>
                    <td className="px-3 py-2.5 text-center tabular-nums">{totals.assists ?? "—"}</td>
                    <td className="px-3 py-2.5 text-center tabular-nums">{totals.steals ?? "—"}</td>
                    <td className="px-3 py-2.5 text-center tabular-nums">{totals.blocks ?? "—"}</td>
                    <td className="px-3 py-2.5 text-center tabular-nums">{totals.turnovers ?? "—"}</td>
                    <td className="px-3 py-2.5 text-center tabular-nums">{totals.foulsCommitted ?? "—"}</td>
                    <td className="px-3 py-2.5 text-center tabular-nums">{totals.foulsDrawn ?? "—"}</td>
                    <td className="px-3 py-2.5 text-center tabular-nums text-loss">
                      {totals.derived.evaluation ?? "—"}
                    </td>
                  </tr>
                );
              })()}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {rosterPanel}

      <div className="flex flex-col gap-3 rounded-lg bg-accent/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-medium">Mode édition : remplissez les statistiques puis enregistrez.</p>
        <div className="flex items-center gap-2">
          <Button type="button" variant="secondary" onClick={handleCancel} disabled={saving} className="flex-1 sm:flex-none">
            Annuler
          </Button>
          <Button type="button" onClick={() => handleSave(hasWarnings)} disabled={saving} className="flex-1 sm:flex-none">
            {hasWarnings ? "Confirmer malgré les avertissements" : "Enregistrer les statistiques"}
          </Button>
        </div>
      </div>
      {error && <p className="text-sm text-loss">{error}</p>}

      <div className="flex flex-col gap-6">
        {calledUpPlayers.map((player) => {
          const row = rows.find((r) => r.playerId === player.playerId);
          if (!row) return null;
          const derived = derivedFor(row);
          const playerWarnings = warnings[player.playerId];

          return (
            <div key={player.playerId} className="rounded-xl border border-border bg-surface p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="text-lg font-semibold">
                    {row.jerseyNumberInput && <span className="text-muted">#{row.jerseyNumberInput} </span>}
                    {player.firstName} {player.lastName}
                  </span>
                  {playerWarnings && <div className="mt-0.5 text-sm text-loss">{playerWarnings.join(" · ")}</div>}
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={row.starter}
                    onChange={() => toggleStarter(player.playerId)}
                    className="h-5 w-5"
                  />
                  5 de départ
                </label>
              </div>

              <div className="grid grid-cols-4 gap-3 sm:flex sm:flex-wrap sm:items-end sm:gap-4">
                <div>
                  <span className="mb-1 block text-xs font-medium text-muted">N° maillot</span>
                  <TextInput
                    type="number"
                    min={0}
                    max={99}
                    value={row.jerseyNumberInput}
                    onChange={(e) => updateJerseyNumber(player.playerId, e.target.value)}
                    className="h-14 w-full text-center text-xl sm:w-16"
                  />
                </div>
                <div>
                  <span className="mb-1 block text-xs font-medium text-muted">Temps (MM:SS)</span>
                  <TextInput
                    value={row.minutesInput}
                    onChange={(e) => updateMinutes(player.playerId, e.target.value)}
                    placeholder="28:32"
                    className="h-14 w-full text-center text-xl sm:w-28"
                  />
                </div>

                {EDITABLE_COLUMNS.map((c, i) => {
                  const isNewGroup = i === 0 || EDITABLE_COLUMNS[i - 1].group !== c.group;
                  return (
                    <div key={c.field} className={isNewGroup ? "sm:border-l sm:border-border sm:pl-4" : ""}>
                      <span className="mb-1 block text-xs font-medium text-muted">{c.label}</span>
                      <TextInput
                        type="number"
                        min={0}
                        value={row[c.field]}
                        onChange={(e) => updateField(player.playerId, c.field, e.target.value)}
                        className="h-14 w-full text-center text-xl sm:w-16"
                      />
                    </div>
                  );
                })}
              </div>

              <div className="mt-3 flex flex-wrap gap-4 border-t border-border pt-3 text-sm text-muted">
                <span>
                  <strong className="text-foreground">{derived.points ?? "—"}</strong> pts
                </span>
                <span>2PT {formatPct(derived.fg2.pct)}</span>
                <span>3PT {formatPct(derived.fg3.pct)}</span>
                <span>LF {formatPct(derived.ft.pct)}</span>
                <span>REB {derived.reboundsTotal ?? "—"}</span>
                <span className="text-loss font-semibold">ÉVAL {derived.evaluation ?? "—"}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-3">
        <Button type="button" variant="secondary" onClick={handleCancel} disabled={saving}>
          Annuler
        </Button>
        <Button type="button" onClick={() => handleSave(hasWarnings)} disabled={saving}>
          {hasWarnings ? "Confirmer malgré les avertissements" : "Enregistrer les statistiques"}
        </Button>
      </div>
    </div>
  );
}
