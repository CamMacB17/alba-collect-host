"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { refundAllPaidPayments } from "./actions";

export default function RefundAllButton({ token }: { token: string }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ attempted: number; refunded: number; skippedAlreadyRefunded: number; failed: number } | null>(null);

  const handleRefundAll = async () => {
    if (!confirm("Refund all paid payments? This cannot be undone.")) {
      return;
    }

    setIsLoading(true);
    setResult(null);
    try {
      const res = await refundAllPaidPayments(token);
      setResult(res);
      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to refund payments");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <button
        onClick={handleRefundAll}
        disabled={isLoading}
        className="px-4 py-2 text-sm rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        style={{
          background: isLoading ? "#404043" : "#E23642",
          color: "white"
        }}
        onMouseEnter={(e) => {
          if (!isLoading) {
            e.currentTarget.style.background = "#c92e3a";
            e.currentTarget.style.transform = "translateY(-1px)";
            e.currentTarget.style.boxShadow = "0 4px 12px rgba(226, 54, 66, 0.3)";
          }
        }}
        onMouseLeave={(e) => {
          if (!isLoading) {
            e.currentTarget.style.background = "#E23642";
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "none";
          }
        }}
      >
        {isLoading ? "Refunding..." : "Refund all paid"}
      </button>
      {result && (
        <span className="text-xs" style={{ color: "#FFFFE0", opacity: 0.7 }}>
          Refunded {result.refunded}, skipped {result.skippedAlreadyRefunded}, failed {result.failed}
        </span>
      )}
    </div>
  );
}
