"use client";

import { useState, useRef, useEffect } from "react";

export default function CreatePage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    eventUrl: string;
    adminUrl: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [totalCost, setTotalCost] = useState<string>("");
  const [copied, setCopied] = useState<string | null>(null);
  const priceInputRef = useRef<HTMLInputElement>(null);
  const successRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to success section when event is created
  useEffect(() => {
    if (result && successRef.current) {
      setTimeout(() => {
        successRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        successRef.current?.focus();
      }, 100);
    }
  }, [result]);

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

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
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
    <main className="min-h-screen py-8 px-4 sm:px-6 lg:px-8" style={{ background: "#2C2C2F" }}>
      <div className="max-w-5xl mx-auto space-y-4">
        {/* Success Section - RENDERED ABOVE FORM */}
        {result && (
          <div 
            ref={successRef}
            tabIndex={-1}
            className="card"
            style={{
              background: "rgba(16, 185, 129, 0.1)",
              border: "1px solid rgba(16, 185, 129, 0.3)"
            }}
          >
            <div className="flex items-start gap-2 mb-4">
              <div className="text-xl">✓</div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold mb-1" style={{ color: "#10b981" }}>Event Created</h2>
                <p className="text-xs" style={{ color: "#FFFFE0", opacity: 0.7 }}>
                  Your event is ready. Share these links with your guests.
                </p>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "#FFFFE0", opacity: 0.8 }}>Event URL</label>
                <div className="flex gap-2">
                  <a
                    href={result.eventUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 px-3 py-2 rounded text-sm truncate transition-colors"
                    style={{
                      background: "#2C2C2F",
                      border: "1px solid #404043",
                      color: "#F78222"
                    }}
                  >
                    {result.eventUrl}
                  </a>
                  <button
                    onClick={() => copyToClipboard(window.location.origin + result.eventUrl, "event")}
                    className="px-3 py-2 rounded text-sm font-medium transition-colors whitespace-nowrap"
                    style={{
                      background: copied === "event" ? "#10b981" : "#333338",
                      border: "1px solid #404043",
                      color: copied === "event" ? "white" : "#FFFFE0"
                    }}
                  >
                    {copied === "event" ? "Copied" : "Copy"}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "#FFFFE0", opacity: 0.8 }}>Admin URL</label>
                <div className="flex gap-2">
                  <a
                    href={result.adminUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 px-3 py-2 rounded text-sm truncate transition-colors"
                    style={{
                      background: "#2C2C2F",
                      border: "1px solid #404043",
                      color: "#F78222"
                    }}
                  >
                    {result.adminUrl}
                  </a>
                  <button
                    onClick={() => copyToClipboard(window.location.origin + result.adminUrl, "admin")}
                    className="px-3 py-2 rounded text-sm font-medium transition-colors whitespace-nowrap"
                    style={{
                      background: copied === "admin" ? "#10b981" : "#333338",
                      border: "1px solid #404043",
                      color: copied === "admin" ? "white" : "#FFFFE0"
                    }}
                  >
                    {copied === "admin" ? "Copied" : "Copy"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Form Section */}
        <div className="card">
          <h1 className="text-xl font-semibold mb-1" style={{ color: "#FFFFE0" }}>Create an Event</h1>
          <p className="mb-6 text-xs" style={{ color: "#FFFFE0", opacity: 0.6 }}>
            Create your golf event, get a link, collect payments.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Row 1: Event Title (full width) */}
            <div>
              <label htmlFor="title" className="block text-xs font-medium mb-1.5" style={{ color: "#FFFFE0", opacity: 0.8 }}>
                Event Title *
              </label>
              <input
                type="text"
                id="title"
                name="title"
                required
                className="w-full px-3 py-2 rounded transition-all"
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

            {/* Row 2: Price + Max Spots side-by-side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="price" className="block text-xs font-medium mb-1.5" style={{ color: "#FFFFE0", opacity: 0.8 }}>
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
                  className="w-full px-3 py-2 rounded transition-all"
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
              <div>
                <label htmlFor="maxSpots" className="block text-xs font-medium mb-1.5" style={{ color: "#FFFFE0", opacity: 0.8 }}>
                  Max Spots *
                </label>
                <input
                  type="number"
                  id="maxSpots"
                  name="maxSpots"
                  min="1"
                  required
                  className="w-full px-3 py-2 rounded transition-all"
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
            </div>

            {/* Row 3: Total cost + Split button */}
            <div>
              <label htmlFor="totalCost" className="block text-xs font-medium mb-1.5" style={{ color: "#FFFFE0", opacity: 0.8 }}>
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
                  className="flex-1 px-3 py-2 rounded transition-all"
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
                  type="button"
                  onClick={handleSplitTotal}
                  className="px-3 py-2 rounded text-sm font-medium whitespace-nowrap transition-colors"
                  style={{
                    background: "#333338",
                    border: "1px solid #404043",
                    color: "#FFFFE0"
                  }}
                >
                  Split total
                </button>
              </div>
            </div>

            {/* Row 4: Organiser name + email side-by-side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="organiserName" className="block text-xs font-medium mb-1.5" style={{ color: "#FFFFE0", opacity: 0.8 }}>
                  Organiser Name *
                </label>
                <input
                  type="text"
                  id="organiserName"
                  name="organiserName"
                  required
                  className="w-full px-3 py-2 rounded transition-all"
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
              <div>
                <label htmlFor="organiserEmail" className="block text-xs font-medium mb-1.5" style={{ color: "#FFFFE0", opacity: 0.8 }}>
                  Organiser Email
                </label>
                <input
                  type="email"
                  id="organiserEmail"
                  name="organiserEmail"
                  className="w-full px-3 py-2 rounded transition-all"
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
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: loading ? "#404043" : "#F78222",
                color: "white"
              }}
            >
              {loading ? "Creating..." : "Create Event"}
            </button>
          </form>

          {error && (
            <div className="mt-4 p-3 rounded" style={{ background: "rgba(226, 54, 66, 0.15)", border: "1px solid #E23642" }}>
              <p className="text-sm" style={{ color: "#E23642" }}>{error}</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
