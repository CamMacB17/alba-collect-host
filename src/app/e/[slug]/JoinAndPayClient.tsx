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
    <div className="mt-8 p-6 border border-gray-300 rounded-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium mb-1">
            Name *
          </label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            disabled={loading || isDisabled}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
        </div>
        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-1">
            Email *
          </label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading || isDisabled}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
        </div>
        {!isDisabled && (
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? "Starting payment..." : "Pay and join"}
          </button>
        )}
      </form>
      {message && (
        <div className="mt-4 p-3 rounded-md bg-red-50 text-red-700 border border-red-200">
          {message.text}
        </div>
      )}
    </div>
  );
}
