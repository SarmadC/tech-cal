import { expect, test, type Locator, type Page } from '@playwright/test';

const TEST_EMAIL = process.env.E2E_EMAIL ?? 'testuser-1760225317169@example.com';
const TEST_PASSWORD = process.env.E2E_PASSWORD ?? 'StrongPassword123';
const TEST_ONBOARDING_EMAIL = process.env.E2E_ONBOARDING_EMAIL ?? 'testuser-1760225110319@example.com';
const TEST_ONBOARDING_PASSWORD = process.env.E2E_ONBOARDING_PASSWORD ?? process.env.E2E_PASSWORD ?? 'StrongPassword123';

const viewports = [
    { name: 'phone-320', width: 320, height: 568 },
    { name: 'phone-360', width: 360, height: 800 },
    { name: 'phone-390', width: 390, height: 844 },
    { name: 'phone-430', width: 430, height: 932 },
] as const;

async function settle(page: Page) {
    await page.waitForLoadState('domcontentloaded');
    await page.waitForLoadState('networkidle').catch(() => null);
}

async function assertNoHorizontalOverflow(page: Page) {
    const result = await page.evaluate(() => ({
        doc: document.documentElement.scrollWidth,
        body: document.body.scrollWidth,
        width: window.innerWidth,
    }));

    expect(result.doc, `document scroll width ${result.doc} should fit viewport ${result.width}`).toBeLessThanOrEqual(result.width + 1);
    expect(result.body, `body scroll width ${result.body} should fit viewport ${result.width}`).toBeLessThanOrEqual(result.width + 1);
}

async function assertBottomReachable(page: Page) {
    await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'auto' }));

    const gap = await page.evaluate(() =>
        Math.abs(document.documentElement.scrollHeight - (window.scrollY + window.innerHeight))
    );

    expect(gap).toBeLessThanOrEqual(4);
}

async function expectVisibleWithoutOverlap(locator: Locator, page: Page) {
    await expect(locator).toBeVisible();
    const box = await locator.boundingBox();
    expect(box).not.toBeNull();
    const viewport = page.viewportSize();

    if (!box || !viewport) {
        return;
    }

    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
}

async function login(page: Page, email: string, password: string) {
    await page.goto('/login');
    await settle(page);

    if (page.url().includes('/discover')) {
        return;
    }

    await page.getByLabel(/Email address/i).fill(email);
    await page.getByLabel(/Password/i).fill(password);
    await page.getByRole('button', { name: /^Sign In$/i }).click();
    await expect(page).toHaveURL(/\/discover/, { timeout: 20000 });
    await settle(page);
}

async function loginFromOnboardingDeepLink(page: Page) {
    await page.goto('/onboarding/career?from=protected');
    await settle(page);

    if (page.url().includes('/login')) {
        await page.getByLabel(/Email address/i).fill(TEST_ONBOARDING_EMAIL);
        await page.getByLabel(/Password/i).fill(TEST_ONBOARDING_PASSWORD);
        await page.getByRole('button', { name: /^Sign In$/i }).click();
        await expect(page).toHaveURL(/\/onboarding\/career\?from=protected/, { timeout: 20000 });
        await settle(page);
    }
}

async function assertFilterPanelFitsViewport(page: Page, triggerLabel: string, panel: Locator, closeLabel: string) {
    await page.getByLabel(triggerLabel).click();
    await expect(panel).toBeVisible();

    const viewport = page.viewportSize();
    const box = await panel.boundingBox();
    expect(box).not.toBeNull();

    if (box && viewport) {
        expect(box.height).toBeLessThanOrEqual(viewport.height);
    }

    const scrollInfo = await panel.evaluate((node) => ({
        clientHeight: (node as HTMLElement).clientHeight,
        scrollHeight: (node as HTMLElement).scrollHeight,
    }));

    expect(scrollInfo.scrollHeight).toBeGreaterThanOrEqual(scrollInfo.clientHeight);
    await page.getByRole('button', { name: closeLabel }).click();
    await expect(panel).not.toBeVisible();
}

async function assertPublicRoutes(page: Page) {
    await page.goto('/');
    await settle(page);
    await expectVisibleWithoutOverlap(page.locator('h1').first(), page);
    await assertNoHorizontalOverflow(page);
    await assertBottomReachable(page);

    await page.goto('/pricing');
    await settle(page);
    await expectVisibleWithoutOverlap(page.getByRole('heading', { level: 1, name: /Start for free/i }), page);
    await assertNoHorizontalOverflow(page);
    await assertBottomReachable(page);

    await page.goto('/blog');
    await settle(page);
    await expectVisibleWithoutOverlap(page.getByRole('heading', { level: 1, name: /Writing/i }), page);
    await assertNoHorizontalOverflow(page);
    await assertBottomReachable(page);

    await page.goto('/events');
    await settle(page);
    await expectVisibleWithoutOverlap(page.getByRole('heading', { name: /^Events$/i }), page);
    await assertNoHorizontalOverflow(page);
    await assertFilterPanelFitsViewport(
        page,
        'Open filters',
        page.getByRole('heading', { name: 'Filters' }).locator('..').locator('..'),
        'Close'
    );
    await assertBottomReachable(page);

    const eventHref = await page.evaluate(() => {
        const link = document.querySelector('section[aria-label="Upcoming tech events"] a[href^="/events/"]') as HTMLAnchorElement | null;
        return link?.getAttribute('href');
    });

    expect(eventHref).toBeTruthy();
    await page.goto(eventHref!);
    await settle(page);
    await expectVisibleWithoutOverlap(page.locator('h1').first(), page);
    await assertNoHorizontalOverflow(page);

    await page.goto('/login');
    await settle(page);
    await expectVisibleWithoutOverlap(page.getByRole('heading', { name: /Welcome back/i }), page);
    await assertNoHorizontalOverflow(page);

    await page.goto('/signup');
    await settle(page);
    await expectVisibleWithoutOverlap(page.getByRole('heading', { name: /Create your account/i }), page);
    await assertNoHorizontalOverflow(page);

    await page.goto('/contact');
    await settle(page);
    await expectVisibleWithoutOverlap(page.getByRole('heading', { level: 1, name: /Hello, how can we help\?/i }), page);
    await assertNoHorizontalOverflow(page);
    await assertBottomReachable(page);

    await page.goto('/resources/cfp-calendar');
    await settle(page);
    await expectVisibleWithoutOverlap(page.getByRole('heading', { level: 1, name: /Call for Papers Deadlines/i }), page);
    await assertNoHorizontalOverflow(page);
    await assertBottomReachable(page);

    await page.goto('/resources/tech-events-calendar-2026');
    await settle(page);
    await expectVisibleWithoutOverlap(page.getByRole('heading', { level: 1, name: /The Complete Tech Calendar for 2026/i }), page);
    await assertNoHorizontalOverflow(page);
    await assertBottomReachable(page);
}

async function assertAuthenticatedRoutes(page: Page) {
    await login(page, TEST_EMAIL, TEST_PASSWORD);

    await page.goto('/discover');
    await settle(page);
    await expectVisibleWithoutOverlap(page.getByTestId('mobile-discovery-header'), page);
    await assertNoHorizontalOverflow(page);
    await assertFilterPanelFitsViewport(
        page,
        'Open filters',
        page.getByRole('dialog', { name: 'Refine your feed' }),
        'Close'
    );
    await assertBottomReachable(page);

    await page.goto('/calendar?view=month');
    await settle(page);
    await expect(page.getByRole('main', { name: 'Mobile calendar month view' })).toBeVisible();
    await assertNoHorizontalOverflow(page);
    await assertBottomReachable(page);

    await page.goto('/dashboard');
    await settle(page);
    await expect(page.locator('.mobile-dashboard-page')).toBeVisible();
    await assertNoHorizontalOverflow(page);
    await assertBottomReachable(page);

    await page.goto('/dashboard/settings');
    await settle(page);
    await expectVisibleWithoutOverlap(page.getByRole('heading', { name: 'Settings' }), page);
    await assertNoHorizontalOverflow(page);
    await assertBottomReachable(page);

    await page.goto('/community');
    await settle(page);
    await expectVisibleWithoutOverlap(page.getByRole('heading', { name: /Community/i }).first(), page);
    await assertNoHorizontalOverflow(page);
    await assertBottomReachable(page);

    const circleHref = await page.evaluate(() => {
        const link = document.querySelector('a[href^="/circle/"]') as HTMLAnchorElement | null;
        return link?.getAttribute('href');
    });

    expect(circleHref).toBeTruthy();
    await page.goto(circleHref!);
    await settle(page);
    await expect(page.locator('main')).toBeVisible();
    await assertNoHorizontalOverflow(page);
    await assertBottomReachable(page);

    const circlePostHref = await page.evaluate(() => {
        const link = document.querySelector('a[href*="/posts/"]') as HTMLAnchorElement | null;
        return link?.getAttribute('href');
    });

    expect(circlePostHref).toBeTruthy();
    await page.goto(circlePostHref!);
    await settle(page);
    await expect(page.locator('main')).toBeVisible();
    await assertNoHorizontalOverflow(page);
    await assertBottomReachable(page);

    await page.goto('/hackathons');
    await settle(page);
    await expectVisibleWithoutOverlap(page.getByRole('heading', { name: /Hackathons/i }).first(), page);
    await assertNoHorizontalOverflow(page);
    await assertBottomReachable(page);
}

async function assertOnboardingRoute(page: Page) {
    await loginFromOnboardingDeepLink(page);
    await expectVisibleWithoutOverlap(
        page.getByRole('heading', { name: /let's personalize your experience/i }),
        page
    );
    await assertNoHorizontalOverflow(page);
    await assertBottomReachable(page);
}

test.describe('mobile responsiveness', () => {
    test.setTimeout(360_000);

    for (const viewport of viewports) {
        test(`${viewport.name} public routes stay usable`, async ({ page }) => {
            await page.setViewportSize({ width: viewport.width, height: viewport.height });
            await assertPublicRoutes(page);
        });

        test(`${viewport.name} authenticated routes stay usable`, async ({ page }) => {
            await page.setViewportSize({ width: viewport.width, height: viewport.height });
            await assertAuthenticatedRoutes(page);
        });

        test(`${viewport.name} onboarding stays usable`, async ({ page }) => {
            await page.setViewportSize({ width: viewport.width, height: viewport.height });
            await assertOnboardingRoute(page);
        });
    }
});
