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
      className="badge badge-warning px-3 py-1 text-sm cursor-pointer hover:opacity-80 transition-opacity"
    >
      Mark paid
    </button>
  );
}
