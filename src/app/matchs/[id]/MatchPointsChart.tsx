"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Card } from "@/components/ui/Card";
import { ChartTooltip } from "@/components/charts/ChartTooltip";
import { CHART_AXIS, CHART_COLORS, CHART_GRID } from "@/components/charts/theme";
import { deriveLine } from "@/lib/stats/derive";
import type { RawPlayerStatLine } from "@/lib/stats/types";

interface PlayerStatLine extends RawPlayerStatLine {
  playerId: string;
  firstName: string;
  lastName: string;
}

export function MatchPointsChart({ playerStats }: { playerStats: PlayerStatLine[] }) {
  const data = playerStats
    .map((s) => ({
      joueuse: s.firstName,
      points: deriveLine(s).points,
    }))
    .filter((d) => d.points !== null)
    .sort((a, b) => (b.points ?? 0) - (a.points ?? 0));

  if (data.length === 0) return null;

  return (
    <Card>
      <h2 className="mb-3 text-sm font-semibold">Répartition des points</h2>
      <ResponsiveContainer width="100%" height={Math.max(200, data.length * 36)}>
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 24, left: 8, bottom: 0 }}>
          <CartesianGrid stroke={CHART_GRID} horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 12, fill: CHART_AXIS }} tickLine={false} axisLine={false} />
          <YAxis
            type="category"
            dataKey="joueuse"
            tick={{ fontSize: 12, fill: CHART_AXIS }}
            tickLine={false}
            axisLine={{ stroke: CHART_GRID }}
            width={90}
          />
          <Tooltip content={ChartTooltip} cursor={{ fill: "var(--background)" }} />
          <Bar dataKey="points" name="Points" fill={CHART_COLORS[0]} radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}
