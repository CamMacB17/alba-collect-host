"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type PaymentStatusPollingProps = {
  paymentId?: string;
  email?: string;
};

export default function PaymentStatusPolling({ paymentId, email }: PaymentStatusPollingProps) {
  const [status, setStatus] = useState<"PLEDGED" | "PAID" | "CANCELLED" | null>(null);
  const [polling, setPolling] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (!paymentId || !polling) return;

    let pollCount = 0;
    const maxPolls = 15; // 15 polls * 2s = 30 seconds max
    const pollInterval = 2000; // 2 seconds
    let intervalId: NodeJS.Timeout | null = null;

    const checkStatus = async () => {
      try {
        const response = await fetch(`/api/payment-status?paymentId=${encodeURIComponent(paymentId)}`);
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
        } else {
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
  }, [paymentId, polling, router]);

  // Confirmed state (PAID)
  if (status === "PAID") {
    return (
      <>
        <h2 className="text-base font-semibold mb-1" style={{ color: "#10b981" }}>
          You're in.
        </h2>
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
