-- CreateIndex
CREATE INDEX "Payment_eventId_idx" ON "public"."Payment"("eventId");

-- CreateIndex
CREATE INDEX "Payment_status_idx" ON "public"."Payment"("status");

-- CreateIndex
CREATE INDEX "Payment_createdAt_idx" ON "public"."Payment"("createdAt");
