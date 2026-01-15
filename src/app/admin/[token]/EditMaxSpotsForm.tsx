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
    <form onSubmit={handleSubmit} className="mb-4">
      <div className="space-y-2">
        <div className="flex gap-2 items-center">
          <label htmlFor="maxSpots" className="font-medium">
            Max spots:
          </label>
          <input
            type="number"
            id="maxSpots"
            name="maxSpots"
            min="1"
            defaultValue={currentMaxSpots ?? ""}
            placeholder="Unlimited"
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-32"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
          >
            Save max spots
          </button>
        </div>
        {error && (
          <p className="text-red-600 text-sm">{error}</p>
        )}
      </div>
    </form>
  );
}
