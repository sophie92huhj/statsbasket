"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Card } from "@/components/ui/Card";
import { ChartTooltip } from "@/components/charts/ChartTooltip";
import { CHART_AXIS, CHART_COLORS, CHART_GRID } from "@/components/charts/theme";
import { deriveLine } from "@/lib/stats/derive";
import type { PlayerMatchInput } from "@/lib/stats/playerSeasonStats";

function formatShortDate(date: Date): string {
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit" }).format(date);
}

export function PlayerTrendCharts({ lines }: { lines: PlayerMatchInput[] }) {
  const played = lines.filter((l) => !l.dnp);
  if (played.length < 2) return null;

  const data = played.map((line) => {
    const derived = deriveLine(line);
    return {
      match: formatShortDate(line.matchDate),
      points: derived.points,
      rebonds: derived.reboundsTotal,
      passes: line.assists,
      fg2: derived.fg2.pct !== null ? Math.round(derived.fg2.pct * 10) / 10 : null,
      fg3: derived.fg3.pct !== null ? Math.round(derived.fg3.pct * 10) / 10 : null,
      ft: derived.ft.pct !== null ? Math.round(derived.ft.pct * 10) / 10 : null,
    };
  });

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <Card>
        <h2 className="mb-3 text-sm font-semibold">Évolution par match</h2>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid stroke={CHART_GRID} vertical={false} />
            <XAxis dataKey="match" tick={{ fontSize: 12, fill: CHART_AXIS }} tickLine={false} axisLine={{ stroke: CHART_GRID }} />
            <YAxis tick={{ fontSize: 12, fill: CHART_AXIS }} tickLine={false} axisLine={false} width={32} />
            <Tooltip content={ChartTooltip} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line type="monotone" dataKey="points" name="Points" stroke={CHART_COLORS[0]} strokeWidth={2} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="rebonds" name="Rebonds" stroke={CHART_COLORS[1]} strokeWidth={2} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="passes" name="Passes" stroke={CHART_COLORS[2]} strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      <Card>
        <h2 className="mb-3 text-sm font-semibold">Évolution de l&apos;adresse</h2>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid stroke={CHART_GRID} vertical={false} />
            <XAxis dataKey="match" tick={{ fontSize: 12, fill: CHART_AXIS }} tickLine={false} axisLine={{ stroke: CHART_GRID }} />
            <YAxis
              tick={{ fontSize: 12, fill: CHART_AXIS }}
              tickLine={false}
              axisLine={false}
              width={40}
              domain={[0, 100]}
              unit="%"
            />
            <Tooltip content={ChartTooltip} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line type="monotone" dataKey="ft" name="LF%" stroke={CHART_COLORS[0]} strokeWidth={2} dot={{ r: 3 }} connectNulls />
            <Line type="monotone" dataKey="fg2" name="2PT%" stroke={CHART_COLORS[1]} strokeWidth={2} dot={{ r: 3 }} connectNulls />
            <Line type="monotone" dataKey="fg3" name="3PT%" stroke={CHART_COLORS[2]} strokeWidth={2} dot={{ r: 3 }} connectNulls />
          </LineChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}
