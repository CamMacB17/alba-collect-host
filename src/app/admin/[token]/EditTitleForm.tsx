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
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <input
          type="text"
          name="title"
          defaultValue={currentTitle}
          required
          className="w-full sm:flex-1 text-sm font-medium min-w-0"
        />
        <button
          type="submit"
          className="btn-success w-full sm:w-auto px-3 py-2 text-xs whitespace-nowrap"
        >
          Save
        </button>
      </div>
    </form>
  );
}
