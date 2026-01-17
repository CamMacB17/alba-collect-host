"use client";

import { useEffect, useState } from "react";

type BookingData = {
  status: "PAID" | "PLEDGED" | "CANCELLED" | "REFUNDED" | "NOT_FOUND";
  event: {
    id: string;
    title: string;
    slug: string;
    pricePence: number;
    maxSpots: number | null;
    closedAt: Date | null;
  } | null;
  payment: {
    id: string;
    name: string;
    email: string;
    status: string;
    paidAt: Date | null;
    refundedAt: Date | null;
    amountPenceCaptured: number | null;
  } | null;
};

type BookingConfirmationProps = {
  sessionId: string;
  onBookingResolved: (found: boolean) => void;
};

export default function BookingConfirmation({ sessionId, onBookingResolved }: BookingConfirmationProps) {
  const [booking, setBooking] = useState<BookingData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBooking = async () => {
      try {
        const response = await fetch(`/api/booking?session_id=${encodeURIComponent(sessionId)}`);
        if (response.ok) {
          const data = await response.json();
          setBooking(data);
          onBookingResolved(data.status !== "NOT_FOUND");
        } else {
          onBookingResolved(false);
        }
      } catch (err) {
        onBookingResolved(false);
      } finally {
        setLoading(false);
      }
    };

    fetchBooking();
  }, [sessionId, onBookingResolved]);

  if (loading) {
    return (
      <div className="alert alert-success">
        <p className="text-sm">
          Loading booking...
        </p>
      </div>
    );
  }

  if (!booking || booking.status === "NOT_FOUND") {
    return null;
  }

  // PAID status
  if (booking.status === "PAID" && booking.payment) {
    const amountDisplay = booking.payment.amountPenceCaptured
      ? `£${(booking.payment.amountPenceCaptured / 100).toFixed(2)}`
      : null;
    const paidDate = booking.payment.paidAt
      ? new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(booking.payment.paidAt))
      : null;

    return (
      <div className="alert alert-success">
        <h2 className="text-base font-semibold mb-1" style={{ color: "var(--alba-green)" }}>
          You're in.
        </h2>
        {booking.payment.email && (
          <p className="text-xs mt-1 opacity-70">
            Paid as: {booking.payment.email}
          </p>
        )}
        {amountDisplay && paidDate && (
          <p className="text-xs mt-1 opacity-70">
            Paid {amountDisplay} on {paidDate}
          </p>
        )}
        <p className="text-xs mt-1 opacity-60">
          Stripe will email your receipt.
        </p>
      </div>
    );
  }

  // PLEDGED status
  if (booking.status === "PLEDGED" && booking.payment) {
    return (
      <div className="alert alert-success">
        <h2 className="text-base font-semibold mb-1" style={{ color: "var(--alba-green)" }}>
          You're in.
        </h2>
        <p className="mb-1 text-xs">
          Confirming payment… If this hasn't updated in 30 seconds, refresh.
        </p>
        {booking.payment.email && (
          <p className="text-xs mt-1 opacity-70">
            Paid as: {booking.payment.email}
          </p>
        )}
        <p className="text-xs mt-1 opacity-60">
          Stripe will email your receipt.
        </p>
      </div>
    );
  }

  // REFUNDED or CANCELLED status
  if ((booking.status === "REFUNDED" || booking.status === "CANCELLED") && booking.payment) {
    const refundDate = booking.payment.refundedAt
      ? new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(booking.payment.refundedAt))
      : null;

    return (
      <div className="alert alert-error">
        <h2 className="text-base font-semibold mb-1" style={{ color: "var(--alba-red)" }}>
          {booking.status === "REFUNDED" ? "Refunded" : "Cancelled"}
        </h2>
        {booking.payment.email && (
          <p className="text-xs mt-1 opacity-70">
            {booking.status === "REFUNDED" ? "Refunded for" : "Cancelled for"}: {booking.payment.email}
          </p>
        )}
        {refundDate && (
          <p className="text-xs mt-1 opacity-60">
            {booking.status === "REFUNDED" ? "Refunded" : "Cancelled"} on {refundDate}
          </p>
        )}
      </div>
    );
  }

  return null;
}
