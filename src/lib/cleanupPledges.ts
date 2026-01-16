import { prisma } from "@/lib/prisma";
import { assertValidTransition } from "@/lib/paymentTransitions";

export async function cleanupPledges(): Promise<number> {
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
      assertValidTransition(payment.status, "CANCELLED");

      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: "CANCELLED" },
      });

      cleaned++;
    } catch (err) {
      // Log error but continue processing other payments
      console.error(`[cleanupPledges] Failed to cancel payment ${payment.id}:`, err);
    }
  }

  return cleaned;
}
