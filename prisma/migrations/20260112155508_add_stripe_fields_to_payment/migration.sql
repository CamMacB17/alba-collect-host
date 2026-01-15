-- AlterTable
ALTER TABLE "public"."Payment" ADD COLUMN     "amountPenceCaptured" INTEGER,
ADD COLUMN     "paidAt" TIMESTAMP(3),
ADD COLUMN     "stripeCheckoutSessionId" TEXT,
ADD COLUMN     "stripePaymentIntentId" TEXT;
