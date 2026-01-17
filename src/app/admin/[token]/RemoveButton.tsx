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
      className="badge badge-error px-3 py-1 text-sm cursor-pointer hover:opacity-80 transition-opacity"
    >
      Remove
    </button>
  );
}
