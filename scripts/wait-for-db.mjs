#!/usr/bin/env node

/**
 * Wait for database to be ready before running migrations
 * Retries connection with exponential backoff
 */

const MAX_RETRIES = 30;
const INITIAL_DELAY = 1000; // 1 second
const MAX_DELAY = 10000; // 10 seconds

async function waitForDatabase() {
  // Use dynamic import for Prisma Client (CommonJS module)
  const { PrismaClient } = await import('@prisma/client');
  const prisma = new PrismaClient({
    log: ['error'],
  });

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      // Try a simple query to check database connectivity
      await prisma.$queryRaw`SELECT 1`;
      console.log('✓ Database is ready');
      await prisma.$disconnect();
      return true;
    } catch (error) {
      const delay = Math.min(INITIAL_DELAY * Math.pow(2, attempt - 1), MAX_DELAY);
      
      if (attempt < MAX_RETRIES) {
        console.log(`✗ Database not ready (attempt ${attempt}/${MAX_RETRIES}), retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        console.error('✗ Database connection failed after maximum retries');
        await prisma.$disconnect();
        throw error;
      }
    }
  }
}

waitForDatabase()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed to connect to database:', error.message);
    process.exit(1);
  });
