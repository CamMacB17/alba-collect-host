"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cleanupAbandonedPledges } from "./actions";

export default function CleanupButton({ token }: { token: string }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleCleanup = async () => {
    setIsLoading(true);
    setSuccessMessage(null);
    try {
      const result = await cleanupAbandonedPledges(token);
      setSuccessMessage(`Cleaned up ${result.cleaned} abandoned payment${result.cleaned !== 1 ? "s" : ""}.`);
      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to clean up payments");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mb-4">
      <button
        onClick={handleCleanup}
        disabled={isLoading}
        className="text-sm opacity-80 hover:opacity-100 hover:underline transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? "Cleaning up..." : "Clean up abandoned payments"}
      </button>
      {successMessage && (
        <p className="mt-1 text-sm" style={{ color: "var(--alba-yellow)" }}>{successMessage}</p>
      )}
    </div>
  );
}
