// Petit wrapper fetch côté client pour les appels vers nos propres API routes.

export class ApiError extends Error {
  constructor(message: string, public status: number, public details?: unknown) {
    super(message);
  }
}

export async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(body?.error?.message ?? body?.error ?? `Erreur ${res.status}`, res.status, body);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}
