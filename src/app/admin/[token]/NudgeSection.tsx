"use client";

export default function NudgeSection({ message }: { message: string }) {
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <div className="mt-8 p-6 bg-gray-50 border border-gray-200 rounded-md">
      <h2 className="text-xl font-semibold mb-4">Nudge</h2>
      <p className="text-sm text-gray-600 mb-3">
        Copy this WhatsApp message to remind people to pay:
      </p>
      <div className="bg-white p-4 border border-gray-300 rounded-md mb-3">
        <p className="text-sm whitespace-pre-wrap font-mono">{message}</p>
      </div>
      <button
        onClick={handleCopy}
        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
      >
        Copy to clipboard
      </button>
    </div>
  );
}
