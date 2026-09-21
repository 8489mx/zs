import { strict as assert } from 'node:assert';
import {
  readProductVariants,
  resolveOrderLinePrice,
  formatVariantLineName,
} from '../../src/modules/storefront/engines/online-order-pricing.engine';

// Regression coverage for invariant SF-4 / open item O54 (ARCHITECTURE_INVARIANTS.md).
//
// Before: the storefront cart showed the chosen variant's price, but the order DTO carried no variant
// and the server billed `retail_price` and dropped the variant name. The customer saw one total, the
// merchant received another, and nobody knew which size was ordered.

const metadata = {
  variants: [
    { name: 'صغير' },
    { name: 'وسط', extraPrice: 15 },
    { name: 'كبير', price: 120 },
    { name: 'عائلي', price: '180.5' },
    { name: '   ' },
    { name: 'خصم', extraPrice: -200 },
  ],
};

function testVariantParsing(): void {
  const variants = readProductVariants(metadata);
  assert.deepEqual(variants.map((v) => v.name), ['صغير', 'وسط', 'كبير', 'عائلي', 'خصم'], 'blank names are dropped');
  assert.equal(readProductVariants(JSON.stringify(metadata)).length, 5, 'metadata stored as a JSON string is read too');
  assert.deepEqual(readProductVariants(null), []);
  assert.deepEqual(readProductVariants('{not json'), []);
  assert.deepEqual(readProductVariants({ variants: 'nope' }), []);
}

function testPricing(): void {
  assert.deepEqual(resolveOrderLinePrice(100, metadata, undefined), { ok: true, unitPrice: 100, variantName: null }, 'no variant = base price');
  assert.deepEqual(resolveOrderLinePrice(100, metadata, '  '), { ok: true, unitPrice: 100, variantName: null });
  assert.deepEqual(resolveOrderLinePrice(100, metadata, 'صغير'), { ok: true, unitPrice: 100, variantName: 'صغير' }, 'variant without price = base');
  assert.deepEqual(resolveOrderLinePrice(100, metadata, 'وسط'), { ok: true, unitPrice: 115, variantName: 'وسط' }, 'extraPrice is added to base');
  assert.deepEqual(resolveOrderLinePrice(100, metadata, 'كبير'), { ok: true, unitPrice: 120, variantName: 'كبير' }, 'absolute price wins');
  assert.deepEqual(resolveOrderLinePrice(100, metadata, ' عائلي '), { ok: true, unitPrice: 180.5, variantName: 'عائلي' }, 'numeric strings and trimming');
  // The exact old bug: an unknown variant must not silently fall back to base price.
  assert.deepEqual(resolveOrderLinePrice(100, metadata, 'عملاق'), { ok: false, reason: 'UNKNOWN_VARIANT' });
  assert.deepEqual(resolveOrderLinePrice(100, {}, 'كبير'), { ok: false, reason: 'UNKNOWN_VARIANT' }, 'variant on a product without variants');
  assert.deepEqual(resolveOrderLinePrice(100, metadata, 'خصم'), { ok: false, reason: 'INVALID_PRICE' }, 'a variant can never price below zero');
}

function testLineName(): void {
  assert.equal(formatVariantLineName('بيتزا', 'كبير'), 'بيتزا (كبير)');
  assert.equal(formatVariantLineName('بيتزا', null), 'بيتزا');
}

testVariantParsing();
testPricing();
testLineName();
console.log('storefront-order-pricing.spec: all checks passed');
