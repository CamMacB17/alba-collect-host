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
      className={`px-2.5 py-1.5 text-xs rounded font-medium transition-colors whitespace-nowrap ${copied ? "btn-success" : "btn-secondary"}`}
    >
      {copied ? "Copied" : label}
    </button>
  );
}
