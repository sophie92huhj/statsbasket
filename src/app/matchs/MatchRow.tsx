"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { OutcomeBadge } from "@/components/ui/Badge";
import { formatNumber } from "@/lib/stats/format";
import type { MatchOutcome } from "@/lib/repositories/match";

export function MatchRow({
  matchId,
  date,
  opponentName,
  location,
  homeScore,
  awayScore,
  diff,
  outcome,
  zebra,
}: {
  matchId: string;
  date: string;
  opponentName: string;
  location: string;
  homeScore: number | null;
  awayScore: number | null;
  diff: number | null;
  outcome: MatchOutcome;
  zebra: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(() => {
      router.push(`/matchs/${matchId}`);
    });
  }

  return (
    <tr
      onClick={handleClick}
      className={`cursor-pointer border-b border-border transition-colors last:border-0 hover:bg-accent-soft/40 active:bg-accent-soft/60 ${
        zebra ? "bg-background/40" : ""
      } ${isPending ? "bg-accent-soft/60 opacity-60" : ""}`}
    >
      <td className="px-4 py-2.5">
        <span className="font-medium underline-offset-2 group-hover:underline">{date}</span>
      </td>
      <td className="px-4 py-2.5">{opponentName}</td>
      <td className="px-4 py-2.5 text-muted">{location}</td>
      <td className="px-4 py-2.5 font-display text-base font-semibold tabular-nums">
        {homeScore ?? "—"} – {awayScore ?? "—"}
      </td>
      <td className="px-4 py-2.5 tabular-nums">{diff !== null ? (diff > 0 ? `+${diff}` : formatNumber(diff)) : "—"}</td>
      <td className="px-4 py-2.5">
        <div className="flex items-center gap-2">
          <OutcomeBadge outcome={outcome} />
          {isPending && (
            <svg className="h-3.5 w-3.5 animate-spin text-muted" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
          )}
        </div>
      </td>
    </tr>
  );
}
