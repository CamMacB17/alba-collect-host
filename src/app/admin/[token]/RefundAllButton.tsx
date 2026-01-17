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
        className="btn-danger px-4 py-2 text-sm font-medium w-full"
      >
        {isLoading ? "Refunding..." : "Refund all paid"}
      </button>
      {result && (
        <span className="text-xs opacity-70">
          Refunded {result.refunded}, skipped {result.skippedAlreadyRefunded}, failed {result.failed}
        </span>
      )}
    </div>
  );
}
