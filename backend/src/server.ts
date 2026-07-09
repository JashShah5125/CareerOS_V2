import dotenv from 'dotenv';
import { execSync } from 'child_process';

dotenv.config();

// Run Prisma generate and db push automatically on startup before loading the app
try {
  console.log('[Prisma] Auto-generating client on startup...');
  execSync('npx prisma generate', { stdio: 'inherit' });
  console.log('[Prisma] Auto-syncing database schema...');
  execSync('npx prisma db push', { stdio: 'inherit' });
  console.log('[Prisma] Database schema synced successfully!');
} catch (error) {
  console.error('[Prisma] Failed to sync database schema:', error);
}

// Load the app dynamically after Prisma client is generated
import('./app').then(({ default: app }) => {
  const PORT = process.env.PORT || 5001;
  app.listen(PORT, () => {
    console.log(`[Server] AI Career Copilot running on http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('[Server] Failed to load application:', err);
});
