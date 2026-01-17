"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateMaxSpots } from "./actions";

export default function EditMaxSpotsForm({ eventId, currentMaxSpots, token }: { eventId: string; currentMaxSpots: number | null; token: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    const maxSpotsValue = formData.get("maxSpots") as string;

    try {
      // Empty string = unlimited (null)
      const maxSpots = maxSpotsValue === "" ? null : parseInt(maxSpotsValue, 10);
      await updateMaxSpots(eventId, maxSpots, token);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update max spots");
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-1">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
          <input
            type="number"
            id="maxSpots"
            name="maxSpots"
            min="1"
            defaultValue={currentMaxSpots ?? ""}
            placeholder="Unlimited"
            className="w-full sm:flex-1 text-sm min-w-0"
          />
          <button
            type="submit"
            className="btn-success w-full sm:w-auto px-3 py-2 text-xs whitespace-nowrap"
          >
            Save
          </button>
        </div>
        {error && (
          <p className="text-xs" style={{ color: "var(--alba-red)" }}>{error}</p>
        )}
      </div>
    </form>
  );
}
