"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, TextInput } from "@/components/ui/Form";
import { apiFetch, ApiError } from "@/lib/api/client";
import { deriveLine, formatPct, formatSecondsAsClock, parseMinutesSeconds } from "@/lib/stats";

interface RosterPlayer {
  playerId: string;
  jerseyNumber: number | null;
  firstName: string;
  lastName: string;
}

interface ExistingStat {
  playerId: string;
  dnp: boolean;
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

const EDITABLE_COLUMNS: { field: EditableField; label: string }[] = [
  { field: "fg2Made", label: "2PM" },
  { field: "fg2Att", label: "2PA" },
  { field: "fg3Made", label: "3PM" },
  { field: "fg3Att", label: "3PA" },
  { field: "ftMade", label: "LFM" },
  { field: "ftAtt", label: "LFA" },
  { field: "reboundsOff", label: "RO" },
  { field: "reboundsDef", label: "RD" },
  { field: "assists", label: "PD" },
  { field: "steals", label: "INT" },
  { field: "turnovers", label: "BP" },
  { field: "blocks", label: "CTR" },
  { field: "foulsCommitted", label: "FP" },
  { field: "foulsDrawn", label: "FR" },
];

type RowState = {
  playerId: string;
  dnp: boolean;
  minutesInput: string; // format MM:SS
} & Record<EditableField, string>;

function emptyRow(playerId: string): RowState {
  return {
    playerId,
    dnp: false,
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
    dnp: stat.dnp,
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
  const statsByPlayer = useMemo(() => new Map(existingStats.map((s) => [s.playerId, s])), [existingStats]);

  const [rows, setRows] = useState<RowState[]>(() =>
    roster.map((p) => rowFromExisting(p.playerId, statsByPlayer.get(p.playerId))),
  );
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<Record<string, string[]>>({});
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  function updateField(playerId: string, field: EditableField, value: string) {
    setRows((prev) => prev.map((r) => (r.playerId === playerId ? { ...r, [field]: value } : r)));
  }

  function updateMinutes(playerId: string, value: string) {
    setRows((prev) => prev.map((r) => (r.playerId === playerId ? { ...r, minutesInput: value } : r)));
  }

  function toggleDnp(playerId: string) {
    setRows((prev) => prev.map((r) => (r.playerId === playerId ? { ...r, dnp: !r.dnp } : r)));
  }

  function derivedFor(row: RowState) {
    return deriveLine({
      dnp: row.dnp,
      secondsPlayed: parseMinutesSeconds(row.minutesInput || ""),
      fg2Made: toNullableInt(row.fg2Made),
      fg2Att: toNullableInt(row.fg2Att),
      fg3Made: toNullableInt(row.fg3Made),
      fg3Att: toNullableInt(row.fg3Att),
      ftMade: toNullableInt(row.ftMade),
      ftAtt: toNullableInt(row.ftAtt),
      reboundsOff: toNullableInt(row.reboundsOff),
      reboundsDef: toNullableInt(row.reboundsDef),
      assists: null,
      steals: null,
      turnovers: null,
      blocks: null,
      foulsCommitted: null,
      foulsDrawn: null,
      officialPoints: null,
    });
  }

  async function handleSave(force = false) {
    setError(null);
    setSaving(true);
    try {
      const lines = rows.map((row) => ({
        playerId: row.playerId,
        dnp: row.dnp,
        secondsPlayed: row.dnp ? null : parseMinutesSeconds(row.minutesInput || ""),
        fg2Made: row.dnp ? null : toNullableInt(row.fg2Made),
        fg2Att: row.dnp ? null : toNullableInt(row.fg2Att),
        fg3Made: row.dnp ? null : toNullableInt(row.fg3Made),
        fg3Att: row.dnp ? null : toNullableInt(row.fg3Att),
        ftMade: row.dnp ? null : toNullableInt(row.ftMade),
        ftAtt: row.dnp ? null : toNullableInt(row.ftAtt),
        reboundsOff: row.dnp ? null : toNullableInt(row.reboundsOff),
        reboundsDef: row.dnp ? null : toNullableInt(row.reboundsDef),
        assists: row.dnp ? null : toNullableInt(row.assists),
        steals: row.dnp ? null : toNullableInt(row.steals),
        turnovers: row.dnp ? null : toNullableInt(row.turnovers),
        blocks: row.dnp ? null : toNullableInt(row.blocks),
        foulsCommitted: row.dnp ? null : toNullableInt(row.foulsCommitted),
        foulsDrawn: row.dnp ? null : toNullableInt(row.foulsDrawn),
      }));

      await apiFetch(`/api/matches/${matchId}/player-stats`, {
        method: "PUT",
        body: JSON.stringify({ lines, force }),
      });
      setWarnings({});
      setSavedAt(Date.now());
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError && err.status === 422) {
        const validation = (err.details as { validation?: { playerId: string; issues: { message: string }[] }[] })
          ?.validation;
        const warn: Record<string, string[]> = {};
        for (const v of validation ?? []) {
          if (v.issues.length > 0) warn[v.playerId] = v.issues.map((i) => i.message);
        }
        setWarnings(warn);
        setError("Des avertissements ont été détectés. Vérifiez puis confirmez l'enregistrement.");
      } else if (err instanceof ApiError && err.status === 400) {
        const validation = (err.details as { validation?: { playerId: string; issues: { message: string }[] }[] })
          ?.validation;
        const warn: Record<string, string[]> = {};
        for (const v of validation ?? []) {
          if (v.issues.length > 0) warn[v.playerId] = v.issues.map((i) => i.message);
        }
        setWarnings(warn);
        setError((err.details as { error?: string })?.error ?? err.message);
      } else {
        setError(err instanceof Error ? err.message : "Erreur inconnue");
      }
    } finally {
      setSaving(false);
    }
  }

  const hasWarnings = Object.keys(warnings).length > 0;

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
              <th className="sticky left-0 bg-surface px-3 py-2">Joueuse</th>
              <th className="px-2 py-2">DNP</th>
              <th className="px-2 py-2">MIN</th>
              {EDITABLE_COLUMNS.map((c) => (
                <th key={c.field} className="px-2 py-2 text-center">
                  {c.label}
                </th>
              ))}
              <th className="px-2 py-2 text-center">PTS</th>
              <th className="px-2 py-2 text-center">2PT%</th>
              <th className="px-2 py-2 text-center">3PT%</th>
              <th className="px-2 py-2 text-center">LF%</th>
              <th className="px-2 py-2 text-center">REB</th>
              <th className="px-2 py-2 text-center">eFG%</th>
              <th className="px-2 py-2 text-center">TS%</th>
            </tr>
          </thead>
          <tbody>
            {roster.map((player) => {
              const row = rows.find((r) => r.playerId === player.playerId)!;
              const derived = derivedFor(row);
              const playerWarnings = warnings[player.playerId];

              return (
                <tr key={player.playerId} className="border-b border-border last:border-0 align-middle">
                  <td className="sticky left-0 bg-surface px-3 py-1.5 font-medium whitespace-nowrap">
                    {player.jerseyNumber !== null && (
                      <span className="mr-1 text-muted">#{player.jerseyNumber}</span>
                    )}
                    {player.firstName} {player.lastName}
                    {playerWarnings && (
                      <div className="mt-0.5 text-xs font-normal text-loss">{playerWarnings.join(" · ")}</div>
                    )}
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    <input type="checkbox" checked={row.dnp} onChange={() => toggleDnp(player.playerId)} />
                  </td>
                  <td className="px-2 py-1.5">
                    <TextInput
                      value={row.minutesInput}
                      onChange={(e) => updateMinutes(player.playerId, e.target.value)}
                      placeholder="MM:SS"
                      disabled={row.dnp}
                      className="w-20"
                    />
                  </td>
                  {EDITABLE_COLUMNS.map((c) => (
                    <td key={c.field} className="px-1 py-1.5">
                      <TextInput
                        type="number"
                        min={0}
                        value={row[c.field]}
                        onChange={(e) => updateField(player.playerId, c.field, e.target.value)}
                        disabled={row.dnp}
                        className="w-14 text-center"
                      />
                    </td>
                  ))}
                  <td className="px-2 py-1.5 text-center tabular-nums font-medium">{derived.points ?? "—"}</td>
                  <td className="px-2 py-1.5 text-center tabular-nums text-muted">{formatPct(derived.fg2.pct)}</td>
                  <td className="px-2 py-1.5 text-center tabular-nums text-muted">{formatPct(derived.fg3.pct)}</td>
                  <td className="px-2 py-1.5 text-center tabular-nums text-muted">{formatPct(derived.ft.pct)}</td>
                  <td className="px-2 py-1.5 text-center tabular-nums text-muted">{derived.reboundsTotal ?? "—"}</td>
                  <td className="px-2 py-1.5 text-center tabular-nums text-muted">{formatPct(derived.efgPct)}</td>
                  <td className="px-2 py-1.5 text-center tabular-nums text-muted">{formatPct(derived.tsPct)}</td>
                </tr>
              );
            })}
            {roster.length === 0 && (
              <tr>
                <td colSpan={20} className="px-4 py-6 text-center text-muted">
                  Aucune joueuse dans l&apos;effectif de cette équipe/saison. Rattachez des joueuses depuis leur
                  page.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-3">
        <Button type="button" onClick={() => handleSave(hasWarnings)} disabled={saving}>
          {hasWarnings ? "Confirmer malgré les avertissements" : "Enregistrer les statistiques"}
        </Button>
        {savedAt && !error && <span className="text-xs text-win">Enregistré.</span>}
      </div>
      {error && <p className="text-sm text-loss">{error}</p>}
    </div>
  );
}
