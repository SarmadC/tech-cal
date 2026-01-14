import { test, expect, type Page } from '@playwright/test';

const TEST_EMAIL = process.env.E2E_EMAIL ?? 'testuser-1760225317169@example.com';
const TEST_PASSWORD = process.env.E2E_PASSWORD ?? 'StrongPassword123';

async function ensureDiscoverReady(page: Page) {
  // Wait for discover page to load
  await expect(page).toHaveURL(/\/discover/, { timeout: 15000 });
  await page.waitForLoadState('networkidle');

  const discoveryContainer = page.locator('[data-view="discovery"], [data-view="discover-shell"]');
  if (await discoveryContainer.count()) {
    await expect(discoveryContainer.first()).toBeVisible({ timeout: 10000 });
  }

  const forYouHeading = page.getByRole('heading', { name: /For You/i });
  if (await forYouHeading.count()) {
    await expect(forYouHeading.first()).toBeVisible();
  }
}

test.describe('Golden Path', () => {
  test('user can sign in, reach discovery, and navigate core views', async ({ page, isMobile }) => {
    await test.step('Open login page', async () => {
      await page.goto('http://localhost:3000/login');
      await page.waitForLoadState('networkidle');
    });

    await test.step('Authenticate (or reuse existing session)', async () => {
      if (page.url().includes('/discover')) {
        await ensureDiscoverReady(page);
        return;
      }

      await page.waitForSelector('input[type="email"], input[name="email"]', { timeout: 15000 });
      await page.getByLabel(/Email address/i).fill(TEST_EMAIL);
      await page.getByLabel(/Password/i).fill(TEST_PASSWORD);
      await page.getByRole('button', { name: /^Sign In$/i }).click();
      await ensureDiscoverReady(page);
    });

    await test.step('Navigate to calendar and verify', async () => {
      // Navigate to calendar
      await page.goto('http://localhost:3000/calendar');
      await expect(page).toHaveURL(/\/calendar\?view=month/, { timeout: 15000 });
      await page.waitForLoadState('networkidle');

      // Wait for calendar content to load (wait for "Loading events..." to disappear)
      await page.getByText('Loading events...').waitFor({ state: 'hidden', timeout: 15000 }).catch(() => null);

      // Verify calendar is visible by checking for calendar grid content
      if (isMobile) {
        // Mobile view verification
        // Check for month name in the toolbar or header
        const currentMonth = new Date().toLocaleString('default', { month: 'long' });
        await expect(page.getByText(currentMonth).first()).toBeVisible({ timeout: 10000 });
      } else {
        // Desktop view verification
        await expect(page.getByRole('button', { name: 'Next month' }).or(page.getByRole('button', { name: 'Next period' }))).toBeVisible({ timeout: 10000 });
        await expect(page.getByText(/Today/)).toBeVisible({ timeout: 10000 });
      }
    });

    await test.step('Return to discover feed', async () => {
      await page.goto('http://localhost:3000/discover');
      await ensureDiscoverReady(page);
    });
  });
});
