"use client";

import { useState } from "react";
import BookingConfirmation from "./BookingConfirmation";
import JoinAndPayClient from "./JoinAndPayClient";
import Card from "@/components/ui/Card";

type BookingWrapperProps = {
  sessionId: string;
  slug: string;
  isFull: boolean;
  isClosed: boolean;
};

export default function BookingWrapper({ sessionId, slug, isFull, isClosed }: BookingWrapperProps) {
  const [bookingFound, setBookingFound] = useState<boolean | null>(null);

  const handleBookingResolved = (found: boolean) => {
    setBookingFound(found);
  };

  return (
    <>
      <BookingConfirmation sessionId={sessionId} onBookingResolved={handleBookingResolved} />
      {bookingFound === false && !isClosed && !isFull && (
        <Card>
          <JoinAndPayClient slug={slug} isFull={isFull} isClosed={isClosed} />
        </Card>
      )}
    </>
  );
}
