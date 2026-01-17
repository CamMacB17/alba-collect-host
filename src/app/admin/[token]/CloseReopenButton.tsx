"use client";

import { useRouter } from "next/navigation";
import { closeEvent, reopenEvent } from "./actions";

export default function CloseReopenButton({ eventId, token, isClosed }: { eventId: string; token: string; isClosed: boolean }) {
  const router = useRouter();

  const handleClick = async () => {
    if (isClosed) {
      if (!confirm("Reopen this event? People will be able to join again.")) {
        return;
      }
    } else {
      if (!confirm("Close this event? People will no longer be able to join.")) {
        return;
      }
    }

    try {
      if (isClosed) {
        await reopenEvent(eventId, token);
      } else {
        await closeEvent(eventId, token);
      }
      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to update event status");
    }
  };

  return (
    <button
      onClick={handleClick}
      className={isClosed ? "btn-success px-4 py-2 text-sm font-medium" : "btn-danger px-4 py-2 text-sm font-medium"}
    >
      {isClosed ? "Reopen event" : "Close event"}
    </button>
  );
}
