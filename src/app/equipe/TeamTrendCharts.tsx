"use client";

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import { Card } from "@/components/ui/Card";
import { ChartTooltip } from "@/components/charts/ChartTooltip";
import { CHART_AXIS, CHART_COLORS, CHART_GRID } from "@/components/charts/theme";
import { deriveLine } from "@/lib/stats/derive";
import { sum } from "@/lib/stats/aggregate";
import type { TeamMatchAggregateInput } from "@/lib/stats/teamSeasonStats";
import type { PlayerSeasonPoints } from "@/lib/repositories/teamAnalytics";

function formatShortDate(date: Date): string {
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit" }).format(date);
}

export function TeamTrendCharts({
  matches,
  playerPoints,
}: {
  matches: TeamMatchAggregateInput[];
  playerPoints: PlayerSeasonPoints[];
}) {
  const trendData = matches.map((m) => {
    const played = m.playerLines.filter((l) => !l.dnp);
    const derived = deriveLine({
      fg2Made: sum(played.map((l) => l.fg2Made)),
      fg2Att: sum(played.map((l) => l.fg2Att)),
      fg3Made: sum(played.map((l) => l.fg3Made)),
      fg3Att: sum(played.map((l) => l.fg3Att)),
      ftMade: sum(played.map((l) => l.ftMade)),
      ftAtt: sum(played.map((l) => l.ftAtt)),
      reboundsOff: null,
      reboundsDef: null,
      assists: null,
      steals: null,
      turnovers: null,
      blocks: null,
      foulsCommitted: null,
      foulsDrawn: null,
    });
    return {
      match: formatShortDate(m.matchDate),
      diff: m.ownScore !== null && m.opponentScore !== null ? m.ownScore - m.opponentScore : null,
      fg2: derived.fg2.pct !== null ? Math.round(derived.fg2.pct * 10) / 10 : null,
      fg3: derived.fg3.pct !== null ? Math.round(derived.fg3.pct * 10) / 10 : null,
      ft: derived.ft.pct !== null ? Math.round(derived.ft.pct * 10) / 10 : null,
    };
  });

  const barData = playerPoints.slice(0, 12).map((p) => ({
    joueuse: p.firstName,
    points: p.totalPoints,
  }));

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {trendData.length >= 2 && (
        <>
          <Card>
            <h2 className="mb-3 text-sm font-semibold">Évolution du différentiel</h2>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={trendData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid stroke={CHART_GRID} vertical={false} />
                <XAxis dataKey="match" tick={{ fontSize: 12, fill: CHART_AXIS }} tickLine={false} axisLine={{ stroke: CHART_GRID }} />
                <YAxis tick={{ fontSize: 12, fill: CHART_AXIS }} tickLine={false} axisLine={false} width={32} />
                <ReferenceLine y={0} stroke={CHART_AXIS} />
                <Tooltip content={ChartTooltip} />
                <Line type="monotone" dataKey="diff" name="Différentiel" stroke={CHART_COLORS[0]} strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          <Card>
            <h2 className="mb-3 text-sm font-semibold">Évolution de l&apos;adresse</h2>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={trendData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
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
        </>
      )}

      {barData.length > 0 && (
        <Card className="lg:col-span-2">
          <h2 className="mb-3 text-sm font-semibold">Points par joueuse (saison)</h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={barData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid stroke={CHART_GRID} vertical={false} />
              <XAxis dataKey="joueuse" tick={{ fontSize: 11, fill: CHART_AXIS }} tickLine={false} axisLine={{ stroke: CHART_GRID }} />
              <YAxis tick={{ fontSize: 12, fill: CHART_AXIS }} tickLine={false} axisLine={false} width={32} />
              <Tooltip content={ChartTooltip} cursor={{ fill: "var(--background)" }} />
              <Bar dataKey="points" name="Points" fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}
    </div>
  );
}
