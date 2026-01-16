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
  const [copied, setCopied] = useState<string | null>(null);
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
    <main className="min-h-screen py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="card">
          <h1 className="text-3xl font-bold mb-2" style={{ color: "#FFFFE0" }}>Create an Event</h1>
          <p className="mb-8" style={{ color: "#FFFFE0", opacity: 0.8 }}>
            Create your golf event, get a link, collect payments.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="title" className="block text-sm font-semibold mb-2" style={{ color: "#FFFFE0" }}>
                Event Title *
              </label>
              <input
                type="text"
                id="title"
                name="title"
                required
                className="w-full px-4 py-3 rounded-lg"
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
              <label htmlFor="price" className="block text-sm font-semibold mb-2" style={{ color: "#FFFFE0" }}>
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
                className="w-full px-4 py-3 rounded-lg"
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
              <p className="mt-2 text-sm" style={{ color: "#FFFFE0", opacity: 0.7 }}>
                Each person will pay this amount.
              </p>
            </div>

            <div>
              <label htmlFor="maxSpots" className="block text-sm font-semibold mb-2" style={{ color: "#FFFFE0" }}>
                Max Spots *
              </label>
              <input
                type="number"
                id="maxSpots"
                name="maxSpots"
                min="1"
                required
                className="w-full px-4 py-3 rounded-lg"
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
              <label htmlFor="totalCost" className="block text-sm font-semibold mb-2" style={{ color: "#FFFFE0" }}>
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
                  className="flex-1 px-4 py-3 rounded-lg"
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
                  className="px-4 py-3 rounded-lg text-sm font-medium whitespace-nowrap transition-all"
                  style={{
                    background: "#363639",
                    border: "1px solid #404043",
                    color: "#FFFFE0"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#404043";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "#363639";
                  }}
                >
                  Split total
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="organiserName" className="block text-sm font-semibold mb-2" style={{ color: "#FFFFE0" }}>
                Organiser Name *
              </label>
              <input
                type="text"
                id="organiserName"
                name="organiserName"
                required
                className="w-full px-4 py-3 rounded-lg"
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
              <label htmlFor="organiserEmail" className="block text-sm font-semibold mb-2" style={{ color: "#FFFFE0" }}>
                Organiser Email
              </label>
              <input
                type="email"
                id="organiserEmail"
                name="organiserEmail"
                className="w-full px-4 py-3 rounded-lg"
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
              disabled={loading}
              className="w-full py-4 px-6 rounded-lg font-semibold text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: loading ? "#404043" : "#F78222",
                color: "white"
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.currentTarget.style.background = "#e6731f";
                  e.currentTarget.style.transform = "translateY(-1px)";
                  e.currentTarget.style.boxShadow = "0 4px 12px rgba(247, 130, 34, 0.3)";
                }
              }}
              onMouseLeave={(e) => {
                if (!loading) {
                  e.currentTarget.style.background = "#F78222";
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "none";
                }
              }}
            >
              {loading ? "Creating..." : "Create Event"}
            </button>
          </form>

          {error && (
            <div className="mt-6 p-4 rounded-lg" style={{ background: "rgba(226, 54, 66, 0.15)", border: "1px solid #E23642" }}>
              <p style={{ color: "#E23642" }}>{error}</p>
            </div>
          )}

          {result && (
            <div className="mt-8 p-6 rounded-lg" style={{ background: "#363639", border: "1px solid #404043" }}>
              <h2 className="text-xl font-semibold mb-4" style={{ color: "#FBB924" }}>Event Created</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: "#FFFFE0" }}>Event URL</label>
                  <div className="flex gap-2">
                    <a
                      href={result.eventUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 px-4 py-3 rounded-lg truncate transition-all"
                      style={{
                        background: "#2C2C2F",
                        border: "1px solid #404043",
                        color: "#F78222"
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = "#F78222";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = "#404043";
                      }}
                    >
                      {result.eventUrl}
                    </a>
                    <button
                      onClick={() => copyToClipboard(window.location.origin + result.eventUrl, "event")}
                      className="px-4 py-3 rounded-lg text-sm font-medium transition-all"
                      style={{
                        background: copied === "event" ? "#F78222" : "#363639",
                        border: "1px solid #404043",
                        color: copied === "event" ? "white" : "#FFFFE0"
                      }}
                    >
                      {copied === "event" ? "Copied" : "Copy"}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: "#FFFFE0" }}>Admin URL</label>
                  <div className="flex gap-2">
                    <a
                      href={result.adminUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 px-4 py-3 rounded-lg truncate transition-all"
                      style={{
                        background: "#2C2C2F",
                        border: "1px solid #404043",
                        color: "#F78222"
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = "#F78222";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = "#404043";
                      }}
                    >
                      {result.adminUrl}
                    </a>
                    <button
                      onClick={() => copyToClipboard(window.location.origin + result.adminUrl, "admin")}
                      className="px-4 py-3 rounded-lg text-sm font-medium transition-all"
                      style={{
                        background: copied === "admin" ? "#F78222" : "#363639",
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
        </div>
      </div>
    </main>
  );
}
