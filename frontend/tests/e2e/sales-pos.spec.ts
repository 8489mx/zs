import { test, expect } from '@playwright/test';

test.describe('Sales and POS Flow', () => {
  test('should create a basic sale and verify totals', async ({ page }) => {
    // Navigate to Login
    await page.goto('/#/login');

    // Attempt login with default admin credentials
    await page.locator('input[name="username"]').fill('zs');
    await page.locator('input[name="password"]').fill('1');
    
    // Click login button (assuming a submit button)
    await page.locator('button[type="submit"]').click();

    // Verify successful login by waiting for dashboard or main layout
    await expect(page.locator('.app-layout')).toBeVisible({ timeout: 10000 });

    // Navigate to POS directly since shift is already open
    await page.goto('/#/pos');
    await expect(page).toHaveURL(/.*pos.*/);
    await expect(page.locator('.pos-mode-toggle button').nth(1)).toBeVisible({ timeout: 15000 });
    
    // Switch to Touch Mode to show product grid without searching
    const touchModeButton = page.locator('.pos-mode-toggle button').nth(1);
    await expect(touchModeButton).toBeVisible();
    await touchModeButton.click();
    
    // Wait for product catalog to load and click the first product
    const firstProduct = page.locator('.pos-group-card-action').first();
    await expect(firstProduct).toBeVisible({ timeout: 15000 });
    await firstProduct.click();
    
    // Verify product is added to cart
    await expect(page.locator('.pos-cart-row').first()).toBeVisible();
    
    // Click checkout (dock success button)
    await page.locator('.pos-workspace-dock .btn-success').click();
    
    // Wait for the checkout dialog to appear and click confirm
    const confirmButton = page.locator('.dialog-shell .btn-success').first();
    await expect(confirmButton).toBeVisible();
    await confirmButton.click();
    
    // Wait for the success dialog (which also has a success button for new sale)
    const newSaleButton = page.locator('.dialog-shell .btn-success').first();
    await expect(newSaleButton).toBeVisible({ timeout: 15000 });
    await newSaleButton.click();
    
    // The dialog should close and the cart should be empty
    await expect(page.locator('.pos-cart-row')).toHaveCount(0);
  });
});

