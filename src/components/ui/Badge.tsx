import clsx from "clsx";
import type { MatchOutcome } from "@/lib/repositories/match";

const OUTCOME_LABEL: Record<Exclude<MatchOutcome, null>, string> = {
  WIN: "Victoire",
  LOSS: "Défaite",
  DRAW: "Nul",
};

const OUTCOME_CLASS: Record<Exclude<MatchOutcome, null>, string> = {
  WIN: "bg-win-bg text-win",
  LOSS: "bg-loss-bg text-loss",
  DRAW: "bg-draw-bg text-draw",
};

export function OutcomeBadge({ outcome }: { outcome: MatchOutcome }) {
  if (!outcome) {
    return <span className="text-xs text-muted">—</span>;
  }
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        OUTCOME_CLASS[outcome],
      )}
    >
      {OUTCOME_LABEL[outcome]}
    </span>
  );
}

export function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full bg-background px-2.5 py-0.5 text-xs font-medium text-muted",
        className,
      )}
    >
      {children}
    </span>
  );
}
