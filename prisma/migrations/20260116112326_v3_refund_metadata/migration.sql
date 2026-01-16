-- AlterTable
ALTER TABLE "public"."Payment" ADD COLUMN     "refundedAt" TIMESTAMP(3),
ADD COLUMN     "stripeRefundId" TEXT;
