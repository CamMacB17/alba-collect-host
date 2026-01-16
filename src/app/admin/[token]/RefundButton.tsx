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
        <span className="text-sm text-gray-600">Refunded</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleRefund}
        disabled={isLoading || isAlreadyRefunded}
        className="px-3 py-1 text-sm bg-orange-100 text-orange-700 rounded hover:bg-orange-200 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? "Refunding..." : "Refund"}
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
