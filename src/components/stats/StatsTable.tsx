import type { ReactNode } from "react";

export function StatRow({ label, value, sublabel }: { label: string; value: ReactNode; sublabel?: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border py-2 last:border-0">
      <span className="text-sm text-muted">{label}</span>
      <span className="text-right">
        <span className="font-medium tabular-nums">{value}</span>
        {sublabel && <span className="ml-1.5 text-xs text-muted">{sublabel}</span>}
      </span>
    </div>
  );
}
