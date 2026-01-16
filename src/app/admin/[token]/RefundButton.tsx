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
        <span className="text-sm" style={{ color: "#FFFFE0", opacity: 0.6 }}>Refunded</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleRefund}
        disabled={isLoading || isAlreadyRefunded}
        className="px-3 py-1 text-sm rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        style={{
          background: isLoading ? "#404043" : "#F78222",
          color: "white"
        }}
        onMouseEnter={(e) => {
          if (!isLoading) {
            e.currentTarget.style.background = "#e6731f";
            e.currentTarget.style.transform = "translateY(-1px)";
            e.currentTarget.style.boxShadow = "0 4px 12px rgba(247, 130, 34, 0.3)";
          }
        }}
        onMouseLeave={(e) => {
          if (!isLoading) {
            e.currentTarget.style.background = "#F78222";
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "none";
          }
        }}
      >
        {isLoading ? "Refunding..." : "Refund"}
      </button>
      {error && <span className="text-xs" style={{ color: "#E23642" }}>{error}</span>}
    </div>
  );
}
