import type { InputHTMLAttributes, SelectHTMLAttributes, ButtonHTMLAttributes } from "react";
import clsx from "clsx";

export function TextInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={clsx(
        "w-full rounded-md border border-border bg-background px-3 py-1.5 text-foreground outline-none focus:border-accent",
        className?.includes("text-") ? "" : "text-sm",
        className,
      )}
    />
  );
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={clsx(
        "w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground outline-none focus:border-accent",
        props.className,
      )}
    />
  );
}

export function Label({ children }: { children: React.ReactNode }) {
  return <label className="mb-1 block text-xs font-medium text-muted">{children}</label>;
}

export function Button({
  className,
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "danger" }) {
  return (
    <button
      {...props}
      className={clsx(
        "rounded-md px-3 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        variant === "primary" && "bg-accent text-accent-foreground hover:opacity-90",
        variant === "secondary" && "border border-border bg-surface hover:bg-background",
        variant === "danger" && "border border-loss text-loss hover:bg-loss-bg",
        className,
      )}
    />
  );
}
