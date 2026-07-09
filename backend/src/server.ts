import dotenv from 'dotenv';
import { execSync } from 'child_process';
import app from './app';

dotenv.config();

// Run Prisma generate and db push only when NOT running on Vercel (e.g. local or Plesk)
if (!process.env.VERCEL) {
  try {
    console.log('[Prisma] Auto-generating client on startup...');
    execSync('npx prisma generate', { stdio: 'inherit' });
    console.log('[Prisma] Auto-syncing database schema...');
    execSync('npx prisma db push', { stdio: 'inherit' });
    console.log('[Prisma] Database schema synced successfully!');
  } catch (error) {
    console.error('[Prisma] Failed to sync database schema:', error);
  }
}

// Only listen to port locally/Plesk (Vercel routes requests directly)
if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 5001;
  app.listen(PORT, () => {
    console.log(`[Server] AI Career Copilot running on http://localhost:${PORT}`);
  });
}

// Export the app handler for Vercel Serverless Functions
export default app;
