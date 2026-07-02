import { test, expect } from '@playwright/test';

test.describe('Purchases Flow', () => {
  test('should load the new purchase page and add an item', async ({ page }) => {
    // Navigate to Login
    await page.goto('/#/login');
    
    // Attempt login with default admin credentials
    await page.locator('input[name="username"]').fill('zs');
    await page.locator('input[name="password"]').fill('1');
    await page.locator('button[type="submit"]').click();

    // Verify successful login by waiting for dashboard or main layout
    await expect(page.locator('.app-layout')).toBeVisible({ timeout: 10000 });

    // Navigate to New Purchase Order
    await page.goto('/#/purchases/new');
    await expect(page).toHaveURL(/.*purchases\/new.*/);
    
    // Wait for the supplier combobox (usually indicated by 'اختيار المورد')
    await expect(page.getByPlaceholder('اختيار المورد...').first()).toBeVisible({ timeout: 15000 });
    
    // Check if Save button is present
    await expect(page.locator('button:has-text("حفظ")').first()).toBeVisible();
    
    // Wait for the page to be ready
    await expect(page.locator('.purchase-prototype-lines')).toBeVisible();
  });
});
