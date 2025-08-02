import { test, expect } from '@playwright/test';

test.describe('Golden Path: Full User Journey', () => {
    // Use a unique email for each test run to ensure a clean state
    const uniqueEmail = `testuser-${Date.now()}@example.com`;
    const password = 'StrongPassword123';
    const fullName = 'E2E Test User';
    // Pick an event that you know will be visible on the calendar page
    const eventToTrackTitle = 'Google I/O 2025';

    test('user can sign up, log out, log in, track an event, and see it on the dashboard', async ({ page }) => {

        // --- 1. SIGN UP ---
        console.log(`Running signup with email: ${uniqueEmail}`);
        await page.goto('/signup');
        await expect(page).toHaveTitle(/Create Next App/); // Or update to your app's title

        // Fill out the registration form
        await page.getByLabel('Full name *').fill(fullName);
        await page.getByLabel('Email address *').fill(uniqueEmail);
        await page.getByLabel('Password *').fill(password);
        await page.getByLabel('Confirm Password *').fill(password);
        await page.getByLabel(/i agree to the/i).check();

        // Click the create account button and wait for the navigation
        await page.getByRole('button', { name: 'Create account' }).click();

        // Since email confirmation is off, Supabase logs us in and redirects.
        // We should land on the dashboard.
        await expect(page).toHaveURL('/dashboard', { timeout: 10000 }); // Increase timeout for the first load
        await expect(page.getByRole('heading', { name: `Good morning, ${fullName.split(' ')[0]}!` })).toBeVisible();
        console.log('Signup and redirect to dashboard successful.');

        // --- 2. SIGN OUT (to test the login flow) ---
        await page.getByRole('button', { name: fullName }).click(); // Click user menu
        await page.getByRole('button', { name: 'Sign Out' }).click();
        await expect(page).toHaveURL('/login');
        console.log('Sign out successful.');

        // --- 3. LOG IN ---
        await page.getByLabel('Email address').fill(uniqueEmail);
        await page.getByLabel('Password').fill(password);
        await page.getByRole('button', { name: 'Sign in' }).click();

        // We should be redirected back to the dashboard.
        await expect(page).toHaveURL('/dashboard');
        await expect(page.getByRole('heading', { name: `Good morning, ${fullName.split(' ')[0]}!` })).toBeVisible();
        console.log('Login successful.');

        // --- 4. TRACK AN EVENT ---
        // Navigate to the main calendar view. Use `first()` in case the link appears in multiple places (e.g., nav and body).
        await page.getByRole('link', { name: 'Calendar' }).first().click();
        await expect(page).toHaveURL('/calendar');

        // Wait for a specific, known event to be visible, ensuring the calendar has loaded.
        await expect(page.getByText(eventToTrackTitle)).toBeVisible({ timeout: 15000 }); // Longer timeout for data fetching

        // Click the event to open its detail panel.
        await page.getByText(eventToTrackTitle).click();
        await expect(page.getByRole('heading', { name: 'Event Details' })).toBeVisible();

        // Click the "Bookmark" button to track the event.
        await page.getByRole('button', { name: 'Bookmark' }).click();

        // Assert that the UI updates to show the event is now tracked.
        await expect(page.getByText('Tracked as bookmarked')).toBeVisible();
        console.log(`Event "${eventToTrackTitle}" tracked successfully.`);

        // --- 5. VERIFY ON DASHBOARD ---
        await page.getByRole('link', { name: 'Dashboard' }).first().click();
        await expect(page).toHaveURL('/dashboard');

        // Find the "Your Upcoming Events" section and verify our tracked event is listed inside it.
        // Scoping the search to a specific card makes the test more reliable.
        const upcomingEventsCard = page.locator('div:has(>div>h3:has-text("Your Upcoming Events"))');
        await expect(upcomingEventsCard).toContainText(eventToTrackTitle);
        console.log('Verified tracked event appears on the dashboard. Golden Path test complete!');
    });
});