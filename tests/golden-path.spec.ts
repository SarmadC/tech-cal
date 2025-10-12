import { test, expect } from '@playwright/test';

/**
 * PREREQUISITE: Create a test account manually in Supabase
 * 
 * 1. Go to Supabase Dashboard → Authentication → Users
 * 2. Click "Add User" → "Create new user"
 * 3. Email: e2e-test@yourdomain.com (use your actual domain)
 * 4. Password: TestPassword123!
 * 5. Auto Confirm User: YES (check this box)
 * 6. Save
 * 
 * Update the credentials below to match your test account.
 */

test.describe('Golden Path: Full User Journey', () => {
    // Using existing confirmed test account from Supabase
    const testEmail = 'testuser-1760225317169@example.com';
    const password = 'StrongPassword123';
    const fullName = 'E2E Test User';

    test('user can log in and verify routing changes work', async ({ page }) => {

        // --- AUTHENTICATION & ROUTING VERIFICATION ---
        // Try to access login page - might already be authenticated
        await page.goto('http://localhost:3000/login');
        await page.waitForLoadState('networkidle');
        
        console.log('Initial URL after login page load:', page.url());
        
        // Check if already authenticated and redirected
        if (page.url().includes('/discover')) {
            console.log('Already authenticated - redirected to discover page');
            // Already logged in, verify we're on discover page
            await expect(page).toHaveURL(/.*\/discover/);
            await expect(page.getByRole('heading', { name: 'For You' })).toBeVisible();
            console.log('✅ Already authenticated - routing changes verified!');
        } else {
            console.log('Not authenticated - proceeding with login');
            // Need to log in
            await page.waitForSelector('input[type="email"], input[name="email"]', { timeout: 15000 });
            
            await page.getByLabel('Email address').fill(testEmail);
            await page.getByLabel('Password').fill(password);
            await page.getByRole('button', { name: 'Sign In' }).click();
            
            // Wait for redirect after login
            await expect(page).toHaveURL(/.*\/discover/, { timeout: 10000 });
            await expect(page.getByRole('heading', { name: 'For You' })).toBeVisible();
            console.log('✅ Login successful - routing changes verified!');
        }

        // Test calendar route fix (quick navigation test)
        console.log('Testing calendar route redirect...');
        await page.goto('http://localhost:3000/calendar');
        await expect(page).toHaveURL(/.*\/calendar\?view=month/);
        console.log('✅ Calendar route redirect working!');

        // Test discover navigation
        console.log('Testing discover navigation...');
        await page.goto('http://localhost:3000/discover');
        await expect(page).toHaveURL(/.*\/discover/);
        await expect(page.getByRole('heading', { name: 'For You' })).toBeVisible();
        console.log('✅ Discover navigation working!');

        console.log('🎉 All core routing changes verified successfully!');
    });
});