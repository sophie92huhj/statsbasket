"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

interface RosterEntry {
  id: string;
  playerId: string;
  teamSeasonId: string;
  status: string;
  teamSeason: { season: { label: string }; team: { name: string } };
}

export function RosterTable({ entries }: { entries: RosterEntry[] }) {
  return (
    <Card className="p-0">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
            <th className="px-4 py-3">Saison</th>
            <th className="px-4 py-3">Équipe</th>
            <th className="px-4 py-3">Statut</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr key={entry.id} className="border-b border-border last:border-0">
              <td className="px-4 py-2">{entry.teamSeason.season.label}</td>
              <td className="px-4 py-2">{entry.teamSeason.team.name}</td>
              <td className="px-4 py-2">
                <Badge>{entry.status}</Badge>
              </td>
            </tr>
          ))}
          {entries.length === 0 && (
            <tr>
              <td colSpan={3} className="px-4 py-6 text-center text-muted">
                Pas encore rattachée à une équipe.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </Card>
  );
}
