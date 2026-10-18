const path = require('path');
const { parse } = require(path.resolve(__dirname, '../../frontend/node_modules/@babel/parser'));
const _traverse = require(path.resolve(__dirname, '../../frontend/node_modules/@babel/traverse'));
const traverse = _traverse.default || _traverse;

const testSnippets = [
  {
    name: 'CustomSelect with default parameter',
    code: `import React from 'react';
export function CustomSelect({ placeholder = 'اختر...' }: { placeholder?: string }) {
  return <div>{placeholder}<span>اختر عنصراً</span></div>;
}`
  },
  {
    name: 'RestaurantOperationsDialog with default parameter',
    code: `import React from 'react';
export function RestaurantOperationsDialog({ backText = 'الرجوع لعمليات المطعم' }) {
  return <button>{backText} - إغلاق</button>;
}`
  },
  {
    name: 'VanTripsTab with variable shadowing t',
    code: `import React from 'react';
export function VanTripsTab({ trips }: { trips: any[] }) {
  const loading = false;
  return (
    <div>
      <h3>قائمة الرحلات</h3>
      <span>{loading ? 'جاري التحميل...' : 'الرحلات الحالية'}</span>
      {trips.map((t) => (
        <div key={t.id}>
          <span>رقم الرحلة: {t.id}</span>
          <span>حالة الرحلة</span>
        </div>
      ))}
    </div>
  );
}`
  }
];

const ARABIC_RE = /[\u0600-\u06FF]/;

function testSnippet(snippet) {
  console.log('--- Testing:', snippet.name);
  const ast = parse(snippet.code, {
    sourceType: 'module',
    plugins: ['typescript', 'jsx']
  });

  const replacements = [];
  const componentsNeedingHook = new Map(); // compNode -> { compPath, fnName }

  function findParentComponent(p) {
    let cur = p;
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

  function getTranslationFnName(compPath) {
    // Check if the component or any of its inner functions has a binding named 't'
    // that is NOT useTranslation
    let shadowsT = false;
    compPath.traverse({
      BindingIdentifier(identPath) {
        if (identPath.node.name === 't') {
          // If it's a parameter or local variable other than useTranslation destructure
          const parent = identPath.parentPath;
          if (parent.isVariableDeclarator()) {
            const init = parent.node.init;
            if (init && init.type === 'CallExpression' && init.callee?.name === 'useTranslation') {
              return; // this is the hook itself
            }
          }
          shadowsT = true;
        }
      }
    });
    return shadowsT ? 'tr' : 't';
  }

  // 1. Visit ONLY JSXText and JSXAttribute and StringLiteral strictly inside JSXExpressionContainer
  traverse(ast, {
    JSXText(p) {
      const text = p.node.value;
      const trimmed = text.trim();
      if (!ARABIC_RE.test(trimmed) || !trimmed) return;
      const comp = findParentComponent(p);
      if (!comp) return;

      const fnName = getTranslationFnName(comp);
      componentsNeedingHook.set(comp.node, { compPath: comp, fnName });

      const leading = text.match(/^\s*/)[0];
      const trailing = text.match(/\s*$/)[0];
      replacements.push({
        start: p.node.start,
        end: p.node.end,
        replacement: `${leading}{${fnName}('key', ${JSON.stringify(trimmed)})}${trailing}`
      });
    },

    JSXAttribute(p) {
      if (p.node.value && p.node.value.type === 'StringLiteral') {
        const text = p.node.value.value;
        if (!ARABIC_RE.test(text)) return;
        const attrName = p.node.name?.name || '';
        if (['key', 'className', 'dir', 'id', 'ref', 'type', 'name'].includes(attrName)) return;

        const comp = findParentComponent(p);
        if (!comp) return;

        const fnName = getTranslationFnName(comp);
        componentsNeedingHook.set(comp.node, { compPath: comp, fnName });

        replacements.push({
          start: p.node.value.start,
          end: p.node.value.end,
          replacement: `{${fnName}('key', ${JSON.stringify(text)})}`
        });
      }
    },

    StringLiteral(p) {
      const text = p.node.value;
      if (!ARABIC_RE.test(text)) return;
      if (p.parentPath.isJSXAttribute()) return; // handled above

      // MUST be inside a JSXExpressionContainer
      const exprContainer = p.findParent(parent => parent.isJSXExpressionContainer());
      if (!exprContainer) return; // STRICT: only inside JSX

      // Skip object keys: { 'نص': val }
      if (p.parentPath.isObjectProperty() && p.parentPath.node.key === p.node) return;
      // Skip comparisons: x === 'نص'
      if (p.parentPath.isBinaryExpression() && ['===', '!==', '==', '!='].includes(p.parentPath.node.operator)) return;
      // Skip switch cases
      if (p.parentPath.isSwitchCase()) return;
      // Skip console
      if (p.parentPath.isCallExpression() && p.parentPath.node.callee?.object?.name === 'console') return;
      // Skip already translated
      if (p.parentPath.isCallExpression()) {
        const callee = p.parentPath.node.callee;
        if (callee.name === 't' || callee.name === 'tr' || callee.property?.name === 't') return;
      }

      const comp = findParentComponent(p);
      if (!comp) return;

      const fnName = getTranslationFnName(comp);
      componentsNeedingHook.set(comp.node, { compPath: comp, fnName });

      replacements.push({
        start: p.node.start,
        end: p.node.end,
        replacement: `${fnName}('key', ${JSON.stringify(text)})`
      });
    }
  });

  // Check that NO parameter default was touched!
  console.log(`Found ${replacements.length} safe JSX replacements.`);
  for (const [node, { compPath, fnName }] of componentsNeedingHook.entries()) {
    console.log(`Component needs hook with fnName: '${fnName}'`);
  }

  // Apply replacements in reverse order
  let result = snippet.code;
  replacements.sort((a, b) => b.start - a.start);
  for (const r of replacements) {
    result = result.slice(0, r.start) + r.replacement + result.slice(r.end);
  }

  // Verify result by re-parsing
  try {
    parse(result, { sourceType: 'module', plugins: ['typescript', 'jsx'] });
    console.log('Result parsed successfully!\n', result);
  } catch (e) {
    console.error('Parse failed on result:', e.message);
  }
}

testSnippets.forEach(testSnippet);
