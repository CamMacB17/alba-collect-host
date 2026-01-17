"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { regenerateAdminToken } from "./actions";
import CopyButton from "./CopyButton";

export default function RegenerateAdminLinkButton({ token }: { token: string }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [newAdminUrl, setNewAdminUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRegenerate = async () => {
    if (!confirm("Regenerate admin link? The current link will stop working immediately. This cannot be undone.")) {
      return;
    }

    setIsLoading(true);
    setNewAdminUrl(null);
    setError(null);
    try {
      const res = await regenerateAdminToken(token);
      if (res.ok) {
        setNewAdminUrl(res.adminUrl);
        router.refresh();
      } else {
        setError(res.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to regenerate admin link");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={handleRegenerate}
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
        {isLoading ? "Regenerating..." : "Regenerate admin link"}
      </button>
      {error && (
        <p className="text-xs" style={{ color: "#E23642" }}>
          {error}
        </p>
      )}
      {newAdminUrl && (
        <div className="mt-2 p-3 rounded" style={{ background: "rgba(16, 185, 129, 0.15)", border: "1px solid rgba(16, 185, 129, 0.3)" }}>
          <p className="text-xs mb-2 font-medium" style={{ color: "#10b981" }}>New admin link:</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 min-w-0 px-2 py-1.5 rounded text-xs font-mono truncate" style={{
              background: "#2C2C2F",
              border: "1px solid #404043",
              color: "#F78222"
            }}>
              {newAdminUrl}
            </code>
            <CopyButton text={newAdminUrl} />
          </div>
        </div>
      )}
    </div>
  );
}
