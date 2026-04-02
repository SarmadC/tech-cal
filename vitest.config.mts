// vitest.config.mts

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
        exclude: ['**/node_modules/**', '**/tests/**/*.spec.ts'],
        alias: {
            '@': path.resolve(__dirname, './src'),
            '@kurecal/domain': path.resolve(__dirname, './packages/domain/src/index.ts'),
        },

        env: {
            NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321',
            NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'test-anon-key',
            NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN || 'https://test@sentry.io/123456',
        }
    },
});
