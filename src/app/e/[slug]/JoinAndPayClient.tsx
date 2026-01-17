"use client";

import { useState } from "react";
import { payAndJoin } from "./actions";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Alert from "@/components/ui/Alert";

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
          <Input
            type="text"
            id="name"
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            disabled={loading || isDisabled}
          />
          <Input
            type="email"
            id="email"
            label="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading || isDisabled}
          />
        </div>
        {!isDisabled && (
          <Button
            type="submit"
            loading={loading}
            loadingText="Opening secure checkout…"
            disabled={loading}
            fullWidth
            className="py-2.5"
          >
            Pay and join
          </Button>
        )}
        {isDisabled && (
          <Alert variant="error">
            {isClosed ? "This event is closed." : "This event is full."}
          </Alert>
        )}
      </form>
      {message && (
        <div className="mt-4">
          <Alert variant="error">
            {message.text}
          </Alert>
        </div>
      )}
    </div>
  );
}
