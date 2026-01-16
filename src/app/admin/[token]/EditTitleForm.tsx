"use client";

import { useRouter } from "next/navigation";
import { updateEventTitle } from "./actions";

export default function EditTitleForm({ eventId, currentTitle, token }: { eventId: string; currentTitle: string; token: string }) {
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newTitle = formData.get("title") as string;

    try {
      await updateEventTitle(eventId, newTitle, token);
      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to update title");
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="flex gap-2 items-start">
        <input
          type="text"
          name="title"
          defaultValue={currentTitle}
          required
          className="flex-1 px-3 py-2 rounded text-sm font-medium transition-all"
          style={{
            background: "#2C2C2F",
            border: "1px solid #404043",
            color: "#FFFFE0"
          }}
          onFocus={(e) => {
            e.target.style.borderColor = "#F78222";
            e.target.style.boxShadow = "0 0 0 3px rgba(247, 130, 34, 0.1)";
          }}
          onBlur={(e) => {
            e.target.style.borderColor = "#404043";
            e.target.style.boxShadow = "none";
          }}
        />
        <button
          type="submit"
          className="px-3 py-2 rounded text-xs font-medium transition-colors whitespace-nowrap"
          style={{
            background: "#10b981",
            color: "white"
          }}
        >
          Save
        </button>
      </div>
    </form>
  );
}
