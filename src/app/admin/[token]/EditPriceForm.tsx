"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateEventPrice } from "./actions";

export default function EditPriceForm({ eventId, currentPricePence, token, isPriceLocked }: { eventId: string; currentPricePence: number | null; token: string; isPriceLocked: boolean }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  // Convert pence to pounds for display
  const currentPricePounds = currentPricePence === null ? null : (currentPricePence / 100).toFixed(2);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    
    if (isPriceLocked) {
      setError("Price is locked after the first payment.");
      return;
    }

    const formData = new FormData(e.currentTarget);
    const priceValue = formData.get("price") as string;

    try {
      // Empty string = free (null)
      if (priceValue === "" || priceValue.trim() === "") {
        const result = await updateEventPrice(eventId, null, token);
        if (result.ok === false) {
          setError(result.error);
          return;
        }
        router.refresh();
        return;
      }

      // Parse and convert pounds to pence (remove £ if present)
      const trimmed = priceValue.trim().replace(/^£\s*/, "");
      const pounds = parseFloat(trimmed);

      if (isNaN(pounds) || pounds < 0) {
        setError("Price must be a valid non-negative number");
        return;
      }

      // Round to nearest penny and convert to pence
      const pricePence = Math.round(pounds * 100);

      const result = await updateEventPrice(eventId, pricePence, token);
      if (result.ok === false) {
        setError(result.error);
        return;
      }
      setError(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update price");
    }
  };

  if (isPriceLocked) {
    return (
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="badge badge-error">
            Locked
          </span>
          <span className="text-sm font-medium">
            £{currentPricePounds || "0.00"}
          </span>
        </div>
        <p className="text-xs opacity-60">
          Price cannot be changed after the first payment
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-1">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
          <input
            type="text"
            id="price"
            name="price"
            defaultValue={currentPricePounds ?? ""}
            placeholder="0.00"
            disabled={isPriceLocked}
            className="w-full sm:flex-1 text-sm tabular-nums min-w-0"
          />
          <button
            type="submit"
            disabled={isPriceLocked}
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
