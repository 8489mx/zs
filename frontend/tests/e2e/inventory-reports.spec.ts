import { test, expect } from '@playwright/test';

test.describe('Inventory Reports Flow', () => {
  test('should load the inventory reports page', async ({ page }) => {
    // Navigate to Login
    await page.goto('/#/login');
    
    // Attempt login with default admin credentials
    await page.locator('input[name="username"]').fill('zs');
    await page.locator('input[name="password"]').fill('1');
    await page.locator('button[type="submit"]').click();

    // Verify successful login
    await expect(page.locator('.app-layout')).toBeVisible({ timeout: 10000 });

    // Navigate to Inventory Reports
    await page.goto('/#/reports');
    
    // Check if the reports page loads
    await expect(page.locator('.page-header')).toBeVisible({ timeout: 10000 });
  });
});
