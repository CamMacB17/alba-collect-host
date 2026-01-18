"use client";

import { useEffect, useState } from "react";
import Alert from "@/components/ui/Alert";
import { requestRefund } from "./actions-refund-request";

type BookingData = {
  status: "PAID" | "PLEDGED" | "CANCELLED" | "REFUNDED" | "NOT_FOUND";
  event: {
    id: string;
    title: string;
    slug: string;
    pricePence: number;
    maxSpots: number | null;
    closedAt: Date | null;
    organiserEmail: string | null;
    startsAt: Date | null;
    adminToken: string | null;
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
  const [refundRequesting, setRefundRequesting] = useState(false);
  const [refundRequestResult, setRefundRequestResult] = useState<{ ok: boolean; error?: string } | null>(null);

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
      <Alert variant="success">
        Loading booking...
      </Alert>
    );
  }

  if (!booking || booking.status === "NOT_FOUND") {
    return null;
  }

  const handleRequestRefund = async () => {
    if (!booking?.event || !booking?.payment || !booking.event.organiserEmail || !booking.event.adminToken) {
      return;
    }

    setRefundRequesting(true);
    setRefundRequestResult(null);

    const result = await requestRefund({
      eventTitle: booking.event.title,
      attendeeName: booking.payment.name,
      attendeeEmail: booking.payment.email,
      paymentId: booking.payment.id,
      amountPence: booking.payment.amountPenceCaptured || 0,
      organiserEmail: booking.event.organiserEmail,
      adminToken: booking.event.adminToken,
    });

    setRefundRequestResult(result);
    setRefundRequesting(false);
  };

  const getContactOrganiserMailto = () => {
    if (!booking?.event?.organiserEmail || !booking?.event?.title || !booking?.payment) {
      return null;
    }

    const subject = encodeURIComponent(`Question about ${booking.event.title}`);
    const body = encodeURIComponent(
      `Hi,\n\nI have a question about ${booking.event.title}.\n\n` +
        `My email: ${booking.payment.email}\n` +
        `Payment reference: ${booking.payment.id}\n\n` +
        `Thanks!`
    );

    return `mailto:${booking.event.organiserEmail}?subject=${subject}&body=${body}`;
  };

  const getGoogleCalendarUrl = () => {
    if (!booking?.event?.startsAt || !booking?.event?.title) {
      return null;
    }

    const startDate = new Date(booking.event.startsAt);
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // Default 60 minutes duration

    const formatDate = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    };

    const params = new URLSearchParams({
      action: "TEMPLATE",
      text: booking.event.title,
      dates: `${formatDate(startDate)}/${formatDate(endDate)}`,
    });

    if (booking.event.organiserEmail) {
      params.append("add", booking.event.organiserEmail);
    }

    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  };

  const getICSUrl = () => {
    if (!booking?.event?.startsAt || !sessionId) {
      return null;
    }

    return `/api/calendar/ics?session_id=${encodeURIComponent(sessionId)}`;
  };

  // PAID status
  if (booking.status === "PAID" && booking.payment && booking.event) {
    const amountDisplay = booking.payment.amountPenceCaptured
      ? `£${(booking.payment.amountPenceCaptured / 100).toFixed(2)}`
      : null;
    const paidDate = booking.payment.paidAt
      ? new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(booking.payment.paidAt))
      : null;

    const contactMailto = getContactOrganiserMailto();

    return (
      <Alert variant="success" title="You&apos;re in.">
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
        <div className="mt-3 pt-3 border-t border-current/20 flex flex-wrap gap-2">
          {contactMailto && (
            <a
              href={contactMailto}
              className="text-xs underline opacity-80 hover:opacity-100"
            >
              Contact organiser
            </a>
          )}
          {booking.event.organiserEmail && booking.event.adminToken && (
            <button
              onClick={handleRequestRefund}
              disabled={refundRequesting}
              className="text-xs underline opacity-80 hover:opacity-100 disabled:opacity-50"
            >
              {refundRequesting ? "Sending..." : "Request a refund"}
            </button>
          )}
          {getGoogleCalendarUrl() && (
            <a
              href={getGoogleCalendarUrl()!}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs underline opacity-80 hover:opacity-100"
            >
              Add to calendar
            </a>
          )}
          {getICSUrl() && (
            <a
              href={getICSUrl()!}
              download={`${booking.event.title.replace(/[^a-z0-9]/gi, "_")}.ics`}
              className="text-xs underline opacity-80 hover:opacity-100"
            >
              Download ICS
            </a>
          )}
        </div>
        {refundRequestResult && (
          <p className={`text-xs mt-2 ${refundRequestResult.ok ? "opacity-70" : "opacity-90"}`}>
            {refundRequestResult.ok
              ? "Refund request sent. The organiser will process it."
              : refundRequestResult.error || "Failed to send refund request."}
          </p>
        )}
      </Alert>
    );
  }

  // PLEDGED status
  if (booking.status === "PLEDGED" && booking.payment && booking.event) {
    const contactMailto = getContactOrganiserMailto();

    return (
      <Alert variant="success" title="You&apos;re in.">
        <p className="mb-1 text-xs">
          Confirming payment… If this hasn&apos;t updated in 30 seconds, refresh.
        </p>
        {booking.payment.email && (
          <p className="text-xs mt-1 opacity-70">
            Paid as: {booking.payment.email}
          </p>
        )}
        <p className="text-xs mt-1 opacity-60">
          Stripe will email your receipt.
        </p>
        {(contactMailto || getGoogleCalendarUrl() || getICSUrl()) && (
          <div className="mt-3 pt-3 border-t border-current/20 flex flex-wrap gap-2">
            {contactMailto && (
              <a
                href={contactMailto}
                className="text-xs underline opacity-80 hover:opacity-100"
              >
                Contact organiser
              </a>
            )}
            {getGoogleCalendarUrl() && (
              <a
                href={getGoogleCalendarUrl()!}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs underline opacity-80 hover:opacity-100"
              >
                Add to Google Calendar
              </a>
            )}
            {getICSUrl() && (
              <a
                href={getICSUrl()!}
                download={`${booking.event.title.replace(/[^a-z0-9]/gi, "_")}.ics`}
                className="text-xs underline opacity-80 hover:opacity-100"
              >
                Download calendar file
              </a>
            )}
          </div>
        )}
      </Alert>
    );
  }

  // REFUNDED or CANCELLED status
  if ((booking.status === "REFUNDED" || booking.status === "CANCELLED") && booking.payment) {
    const refundDate = booking.payment.refundedAt
      ? new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(booking.payment.refundedAt))
      : null;

    return (
      <Alert variant="error" title={booking.status === "REFUNDED" ? "Refunded" : "Cancelled"}>
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
      </Alert>
    );
  }

  return null;
}
