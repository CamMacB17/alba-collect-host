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
        // Immediately redirect to the new admin URL
        window.location.assign(res.adminUrl);
      } else {
        setError(res.error);
        setIsLoading(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to regenerate admin link");
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={handleRegenerate}
        disabled={isLoading}
        className="btn-danger px-4 py-2 text-sm font-medium w-full"
      >
        {isLoading ? "Regenerating..." : "Regenerate admin link"}
      </button>
      {error && (
        <p className="text-xs" style={{ color: "var(--alba-red)" }}>
          {error}
        </p>
      )}
      {newAdminUrl && (
        <div className="mt-2 alert alert-success">
          <p className="text-xs mb-2 font-medium" style={{ color: "var(--alba-green)" }}>New admin link:</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 min-w-0 px-2 py-1.5 rounded text-xs font-mono truncate" style={{
              background: "var(--alba-bg)",
              border: "1px solid var(--alba-border)",
              color: "var(--alba-accent)"
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
