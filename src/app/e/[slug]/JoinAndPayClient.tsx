"use client";

import { useState } from "react";
import { payAndJoin } from "./actions";

type JoinAndPayClientProps = {
  slug: string;
  isFull: boolean;
  isClosed: boolean;
};

export default function JoinAndPayClient({ slug, isFull, isClosed }: JoinAndPayClientProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "error"; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const result = await payAndJoin({ slug, name, email });

      if ("error" in result) {
        // Normalise error messages
        let errorText = result.error;
        if (result.error.includes("already marked as paid")) {
          errorText = result.error; // Keep as-is
        } else if (result.error.includes("CHECKOUT_FAILED") || result.error.includes("Failed to start")) {
          errorText = "Something went wrong. Please try again.";
        } else {
          errorText = result.error;
        }
        setMessage({ type: "error", text: errorText });
        setLoading(false);
      } else {
        // Redirect to Stripe Checkout
        window.location.href = result.checkoutUrl;
      }
    } catch (err) {
      setLoading(false);
      setMessage({ 
        type: "error", 
        text: "Something went wrong. Please try again." 
      });
    }
  };

  const isDisabled = isFull || isClosed;

  return (
    <div>
      <h2 className="text-xl font-semibold mb-6" style={{ color: "#FFFFE0" }}>
        Join this event
      </h2>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="name" className="block text-sm font-semibold mb-2" style={{ color: "#FFFFE0" }}>
            Name *
          </label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            disabled={loading || isDisabled}
            className="w-full px-4 py-3 rounded-lg transition-all"
            style={{
              background: isDisabled ? "#2C2C2F" : "#2C2C2F",
              border: "1px solid #404043",
              color: "#FFFFE0",
              opacity: isDisabled ? 0.5 : 1,
              cursor: isDisabled ? "not-allowed" : "text"
            }}
            onFocus={(e) => {
              if (!isDisabled) {
                e.target.style.borderColor = "#F78222";
                e.target.style.boxShadow = "0 0 0 3px rgba(247, 130, 34, 0.1)";
              }
            }}
            onBlur={(e) => {
              e.target.style.borderColor = "#404043";
              e.target.style.boxShadow = "none";
            }}
          />
        </div>
        <div>
          <label htmlFor="email" className="block text-sm font-semibold mb-2" style={{ color: "#FFFFE0" }}>
            Email *
          </label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading || isDisabled}
            className="w-full px-4 py-3 rounded-lg transition-all"
            style={{
              background: isDisabled ? "#2C2C2F" : "#2C2C2F",
              border: "1px solid #404043",
              color: "#FFFFE0",
              opacity: isDisabled ? 0.5 : 1,
              cursor: isDisabled ? "not-allowed" : "text"
            }}
            onFocus={(e) => {
              if (!isDisabled) {
                e.target.style.borderColor = "#F78222";
                e.target.style.boxShadow = "0 0 0 3px rgba(247, 130, 34, 0.1)";
              }
            }}
            onBlur={(e) => {
              e.target.style.borderColor = "#404043";
              e.target.style.boxShadow = "none";
            }}
          />
        </div>
        {!isDisabled && (
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
            {loading ? "Starting payment..." : "Pay and join"}
          </button>
        )}
        {isDisabled && (
          <div className="p-4 rounded-lg text-center" style={{ background: "rgba(226, 54, 66, 0.15)", border: "1px solid #E23642" }}>
            <p style={{ color: "#E23642" }}>
              {isClosed ? "This event is closed." : "This event is full."}
            </p>
          </div>
        )}
      </form>
      {message && (
        <div className="mt-4 p-4 rounded-lg" style={{ background: "rgba(226, 54, 66, 0.15)", border: "1px solid #E23642" }}>
          <p style={{ color: "#E23642" }}>{message.text}</p>
        </div>
      )}
    </div>
  );
}
