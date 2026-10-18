const fs = require('fs');
const path = require('path');
const { parse } = require(path.resolve(__dirname, '../../frontend/node_modules/@babel/parser'));
const _traverse = require(path.resolve(__dirname, '../../frontend/node_modules/@babel/traverse'));
const traverse = _traverse.default || _traverse;

const srcDir = path.resolve(__dirname, '../../frontend/src');

function isInsideFunctionParams(path) {
  let cur = path;
  while (cur) {
    if (cur.isFunction()) {
      // Check if path is within cur.node.params
      const params = cur.node.params;
      for (const param of params) {
        if (param.start <= path.node.start && path.node.end <= param.end) {
          return true;
        }
      }
      return false;
    }
    cur = cur.parentPath;
  }
  return false;
}

function fixFile(filePath) {
  const code = fs.readFileSync(filePath, 'utf8');
  if (!code.includes('t(')) return false;

  let ast;
  try {
    ast = parse(code, {
      sourceType: 'module',
      plugins: ['typescript', 'jsx', 'decorators-legacy', 'classProperties', 'optionalChaining', 'nullishCoalescingOperator', 'dynamicImport'],
    });
  } catch (err) {
    console.error(`Parse error in ${filePath}:`, err.message);
    return false;
  }

  const replacements = [];

  traverse(ast, {
    CallExpression(p) {
      if (p.node.callee.name === 't' && isInsideFunctionParams(p)) {
        // This is t('key', "fallback") inside function params!
        // We must replace it with the fallback string literal or identifier
        const args = p.node.arguments;
        if (args.length >= 2) {
          const fallback = args[1];
          // Get the exact code of fallback
          const fallbackCode = code.slice(fallback.start, fallback.end);
          replacements.push({
            start: p.node.start,
            end: p.node.end,
            replacement: fallbackCode
          });
        }
      }
    }
  });

  if (replacements.length === 0) return false;

  replacements.sort((a, b) => b.start - a.start);

  let newCode = code;
  for (const r of replacements) {
    newCode = newCode.slice(0, r.start) + r.replacement + newCode.slice(r.end);
  }

  // Verify syntax
  try {
    parse(newCode, {
      sourceType: 'module',
      plugins: ['typescript', 'jsx', 'decorators-legacy', 'classProperties', 'optionalChaining', 'nullishCoalescingOperator', 'dynamicImport'],
    });
  } catch (err) {
    console.error(`Verification error in ${filePath}:`, err.message);
    return false;
  }

  fs.writeFileSync(filePath, newCode, 'utf8');
  return replacements.length;
}

function walk(dir) {
  let count = 0;
  let fixedFiles = 0;
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.git', 'dist'].includes(f.name)) continue;
    const full = path.join(dir, f.name);
    if (f.isDirectory()) {
      const sub = walk(full);
      count += sub.count;
      fixedFiles += sub.fixedFiles;
    } else if (f.name.endsWith('.tsx') || f.name.endsWith('.ts')) {
      const res = fixFile(full);
      if (res) {
        console.log(`[FIXED] ${path.relative(srcDir, full)} (${res} param defaults reverted)`);
        count += res;
        fixedFiles++;
      }
    }
  }
  return { count, fixedFiles };
}

console.log('Fixing parameter defaults across frontend/src...');
const result = walk(srcDir);
console.log(`Done! Fixed ${result.count} parameter defaults across ${result.fixedFiles} files.`);
