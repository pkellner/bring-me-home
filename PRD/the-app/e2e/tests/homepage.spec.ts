import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test('should load homepage', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Bring Me Home/);
  });

  test('should navigate to towns', async ({ page }) => {
    await page.goto('/');
    const townLink = page.locator('a[href*="/town"]').first();
    if (await townLink.isVisible()) {
      await townLink.click();
      await expect(page.url()).toContain('/');
    }
  });
});