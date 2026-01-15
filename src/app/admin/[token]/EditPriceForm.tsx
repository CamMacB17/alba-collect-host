"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateEventPrice } from "./actions";

export default function EditPriceForm({ eventId, currentPricePence, token }: { eventId: string; currentPricePence: number | null; token: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  // Convert pence to pounds for display
  const currentPricePounds = currentPricePence === null ? null : (currentPricePence / 100).toFixed(2);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    const priceValue = formData.get("price") as string;

    try {
      // Empty string = free (null)
      if (priceValue === "" || priceValue.trim() === "") {
        await updateEventPrice(eventId, null, token);
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

      await updateEventPrice(eventId, pricePence, token);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update price");
    }
  };

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
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-32"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
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
