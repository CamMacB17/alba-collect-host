import { prisma } from "@/lib/prisma";

export async function cleanupPledges(): Promise<number> {
  const cutoff = new Date(Date.now() - 30 * 60 * 1000);

  const result = await prisma.payment.updateMany({
    where: {
      status: "PLEDGED",
      createdAt: {
        lt: cutoff,
      },
    },
    data: {
      status: "CANCELLED",
    },
  });

  return result.count;
}
