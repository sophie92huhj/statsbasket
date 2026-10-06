"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Form";
import { useAuth } from "@/lib/auth/AuthContext";

interface MatchDocument {
  id: string;
  fileName: string;
  fileSize: number;
  createdAt: string | Date;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

export function MatchDocumentsPanel({ matchId, documents }: { matchId: string; documents: MatchDocument[] }) {
  const router = useRouter();
  const { isAdmin } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`/api/matches/${matchId}/documents`, { method: "POST", body: formData });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Échec de l'envoi du fichier.");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleDelete(docId: string) {
    if (!confirm("Supprimer cette feuille de match ?")) return;
    await fetch(`/api/matches/${matchId}/documents/${docId}`, { method: "DELETE" });
    router.refresh();
  }

  if (documents.length === 0 && !isAdmin) return null;

  return (
    <Card className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold">Feuille de match</h2>

      {documents.length === 0 ? (
        <p className="text-sm text-muted">Aucune feuille de match ajoutée.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {documents.map((doc) => (
            <li key={doc.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm">
              <a
                href={`/api/matches/${matchId}/documents/${doc.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-accent-text hover:underline break-all"
              >
                {doc.fileName}
              </a>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted">{formatFileSize(doc.fileSize)}</span>
                {isAdmin && (
                  <Button variant="danger" type="button" onClick={() => handleDelete(doc.id)}>
                    Supprimer
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {isAdmin && (
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            onChange={handleFileSelected}
            disabled={uploading}
            className="text-sm"
          />
          {uploading && <p className="mt-1 text-xs text-muted">Envoi en cours…</p>}
          {error && <p className="mt-1 text-sm text-loss">{error}</p>}
        </div>
      )}
    </Card>
  );
}
