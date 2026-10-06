import type { ReactNode } from "react";
import clsx from "clsx";

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={clsx(
        "rounded-xl border border-border bg-surface p-4 shadow-sm shadow-black/[0.03] transition-colors",
        className,
      )}
    >
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
    <Card className="group relative flex flex-col gap-1 overflow-hidden">
      <span
        className={clsx(
          "absolute inset-x-0 top-0 h-0.5 rounded-t-xl",
          status === "success" && "bg-win",
          status === "danger" && "bg-loss",
          !status && "bg-accent/70",
        )}
      />
      <span className="text-xs font-medium uppercase tracking-wide text-muted">{label}</span>
      <span
        className={clsx(
          "font-display text-3xl font-semibold leading-none tabular-nums",
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
