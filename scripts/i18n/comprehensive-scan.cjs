const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const FRONTEND_SRC = path.join(ROOT, 'frontend/src');
const UI_DICT_PATH = path.join(FRONTEND_SRC, 'lib/ui-dictionary.json');
const EN_JSON_PATH = path.join(FRONTEND_SRC, 'locales/en.json');
const AR_JSON_PATH = path.join(FRONTEND_SRC, 'locales/ar.json');

const uiDict = JSON.parse(fs.readFileSync(UI_DICT_PATH, 'utf8'));
const enJson = JSON.parse(fs.readFileSync(EN_JSON_PATH, 'utf8'));
const arJson = JSON.parse(fs.readFileSync(AR_JSON_PATH, 'utf8'));

function flatten(obj, prefix = '') {
  let res = {};
  for (const [k, v] of Object.entries(obj)) {
    const full = prefix ? prefix + '.' + k : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      Object.assign(res, flatten(v, full));
    } else {
      res[full] = v;
    }
  }
  return res;
}

const flatEn = flatten(enJson);
const flatAr = flatten(arJson);
const arabicRegex = /[\u0600-\u06FF]/;

// 1. Find missing i18n keys
const missingKeys = [];
for (const [key, arVal] of Object.entries(flatAr)) {
  const enVal = flatEn[key];
  if (!enVal || (typeof enVal === 'string' && (enVal.trim() === '' || arabicRegex.test(enVal)))) {
    missingKeys.push({ key, arText: arVal });
  }
}

// 2. Scan frontend/src for all Arabic in code & JSX
function walk(dir) {
  let results = [];
  for (const file of fs.readdirSync(dir)) {
    if (['node_modules', 'dist', '.git', 'locales'].includes(file)) continue;
    const full = path.join(dir, file);
    if (fs.statSync(full).isDirectory()) {
      results.push(...walk(full));
    } else if (
      (file.endsWith('.tsx') || file.endsWith('.ts')) &&
      !file.endsWith('.spec.ts') &&
      !file.endsWith('.spec.tsx') &&
      !file.endsWith('.d.ts') &&
      !file.includes('ui-dictionary')
    ) {
      results.push(full);
    }
  }
  return results;
}

const files = walk(FRONTEND_SRC);
const rawArabicStrings = new Map(); // text -> occurrences count

// t(...) matches
const tRegex = /\b(?:t|__t)\s*\(\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]\s*\)/g;

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  if (!arabicRegex.test(content)) continue;

  // t('key', 'default')
  let tm;
  while ((tm = tRegex.exec(content)) !== null) {
    const key = tm[1];
    const defArabic = tm[2].trim();
    if (arabicRegex.test(defArabic)) {
      if (!flatEn[key] || flatEn[key].trim() === '' || arabicRegex.test(flatEn[key])) {
        if (!missingKeys.some(m => m.key === key)) {
          missingKeys.push({ key, arText: defArabic });
        }
      }
    }
  }

  // JSX text >نص عربي<
  const jsxMatches = content.matchAll(/>([^<>{}\r\n]*[\u0600-\u06FF][^<>{}\r\n]*)</g);
  for (const m of jsxMatches) {
    const s = m[1].replace(/\s+/g, ' ').trim();
    if (s.length > 1 && !s.startsWith('//') && !s.startsWith('/*')) {
      rawArabicStrings.set(s, (rawArabicStrings.get(s) || 0) + 1);
    }
  }

  // String literals 'نص عربي' or "نص عربي" or `نص عربي`
  const strMatches = content.matchAll(/(['"`])([^'"`\r\n]*[\u0600-\u06FF][^'"`\r\n]*)\1/g);
  for (const m of strMatches) {
    const s = m[2].replace(/\s+/g, ' ').trim();
    if (s.length > 1 && !s.startsWith('//') && !s.startsWith('/*')) {
      rawArabicStrings.set(s, (rawArabicStrings.get(s) || 0) + 1);
    }
  }
}

// Filter rawArabicStrings that are already in uiDict
const missingFromUiDict = [];
for (const [text, count] of rawArabicStrings.entries()) {
  if (!uiDict[text]) {
    missingFromUiDict.push({ text, count });
  }
}

missingFromUiDict.sort((a, b) => b.count - a.count);

console.log('=== COMPREHENSIVE SCAN RESULTS ===');
console.log('Total missing i18n keys for en.json:', missingKeys.length);
console.log('Total raw Arabic strings missing from ui-dictionary.json:', missingFromUiDict.length);
console.log('\nTop 20 missing i18n keys sample:');
missingKeys.slice(0, 20).forEach(m => console.log(`  [${m.key}] => "${m.arText}"`));
console.log('\nTop 30 raw Arabic phrases missing from uiDict:');
missingFromUiDict.slice(0, 30).forEach(m => console.log(`  (${m.count}x) => "${m.text}"`));

fs.writeFileSync(
  path.join(__dirname, 'missing-i18n-report.json'),
  JSON.stringify({ missingKeys, missingFromUiDict }, null, 2),
  'utf8'
);
console.log('\nFull report saved to scripts/i18n/missing-i18n-report.json');
