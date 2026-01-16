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

      // Parse and convert pounds to pence
      const trimmed = priceValue.trim();
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
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span
            className="inline-flex items-center px-2 py-1 rounded text-xs font-medium"
            style={{
              background: "rgba(226, 54, 66, 0.15)",
              color: "#E23642",
              border: "1px solid rgba(226, 54, 66, 0.3)"
            }}
          >
            Locked
          </span>
          <span className="text-sm font-medium" style={{ color: "#FFFFE0" }}>
            £{currentPricePounds || "0.00"}
          </span>
        </div>
        <p className="text-xs" style={{ color: "#FFFFE0", opacity: 0.6 }}>
          Price cannot be changed after the first payment
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-2">
        <div className="flex gap-3 items-start">
          <div className="flex items-center gap-2 flex-1">
            <span className="text-sm font-medium" style={{ color: "#FFFFE0", opacity: 0.8 }}>£</span>
            <input
              type="text"
              id="price"
              name="price"
              defaultValue={currentPricePounds ?? ""}
              placeholder="0.00"
              disabled={isPriceLocked}
              className="px-3 py-2 rounded-lg w-32 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
          </div>
          <button
            type="submit"
            disabled={isPriceLocked}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            style={{
              background: isPriceLocked ? "#404043" : "#10b981",
              color: "white"
            }}
            onMouseEnter={(e) => {
              if (!isPriceLocked) {
                e.currentTarget.style.background = "#059669";
                e.currentTarget.style.transform = "translateY(-1px)";
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(16, 185, 129, 0.3)";
              }
            }}
            onMouseLeave={(e) => {
              if (!isPriceLocked) {
                e.currentTarget.style.background = "#10b981";
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
              }
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
