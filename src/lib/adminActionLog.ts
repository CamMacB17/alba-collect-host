import { prisma } from "@/lib/prisma";
import { createHash } from "crypto";

/**
 * Hash an admin token using SHA-256
 */
function hashAdminToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Log an admin action
 */
export async function logAdminAction(args: {
  eventId: string;
  adminToken: string;
  actionType: "EVENT_CLOSE" | "EVENT_REOPEN" | "REFUND_ALL" | "regenerate_admin_token" | "cancel_pledge" | "mark_paid" | "update_event_title" | "update_event_price" | "update_event_max_spots" | "refund_payment";
  metadata: Record<string, unknown>;
}): Promise<void> {
  const { eventId, adminToken, actionType, metadata } = args;

  const adminTokenHash = hashAdminToken(adminToken);

  await prisma.adminActionLog.create({
    data: {
      eventId,
      adminTokenHash,
      actionType,
      metadataJson: metadata as any, // Prisma Json type
    },
  });
}
