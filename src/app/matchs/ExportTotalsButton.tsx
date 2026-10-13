"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Form";

export interface ExportableMatch {
  id: string;
  date: string;
  opponentName: string;
  location: string;
  score: string;
}

export function ExportTotalsButton({ matches }: { matches: ExportableMatch[] }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(() => new Set(matches.map((m) => m.id)));

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleValidate() {
    // Conserve l'ordre de la liste pour une URL stable.
    const ids = matches.filter((m) => selected.has(m.id)).map((m) => m.id);
    window.open(`/api/matches/export-totals?ids=${ids.join(",")}`, "_blank", "noopener,noreferrer");
    setOpen(false);
  }

  if (matches.length === 0) return null;

  return (
    <>
      <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
        Export stats totaux
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setOpen(false)}
          role="presentation"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="export-totals-title"
            className="w-full max-w-lg"
          >
            <Card className="flex max-h-[85vh] flex-col gap-4">
              <div>
                <h2 id="export-totals-title" className="text-sm font-semibold">
                  Export stats totaux
                </h2>
                <p className="text-xs text-muted">Cochez les matchs à comptabiliser.</p>
              </div>

              <div className="flex gap-3 text-xs">
                <button type="button" className="font-medium text-foreground underline-offset-2 hover:underline" onClick={() => setSelected(new Set(matches.map((m) => m.id)))}>
                  Tout cocher
                </button>
                <button type="button" className="font-medium text-foreground underline-offset-2 hover:underline" onClick={() => setSelected(new Set())}>
                  Tout décocher
                </button>
                <span className="ml-auto text-muted">
                  {selected.size} / {matches.length} sélectionné{selected.size > 1 ? "s" : ""}
                </span>
              </div>

              <ul className="min-h-0 flex-1 overflow-y-auto rounded-md border border-border">
                {matches.map((m) => (
                  <li key={m.id} className="border-b border-border last:border-0">
                    <label className="flex cursor-pointer items-center gap-3 px-3 py-2 text-sm hover:bg-accent-soft/40">
                      <input type="checkbox" checked={selected.has(m.id)} onChange={() => toggle(m.id)} className="accent-[var(--accent)]" />
                      <span className="w-24 tabular-nums">{m.date}</span>
                      <span className="flex-1 truncate">{m.opponentName}</span>
                      <span className="text-xs text-muted">{m.location}</span>
                      <span className="w-16 text-right tabular-nums">{m.score}</span>
                    </label>
                  </li>
                ))}
              </ul>

              <div className="flex justify-end gap-3">
                <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
                  Annuler
                </Button>
                <Button type="button" onClick={handleValidate} disabled={selected.size === 0}>
                  Valider
                </Button>
              </div>
            </Card>
          </div>
        </div>
      )}
    </>
  );
}
