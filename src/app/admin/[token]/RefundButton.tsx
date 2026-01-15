"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { refundPayment } from "./actions";

export default function RefundButton({ paymentId, token }: { paymentId: string; token: string }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRefund = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await refundPayment(paymentId, token);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to refund payment");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleRefund}
        disabled={isLoading}
        className="px-3 py-1 text-sm bg-orange-100 text-orange-700 rounded hover:bg-orange-200 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? "Refunding..." : "Refund"}
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
