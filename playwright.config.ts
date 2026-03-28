import { defineConfig } from '@playwright/test';
import dotenv from 'dotenv';

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
dotenv.config({ path: '.env.local' });

const playwrightPort = process.env.PLAYWRIGHT_PORT
    ? Number(process.env.PLAYWRIGHT_PORT)
    : 3000;
const playwrightWorkers = process.env.PLAYWRIGHT_WORKERS
    ? Number(process.env.PLAYWRIGHT_WORKERS)
    : 1;
const playwrightBaseUrl = `http://localhost:${playwrightPort}`;
const playwrightWebServerCommand =
    process.env.PLAYWRIGHT_WEB_SERVER_COMMAND ??
    `npm run start -- --port ${playwrightPort}`;

/**
 * See https://playwright.dev/docs/test-configuration.
 */

export default defineConfig({
    testDir: './tests',

    // vvv THIS IS THE LINE TO ADD vvv
    testMatch: /.*\.spec\.ts/,

    /* Run tests in files in parallel */
    fullyParallel: true,
    /* Fail the build on CI if you accidentally left test.only in the source code. */
    forbidOnly: !!process.env.CI,
    /* Retry on CI only */
    retries: process.env.CI ? 2 : 0,
    /* Opt out of parallel tests on CI. */
    workers: Number.isFinite(playwrightWorkers) && playwrightWorkers > 0 ? playwrightWorkers : 1,
    /* Reporter to use. See https://playwright.dev/docs/test-reporters */
    reporter: 'html',
    /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
    use: {
        /* Base URL to use in actions like `await page.goto('/')`. */
        baseURL: playwrightBaseUrl,

        /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
        trace: 'on-first-retry',
    },

    /* Configure projects for major browsers */
    projects: [
        {
            name: 'chromium',
            use: { 
                ...{ channel: 'chromium' },
            },
        },
    ],

    /* Optional: Run your local dev server before starting the tests */
    /* Optional: Run your local dev server before starting the tests */
    webServer: {
      command: playwrightWebServerCommand,
      url: playwrightBaseUrl,
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,
      env: {
        NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
        ...process.env as Record<string, string>,
      },
    },
});
