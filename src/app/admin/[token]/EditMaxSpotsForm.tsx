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
      <div className="space-y-2">
        <div className="flex gap-3 items-start">
          <input
            type="number"
            id="maxSpots"
            name="maxSpots"
            min="1"
            defaultValue={currentMaxSpots ?? ""}
            placeholder="Unlimited"
            className="px-3 py-2 rounded-lg w-32 transition-all"
            style={{
              background: "#2C2C2F",
              border: "1px solid #404043",
              color: "#FFFFE0"
            }}
            onFocus={(e) => {
              e.target.style.borderColor = "#F78222";
              e.target.style.boxShadow = "0 0 0 3px rgba(247, 130, 34, 0.1)";
            }}
            onBlur={(e) => {
              e.target.style.borderColor = "#404043";
              e.target.style.boxShadow = "none";
            }}
          />
          <button
            type="submit"
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap"
            style={{
              background: "#10b981",
              color: "white"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#059669";
              e.currentTarget.style.transform = "translateY(-1px)";
              e.currentTarget.style.boxShadow = "0 4px 12px rgba(16, 185, 129, 0.3)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#10b981";
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            Save
          </button>
        </div>
        {error && (
          <p className="text-xs" style={{ color: "#E23642" }}>{error}</p>
        )}
      </div>
    </form>
  );
}
