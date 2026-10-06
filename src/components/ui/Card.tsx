import type { ReactNode } from "react";
import clsx from "clsx";

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={clsx("rounded-xl border border-border bg-surface p-4 shadow-sm", className)}>
      {children}
    </div>
  );
}

export function KpiCard({
  label,
  value,
  sublabel,
  status,
}: {
  label: string;
  value: ReactNode;
  sublabel?: ReactNode;
  /** Code couleur optionnel (ex: objectif atteint/manqué). Omis = style neutre. */
  status?: "success" | "danger";
}) {
  return (
    <Card className="flex flex-col gap-1">
      <span className="text-xs font-medium uppercase tracking-wide text-muted">{label}</span>
      <span
        className={clsx(
          "text-2xl font-semibold tabular-nums",
          status === "success" && "text-win",
          status === "danger" && "text-loss",
        )}
      >
        {value}
      </span>
      {sublabel ? <span className="text-xs text-muted">{sublabel}</span> : null}
    </Card>
  );
}
