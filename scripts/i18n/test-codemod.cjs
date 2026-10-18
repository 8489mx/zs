const path = require('path');
const fs = require('fs');
const { parse } = require(path.resolve(__dirname, '../../frontend/node_modules/@babel/parser'));
const _traverse = require(path.resolve(__dirname, '../../frontend/node_modules/@babel/traverse'));
const traverse = _traverse.default || _traverse;

const sampleCode = `import React, { useState } from 'react';

export function DemoComponent({ count }: { count: number }) {
  const [active, setActive] = useState('كل الفواتير');
  const title = 'إعدادات النظام';
  return (
    <div className="card">
      <h3>العنوان الرئيسي</h3>
      <input placeholder="ابحث هنا..." />
      <button onClick={() => alert('تم الحفظ')}>
        حفظ
      </button>
    </div>
  );
}
`;

const ast = parse(sampleCode, {
  sourceType: 'module',
  plugins: ['jsx', 'typescript']
});

const replacements = [];
const componentsNeedingHook = new Set();
const ARABIC_RE = /[\u0600-\u06FF]/;

function isComponentOrHook(path) {
  if (path.isFunctionDeclaration()) {
    const name = path.node.id?.name || '';
    return /^[A-Z]/.test(name) || /^use[A-Z]/.test(name);
  }
  if (path.isVariableDeclarator()) {
    const name = path.node.id?.name || '';
    const init = path.node.init;
    if (init && (init.type === 'ArrowFunctionExpression' || init.type === 'FunctionExpression')) {
      return /^[A-Z]/.test(name) || /^use[A-Z]/.test(name);
    }
  }
  return false;
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
    }
    cur = cur.parentPath;
  }
  return null;
}

traverse(ast, {
  JSXText(p) {
    const text = p.node.value.trim();
    if (ARABIC_RE.test(text)) {
      const orig = p.node.value;
      const leading = orig.match(/^\s*/)[0];
      const trailing = orig.match(/\s*$/)[0];
      replacements.push({
        start: p.node.start,
        end: p.node.end,
        replacement: leading + `{t('demo.text', '${text}')}` + trailing
      });
      const comp = findParentComponent(p);
      if (comp) componentsNeedingHook.add(comp);
    }
  },
  JSXAttribute(p) {
    if (p.node.value && p.node.value.type === 'StringLiteral') {
      const text = p.node.value.value;
      if (ARABIC_RE.test(text)) {
        replacements.push({
          start: p.node.value.start,
          end: p.node.value.end,
          replacement: `{t('demo.attr', '${text}')}`
        });
        const comp = findParentComponent(p);
        if (comp) componentsNeedingHook.add(comp);
      }
    }
  },
  StringLiteral(p) {
    if (p.parentPath.isJSXAttribute()) return;
    if (p.parentPath.isImportDeclaration()) return;
    if (p.parentPath.isBinaryExpression()) {
      // Don't replace comparisons: status === 'معلق'
      if (['===', '!==', '==', '!='].includes(p.parentPath.node.operator)) return;
    }
    if (p.parentPath.isSwitchCase()) return;
    const text = p.node.value;
    if (ARABIC_RE.test(text)) {
      const comp = findParentComponent(p);
      if (comp) {
        replacements.push({
          start: p.node.start,
          end: p.node.end,
          replacement: `t('demo.str', '${text}')`
        });
        componentsNeedingHook.add(comp);
      }
    }
  }
});

for (const comp of componentsNeedingHook) {
  let body = comp.node.body;
  if (body.type === 'BlockStatement') {
    replacements.push({
      start: body.start + 1,
      end: body.start + 1,
      replacement: '\n  const { t } = useTranslation();'
    });
  }
}

// Add import
replacements.push({
  start: 0,
  end: 0,
  replacement: "import { useTranslation } from 'react-i18next';\n"
});

replacements.sort((a, b) => b.start - a.start);

let result = sampleCode;
for (const r of replacements) {
  result = result.slice(0, r.start) + r.replacement + result.slice(r.end);
}

console.log('TRANSFORMED RESULT:');
console.log(result);
