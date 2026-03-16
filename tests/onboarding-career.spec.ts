import { test, expect, type Page } from '@playwright/test';

const TEST_EMAIL = process.env.E2E_ONBOARDING_EMAIL ?? 'testuser-1760225110319@example.com';
const TEST_PASSWORD = process.env.E2E_ONBOARDING_PASSWORD ?? process.env.E2E_PASSWORD ?? 'StrongPassword123';

async function loginFromProtectedDeepLink(page: Page) {
  await page.goto('http://localhost:3000/onboarding/career?from=protected');
  await page.waitForLoadState('networkidle');

  if (page.url().includes('/login')) {
    await page.getByLabel(/Email address/i).fill(TEST_EMAIL);
    await page.getByLabel(/Password/i).fill(TEST_PASSWORD);
    await page.getByRole('button', { name: /^Sign In$/i }).click();
    await page.waitForLoadState('networkidle');
  }

  await expect(page).toHaveURL(/\/onboarding\/career\?from=protected/, { timeout: 15000 });
}

test.describe('Career onboarding', () => {
  test('returns to onboarding from the protected deep link and uses the native role dropdown', async ({ page }) => {
    await loginFromProtectedDeepLink(page);

    await expect(page.getByRole('heading', { name: /let's personalize your experience/i })).toBeVisible();
    await page.getByRole('button', { name: /get started/i }).click();

    const roleSelect = page.locator('select#current-role');
    await roleSelect.selectOption('Software Engineer');
    await expect(roleSelect).toHaveValue('Software Engineer');

    await page.getByRole('button', { name: /individual contributor/i }).click();
    await page.locator('label').filter({ hasText: /^Mid-level/ }).click();

    const continueButton = page.getByRole('button', { name: /continue/i });
    await expect(continueButton).toBeEnabled();
  });

  test('rehydrates legacy optional progress into step 3 with inline preferences on desktop', async ({ page }) => {
    await loginFromProtectedDeepLink(page);

    await page.evaluate(() => {
      localStorage.setItem('career-onboarding-step', '5');
      localStorage.setItem('career-onboarding-data', JSON.stringify({
        step1_role: {
          currentRole: 'Software Engineer',
          seniority: 'mid-level',
        },
        step2_skills: {
          primarySkills: ['React', 'TypeScript'],
          skillsToLearn: [],
          interests: [],
          skillTags: [
            {
              skill: 'React',
              proficiency: 'advanced',
              yearsOfExperience: 5,
              lastUsed: new Date().toISOString(),
              category: 'Frontend',
              order: 0,
            },
            {
              skill: 'TypeScript',
              proficiency: 'advanced',
              yearsOfExperience: 5,
              lastUsed: new Date().toISOString(),
              category: 'Frontend',
              order: 1,
            },
          ],
        },
        step3_goals: {
          careerGoals: ['networking'],
          timeframe: 'medium-term',
        },
        step4_preferences: {
          learningStyle: ['hands-on'],
        },
        step5_networking: {
          networkingGoals: ['find-peers'],
          preferredEventTypes: [],
        },
      }));
    });

    await page.goto('http://localhost:3000/onboarding/career?from=protected');
    await page.waitForLoadState('networkidle');

    await expect(page.getByLabel('Step 3: Goals')).toHaveAttribute('aria-current', 'step');
    await expect(page.getByLabel('Step 4: Learning')).toHaveCount(0);
    await expect(page.getByText('Step 3 of 3')).toBeVisible();
    await expect(page.getByText('Learning preferences')).toBeVisible();
    await expect(page.getByText('Networking preferences')).toBeVisible();
    await expect(page.getByText('Team preferences')).toBeVisible();
    await expect(page.getByText('Preferred formats')).toBeVisible();
  });
});
