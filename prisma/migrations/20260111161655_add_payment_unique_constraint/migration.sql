ALTER TABLE "Payment" ADD CONSTRAINT "Payment_eventId_email_key" UNIQUE ("eventId", "email");
