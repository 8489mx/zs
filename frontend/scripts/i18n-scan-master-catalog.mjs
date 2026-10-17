#!/usr/bin/env node
/**
 * Z-Systems Master Catalog Scanner & Builder
 * Scans frontend/src for all Arabic strings in JSX and code,
 * builds a unified Master Catalog mapping Arabic text to all supported languages.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SRC_DIR = path.resolve(__dirname, '../src');
const LOCALES_DIR = path.resolve(SRC_DIR, 'locales');
const OUT_CATALOG = path.resolve(__dirname, 'master-catalog.json');

const arLocPath = path.join(LOCALES_DIR, 'ar.json');
const enLocPath = path.join(LOCALES_DIR, 'en.json');
const zhLocPath = path.join(LOCALES_DIR, 'zh.json');
const bnLocPath = path.join(LOCALES_DIR, 'bn.json');
const urLocPath = path.join(LOCALES_DIR, 'ur.json');
const hiLocPath = path.join(LOCALES_DIR, 'hi.json');
const tlLocPath = path.join(LOCALES_DIR, 'tl.json');
const frLocPath = path.join(LOCALES_DIR, 'fr.json');

const arJson = fs.existsSync(arLocPath) ? JSON.parse(fs.readFileSync(arLocPath, 'utf8')) : {};
const enJson = fs.existsSync(enLocPath) ? JSON.parse(fs.readFileSync(enLocPath, 'utf8')) : {};
const zhJson = fs.existsSync(zhLocPath) ? JSON.parse(fs.readFileSync(zhLocPath, 'utf8')) : {};
const bnJson = fs.existsSync(bnLocPath) ? JSON.parse(fs.readFileSync(bnLocPath, 'utf8')) : {};
const urJson = fs.existsSync(urLocPath) ? JSON.parse(fs.readFileSync(urLocPath, 'utf8')) : {};
const hiJson = fs.existsSync(hiLocPath) ? JSON.parse(fs.readFileSync(hiLocPath, 'utf8')) : {};
const tlJson = fs.existsSync(tlLocPath) ? JSON.parse(fs.readFileSync(tlLocPath, 'utf8')) : {};
const frJson = fs.existsSync(frLocPath) ? JSON.parse(fs.readFileSync(frLocPath, 'utf8')) : {};

// 1. Build initial mapping from existing locale keys
const masterCatalog = {};

function flattenAndMap(arObj, enObj, zhObj, bnObj, urObj, hiObj, tlObj, frObj) {
  for (const key in arObj) {
    const arVal = arObj[key];
    const enVal = enObj?.[key];
    const zhVal = zhObj?.[key];
    const bnVal = bnObj?.[key];
    const urVal = urObj?.[key];
    const hiVal = hiObj?.[key];
    const tlVal = tlObj?.[key];
    const frVal = frObj?.[key];

    if (typeof arVal === 'string' && arVal.trim()) {
      const cleanAr = arVal.trim();
      masterCatalog[cleanAr] = {
        en: typeof enVal === 'string' ? enVal.trim() : cleanAr,
        zh: typeof zhVal === 'string' ? zhVal.trim() : enVal || cleanAr,
        bn: typeof bnVal === 'string' ? bnVal.trim() : enVal || cleanAr,
        ur: typeof urVal === 'string' ? urVal.trim() : cleanAr,
        hi: typeof hiVal === 'string' ? hiVal.trim() : enVal || cleanAr,
        tl: typeof tlVal === 'string' ? tlVal.trim() : enVal || cleanAr,
        fr: typeof frVal === 'string' ? frVal.trim() : enVal || cleanAr,
      };
    } else if (typeof arVal === 'object' && arVal !== null && !Array.isArray(arVal)) {
      flattenAndMap(
        arVal,
        typeof enVal === 'object' ? enVal : {},
        typeof zhVal === 'object' ? zhVal : {},
        typeof bnVal === 'object' ? bnVal : {},
        typeof urVal === 'object' ? urVal : {},
        typeof hiVal === 'object' ? hiVal : {},
        typeof tlVal === 'object' ? tlVal : {},
        typeof frVal === 'object' ? frVal : {}
      );
    }
  }
}

flattenAndMap(arJson, enJson, zhJson, bnJson, urJson, hiJson, tlJson, frJson);

console.log(`Initial mapped phrases from locale files: ${Object.keys(masterCatalog).length}`);

// 2. Scan entire frontend/src for all Arabic text literals
const ARABIC_REGEX = /[\u0600-\u06FF]/;
let scannedFilesCount = 0;
let foundNewPhrasesCount = 0;

function walkDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'locales' || entry.name === 'dist') continue;
      walkDir(fullPath);
    } else if (entry.isFile() && (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts'))) {
      if (entry.name.endsWith('.spec.ts') || entry.name.endsWith('.spec.tsx') || entry.name.endsWith('.d.ts')) continue;
      scannedFilesCount++;
      scanFile(fullPath);
    }
  }
}

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  if (!ARABIC_REGEX.test(content)) return;

  // Match JSX children: >نص عربي<
  const jsxMatches = content.matchAll(/>([^<>{}]*[\u0600-\u06FF][^<>{}]*)</g);
  for (const m of jsxMatches) {
    registerPhrase(m[1]);
  }

  // Match string literals: 'نص عربي' or "نص عربي"
  const stringMatches = content.matchAll(/(['"`])([^'"`\n\r]*[\u0600-\u06FF][^'"`\n\r]*)\1/g);
  for (const m of stringMatches) {
    registerPhrase(m[2]);
  }
}

function registerPhrase(raw) {
  if (!raw) return;
  const clean = raw.replace(/\s+/g, ' ').trim();
  // Filter out noise like single punctuation or pure symbols
  if (clean.length < 2) return;
  if (!ARABIC_REGEX.test(clean)) return;
  // Ignore comments or URLs
  if (clean.startsWith('//') || clean.startsWith('/*') || clean.includes('http')) return;

  if (!masterCatalog[clean]) {
    masterCatalog[clean] = {
      en: clean,
      zh: clean,
      bn: clean,
      ur: clean,
      hi: clean,
      tl: clean,
      fr: clean,
    };
    foundNewPhrasesCount++;
  }
}

walkDir(SRC_DIR);

fs.writeFileSync(OUT_CATALOG, JSON.stringify(masterCatalog, null, 2), 'utf8');

console.log(`Scan completed:
- Scanned files: ${scannedFilesCount}
- Total master catalog phrases: ${Object.keys(masterCatalog).length}
- Newly registered raw phrases: ${foundNewPhrasesCount}
- Catalog saved at: ${OUT_CATALOG}
`);
