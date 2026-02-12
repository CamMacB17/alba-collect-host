#!/usr/bin/env node

/**
 * Start script that attempts migrations but doesn't fail if database isn't ready
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function start() {
  // Log database hostname (redacted credentials)
  try {
    const dbUrl = process.env.DATABASE_URL;
    if (dbUrl) {
      const hostname = new URL(dbUrl).hostname;
      console.log(`DB host: ${hostname}`);
    } else {
      console.log('DB host: MISSING');
    }
  } catch (error) {
    console.log('DB host: MISSING');
  }

  console.log('Attempting to run database migrations...');
  
  try {
    await execAsync('npx prisma migrate deploy');
    console.log('✓ Migrations completed successfully');
  } catch (error) {
    console.warn('⚠ Migrations skipped (database may not be ready)');
  }

  console.log('Starting Next.js application...');
  
  // Start Next.js using spawn to keep it in foreground
  const { spawn } = await import('child_process');
  const nextProcess = spawn('next', ['start'], {
    stdio: 'inherit',
    shell: true,
  });

  nextProcess.on('error', (error) => {
    console.error('Failed to start Next.js:', error);
    process.exit(1);
  });

  nextProcess.on('exit', (code, signal) => {
    if (code !== null) {
      process.exit(code);
    } else if (signal) {
      process.kill(process.pid, signal);
    }
  });

  // Forward termination signals
  process.on('SIGTERM', () => nextProcess.kill('SIGTERM'));
  process.on('SIGINT', () => nextProcess.kill('SIGINT'));
}

start().catch((error) => {
  console.error('Start script error:', error);
  process.exit(1);
});
