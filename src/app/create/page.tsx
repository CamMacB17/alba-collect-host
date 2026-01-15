"use client";

import { useState, useRef } from "react";

export default function CreatePage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    eventUrl: string;
    adminUrl: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [totalCost, setTotalCost] = useState<string>("");
  const priceInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    const formData = new FormData(e.currentTarget);
    const title = formData.get("title") as string;
    const pricePounds = formData.get("price") as string;
    const maxSpots = formData.get("maxSpots") as string;
    const organiserName = formData.get("organiserName") as string;
    const organiserEmail = formData.get("organiserEmail") as string;

    // Convert pounds to pence with validation
    const pricePoundsNum = parseFloat(pricePounds);
    if (isNaN(pricePoundsNum) || pricePoundsNum <= 0) {
      setError("Please enter a valid price greater than 0");
      setLoading(false);
      return;
    }
    const pricePence = Math.round(pricePoundsNum * 100);

    // Validate maxSpots
    const maxSpotsNum = parseInt(maxSpots, 10);
    if (isNaN(maxSpotsNum) || maxSpotsNum <= 0) {
      setError("Please enter a valid number of spots greater than 0");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          pricePence,
          maxSpots: maxSpotsNum,
          organiserName,
          organiserEmail: organiserEmail || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create event");
      }

      setResult({
        eventUrl: data.eventUrl,
        adminUrl: data.adminUrl,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create event");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleSplitTotal = () => {
    const totalCostNum = parseFloat(totalCost);
    const maxSpotsInput = document.getElementById("maxSpots") as HTMLInputElement;
    const maxSpotsNum = parseInt(maxSpotsInput?.value || "0", 10);

    if (isNaN(totalCostNum) || totalCostNum <= 0) {
      setError("Please enter a valid total cost greater than 0");
      return;
    }

    if (isNaN(maxSpotsNum) || maxSpotsNum <= 0) {
      setError("Please enter a valid number of spots first");
      return;
    }

    // Calculate price per person
    const pricePerPerson = totalCostNum / maxSpotsNum;
    
    // Round to nearest 0.50 (50p)
    const roundedPrice = Math.round(pricePerPerson * 2) / 2;
    
    // Update the price input field
    if (priceInputRef.current) {
      priceInputRef.current.value = roundedPrice.toFixed(2);
    }
    
    setError(null);
  };

  return (
    <main className="min-h-screen p-8 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Create an Event</h1>
      <p className="text-gray-600 mb-8">
        Alba Collect Host v1: create an event, get a link, collect payments.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="title" className="block text-sm font-medium mb-1">
            Title *
          </label>
          <input
            type="text"
            id="title"
            name="title"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label htmlFor="price" className="block text-sm font-medium mb-1">
            Price per person (£) *
          </label>
          <input
            ref={priceInputRef}
            type="number"
            id="price"
            name="price"
            step="0.01"
            min="0"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="mt-1 text-sm text-gray-500">Each person will pay this amount.</p>
        </div>

        <div>
          <label htmlFor="maxSpots" className="block text-sm font-medium mb-1">
            Max Spots *
          </label>
          <input
            type="number"
            id="maxSpots"
            name="maxSpots"
            min="1"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label htmlFor="totalCost" className="block text-sm font-medium mb-1">
            Total cost (£) (optional)
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              id="totalCost"
              name="totalCost"
              step="0.01"
              min="0"
              value={totalCost}
              onChange={(e) => setTotalCost(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={handleSplitTotal}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-md text-sm whitespace-nowrap"
            >
              Split total into per-person price
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="organiserName" className="block text-sm font-medium mb-1">
            Organiser Name *
          </label>
          <input
            type="text"
            id="organiserName"
            name="organiserName"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label htmlFor="organiserEmail" className="block text-sm font-medium mb-1">
            Organiser Email
          </label>
          <input
            type="email"
            id="organiserEmail"
            name="organiserEmail"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {loading ? "Creating..." : "Create Event"}
        </button>
      </form>

      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md text-red-700">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-8 p-6 bg-green-50 border border-green-200 rounded-md">
          <h2 className="text-xl font-semibold mb-4">Event Created!</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">Event URL</label>
              <div className="flex gap-2">
                <a
                  href={result.eventUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-md text-blue-600 hover:underline truncate"
                >
                  {result.eventUrl}
                </a>
                <button
                  onClick={() => copyToClipboard(window.location.origin + result.eventUrl)}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-md text-sm"
                >
                  Copy
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Admin URL</label>
              <div className="flex gap-2">
                <a
                  href={result.adminUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-md text-blue-600 hover:underline truncate"
                >
                  {result.adminUrl}
                </a>
                <button
                  onClick={() => copyToClipboard(window.location.origin + result.adminUrl)}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-md text-sm"
                >
                  Copy
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
