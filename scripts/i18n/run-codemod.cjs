/**
 * Z-Systems AST Codemod for Native Compile-Time i18n
 * Converts Arabic strings in React TSX components to t('key', 'default')
 * 
 * Usage:
 *   node scripts/i18n/run-codemod.cjs --dry-run
 *   node scripts/i18n/run-codemod.cjs --feature=sales
 *   node scripts/i18n/run-codemod.cjs --all
 */

const fs = require('fs');
const path = require('path');

const FRONTEND_DIR = path.resolve(__dirname, '../../frontend');
const SRC_DIR = path.join(FRONTEND_DIR, 'src');
const DICT_PATH = path.join(SRC_DIR, 'lib/ui-dictionary.json');
const EN_PATH = path.join(SRC_DIR, 'locales/en.json');
const AR_PATH = path.join(SRC_DIR, 'locales/ar.json');

const { parse } = require(path.join(FRONTEND_DIR, 'node_modules/@babel/parser'));
const _traverse = require(path.join(FRONTEND_DIR, 'node_modules/@babel/traverse'));
const traverse = _traverse.default || _traverse;

const ARABIC_RE = /[\u0600-\u06FF]/;
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'locales', '__tests__']);
const SKIP_FILES = new Set([
  'auto-translator.ts',
  'ui-dictionary.json',
  'i18n.ts',
  'i18n-purchase-prototype.ts',
  // Already converted in pilot:
  'ReturnsWorkspace.tsx',
  'ReturnsWorkspaceHeader.tsx',
  'ReturnsRegisterCard.tsx',
  'ReturnsCreateModal.tsx',
  'ReturnsAnomalyRadarCard.tsx',
  'ReturnsSelectedReturnCard.tsx',
  'ReturnsInvoiceItemsTable.tsx',
]);

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const isAll = args.includes('--all');
const featureArg = args.find(a => a.startsWith('--feature='));
const targetFeature = featureArg ? featureArg.split('=')[1] : null;

// Load dictionaries
console.log('Loading dictionaries...');
const uiDict = fs.existsSync(DICT_PATH) ? JSON.parse(fs.readFileSync(DICT_PATH, 'utf8')) : {};
const enLocales = fs.existsSync(EN_PATH) ? JSON.parse(fs.readFileSync(EN_PATH, 'utf8')) : {};
const arLocales = fs.existsSync(AR_PATH) ? JSON.parse(fs.readFileSync(AR_PATH, 'utf8')) : {};

console.log(`Loaded ${Object.keys(uiDict).length} dictionary entries.`);

// Also load en-extracted if available
let enExtracted = {};
const enExtractedPath = path.resolve(__dirname, 'output/en-extracted.json');
if (fs.existsSync(enExtractedPath)) {
  try {
    enExtracted = JSON.parse(fs.readFileSync(enExtractedPath, 'utf8'));
  } catch {}
}

function findTranslation(arabicText) {
  const trimmed = arabicText.trim();
  if (uiDict[trimmed]) return uiDict[trimmed];
  if (uiDict[arabicText]) return uiDict[arabicText];
  // Normalized lookup (strip trailing punctuation, spaces)
  const norm = trimmed.replace(/[:.،؟!]+$/, '').trim();
  if (uiDict[norm]) {
    const punct = trimmed.slice(norm.length);
    return uiDict[norm] + punct;
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

function findParentComponent(path) {
  let cur = path;
  while (cur) {
    if (cur.isFunctionDeclaration()) {
      const name = cur.node.id?.name || '';
      if (/^[A-Z]/.test(name) || /^use[A-Z]/.test(name)) return cur;
    }
    if (cur.isArrowFunctionExpression() || cur.isFunctionExpression()) {
      if (cur.parentPath.isVariableDeclarator()) {
        const name = cur.parentPath.node.id?.name || '';
        if (/^[A-Z]/.test(name) || /^use[A-Z]/.test(name)) return cur;
      }
      if (cur.parentPath.isExportDefaultDeclaration()) {
        return cur;
      }
    }
    cur = cur.parentPath;
  }
  return null;
}

function escapeStringForJs(str) {
  return JSON.stringify(str).slice(1, -1);
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
  let hasReactI18nextImport = false;
  let reactI18nextImportNode = null;

  for (const stmt of ast.program.body) {
    if (stmt.type === 'ImportDeclaration') {
      if (stmt.specifiers.some(s => s.local.name === 'useTranslation')) {
        hasUseTranslationImport = true;
      }
      if (stmt.source.value === 'react-i18next') {
        hasReactI18nextImport = true;
        reactI18nextImportNode = stmt;
      }
    }
  }

  const replacements = [];
  const componentsNeedingHook = new Map(); // compNode -> compPath
  let stringCounter = 0;
  const newTranslations = [];

  traverse(ast, {
    JSXText(p) {
      const rawText = p.node.value;
      const trimmed = rawText.trim();
      if (!ARABIC_RE.test(trimmed) || !trimmed) return;

      const comp = findParentComponent(p);
      if (!comp) return; // Do not transform outside components

      const key = makeKey(filePath, stringCounter++);
      const translation = findTranslation(trimmed);

      newTranslations.push({ key, ar: trimmed, en: translation || trimmed });

      const leading = rawText.match(/^\s*/)[0];
      const trailing = rawText.match(/\s*$/)[0];

      replacements.push({
        start: p.node.start,
        end: p.node.end,
        replacement: `${leading}{t('${key}', ${JSON.stringify(trimmed)})}${trailing}`,
      });

      componentsNeedingHook.set(comp.node, comp);
    },

    JSXAttribute(p) {
      if (p.node.value && p.node.value.type === 'StringLiteral') {
        const rawText = p.node.value.value;
        if (!ARABIC_RE.test(rawText)) return;

        // Skip non-user-facing attributes
        const attrName = p.node.name?.name || '';
        if (['key', 'className', 'dir', 'id', 'ref', 'type', 'name'].includes(attrName)) return;

        const comp = findParentComponent(p);
        if (!comp) return;

        const key = makeKey(filePath, stringCounter++);
        const translation = findTranslation(rawText);

        newTranslations.push({ key, ar: rawText, en: translation || rawText });

        replacements.push({
          start: p.node.value.start,
          end: p.node.value.end,
          replacement: `{t('${key}', ${JSON.stringify(rawText)})}`,
        });

        componentsNeedingHook.set(comp.node, comp);
      }
    },

    StringLiteral(p) {
      const rawText = p.node.value;
      if (!ARABIC_RE.test(rawText)) return;

      // Skip JSXAttributes (handled above), imports, and exports
      if (p.parentPath.isJSXAttribute()) return;
      if (p.parentPath.isImportDeclaration()) return;
      if (p.parentPath.isExportNamedDeclaration() || p.parentPath.isExportAllDeclaration()) return;

      // Skip already translated calls: t('key', 'default')
      if (p.parentPath.isCallExpression()) {
        const callee = p.parentPath.node.callee;
        if (callee.name === 't' || (callee.property && callee.property.name === 't')) return;
        // Skip console calls
        if (callee.object?.name === 'console') return;
      }

      // Skip comparisons: status === 'معلق'
      if (p.parentPath.isBinaryExpression()) {
        const op = p.parentPath.node.operator;
        if (['===', '!==', '==', '!='].includes(op)) return;
      }

      // Skip switch cases: case 'معلق':
      if (p.parentPath.isSwitchCase()) return;

      // Skip object keys: { 'الاسم': 123 }
      if (p.parentPath.isObjectProperty() && p.parentPath.node.key === p.node) return;

      // Skip TypeScript types
      let cur = p.parentPath;
      let isType = false;
      while (cur) {
        if (cur.node.type?.startsWith('TS') && !['TSAsExpression', 'TSNonNullExpression'].includes(cur.node.type)) {
          isType = true;
          break;
        }
        cur = cur.parentPath;
      }
      if (isType) return;

      const comp = findParentComponent(p);
      if (!comp) return; // Never transform strings outside component/hook scope

      const key = makeKey(filePath, stringCounter++);
      const translation = findTranslation(rawText);

      newTranslations.push({ key, ar: rawText, en: translation || rawText });

      replacements.push({
        start: p.node.start,
        end: p.node.end,
        replacement: `t('${key}', ${JSON.stringify(rawText)})`,
      });

      componentsNeedingHook.set(comp.node, comp);
    },
  });

  if (replacements.length === 0) return null;

  // Insert hook in each component that needs it
  for (const [compNode, compPath] of componentsNeedingHook.entries()) {
    // Check if component already declares t
    let hasExistingT = false;
    if (compPath.scope && compPath.scope.hasOwnBinding('t')) {
      hasExistingT = true;
    } else {
      // Manual check inside block statements
      const bodyNode = compNode.body;
      if (bodyNode && bodyNode.type === 'BlockStatement') {
        for (const s of bodyNode.body) {
          if (s.type === 'VariableDeclaration') {
            for (const d of s.declarations) {
              if (d.id?.name === 't') hasExistingT = true;
              if (d.id?.type === 'ObjectPattern') {
                if (d.id.properties?.some(prop => prop.key?.name === 't' || prop.value?.name === 't')) {
                  hasExistingT = true;
                }
              }
            }
          }
        }
      }
    }

    if (!hasExistingT) {
      const bodyNode = compNode.body;
      if (bodyNode && bodyNode.type === 'BlockStatement') {
        replacements.push({
          start: bodyNode.start + 1,
          end: bodyNode.start + 1,
          replacement: '\n  const { t } = useTranslation();',
        });
      } else if (compNode.body) {
        // Arrow function with concise body: () => <div />
        replacements.push({
          start: compNode.body.start,
          end: compNode.body.start,
          replacement: '{\n  const { t } = useTranslation();\n  return ',
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
    if (hasReactI18nextImport && reactI18nextImportNode) {
      // Add useTranslation to existing import
      replacements.push({
        start: reactI18nextImportNode.start,
        end: reactI18nextImportNode.end,
        replacement: `import { useTranslation } from 'react-i18next';`,
      });
    } else {
      // Add new import at the very top of file
      replacements.push({
        start: 0,
        end: 0,
        replacement: "import { useTranslation } from 'react-i18next';\n",
      });
    }
  }

  // Sort replacements descending by start
  replacements.sort((a, b) => b.start - a.start);

  let newCode = code;
  for (const r of replacements) {
    newCode = newCode.slice(0, r.start) + r.replacement + newCode.slice(r.end);
  }

  // Verify that transformed code parses cleanly
  try {
    parse(newCode, {
      sourceType: 'module',
      plugins: ['typescript', 'jsx', 'decorators-legacy', 'classProperties', 'optionalChaining', 'nullishCoalescingOperator', 'dynamicImport'],
    });
  } catch (verifyErr) {
    return { error: `Syntax verification failed after transform: ${verifyErr.message}` };
  }

  return {
    transformedCode: newCode,
    replacementsCount: replacements.length,
    translations: newTranslations,
  };
}

// Main runner
async function run() {
  console.log('=== Z-Systems i18n AST Codemod ===');
  console.log(`Mode: ${isDryRun ? 'DRY RUN (no files modified)' : 'EXECUTE'}`);
  if (targetFeature) console.log(`Target Feature: ${targetFeature}`);

  const allFiles = walkDir(SRC_DIR);
  let targetFiles = allFiles;

  if (targetFeature) {
    targetFiles = allFiles.filter(f => f.includes(`features\\${targetFeature}`) || f.includes(`features/${targetFeature}`));
  }

  console.log(`Found ${targetFiles.length} candidate TSX files.`);

  let processedCount = 0;
  let transformedCount = 0;
  let errorCount = 0;
  let totalStringsReplaced = 0;
  const allNewTranslations = [];

  for (const file of targetFiles) {
    processedCount++;
    const relPath = path.relative(FRONTEND_DIR, file).replace(/\\/g, '/');
    const result = transformFile(file);

    if (!result) continue;

    if (result.error) {
      console.warn(`[SKIP/ERROR] ${relPath}: ${result.error}`);
      errorCount++;
      continue;
    }

    transformedCount++;
    totalStringsReplaced += result.translations.length;
    allNewTranslations.push(...result.translations);

    if (!isDryRun) {
      fs.writeFileSync(file, result.transformedCode, 'utf8');
    }

    if (transformedCount % 25 === 0 || transformedCount <= 5) {
      console.log(`[OK] (${transformedCount}) ${relPath} (${result.translations.length} strings)`);
    }
  }

  console.log('\n==================================');
  console.log(`Total TSX scanned: ${processedCount}`);
  console.log(`Files transformed: ${transformedCount}`);
  console.log(`Strings replaced: ${totalStringsReplaced}`);
  console.log(`Errors skipped: ${errorCount}`);

  if (!isDryRun && allNewTranslations.length > 0) {
    console.log('\nUpdating en.json and ar.json...');
    for (const item of allNewTranslations) {
      setNestedKey(arLocales, item.key, item.ar);
      setNestedKey(enLocales, item.key, item.en);
    }
    fs.writeFileSync(EN_PATH, JSON.stringify(enLocales, null, 2) + '\n', 'utf8');
    fs.writeFileSync(AR_PATH, JSON.stringify(arLocales, null, 2) + '\n', 'utf8');
    console.log('Dictionaries saved successfully.');
  }

  console.log('Codemod finished successfully!');
}

run().catch(console.error);
