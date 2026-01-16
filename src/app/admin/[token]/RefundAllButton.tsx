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
        className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? "Refunding..." : "Refund all paid"}
      </button>
      {result && (
        <span className="text-xs text-gray-600">
          Refunded {result.refunded}, skipped {result.skippedAlreadyRefunded}, failed {result.failed}
        </span>
      )}
    </div>
  );
}
