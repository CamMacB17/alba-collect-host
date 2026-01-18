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
    const eventDate = formData.get("eventDate") as string;
    const eventTime = formData.get("eventTime") as string;

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

    // Validate date/time: if either is provided, both must be provided
    const hasDate = eventDate && eventDate.trim().length > 0;
    const hasTime = eventTime && eventTime.trim().length > 0;
    if (hasDate !== hasTime) {
      setError("Please provide both date and time, or leave both empty");
      setLoading(false);
      return;
    }

    // Combine date and time into startsAt (Europe/London timezone)
    let startsAt: string | undefined = undefined;
    if (hasDate && hasTime) {
      // Parse date components
      const [year, month, day] = eventDate.split("-").map(Number);
      const [hours, minutes] = eventTime.split(":").map(Number);
      
      if (isNaN(year) || isNaN(month) || isNaN(day) || isNaN(hours) || isNaN(minutes)) {
        setError("Please enter a valid date and time");
        setLoading(false);
        return;
      }

      // Create date assuming Europe/London timezone
      // Note: JavaScript Date interprets as local time, so we create UTC date
      // and adjust for Europe/London offset (UTC+0 in winter, UTC+1 in summer)
      // For simplicity, we'll create the date and let the server handle timezone
      // The user enters local time thinking it's Europe/London
      const dateTimeString = `${eventDate}T${eventTime}:00`;
      const localDate = new Date(dateTimeString);
      
      if (isNaN(localDate.getTime())) {
        setError("Please enter a valid date and time");
        setLoading(false);
        return;
      }
      
      // Send as ISO string (server will interpret as needed)
      startsAt = localDate.toISOString();
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
          startsAt: startsAt || undefined,
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
    <main className="min-h-screen py-6 md:py-8 px-4 sm:px-6 overflow-x-hidden">
      <div className="w-full max-w-4xl mx-auto space-y-4">
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
            <div className="flex items-start gap-3 mb-6">
              <div className="text-2xl" style={{ color: "var(--alba-green)" }}>✓</div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold mb-1" style={{ color: "var(--alba-green)" }}>Event Created</h2>
                <p className="text-sm opacity-80">
                  Your event is ready. Share these links with your guests.
                </p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 opacity-80">Event URL</label>
                <div className="flex gap-2">
                  <a
                    href={result.eventUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 px-4 py-2.5 rounded-lg truncate transition-all"
                    style={{
                      background: "var(--alba-bg)",
                      border: "1px solid var(--alba-border)",
                      color: "var(--alba-accent)"
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = "var(--alba-accent)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "var(--alba-border)";
                    }}
                  >
                    {result.eventUrl}
                  </a>
                  <button
                    onClick={() => copyToClipboard(window.location.origin + result.eventUrl, "event")}
                    className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${copied === "event" ? "btn-success" : "btn-secondary"}`}
                  >
                    {copied === "event" ? "Copied" : "Copy"}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 opacity-80">Admin URL</label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <a
                    href={result.adminUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 min-w-0 px-4 py-2.5 rounded-lg truncate transition-all"
                    style={{
                      background: "var(--alba-bg)",
                      border: "1px solid var(--alba-border)",
                      color: "var(--alba-accent)"
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = "var(--alba-accent)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "var(--alba-border)";
                    }}
                  >
                    {result.adminUrl}
                  </a>
                  <button
                    onClick={() => copyToClipboard(window.location.origin + result.adminUrl, "admin")}
                    className={`w-full sm:w-auto px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${copied === "admin" ? "btn-success" : "btn-secondary"}`}
                  >
                    {copied === "admin" ? "Copied" : "Copy"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Form Section */}
        <div className="p-4 md:p-6 rounded-lg" style={{ background: "var(--alba-card-bg)", border: "1px solid var(--alba-border)", boxShadow: "0 1px 3px rgba(0, 0, 0, 0.2)" }}>
          <h1 className="text-xl font-semibold mb-1" style={{ color: "#FFFFE0" }}>Create an Event</h1>
          <p className="mb-3 text-xs" style={{ color: "#FFFFE0", opacity: 0.7 }}>
            Create your golf event, get a link, collect payments.
          </p>

          <form onSubmit={handleSubmit} className="space-y-3">
            {/* Event Title */}
            <div>
              <label htmlFor="title" className="block text-xs font-medium mb-1.5 opacity-80">
                Event Title *
              </label>
              <input
                type="text"
                id="title"
                name="title"
                required
                className="w-full"
              />
            </div>

            {/* Price per person */}
            <div>
              <label htmlFor="price" className="block text-xs font-medium mb-1.5 opacity-80">
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
                className="w-full tabular-nums"
              />
            </div>

            {/* Max Spots */}
            <div>
              <label htmlFor="maxSpots" className="block text-xs font-medium mb-1.5 opacity-80">
                Max Spots *
              </label>
              <input
                type="number"
                id="maxSpots"
                name="maxSpots"
                min="1"
                required
                className="w-full"
              />
            </div>

            {/* Total cost + Split total button + Date/Time (inline on desktop) */}
            <div>
              <div className="flex flex-col md:flex-row md:items-end gap-2">
                {/* Total cost section */}
                <div className="flex-1">
                  <label htmlFor="totalCost" className="block text-xs font-medium mb-1.5 opacity-80">
                    Total cost (£) (optional)
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="number"
                      id="totalCost"
                      name="totalCost"
                      step="0.01"
                      min="0"
                      value={totalCost}
                      onChange={(e) => setTotalCost(e.target.value)}
                      className="flex-1 tabular-nums"
                    />
                    <button
                      type="button"
                      onClick={handleSplitTotal}
                      className="btn-secondary px-3 py-2 text-xs whitespace-nowrap sm:w-auto"
                    >
                      Split total
                    </button>
                  </div>
                </div>
                {/* Date/Time section (inline on desktop) */}
                <div className="flex-1 md:flex md:gap-2">
                  <div className="flex-1">
                    <label htmlFor="eventDate" className="block text-xs font-medium mb-1.5 opacity-80">
                      Event Date (optional)
                    </label>
                    <div className="relative">
                      <input
                        type="date"
                        id="eventDate"
                        name="eventDate"
                        className="w-full"
                      />
                      <svg
                        className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-60 pointer-events-none"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  </div>
                  <div className="flex-1">
                    <label htmlFor="eventTime" className="block text-xs font-medium mb-1.5 opacity-80">
                      Event Time (optional)
                    </label>
                    <div className="relative">
                      <input
                        type="time"
                        id="eventTime"
                        name="eventTime"
                        className="w-full"
                      />
                      <svg
                        className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-60 pointer-events-none"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Organiser Name */}
            <div>
              <label htmlFor="organiserName" className="block text-xs font-medium mb-1.5 opacity-80">
                Organiser Name *
              </label>
              <input
                type="text"
                id="organiserName"
                name="organiserName"
                required
                className="w-full"
              />
            </div>

            {/* Organiser Email */}
            <div>
              <label htmlFor="organiserEmail" className="block text-xs font-medium mb-1.5 opacity-80">
                Organiser Email
              </label>
              <input
                type="email"
                id="organiserEmail"
                name="organiserEmail"
                className="w-full"
              />
            </div>

            {/* Create Event button */}
            <div>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full py-2.5"
              >
                {loading ? "Creating..." : "Create Event"}
              </button>
            </div>
          </form>

          {error && (
            <div className="mt-4 alert alert-error">
              <p className="text-sm">{error}</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
