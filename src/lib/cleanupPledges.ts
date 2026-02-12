import { prisma } from "@/lib/prisma";
import { assertValidPaymentTransition } from "@/lib/paymentTransitions";
import { logger, generateCorrelationId } from "@/lib/logger";
import { checkDbHealth } from "@/lib/db-health";

export async function cleanupPledges(): Promise<number> {
  const correlationId = generateCorrelationId();

  // Check database health before proceeding
  const dbHealth = await checkDbHealth();
  if (!dbHealth.ok) {
    const errorMsg = dbHealth.message || "";
    const isUnreachable = errorMsg.includes("Database unreachable") || 
                         errorMsg.includes("Can't reach database server") ||
                         errorMsg.includes("ECONNREFUSED");
    
    if (isUnreachable) {
      logger.error("Cleanup skipped: database unreachable", { correlationId });
      throw new Error("DATABASE_UNREACHABLE");
    }
    // Other errors - still throw but with original message
    logger.error("Cleanup skipped: database health check failed", { correlationId, error: errorMsg });
    throw new Error(`DATABASE_ERROR: ${errorMsg}`);
  }

  const cutoff = new Date(Date.now() - 30 * 60 * 1000);

  // Find PLEDGED payments older than cutoff
  // Only select fields we need to avoid any relation or field access issues
  const oldPledges = await prisma.payment.findMany({
    where: {
      status: "PLEDGED",
      createdAt: {
        lt: cutoff,
      },
    },
    select: {
      id: true,
      status: true,
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
