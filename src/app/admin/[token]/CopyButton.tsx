"use client";

import { useState } from "react";

export default function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const handleClick = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
      }, 1000);
    } catch (error) {
      // Fallback if clipboard API fails
      console.error("Failed to copy:", error);
    }
  };

  return (
    <button
      onClick={handleClick}
      className="px-3 py-2 text-sm rounded-lg font-medium transition-all whitespace-nowrap"
      style={{
        background: copied ? "#F78222" : "#363639",
        border: "1px solid #404043",
        color: copied ? "white" : "#FFFFE0"
      }}
      onMouseEnter={(e) => {
        if (!copied) {
          e.currentTarget.style.background = "#404043";
        }
      }}
      onMouseLeave={(e) => {
        if (!copied) {
          e.currentTarget.style.background = "#363639";
        }
      }}
    >
      {copied ? "Copied" : label}
    </button>
  );
}
