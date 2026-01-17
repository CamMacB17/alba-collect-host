-- DropIndex
DROP INDEX "public"."AdminToken_eventId_key";

-- CreateIndex
CREATE INDEX "AdminToken_eventId_idx" ON "public"."AdminToken"("eventId");
