# Regression checklist

Run this checklist after any change that touches sales, purchases, inventory, POS, printing, or settings.

## Core smoke tests
1. Log in successfully.
2. Open each main page once: sales, pos, purchases, inventory, accounts, settings.
3. In browser console run:
   `window.__zstoreApp && window.__zstoreApp.smokeTests && window.__zstoreApp.smokeTests()`
4. Confirm the returned report has `ok: true`.

## Sales
1. Add a sellable item from the picker.
2. Add the same item by barcode.
3. Change quantity.
4. Complete sale.
5. Print invoice.
6. Confirm stock decreased.

## POS
1. Add item by quick grid.
2. Increase/decrease quantity.
3. Hold invoice.
4. Recall invoice.
5. Save cash.
6. Reprint last invoice.

## Purchases
1. Add supplier.
2. Add purchase item.
3. Save purchase invoice.
4. Confirm stock increased.

## Inventory
1. Stock adjustment save.
2. Add stock count draft item.
3. Save stock count session.
4. Add transfer draft item.
5. Create transfer.

## Accounts
1. Add customer payment.
2. Add supplier payment.
3. Open customer ledger.
4. Open supplier ledger.

## Settings
1. Save settings.
2. Export backup.
3. Import backup.
4. Save a user.

## If a test fails
- Check `window.AppSafetyService.getLastError()` in console.
- Fix the root cause in the related service/module.
- Re-run the full checklist, not only the failing step.
