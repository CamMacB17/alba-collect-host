"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { refundPayment } from "./actions";

export default function RefundButton({ paymentId, token, isAlreadyRefunded }: { paymentId: string; token: string; isAlreadyRefunded: boolean }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRefund = async () => {
    if (isAlreadyRefunded) {
      setError("Payment has already been refunded");
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const result = await refundPayment(paymentId, token);
      if (result.ok === false) {
        setError(result.error);
        return;
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to refund payment");
    } finally {
      setIsLoading(false);
    }
  };

  if (isAlreadyRefunded) {
    return (
      <div className="flex flex-col items-end gap-1">
        <span className="text-sm opacity-60">Refunded</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleRefund}
        disabled={isLoading || isAlreadyRefunded}
        className="btn-primary px-3 py-1 text-sm"
      >
        {isLoading ? "Refunding..." : "Refund"}
      </button>
      {error && <span className="text-xs" style={{ color: "var(--alba-red)" }}>{error}</span>}
    </div>
  );
}
