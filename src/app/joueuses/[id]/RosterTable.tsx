"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Form";
import { apiFetch } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/AuthContext";

const POSITION_LABEL: Record<string, string> = {
  POSTE_1: "1",
  POSTE_2: "2",
  POSTE_3: "3",
  POSTE_4: "4",
  POSTE_5: "5",
};

const POSITIONS = [
  { value: "", label: "—" },
  { value: "POSTE_1", label: "1" },
  { value: "POSTE_2", label: "2" },
  { value: "POSTE_3", label: "3" },
  { value: "POSTE_4", label: "4" },
  { value: "POSTE_5", label: "5" },
];

interface RosterEntry {
  id: string;
  playerId: string;
  teamSeasonId: string;
  position: string | null;
  status: string;
  teamSeason: { season: { label: string }; team: { name: string } };
}

export function RosterTable({ entries }: { entries: RosterEntry[] }) {
  const router = useRouter();
  const { isAdmin } = useAuth();
  const [savingId, setSavingId] = useState<string | null>(null);

  async function handlePositionChange(entry: RosterEntry, position: string) {
    setSavingId(entry.id);
    try {
      await apiFetch("/api/roster", {
        method: "POST",
        body: JSON.stringify({
          playerId: entry.playerId,
          teamSeasonId: entry.teamSeasonId,
          position: position || null,
        }),
      });
      router.refresh();
    } finally {
      setSavingId(null);
    }
  }

  return (
    <Card className="p-0">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
            <th className="px-4 py-3">Saison</th>
            <th className="px-4 py-3">Équipe</th>
            <th className="px-4 py-3">Poste</th>
            <th className="px-4 py-3">Statut</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr key={entry.id} className="border-b border-border last:border-0">
              <td className="px-4 py-2">{entry.teamSeason.season.label}</td>
              <td className="px-4 py-2">{entry.teamSeason.team.name}</td>
              <td className="px-4 py-2">
                {isAdmin ? (
                  <Select
                    value={entry.position ?? ""}
                    onChange={(e) => handlePositionChange(entry, e.target.value)}
                    disabled={savingId === entry.id}
                    className="w-20"
                  >
                    {POSITIONS.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </Select>
                ) : entry.position ? (
                  POSITION_LABEL[entry.position]
                ) : (
                  "—"
                )}
              </td>
              <td className="px-4 py-2">
                <Badge>{entry.status}</Badge>
              </td>
            </tr>
          ))}
          {entries.length === 0 && (
            <tr>
              <td colSpan={4} className="px-4 py-6 text-center text-muted">
                Pas encore rattachée à une équipe.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </Card>
  );
}
