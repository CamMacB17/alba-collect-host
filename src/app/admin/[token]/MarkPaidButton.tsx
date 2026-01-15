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
      className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200"
    >
      Mark paid
    </button>
  );
}
