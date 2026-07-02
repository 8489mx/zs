import { test, expect } from '@playwright/test';

test.describe('Inventory Movements Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to Login
    await page.goto('/#/login');
    // Attempt login with default admin credentials
    await page.locator('input[name="username"]').fill('zs');
    await page.locator('input[name="password"]').fill('1');
    await page.locator('button[type="submit"]').click();
    // Verify successful login
    await expect(page.locator('.app-layout')).toBeVisible({ timeout: 10000 });
  });

  test('should load issue order page', async ({ page }) => {
    // Navigate to Issue Order (اذن صرف)
    await page.goto('/#/inventory/issue-order/new');
    await expect(page).toHaveURL(/.*issue-order\/new.*/);
    
    // Check if Save button is present
    await expect(page.locator('button:has-text("حفظ")').first()).toBeVisible({ timeout: 10000 });
  });

  test('should load transfers page', async ({ page }) => {
    // Navigate to Transfers (التحويلات)
    // Note: Assuming the path based on typical structure, adjust if needed
    await page.goto('/#/inventory/transfers');
    
    // Just verify the page loads and header is visible
    await expect(page.locator('.page-header')).toBeVisible({ timeout: 10000 });
  });
});
