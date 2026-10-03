import assert from 'assert';
import {
  isOfferActiveNow,
  calculateOfferAdjustedPrice,
  resolveBestStorefrontOffer,
  RawStorefrontOffer,
} from '../../src/modules/storefront/engines/storefront-offers.engine';

async function testStorefrontOffersEngine(): Promise<void> {
  console.log('=== STOREFRONT PROMOTIONS & OFFERS ENGINE SPEC ===\n');

  const todayIso = '2026-10-03';
  const fakeNow = new Date('2026-10-03T14:30:00Z');

  // Test 1: Percentage Discount Offer
  {
    const offer: RawStorefrontOffer = {
      offer_type: 'percent',
      value: 20, // 20%
      is_active: true,
      start_date: '2026-10-01',
      end_date: '2026-10-10',
    };
    const res = resolveBestStorefrontOffer(250, [offer], 1, todayIso, fakeNow);
    assert.equal(res.hasDiscount, true);
    assert.equal(res.originalPrice, 250);
    assert.equal(res.price, 200); // 250 - 50 = 200
    assert.equal(res.discountPercent, 20);
    assert.equal(res.offerBadge, 'خصم 20%');
    console.log('[Test 1 Passed] 20% percentage discount correctly applied.');
  }

  // Test 2: Fixed Amount Discount Offer
  {
    const offer: RawStorefrontOffer = {
      offer_type: 'fixed',
      value: 30, // 30 off
      is_active: true,
      start_date: '2026-10-01',
      end_date: '2026-10-10',
    };
    const res = resolveBestStorefrontOffer(100, [offer], 1, todayIso, fakeNow);
    assert.equal(res.hasDiscount, true);
    assert.equal(res.originalPrice, 100);
    assert.equal(res.price, 70);
    assert.equal(res.discountPercent, 30);
    console.log('[Test 2 Passed] Fixed amount discount correctly applied.');
  }

  // Test 3: Absolute Price Offer
  {
    const offer: RawStorefrontOffer = {
      offer_type: 'price',
      value: 149.99,
      is_active: true,
    };
    const res = resolveBestStorefrontOffer(200, [offer], 1, todayIso, fakeNow);
    assert.equal(res.hasDiscount, true);
    assert.equal(res.originalPrice, 200);
    assert.equal(res.price, 149.99);
    assert.equal(res.discountPercent, 25);
    console.log('[Test 3 Passed] Absolute price offer correctly applied.');
  }

  // Test 4: Expired Offer Ignored
  {
    const offer: RawStorefrontOffer = {
      offer_type: 'percent',
      value: 50,
      is_active: true,
      start_date: '2026-09-01',
      end_date: '2026-09-30', // expired
    };
    const res = resolveBestStorefrontOffer(100, [offer], 1, todayIso, fakeNow);
    assert.equal(res.hasDiscount, false);
    assert.equal(res.price, 100);
    console.log('[Test 4 Passed] Expired offer is safely ignored.');
  }

  // Test 5: Multiple Active Offers Picks the Best Savings for Shopper
  {
    const offer1: RawStorefrontOffer = {
      id: 1,
      offer_type: 'percent',
      value: 10, // 10% off 200 = 180
      is_active: true,
    };
    const offer2: RawStorefrontOffer = {
      id: 2,
      offer_type: 'percent',
      value: 25, // 25% off 200 = 150 (better!)
      is_active: true,
    };
    const res = resolveBestStorefrontOffer(200, [offer1, offer2], 1, todayIso, fakeNow);
    assert.equal(res.hasDiscount, true);
    assert.equal(res.price, 150);
    assert.equal(res.discountPercent, 25);
    assert.equal(res.offerId, 2);
    console.log('[Test 5 Passed] Best promotional offer picked when multiple are active.');
  }

  // Test 6: Inactive Offer flag is_active = false
  {
    const offer: RawStorefrontOffer = {
      offer_type: 'percent',
      value: 40,
      is_active: false,
    };
    const res = resolveBestStorefrontOffer(100, [offer], 1, todayIso, fakeNow);
    assert.equal(res.hasDiscount, false);
    assert.equal(res.price, 100);
    console.log('[Test 6 Passed] Inactive offer (is_active: false) safely ignored.');
  }

  console.log('\n=== ALL STOREFRONT OFFERS TESTS PASSED (6/6) ===');
}

testStorefrontOffersEngine().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
