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
      <h2 className="text-base font-semibold mb-4">
        Join this event
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name and Email side-by-side on desktop */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="name" className="block text-xs font-medium mb-1.5 opacity-80">
              Name *
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={loading || isDisabled}
              className="w-full"
            />
          </div>
          <div>
            <label htmlFor="email" className="block text-xs font-medium mb-1.5 opacity-80">
              Email *
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading || isDisabled}
              className="w-full"
            />
          </div>
        </div>
        {!isDisabled && (
          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-2.5"
          >
            {loading ? "Opening secure checkout…" : "Pay and join"}
          </button>
        )}
        {isDisabled && (
          <div className="alert alert-error text-center">
            <p className="text-xs">
              {isClosed ? "This event is closed." : "This event is full."}
            </p>
          </div>
        )}
      </form>
      {message && (
        <div className="mt-4 alert alert-error">
          <p className="text-xs">{message.text}</p>
        </div>
      )}
    </div>
  );
}
