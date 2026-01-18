"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { refundPaymentOps } from "../actions";

type RefundButtonProps = {
  paymentId: string;
  key: string;
};

export default function RefundButton({ paymentId, key }: RefundButtonProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleRefund = async () => {
    if (!window.confirm("Refund this payment?")) {
      return;
    }

    setLoading(true);
    try {
      const result = await refundPaymentOps(paymentId, key);
      if ("error" in result) {
        alert(`Refund failed: ${result.error}`);
      } else {
        // Refresh page to show updated status
        router.refresh();
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      alert(`Refund failed: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleRefund}
      disabled={loading}
      className="text-xs underline opacity-80 hover:opacity-100 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {loading ? "Refunding..." : "Refund"}
    </button>
  );
}
