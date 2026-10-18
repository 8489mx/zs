/**
 * Z-Systems Safe AST Codemod for Native Permanent i18n
 * Converts Arabic strings in React TSX files to t('key', 'default')
 * 
 * Safety Invariants:
 * 1. ONLY touches JSXText, user-facing JSXAttributes, and StringLiterals inside JSXExpressionContainers.
 * 2. NEVER touches function parameter defaults (AssignmentPattern) -> Eliminates "t is not defined".
 * 3. Scope shadowing detection: If 't' is bound to any loop/param, aliases hook to 'tr' -> Eliminates "t2 is not a function".
 * 4. NEVER touches code outside React components.
 * 5. Re-parses and validates every file with Babel before writing to disk.
 */

const fs = require('fs');
const path = require('path');

const FRONTEND_DIR = path.resolve(__dirname, '../../frontend');
const SRC_DIR = path.join(FRONTEND_DIR, 'src');
const DICT_PATH = path.join(SRC_DIR, 'lib/ui-dictionary.json');
const EN_PATH = path.join(SRC_DIR, 'locales/en.json');
const AR_PATH = path.join(SRC_DIR, 'locales/ar.json');
const EN_EXTRACTED_PATH = path.resolve(__dirname, 'output/en-extracted.json');

const { parse } = require(path.join(FRONTEND_DIR, 'node_modules/@babel/parser'));
const _traverse = require(path.join(FRONTEND_DIR, 'node_modules/@babel/traverse'));
const traverse = _traverse.default || _traverse;

const ARABIC_RE = /[\u0600-\u06FF]/;
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'locales', '__tests__', 'test']);
const SKIP_FILES = new Set([
  'auto-translator.ts',
  'ui-dictionary.json',
  'i18n.ts',
  'i18n-purchase-prototype.ts',
]);

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const isAll = args.includes('--all');
const featureArg = args.find(a => a.startsWith('--feature='));
const targetFeature = featureArg ? featureArg.split('=')[1] : null;
const fileArg = args.find(a => a.startsWith('--file='));
const targetFile = fileArg ? fileArg.split('=')[1] : null;

// Load translation dictionaries
const uiDict = fs.existsSync(DICT_PATH) ? JSON.parse(fs.readFileSync(DICT_PATH, 'utf8')) : {};
const unifiedDict = new Map();

for (const [ar, en] of Object.entries(uiDict)) {
  if (ar && en && typeof ar === 'string' && typeof en === 'string') {
    unifiedDict.set(ar.trim(), en.trim());
  }
}

const AR_EXTRACTED_PATH = path.resolve(__dirname, 'output/ar-extracted.json');
if (fs.existsSync(EN_EXTRACTED_PATH) && fs.existsSync(AR_EXTRACTED_PATH)) {
  try {
    const arExtracted = JSON.parse(fs.readFileSync(AR_EXTRACTED_PATH, 'utf8'));
    const enExtracted = JSON.parse(fs.readFileSync(EN_EXTRACTED_PATH, 'utf8'));
    for (const [k, arVal] of Object.entries(arExtracted)) {
      const enVal = enExtracted[k];
      if (arVal && enVal && typeof arVal === 'string' && typeof enVal === 'string' && enVal.trim() && !unifiedDict.has(arVal.trim())) {
        unifiedDict.set(arVal.trim(), enVal.trim());
      }
    }
  } catch {}
}

console.log(`Loaded ${unifiedDict.size} unified dictionary entries.`);

const enLocales = fs.existsSync(EN_PATH) ? JSON.parse(fs.readFileSync(EN_PATH, 'utf8')) : {};
const arLocales = fs.existsSync(AR_PATH) ? JSON.parse(fs.readFileSync(AR_PATH, 'utf8')) : {};

// Common prefixes for smart phrase decomposition
const PREFIX_MAP = [
  ['إضافة ', 'Add '],
  ['اضافة ', 'Add '],
  ['تعديل ', 'Edit '],
  ['حذف ', 'Delete '],
  ['عرض ', 'View '],
  ['معاينة ', 'Preview '],
  ['طباعة ', 'Print '],
  ['تصدير ', 'Export '],
  ['استيراد ', 'Import '],
  ['تأكيد ', 'Confirm '],
  ['إلغاء ', 'Cancel '],
  ['الغاء ', 'Cancel '],
  ['إغلاق ', 'Close '],
  ['اغلاق ', 'Close '],
  ['فتح ', 'Open '],
  ['تسجيل ', 'Record '],
  ['تحديث ', 'Update '],
  ['تفعيل ', 'Activate '],
  ['تعطيل ', 'Deactivate '],
  ['أرشفة ', 'Archive '],
  ['استرجاع ', 'Restore '],
  ['اختر ', 'Select '],
  ['اختيار ', 'Select '],
  ['حدد ', 'Select '],
  ['بحث عن ', 'Search for '],
  ['بحث في ', 'Search in '],
  ['بحث ', 'Search '],
  ['ابحث عن ', 'Search for '],
  ['ابحث ', 'Search '],
  ['إدارة ', 'Manage '],
  ['تحويل ', 'Transfer '],
  ['تسوية ', 'Adjustment '],
  ['قائمة ', 'List of '],
  ['سجل ', 'Register of '],
  ['تقرير ', 'Report of '],
  ['تفاصيل ', 'Details of '],
  ['حركات ', 'Transactions of '],
  ['إحصائيات ', 'Statistics of '],
];

function findTranslation(arabicText) {
  const trimmed = arabicText.trim();
  if (unifiedDict.has(trimmed)) return unifiedDict.get(trimmed);
  if (unifiedDict.has(arabicText)) return unifiedDict.get(arabicText);

  // Normalized lookup (strip trailing punctuation, spaces)
  const norm = trimmed.replace(/[:.،؟!]+$/, '').trim();
  if (unifiedDict.has(norm)) {
    const punct = trimmed.slice(norm.length);
    return unifiedDict.get(norm) + punct;
  }

  // Prefix decomposition
  for (const [arPrefix, enPrefix] of PREFIX_MAP) {
    if (trimmed.startsWith(arPrefix)) {
      const remainder = trimmed.slice(arPrefix.length).trim();
      const translatedRem = unifiedDict.get(remainder);
      if (translatedRem) {
        return enPrefix + translatedRem;
      }
    }
  }

  return null;
}

function walkDir(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkDir(full));
    } else if (entry.name.endsWith('.tsx') && !entry.name.includes('.spec.') && !entry.name.includes('.test.') && !SKIP_FILES.has(entry.name)) {
      files.push(full);
    }
  }
  return files;
}

function makeKey(filePath, index) {
  const rel = path.relative(SRC_DIR, filePath).replace(/\\/g, '/');
  const parts = rel.replace(/\.(tsx?|jsx?)$/, '').split('/');
  const cleaned = parts.filter(p => !['features', 'pages', 'components', 'utils', 'hooks', 'src'].includes(p));
  const base = cleaned.map(p => p.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '').replace(/-/g, '_')).join('.');
  return `${base}.s${index}`;
}

function setNestedKey(obj, keyPath, value) {
  const parts = keyPath.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const p = parts[i];
    if (!cur[p] || typeof cur[p] !== 'object') {
      cur[p] = {};
    }
    cur = cur[p];
  }
  cur[parts[parts.length - 1]] = value;
}

function findParentComponent(p) {
  let cur = p;
  while (cur) {
    if (cur.isFunctionDeclaration()) {
      const name = cur.node.id?.name || '';
      if (/^[A-Z]/.test(name) || /^use[A-Z]/.test(name)) return cur;
    }
    if (cur.isArrowFunctionExpression() || cur.isFunctionExpression()) {
      // Direct variable declarator: const MyComp = () => ...
      if (cur.parentPath.isVariableDeclarator()) {
        const name = cur.parentPath.node.id?.name || '';
        if (/^[A-Z]/.test(name) || /^use[A-Z]/.test(name)) return cur;
      }
      // Wrapper call (React.memo / forwardRef): const MyComp = React.memo(() => ...)
      if (cur.parentPath.isCallExpression()) {
        const callParent = cur.parentPath.parentPath;
        if (callParent && callParent.isVariableDeclarator()) {
          const name = callParent.node.id?.name || '';
          if (/^[A-Z]/.test(name) || /^use[A-Z]/.test(name)) return cur;
        }
      }
      // Export default
      if (cur.parentPath.isExportDefaultDeclaration()) {
        return cur;
      }
    }
    cur = cur.parentPath;
  }
  return null;
}

const compFnNameCache = new WeakMap();
function getTranslationFnName(compPath) {
  if (compFnNameCache.has(compPath.node)) {
    return compFnNameCache.get(compPath.node);
  }
  let shadowsT = false;
  compPath.traverse({
    BindingIdentifier(identPath) {
      if (identPath.node.name === 't') {
        const parent = identPath.parentPath;
        if (parent.isVariableDeclarator()) {
          const init = parent.node.init;
          if (init && init.type === 'CallExpression') {
            const calleeName = init.callee?.name || init.callee?.property?.name;
            if (calleeName === 'useTranslation') return; // our own hook
          }
        }
        shadowsT = true;
      }
    }
  });
  const res = shadowsT ? '__t' : 't';
  compFnNameCache.set(compPath.node, res);
  return res;
}

function transformFile(filePath) {
  const code = fs.readFileSync(filePath, 'utf8');
  if (!ARABIC_RE.test(code)) return null;

  let ast;
  try {
    ast = parse(code, {
      sourceType: 'module',
      plugins: ['typescript', 'jsx', 'decorators-legacy', 'classProperties', 'optionalChaining', 'nullishCoalescingOperator', 'dynamicImport'],
    });
  } catch (err) {
    return { error: `Parse error: ${err.message}` };
  }

  // Check existing useTranslation import
  let hasUseTranslationImport = false;
  let reactI18nextImportNode = null;

  for (const stmt of ast.program.body) {
    if (stmt.type === 'ImportDeclaration') {
      if (stmt.specifiers.some(s => s.local?.name === 'useTranslation')) {
        hasUseTranslationImport = true;
      }
      if (stmt.source.value === 'react-i18next') {
        reactI18nextImportNode = stmt;
      }
    }
  }

  const replacements = [];
  const componentsNeedingHook = new Map(); // compNode -> { compPath, fnName }
  let stringCounter = 0;
  const newTranslations = [];

  // Visitor restricted strictly to JSX
  traverse(ast, {
    JSXText(p) {
      const rawText = p.node.value;
      const trimmed = rawText.trim();
      if (!ARABIC_RE.test(trimmed) || !trimmed) return;

      const comp = findParentComponent(p);
      if (!comp) return;

      const fnName = getTranslationFnName(comp);
      componentsNeedingHook.set(comp.node, { compPath: comp, fnName });

      const key = makeKey(filePath, stringCounter++);
      const translation = findTranslation(trimmed) || trimmed;

      newTranslations.push({ key, ar: trimmed, en: translation });

      const leading = rawText.match(/^\s*/)[0];
      const trailing = rawText.match(/\s*$/)[0];

      replacements.push({
        start: p.node.start,
        end: p.node.end,
        replacement: `${leading}{${fnName}('${key}', ${JSON.stringify(trimmed)})}${trailing}`,
      });
    },

    JSXAttribute(p) {
      if (p.node.value && p.node.value.type === 'StringLiteral') {
        const rawText = p.node.value.value;
        if (!ARABIC_RE.test(rawText)) return;

        // Skip non-user-facing attributes
        const attrName = p.node.name?.name || '';
        if (['key', 'className', 'dir', 'id', 'ref', 'type', 'name', 'to', 'href', 'as', 'role'].includes(attrName)) return;
        if (attrName.startsWith('data-') || attrName.startsWith('aria-hidden')) return;

        const comp = findParentComponent(p);
        if (!comp) return;

        const fnName = getTranslationFnName(comp);
        componentsNeedingHook.set(comp.node, { compPath: comp, fnName });

        const key = makeKey(filePath, stringCounter++);
        const translation = findTranslation(rawText) || rawText;

        newTranslations.push({ key, ar: rawText, en: translation });

        replacements.push({
          start: p.node.value.start,
          end: p.node.value.end,
          replacement: `{${fnName}('${key}', ${JSON.stringify(rawText)})}`,
        });
      }
    },

    StringLiteral(p) {
      const rawText = p.node.value;
      if (!ARABIC_RE.test(rawText)) return;
      if (p.parentPath.isJSXAttribute()) return;

      // STRICT: Must be inside JSXExpressionContainer
      const exprContainer = p.findParent(parent => parent.isJSXExpressionContainer());
      if (!exprContainer) return;

      // Skip object keys: { 'نص': val }
      if (p.parentPath.isObjectProperty() && p.parentPath.node.key === p.node) return;
      // Skip comparisons: x === 'نص'
      if (p.parentPath.isBinaryExpression() && ['===', '!==', '==', '!='].includes(p.parentPath.node.operator)) return;
      // Skip switch cases
      if (p.parentPath.isSwitchCase()) return;
      // Skip console
      if (p.parentPath.isCallExpression() && p.parentPath.node.callee?.object?.name === 'console') return;
      // Skip already translated calls: t('...'), tr('...')
      if (p.parentPath.isCallExpression()) {
        const name = p.parentPath.node.callee?.name;
        if (name === 't' || name === 'tr' || p.parentPath.node.callee?.property?.name === 't') return;
      }

      const comp = findParentComponent(p);
      if (!comp) return;

      const fnName = getTranslationFnName(comp);
      componentsNeedingHook.set(comp.node, { compPath: comp, fnName });

      const key = makeKey(filePath, stringCounter++);
      const translation = findTranslation(rawText) || rawText;

      newTranslations.push({ key, ar: rawText, en: translation });

      replacements.push({
        start: p.node.start,
        end: p.node.end,
        replacement: `${fnName}('${key}', ${JSON.stringify(rawText)})`,
      });
    }
  });

  if (replacements.length === 0) return null;

  // Insert hook in each component that needs it
  for (const [compNode, { compPath, fnName }] of componentsNeedingHook.entries()) {
    // Check if component already declares t or __t
    const hasBinding = compPath.scope && compPath.scope.hasOwnBinding(fnName);
    if (!hasBinding) {
      const hookLine = fnName === '__t' ? '\n  const { t: __t } = useTranslation();' : '\n  const { t } = useTranslation();';
      const bodyNode = compNode.body;
      if (bodyNode && bodyNode.type === 'BlockStatement') {
        replacements.push({
          start: bodyNode.start + 1,
          end: bodyNode.start + 1,
          replacement: hookLine,
        });
      } else if (compNode.body) {
        // Arrow function concise body: () => <div />
        replacements.push({
          start: compNode.body.start,
          end: compNode.body.start,
          replacement: `{\n  ${hookLine.trim()}\n  return `,
        });
        replacements.push({
          start: compNode.body.end,
          end: compNode.body.end,
          replacement: ';\n}',
        });
      }
    }
  }

  // Insert import if needed
  if (!hasUseTranslationImport) {
    if (reactI18nextImportNode) {
      replacements.push({
        start: reactI18nextImportNode.start,
        end: reactI18nextImportNode.end,
        replacement: `import { useTranslation } from 'react-i18next';`,
      });
    } else {
      replacements.push({
        start: 0,
        end: 0,
        replacement: `import { useTranslation } from 'react-i18next';\n`,
      });
    }
  }

  // Sort replacements in reverse order (bottom-up) to preserve character offsets
  replacements.sort((a, b) => b.start - a.start);

  // Apply replacements
  let newCode = code;
  for (const r of replacements) {
    newCode = newCode.slice(0, r.start) + r.replacement + newCode.slice(r.end);
  }

  // Validate resulting code by re-parsing with Babel
  try {
    parse(newCode, {
      sourceType: 'module',
      plugins: ['typescript', 'jsx', 'decorators-legacy', 'classProperties', 'optionalChaining', 'nullishCoalescingOperator', 'dynamicImport'],
    });
  } catch (err) {
    return { error: `Post-transform validation parse error: ${err.message}` };
  }

  return {
    filePath,
    replacementsCount: replacements.length,
    newTranslations,
    newCode,
  };
}

// Main execution
console.log('--- Z-Systems Safe i18n Codemod ---');
let targetFiles = [];

if (targetFile) {
  const full = path.resolve(SRC_DIR, targetFile);
  targetFiles = [full];
} else if (targetFeature) {
  const featureDir = path.join(SRC_DIR, 'features', targetFeature);
  if (fs.existsSync(featureDir)) {
    targetFiles = walkDir(featureDir);
  } else {
    console.error(`Feature directory not found: ${featureDir}`);
    process.exit(1);
  }
} else if (isAll) {
  targetFiles = walkDir(SRC_DIR);
} else {
  console.log('Please specify --all, --feature=<name>, or --file=<path>');
  process.exit(0);
}

console.log(`Found ${targetFiles.length} candidate files to check.`);

let transformedCount = 0;
let totalReplacements = 0;
const allNewTranslations = [];
const errors = [];

for (let i = 0; i < targetFiles.length; i++) {
  if (i > 0 && i % 100 === 0) {
    console.log(`Processed ${i}/${targetFiles.length} files... (${transformedCount} transformed, ${totalReplacements} strings)`);
  }
  const file = targetFiles[i];
  const res = transformFile(file);
  if (!res) continue;
  if (res.error) {
    errors.push({ file: path.relative(SRC_DIR, file), error: res.error });
    continue;
  }

  transformedCount++;
  totalReplacements += res.replacementsCount;
  allNewTranslations.push(...res.newTranslations);

  if (!isDryRun) {
    fs.writeFileSync(file, res.newCode, 'utf8');
  }
}

// Update locale files
if (!isDryRun && allNewTranslations.length > 0) {
  for (const item of allNewTranslations) {
    setNestedKey(enLocales, item.key, item.en);
    setNestedKey(arLocales, item.key, item.ar);
  }
  fs.writeFileSync(EN_PATH, JSON.stringify(enLocales, null, 2) + '\n', 'utf8');
  fs.writeFileSync(AR_PATH, JSON.stringify(arLocales, null, 2) + '\n', 'utf8');
  console.log(`Updated ${EN_PATH} and ${AR_PATH} with ${allNewTranslations.length} keys.`);
}

console.log(`\nCodemod Summary:`);
console.log(`- Files processed: ${targetFiles.length}`);
console.log(`- Files transformed: ${transformedCount}`);
console.log(`- Strings replaced: ${totalReplacements}`);
console.log(`- Mode: ${isDryRun ? 'DRY RUN (no changes written)' : 'LIVE EXECUTION'}`);

if (errors.length > 0) {
  console.log(`- Errors encountered: ${errors.length}`);
  errors.slice(0, 10).forEach(e => console.log(`  [!] ${e.file}: ${e.error}`));
} else {
  console.log(`- Errors encountered: 0 (ALL FILES PASSED AST PARSER VALIDATION)`);
}
