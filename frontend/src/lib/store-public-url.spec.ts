import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  RESERVED_STORE_SLUGS,
  buildStorePublicUrl,
  getStoreHostSlug,
  storePublicUrlParts,
} from './store-public-url';

// SF-10 (ARCHITECTURE_INVARIANTS.md section 4). Backend twin: test/critical/store-public-url.spec.ts.
const ROOT = 'zsystemai.com';

describe('store public URL (SF-10)', () => {
  it('uses the legacy path when subdomain stores are off', () => {
    expect(buildStorePublicUrl('almhnds', 'https://zsystemai.com', '')).toBe('https://zsystemai.com/st/almhnds');
    expect(storePublicUrlParts('http://localhost:5173', '')).toEqual({ prefix: 'http://localhost:5173/st/', suffix: '' });
  });

  it('gives each store its own subdomain when on', () => {
    expect(buildStorePublicUrl('AlMhnds', 'https://app.zsystemai.com', ROOT)).toBe('https://almhnds.zsystemai.com');
    expect(storePublicUrlParts('https://app.zsystemai.com', ROOT)).toEqual({ prefix: 'https://', suffix: '.zsystemai.com' });
  });

  it('never turns a reserved or non-DNS slug into a subdomain', () => {
    expect(buildStorePublicUrl('app', 'https://app.zsystemai.com', ROOT)).toBe('https://app.zsystemai.com/st/app');
    expect(buildStorePublicUrl('-bad', 'https://app.zsystemai.com', ROOT)).toBe('https://app.zsystemai.com/st/-bad');
  });

  it('recognises a store host and nothing else', () => {
    expect(getStoreHostSlug('almhnds.zsystemai.com', ROOT)).toBe('almhnds');
    expect(getStoreHostSlug('app.zsystemai.com', ROOT)).toBeNull();
    expect(getStoreHostSlug('www.zsystemai.com', ROOT)).toBeNull();
    expect(getStoreHostSlug('zsystemai.com', ROOT)).toBeNull();
    expect(getStoreHostSlug('a.b.zsystemai.com', ROOT)).toBeNull();
    expect(getStoreHostSlug('almhnds.evilzsystemai.com', ROOT)).toBeNull();
    expect(getStoreHostSlug('almhnds.zsystemai.com', '')).toBeNull();
    expect(getStoreHostSlug('localhost', ROOT)).toBeNull();
  });

  it('keeps the reserved list identical to the backend engine', () => {
    const backend = readFileSync(
      resolve(__dirname, '../../../backend/src/modules/storefront/engines/store-public-url.engine.ts'),
      'utf8',
    );
    const block = backend.slice(backend.indexOf('RESERVED_STORE_SLUGS'), backend.indexOf(']);'));
    const backendSlugs = [...block.matchAll(/'([a-z0-9-]+)'/g)].map((m) => m[1]).sort();
    expect(backendSlugs).toEqual([...RESERVED_STORE_SLUGS].sort());
  });
});
