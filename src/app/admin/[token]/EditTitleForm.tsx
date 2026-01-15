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
    <form onSubmit={handleSubmit} className="mb-4">
      <div className="flex gap-2 items-center">
        <input
          type="text"
          name="title"
          defaultValue={currentTitle}
          required
          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-3xl font-bold"
        />
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
        >
          Save title
        </button>
      </div>
    </form>
  );
}
