#!/usr/bin/env node
/**
 * O31: a user-facing string written with single quotes but containing `${...}` prints the code
 * itself — "سعر بيع العرض (${getGlobalCurrencySymbol()})" — and only a human reading that screen
 * ever notices. TypeScript accepts it, so this walks the real syntax tree and fails on any string
 * literal (not template literal) that contains an interpolation.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';

const ROOT = 'src';
const SKIP = /node_modules|__tests__|\.spec\.|\.test\./;

function sourceFiles(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (SKIP.test(full)) continue;
    if (entry.isDirectory()) sourceFiles(full, out);
    else if (/\.(ts|tsx)$/.test(entry.name)) out.push(full);
  }
  return out;
}

const findings = [];
for (const file of sourceFiles(ROOT)) {
  const text = readFileSync(file, 'utf8');
  const sourceFile = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const visit = (node) => {
    if (ts.isStringLiteral(node) && node.text.includes('${')) {
      const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
      findings.push(`${file}:${line + 1}  ${node.text.slice(0, 100)}`);
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
}

if (findings.length) {
  console.error(`Literal interpolation check failed: ${findings.length} string literal(s) print \${...} verbatim (O31).`);
  console.error(findings.join('\n'));
  console.error('\nUse a template literal (backticks) for these.');
  process.exit(1);
}
console.log('Literal interpolation check passed (no string literal prints ${...} verbatim).');
