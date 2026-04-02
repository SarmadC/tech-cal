import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './vitest.setup.ts',
    testTimeout: 10000,
    include: [
      'packages/domain/src/**/*.test.ts',
      'packages/mobile-client/src/**/*.test.ts',
      'src/app/api/mobile/**/*.test.ts',
      'src/app/api/blocks/**/*.test.ts',
      'src/app/api/follows/**/*.test.ts',
      'src/app/api/profile/**/*.test.ts',
      'src/lib/apiAuth.test.ts',
      'src/lib/mobileSubscriptions.test.ts',
    ],
    exclude: [
      '**/node_modules/**',
      'apps/mobile/**',
      'playwright-report/**',
      'test-results/**',
      'coverage/**',
    ],
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    env: {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'test-anon-key',
      NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN || 'https://test@sentry.io/123456',
    },
  },
});
