import { prisma } from "@/lib/prisma";
import { assertValidPaymentTransition } from "@/lib/paymentTransitions";
import { logger, generateCorrelationId } from "@/lib/logger";

export async function cleanupPledges(): Promise<number> {
  const correlationId = generateCorrelationId();
  const cutoff = new Date(Date.now() - 30 * 60 * 1000);

  // Find PLEDGED payments older than cutoff
  const oldPledges = await prisma.payment.findMany({
    where: {
      status: "PLEDGED",
      createdAt: {
        lt: cutoff,
      },
    },
  });

  let cleaned = 0;

  // Update each payment individually with transition validation
  for (const payment of oldPledges) {
    try {
      // Validate transition: only allow PLEDGED -> CANCELLED
      assertValidPaymentTransition(payment.status, "CANCELLED");

      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: "CANCELLED" },
      });

      cleaned++;
    } catch (err) {
      // Log error but continue processing other payments
      logger.error("Failed to cancel payment", { correlationId, paymentId: payment.id, error: err });
    }
  }

  logger.info("Cleanup pledges completed", { correlationId, cleaned, total: oldPledges.length });
  return cleaned;
}
