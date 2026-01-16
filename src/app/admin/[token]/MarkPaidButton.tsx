"use client";

import { useRouter } from "next/navigation";
import { markPaid } from "./actions";

export default function MarkPaidButton({ paymentId, token }: { paymentId: string; token: string }) {
  const router = useRouter();

  const handleMarkPaid = async () => {
    try {
      await markPaid(paymentId, token);
      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to mark as paid");
    }
  };

  return (
    <button
      onClick={handleMarkPaid}
      className="px-3 py-1 text-sm rounded-lg transition-all"
      style={{
        background: "rgba(251, 185, 36, 0.2)",
        border: "1px solid #FBB924",
        color: "#FBB924"
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "rgba(251, 185, 36, 0.3)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "rgba(251, 185, 36, 0.2)";
      }}
    >
      Mark paid
    </button>
  );
}
