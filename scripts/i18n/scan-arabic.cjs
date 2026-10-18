/**
 * Z-Systems i18n Scanner
 * Run from frontend/: node ../scripts/i18n/scan-arabic.cjs
 */
const fs = require('fs');
const path = require('path');
const { parse } = require(path.resolve(__dirname, '../../frontend/node_modules/@babel/parser'));
const _traverse = require(path.resolve(__dirname, '../../frontend/node_modules/@babel/traverse'));
const traverse = _traverse.default || _traverse;

const SRC_DIR = path.resolve(__dirname, '../../frontend/src');
const OUT_DIR = path.resolve(__dirname, 'output');
const ARABIC_RE = /[\u0600-\u06FF]/;
const SKIP_DIRS = new Set(['node_modules','.git','dist','locales','test','__tests__']);
const SKIP_FILES = new Set(['auto-translator.ts','ui-dictionary.json','i18n.ts','i18n-purchase-prototype.ts']);

function walkDir(dir) {
  const r = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(e.name)) continue;
    const f = path.join(dir, e.name);
    if (e.isDirectory()) r.push(...walkDir(f));
    else if (/\.(tsx?|jsx?)$/.test(e.name) && !SKIP_FILES.has(e.name)) r.push(f);
  }
  return r;
}

function makeKey(filePath, index) {
  const rel = path.relative(SRC_DIR, filePath).replace(/\\/g, '/');
  const parts = rel.replace(/\.(tsx?|jsx?)$/, '').split('/');
  const cleaned = parts.filter(p => !['features','pages','components','utils','hooks'].includes(p));
  const base = cleaned.map(p => p.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/,'').replace(/-/g,'_')).join('.');
  return `${base}.s${index}`;
}

function isTSType(p) {
  let n = p.parentPath;
  while (n) {
    const t = n.node?.type || '';
    if (t.startsWith('TS') && !t.startsWith('TSAs') && !t.startsWith('TSNonNull')) return true;
    n = n.parentPath;
  }
  return false;
}
function isImport(p) { let n=p.parentPath; while(n){if(n.isImportDeclaration?.())return true;n=n.parentPath;} return false; }
function isObjKey(p) { return p.parent?.type==='ObjectProperty'&&p.parent.key===p.node; }

function scanFile(filePath) {
  const code = fs.readFileSync(filePath, 'utf-8');
  const isJSX = /\.tsx$/.test(filePath);
  const entries = [];
  let ast;
  try {
    ast = parse(code, {
      sourceType: 'module',
      plugins: ['typescript', ...(isJSX ? ['jsx'] : []), 'decorators-legacy', 'classProperties', 'optionalChaining', 'nullishCoalescingOperator', 'dynamicImport'],
    });
  } catch (e) {
    console.warn(`⚠ Parse error: ${path.basename(filePath)}: ${e.message}`);
    return [];
  }
  traverse(ast, {
    StringLiteral(p) {
      if (!ARABIC_RE.test(p.node.value)) return;
      if (isTSType(p) || isImport(p) || isObjKey(p)) return;
      entries.push({ type: 'StringLiteral', text: p.node.value, line: p.node.loc?.start?.line||0 });
    },
    JSXText(p) {
      const t = p.node.value.trim();
      if (!ARABIC_RE.test(t)||!t) return;
      entries.push({ type: 'JSXText', text: t, line: p.node.loc?.start?.line||0 });
    },
    TemplateLiteral(p) {
      if (!p.node.quasis.some(q => ARABIC_RE.test(q.value.raw))) return;
      if (isTSType(p)) return;
      const full = p.node.quasis.map(q => q.value.raw).join('{{VAR}}');
      entries.push({ type: 'TemplateLiteral', text: full, line: p.node.loc?.start?.line||0, expressions: p.node.expressions.length });
    },
  });
  return entries;
}

// ---------- run ----------
console.log('🔍 Z-Systems i18n Scanner\n   Scanning:', SRC_DIR);
const files = walkDir(SRC_DIR);
console.log(`   Found ${files.length} source files\n`);

let uiDict = {};
const dictPath = path.join(SRC_DIR, 'lib', 'ui-dictionary.json');
if (fs.existsSync(dictPath)) {
  uiDict = JSON.parse(fs.readFileSync(dictPath, 'utf-8'));
  console.log(`   Loaded ui-dictionary: ${Object.keys(uiDict).length} entries\n`);
}

const manifest = []; const arJson = {}; const enJson = {};
let total = 0; let filesAr = 0;

for (const fp of files) {
  const entries = scanFile(fp);
  if (!entries.length) continue;
  filesAr++;
  const rel = path.relative(SRC_DIR, fp).replace(/\\/g, '/');
  entries.forEach((e, i) => {
    const key = makeKey(fp, i);
    arJson[key] = e.text;
    enJson[key] = uiDict[e.text.trim()] || '';
    manifest.push({ key, file: rel, line: e.line, type: e.type, text: e.text, hasEn: !!uiDict[e.text.trim()] });
    total++;
  });
}

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(path.join(OUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));
fs.writeFileSync(path.join(OUT_DIR, 'ar-extracted.json'), JSON.stringify(arJson, null, 2));
fs.writeFileSync(path.join(OUT_DIR, 'en-extracted.json'), JSON.stringify(enJson, null, 2));

const matched = manifest.filter(m => m.hasEn).length;
console.log(`\n✅ Scan Complete!`);
console.log(`   Files scanned:      ${files.length}`);
console.log(`   Files with Arabic:  ${filesAr}`);
console.log(`   Total strings:      ${total}`);
console.log(`   Dict matched:       ${matched} (${((matched/total)*100).toFixed(1)}%)`);
console.log(`   Needs translation:  ${total - matched}`);
console.log(`\n   Output → ${OUT_DIR}/`);
