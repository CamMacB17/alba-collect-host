"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type PaymentStatusPollingProps = {
  eventId: string;
  email?: string;
  payment?: {
    id: string;
    email: string;
    name: string;
    status: string;
    paidAt: Date | null;
    refundedAt: Date | null;
    amountPence: number;
    amountPenceCaptured: number | null;
  } | null;
};

export default function PaymentStatusPolling({ eventId, email, payment }: PaymentStatusPollingProps) {
  const [status, setStatus] = useState<"PLEDGED" | "PAID" | "CANCELLED" | "NONE" | null>(null);
  const [polling, setPolling] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // If payment prop is provided (from session_id lookup) and already PAID, skip polling
    if (payment && payment.status === "PAID") {
      setStatus("PAID");
      setPolling(false);
      return;
    }

    // If payment prop shows CANCELLED with refund, skip polling
    if (payment && payment.status === "CANCELLED" && payment.refundedAt) {
      setStatus("CANCELLED");
      setPolling(false);
      return;
    }

    if (!eventId || !email || !polling) return;

    let pollCount = 0;
    const maxPolls = 15; // 15 polls * 2s = 30 seconds max
    const pollInterval = 2000; // 2 seconds
    let intervalId: NodeJS.Timeout | null = null;

    const checkStatus = async () => {
      try {
        // Use eventId+email for polling (session_id lookup handled server-side)
        const response = await fetch(`/api/payment-status?eventId=${encodeURIComponent(eventId)}&email=${encodeURIComponent(email || "")}`);
        if (!response.ok) {
          pollCount++;
          if (pollCount >= maxPolls) {
            setPolling(false);
            if (intervalId) clearInterval(intervalId);
          }
          return;
        }
        const data = await response.json();
        if (data.status === "PAID") {
          setStatus("PAID");
          setPolling(false);
          if (intervalId) clearInterval(intervalId);
          // Refresh the page to ensure server-side data is up to date
          router.refresh();
        } else if (data.status === "CANCELLED") {
          setStatus("CANCELLED");
          setPolling(false);
          if (intervalId) clearInterval(intervalId);
        } else if (data.status === "NONE") {
          // No payment found yet, continue polling
          pollCount++;
          if (pollCount >= maxPolls) {
            setPolling(false);
            if (intervalId) clearInterval(intervalId);
          }
        } else {
          // PLEDGED or other status, continue polling
          pollCount++;
          if (pollCount >= maxPolls) {
            setPolling(false);
            if (intervalId) clearInterval(intervalId);
          }
        }
      } catch (err) {
        // Silently fail and continue polling
        pollCount++;
        if (pollCount >= maxPolls) {
          setPolling(false);
          if (intervalId) clearInterval(intervalId);
        }
      }
    };

    // Check immediately
    checkStatus();

    // Then poll every 2 seconds
    intervalId = setInterval(() => {
      if (!polling || pollCount >= maxPolls) {
        if (intervalId) clearInterval(intervalId);
        return;
      }
      checkStatus();
    }, pollInterval);

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [eventId, email, polling, router]);

  // Use payment prop status if available (from session_id lookup)
  const displayStatus = payment?.status || status;
  const displayEmail = payment?.email || email;

  // Confirmed state (PAID)
  if (displayStatus === "PAID") {
    const amountDisplay = payment?.amountPenceCaptured || payment?.amountPence
      ? `£${((payment.amountPenceCaptured || payment.amountPence) / 100).toFixed(2)}`
      : null;
    const paidDate = payment?.paidAt 
      ? new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(payment.paidAt)
      : null;

    return (
      <>
        <h2 className="text-base font-semibold mb-1" style={{ color: "#10b981" }}>
          You're in.
        </h2>
        {displayEmail && (
          <p className="text-xs mt-1" style={{ color: "#FFFFE0", opacity: 0.7 }}>
            Paid as: {displayEmail}
          </p>
        )}
        {amountDisplay && paidDate && (
          <p className="text-xs mt-1" style={{ color: "#FFFFE0", opacity: 0.7 }}>
            Paid {amountDisplay} on {paidDate}
          </p>
        )}
        <p className="text-xs mt-1" style={{ color: "#FFFFE0", opacity: 0.6 }}>
          Stripe will email your receipt.
        </p>
      </>
    );
  }

  // Refunded state
  if (displayStatus === "CANCELLED" && (payment?.refundedAt || payment)) {
    return (
      <>
        <h2 className="text-base font-semibold mb-1" style={{ color: "#FFFFE0" }}>
          Refunded
        </h2>
        {displayEmail && (
          <p className="text-xs mt-1" style={{ color: "#FFFFE0", opacity: 0.7 }}>
            Refunded for: {displayEmail}
          </p>
        )}
        {payment?.refundedAt && (
          <p className="text-xs mt-1" style={{ color: "#FFFFE0", opacity: 0.6 }}>
            Refunded on {new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(payment.refundedAt)}
          </p>
        )}
      </>
    );
  }

  // Confirming state (still polling or PLEDGED)
  return (
    <>
      <h2 className="text-base font-semibold mb-1" style={{ color: "#10b981" }}>
        You're in.
      </h2>
      <p className="mb-1 text-xs" style={{ color: "#FFFFE0" }}>
        Confirming payment… If this hasn't updated in 30 seconds, refresh.
      </p>
      {email && (
        <p className="text-xs mt-1" style={{ color: "#FFFFE0", opacity: 0.7 }}>
          Paid as: {email}
        </p>
      )}
      <p className="text-xs mt-1" style={{ color: "#FFFFE0", opacity: 0.6 }}>
        Stripe will email your receipt.
      </p>
    </>
  );
}
