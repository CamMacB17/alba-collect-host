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
      className="px-3 py-1 text-sm rounded-lg transition-all"
      style={{
        background: "rgba(226, 54, 66, 0.15)",
        border: "1px solid #E23642",
        color: "#E23642"
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "rgba(226, 54, 66, 0.25)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "rgba(226, 54, 66, 0.15)";
      }}
    >
      Remove
    </button>
  );
}
