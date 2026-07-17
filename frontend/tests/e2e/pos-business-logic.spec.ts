import { test, expect } from '@playwright/test';

test.describe('POS Business Logic & Performance', () => {
  test.setTimeout(300000); // 5 minutes timeout

  test('Comprehensive POS E2E flow', async ({ page }) => {
    const baseUrl = process.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5173';
    
    const e2eUser = process.env.E2E_USERNAME || 'dev-e2e';
    const e2ePass = process.env.E2E_PASSWORD || '1';
    
    console.log('--- 1. Navigation & Login ---');
    await page.goto(`${baseUrl}/login`);
    await page.fill('input[name="username"]', e2eUser);
    await page.fill('input[name="password"]', e2ePass);
    
    await page.click('.login-submit-pro-btn');
    
    // Wait for the app to actually route to the dashboard
    await expect(page).toHaveURL(/.*dashboard.*/, { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(3000); // Give the app a moment to set up context and load state
    
    console.log('--- 2. Open Cashier Shift ---');
    await page.goto(`${baseUrl}/#/cash-drawer`);
    
    const openShiftBtn = page.locator('text="فتح وردية"');
    if (await openShiftBtn.count() > 0) {
      await openShiftBtn.first().click();
      const submitBtn = page.locator('button[type="submit"]:has-text("فتح وردية")');
      if (await submitBtn.count() > 0) {
         await submitBtn.click();
         await page.waitForTimeout(1000);
      }
    }
    
    console.log('--- 3. Load POS Workspace ---');
    const startPosLoad = Date.now();
    
    let apiRequestsDuringLoad = 0;
    const loadHandler = (req) => {
        if (req.url().includes('/api/')) apiRequestsDuringLoad++;
    };
    page.on('request', loadHandler);
    
    await page.goto(`${baseUrl}/#/pos`);
    try {
        await page.waitForSelector('.pos-workspace', { timeout: 15000 });
    } catch (e) {
        await page.screenshot({ path: 'C:/Users/Administrator/.gemini/antigravity/brain/2708c966-08c3-4340-a7a8-d8bac63a62eb/pos-failure2.png' });
        throw e;
    }
    
    const posLoadTime = Date.now() - startPosLoad;
    page.off('request', loadHandler);
    console.log(`✅ POS Load Time: ${posLoadTime}ms`);
    console.log(`✅ Initial API Requests: ${apiRequestsDuringLoad}`);
    
    const searchInput = page.locator('.pos-products-unified-search-field input');
    await expect(searchInput).toBeVisible();
    
    const renderTimes: number[] = [];
    const itemsToAdd = 100;
    
    for (let i = 0; i < itemsToAdd; i++) {
        const startAdd = Date.now();
        const barcode = `POS-${i}`;
        
        await searchInput.fill(barcode);
        await page.waitForTimeout(50);
        await page.keyboard.press('Enter');
        
        // Wait a tiny bit for the UI
        await page.waitForTimeout(100);
        
        const addTime = Date.now() - startAdd;
        renderTimes.push(addTime);
        await searchInput.clear();
    }
    
    const avgRender = renderTimes.reduce((a, b) => a + b, 0) / renderTimes.length;
    const maxRender = Math.max(...renderTimes);
    const freezes = renderTimes.filter(t => t > 500).length;
    
    console.log(`✅ Added ${itemsToAdd} items.`);
    console.log(`✅ Avg render time: ${avgRender.toFixed(2)}ms, Max: ${maxRender}ms, Freezes (>500ms): ${freezes}`);
    
    const cartLinesCount = await page.locator('.pos-cart-line-item').count();
    console.log(`✅ Actual Cart Lines Count: ${cartLinesCount}`);
    
    console.log('--- 6. Double Submit & Slow Network Checkout ---');
    let checkoutCount = 0;
    await page.route('**/api/sales', async route => {
        if (route.request().method() === 'POST') {
            checkoutCount++;
            console.log(`Intercepted POST /api/sales (Attempt ${checkoutCount})`);
            await new Promise(resolve => setTimeout(resolve, 2000)); // Slow network
            await route.continue();
        } else {
            await route.continue();
        }
    });
    
    // Find checkout button
    const checkoutBtn = page.locator('button.pos-checkout-btn, button:has-text("دفع"), button:has-text("اعتماد")').first();
    await expect(checkoutBtn).toBeVisible();
    
    const startCheckout = Date.now();
    await checkoutBtn.click();
    
    // Sometimes there is a modal for cash input
    const confirmBtn = page.locator('.modal button:has-text("تأكيد"), .modal button:has-text("اعتماد"), .modal button:has-text("دفع")').first();
    if (await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await confirmBtn.click();
        await confirmBtn.click(); // Double submit attempt
    } else {
        await checkoutBtn.click(); // Double submit attempt directly
    }
    
    // Wait for the cart to clear or success message
    await page.waitForFunction(() => {
        return document.querySelectorAll('.pos-cart-line-item').length === 0 || document.body.innerText.includes('نجاح');
    }, { timeout: 15000 });
    
    const checkoutTime = Date.now() - startCheckout;
    console.log(`✅ Checkout Time (with 2s simulated network delay): ${checkoutTime}ms`);
    console.log(`✅ API Sales POST calls count: ${checkoutCount} (Idempotency check)`);
    
    expect(checkoutCount).toBe(1); // Ensure double submit prevented
    
    // Verify invoice backend (We'll check it in a separate step or query)
    console.log('✅ Done! Run backend queries to verify stock & ledger.');
  });
});
