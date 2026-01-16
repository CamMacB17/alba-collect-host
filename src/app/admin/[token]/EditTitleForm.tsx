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
      <div className="flex gap-2 items-center">
        <input
          type="text"
          name="title"
          defaultValue={currentTitle}
          required
          className="flex-1 px-4 py-3 rounded-lg text-2xl font-bold transition-all"
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
          className="px-4 py-3 rounded-lg text-sm font-medium transition-all"
          style={{
            background: "#363639",
            border: "1px solid #404043",
            color: "#FFFFE0"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#404043";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "#363639";
          }}
        >
          Save
        </button>
      </div>
    </form>
  );
}
