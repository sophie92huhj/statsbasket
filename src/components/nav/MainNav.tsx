"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard" },
  { href: "/matchs", label: "Matchs" },
  { href: "/joueuses", label: "Joueuses" },
  { href: "/equipe", label: "Équipe" },
  { href: "/comparaisons", label: "Comparaisons" },
  { href: "/saison", label: "Analyse de saison" },
  { href: "/parametres", label: "Paramètres" },
] as const;

export function MainNav() {
  const pathname = usePathname();

  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex max-w-7xl items-center gap-6 px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-accent" />
          StatsBasket
        </Link>
        <nav className="flex flex-1 items-center gap-1 overflow-x-auto text-sm">
          {NAV_ITEMS.map((item) => {
            const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  "whitespace-nowrap rounded-md px-3 py-1.5 transition-colors",
                  isActive
                    ? "bg-accent text-accent-foreground font-medium"
                    : "text-muted hover:bg-background hover:text-foreground",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
