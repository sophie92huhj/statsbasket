"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Select } from "@/components/ui/Form";
import type { Season } from "@prisma/client";

export function SeasonSelector({ seasons, currentSeasonId }: { seasons: Season[]; currentSeasonId?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function handleChange(seasonId: string) {
    const params = new URLSearchParams(searchParams);
    if (seasonId) {
      params.set("saison", seasonId);
    } else {
      params.delete("saison");
    }
    router.push(`?${params.toString()}`);
  }

  return (
    <Select value={currentSeasonId ?? ""} onChange={(e) => handleChange(e.target.value)} className="w-auto">
      <option value="">Toutes les saisons</option>
      {seasons.map((s) => (
        <option key={s.id} value={s.id}>
          {s.label}
        </option>
      ))}
    </Select>
  );
}
