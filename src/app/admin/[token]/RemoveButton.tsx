"use client";

import { useRouter } from "next/navigation";
import { cancelPledge } from "./actions";

export default function RemoveButton({ paymentId, token }: { paymentId: string; token: string }) {
  const router = useRouter();

  const handleRemove = async () => {
    if (confirm("Remove this person from the event?")) {
      try {
        await cancelPledge(paymentId, token);
        router.refresh();
      } catch (error) {
        alert(error instanceof Error ? error.message : "Failed to remove person");
      }
    }
  };

  return (
    <button
      onClick={handleRemove}
      className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
    >
      Remove
    </button>
  );
}
