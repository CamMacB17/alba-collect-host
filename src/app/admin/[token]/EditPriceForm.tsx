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
      <div className="mb-4">
        <p className="text-sm text-gray-600">Price is locked after the first payment.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mb-4">
      <div className="space-y-2">
        <div className="flex gap-2 items-center">
          <label htmlFor="price" className="font-medium">
            Price per person (£):
          </label>
          <input
            type="text"
            id="price"
            name="price"
            defaultValue={currentPricePounds ?? ""}
            placeholder="Free"
            disabled={isPriceLocked}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-32 disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
          <button
            type="submit"
            disabled={isPriceLocked}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            Save price
          </button>
        </div>
        <p className="text-sm text-gray-600">
          Changing price won't affect people who already joined.
        </p>
        {error && (
          <p className="text-red-600 text-sm">{error}</p>
        )}
      </div>
    </form>
  );
}
