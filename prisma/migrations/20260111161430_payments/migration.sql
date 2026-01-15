/*
  Warnings:

  - The values [PENDING,FAILED,REFUNDED] on the enum `PaymentStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `payerEmail` on the `Payment` table. All the data in the column will be lost.
  - You are about to drop the column `payerName` on the `Payment` table. All the data in the column will be lost.
  - You are about to drop the column `stripeCheckoutSessionId` on the `Payment` table. All the data in the column will be lost.
  - Added the required column `email` to the `Payment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `Payment` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "public"."PaymentStatus_new" AS ENUM ('PLEDGED', 'PAID', 'CANCELLED');
ALTER TABLE "public"."Payment" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "public"."Payment" ALTER COLUMN "status" TYPE "public"."PaymentStatus_new" USING ("status"::text::"public"."PaymentStatus_new");
ALTER TYPE "public"."PaymentStatus" RENAME TO "PaymentStatus_old";
ALTER TYPE "public"."PaymentStatus_new" RENAME TO "PaymentStatus";
DROP TYPE "public"."PaymentStatus_old";
ALTER TABLE "public"."Payment" ALTER COLUMN "status" SET DEFAULT 'PLEDGED';
COMMIT;

-- AlterTable
ALTER TABLE "public"."Payment" DROP COLUMN "payerEmail",
DROP COLUMN "payerName",
DROP COLUMN "stripeCheckoutSessionId",
ADD COLUMN     "email" TEXT NOT NULL,
ADD COLUMN     "name" TEXT NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'PLEDGED';
