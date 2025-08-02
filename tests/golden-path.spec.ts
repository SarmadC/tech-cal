import { test, expect } from '@playwright/test';

test.describe('Golden Path: Full User Journey', () => {
    const uniqueEmail = `testuser-${Date.now()}@example.com`;
    const password = 'StrongPassword123';
    const fullName = 'E2E Test User';
    const userFirstName = fullName.split(' ')[0];

    test('user can sign up, log out, log in, track an event, and see it on the dashboard', async ({ page }) => {

        // --- AUTHENTICATION & TRACKING (ALL WORKING) ---
        console.log(`Running signup with email: ${uniqueEmail}`);
        await page.goto('http://localhost:3000/signup');
        await page.getByLabel('Full name *').fill(fullName);
        await page.getByLabel('Email address *').fill(uniqueEmail);
        await page.getByLabel('Password *', { exact: true }).fill(password);
        await page.getByLabel('Confirm Password *').fill(password);
        await page.getByLabel(/i agree to the/i).check();
        await page.getByRole('button', { name: 'Create account' }).click();
        await expect(page).toHaveURL(/.*\/dashboard/, { timeout: 10000 });
        const greetingLocator = page.getByRole('heading', { name: new RegExp(`Good (morning|afternoon|evening), ${userFirstName}!`, 'i') });
        await expect(greetingLocator).toBeVisible();
        console.log('Signup and redirect to dashboard successful.');

        await page.getByRole('button', { name: fullName }).click();
        await page.getByRole('button', { name: 'Sign Out' }).click();
        await expect(page).toHaveURL(/.*\/login/);
        console.log('Sign out successful.');

        await page.getByLabel('Email address').fill(uniqueEmail);
        await page.getByLabel('Password').fill(password);
        await page.getByRole('button', { name: 'Sign in' }).click();
        await expect(page).toHaveURL(/.*\/dashboard/);
        await expect(greetingLocator).toBeVisible();
        console.log('Login successful.');

        const navBar = page.getByRole('navigation');
        await navBar.getByRole('link', { name: 'Calendar', exact: true }).click();
        await expect(page).toHaveURL(/.*\/calendar/);

        console.log('Switching to Monthly view to find events...');
        const eventsRequestPromise = page.waitForResponse(resp => resp.url().includes('/rest/v1/events') && resp.status() === 200);
        await page.getByRole('button', { name: 'month' }).click();
        await eventsRequestPromise;
        console.log('Monthly event data loaded.');

        const firstEventLocator = page.locator('.fc-event').first();
        await expect(firstEventLocator).toBeVisible({ timeout: 5000 });
        const eventTitleLocator = firstEventLocator.locator('p').first();
        const eventToTrackTitle = await eventTitleLocator.textContent();
        expect(eventToTrackTitle).not.toBeNull();
        console.log(`Found event to track: "${eventToTrackTitle}"`);

        await firstEventLocator.click();
        await expect(page.getByRole('heading', { name: 'Event Details' })).toBeVisible();

        const statusRefetchPromise = page.waitForResponse(resp => resp.url().includes('/rest/v1/user_events') && resp.request().method() === 'GET');
        await page.getByRole('button', { name: 'Bookmark' }).click();
        await statusRefetchPromise;
        await expect(page.getByText('Tracked as bookmarked')).toBeVisible();
        console.log(`Event "${eventToTrackTitle}" tracked successfully.`);

        // --- 5. VERIFY ON DASHBOARD ---
        await page.getByRole('link', { name: 'Go to Dashboard' }).click();
        await expect(page).toHaveURL(/.*\/dashboard/);

        // vvv THIS IS THE FINAL FIX vvv
        // 1. Find the "Your Upcoming Events" title. This confirms the card is starting to render.
        const cardTitle = page.getByText('Your Upcoming Events');
        await expect(cardTitle).toBeVisible();

        // 2. Find the parent <Card> element by working up from the title.
        //    'div >> nth=1' gets the parent div (CardHeader), and another gets the main Card div.
        //    This is a robust way to select the entire card component.
        const upcomingEventsCard = cardTitle.locator('.. >> ..');

        // 3. Assert that this card contains the text of the event we tracked.
        await expect(upcomingEventsCard).toContainText(eventToTrackTitle!);
        console.log('Verified tracked event appears on the dashboard. Golden Path test complete! 🏆');
    });
});