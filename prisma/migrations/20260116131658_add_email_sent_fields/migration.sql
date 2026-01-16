-- AlterTable
ALTER TABLE "public"."Payment" ADD COLUMN     "receiptEmailSentAt" TIMESTAMP(3),
ADD COLUMN     "refundEmailSentAt" TIMESTAMP(3);
