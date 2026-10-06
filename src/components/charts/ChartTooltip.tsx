import type { TooltipContentProps } from "recharts";
import type { NameType, ValueType } from "recharts/types/component/DefaultTooltipContent";

export function ChartTooltip({ active, payload, label }: TooltipContentProps<ValueType, NameType>) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="rounded-md border border-border bg-surface px-3 py-2 text-sm shadow-md">
      {label !== undefined && <div className="mb-1 text-xs text-muted">{label}</div>}
      <div className="flex flex-col gap-1">
        {payload.map((entry, index) => (
          <div key={`${entry.name}-${index}`} className="flex items-center gap-2">
            <span
              className="inline-block h-0.5 w-3 rounded-full"
              style={{ backgroundColor: entry.color }}
              aria-hidden
            />
            <span className="font-semibold tabular-nums">{entry.value}</span>
            <span className="text-xs text-muted">{entry.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
