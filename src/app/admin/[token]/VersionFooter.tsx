"use client";

import { useEffect, useState } from "react";

export default function VersionFooter() {
  const [version, setVersion] = useState<string>("");

  useEffect(() => {
    fetch("/api/version")
      .then((res) => res.json())
      .then((data) => {
        const buildId = data.buildId;
        const commit = data.commit;
        const deployedAt = data.deployedAt;

        // Show buildId if available, otherwise commit short (first 7 chars), otherwise "unknown"
        let versionText = "unknown";
        if (buildId) {
          versionText = buildId;
        } else if (commit) {
          versionText = commit.substring(0, 7);
        }

        setVersion(versionText);
      })
      .catch(() => {
        setVersion("unknown");
      });
  }, []);

  return (
    <div className="mt-8 pt-4 text-center">
      <p className="text-xs opacity-50">
        Version: {version}
      </p>
    </div>
  );
}
