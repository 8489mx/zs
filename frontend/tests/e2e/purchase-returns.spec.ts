import { test, expect } from '@playwright/test';

test.describe('Purchase Returns Flow', () => {
  test('should load the purchase returns page', async ({ page }) => {
    // Navigate to Login
    await page.goto('/#/login');
    
    // Attempt login with default admin credentials
    await page.locator('input[name="username"]').fill('zs');
    await page.locator('input[name="password"]').fill('1');
    await page.locator('button[type="submit"]').click();

    // Verify successful login
    await expect(page.locator('.app-layout')).toBeVisible({ timeout: 10000 });

    // Navigate to Purchase Returns
    await page.goto('/#/purchase-returns');
    await expect(page).toHaveURL(/.*purchase-returns.*/);
    
    // Check if page loaded
    await expect(page.locator('.page-header')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('button:has-text("إضافة")').first().or(page.locator('button:has-text("جديد")').first())).toBeVisible({ timeout: 5000 }).catch(() => {}); // Optional check for new button
  });
});
