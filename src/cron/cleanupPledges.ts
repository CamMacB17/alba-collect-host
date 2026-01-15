import { prisma } from "@/lib/prisma";
import { cleanupPledges } from "@/lib/cleanupPledges";

async function main() {
  try {
    const cleaned = await cleanupPledges();
    console.log(`cleaned=${cleaned}`);
    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error("Error cleaning up pledges:", error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

main();
