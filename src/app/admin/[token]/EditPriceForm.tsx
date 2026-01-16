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
      <div>
        <p className="text-sm" style={{ color: "#FFFFE0", opacity: 0.7 }}>Price is locked after the first payment.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-2">
        <div className="flex gap-2 items-center">
          <label htmlFor="price" className="font-medium" style={{ color: "#FFFFE0", opacity: 0.8 }}>
            £
          </label>
          <input
            type="text"
            id="price"
            name="price"
            defaultValue={currentPricePounds ?? ""}
            placeholder="Free"
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
          <button
            type="submit"
            disabled={isPriceLocked}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: isPriceLocked ? "#404043" : "#363639",
              border: "1px solid #404043",
              color: "#FFFFE0"
            }}
            onMouseEnter={(e) => {
              if (!isPriceLocked) {
                e.currentTarget.style.background = "#404043";
              }
            }}
            onMouseLeave={(e) => {
              if (!isPriceLocked) {
                e.currentTarget.style.background = "#363639";
              }
            }}
          >
            Save
          </button>
        </div>
        <p className="text-sm" style={{ color: "#FFFFE0", opacity: 0.6 }}>
          Changing price won't affect people who already joined.
        </p>
        {error && (
          <p className="text-sm" style={{ color: "#E23642" }}>{error}</p>
        )}
      </div>
    </form>
  );
}
