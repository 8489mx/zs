#!/usr/bin/env node
/**
 * Every `/api/...` path the frontend calls must exist as a route on a backend controller.
 *
 * The existing contract check (api-contract-alignment.mjs) compares only the paths declared in
 * `contracts.ts` files — a few dozen of them. Everything else the app calls was unchecked, and a
 * call to a route that never existed simply 404s at runtime: the screen shows empty data, or a
 * feature quietly does nothing. That is how `/api/pos/shifts/current` survived (the quick cash
 * advance never found the open shift, so it always booked against the main treasury).
 *
 * Matching rules:
 * - A literal that ends the string ('/api/x/y') must match a route exactly, with `:params` wild.
 * - A literal cut short by an interpolation ('/api/x/${id}') must be a prefix of some route.
 * - Controllers may declare several prefixes and several paths per decorator; both are expanded.
 *
 * Known-unmatchable strings (base URLs, mocks in test helpers) live in the baseline file.
 */
import fs from 'node:fs';
import path from 'node:path';
import { enforceWithBaseline } from './architecture-baseline.mjs';

const frontendRoot = process.cwd();
const backendSrc = path.resolve(frontendRoot, '..', 'backend', 'src');

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!/node_modules|__tests__/.test(full)) walk(full, out);
    } else if (/\.(ts|tsx)$/.test(entry.name) && !/\.spec\.|\.test\./.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

function frontendCalls() {
  const calls = new Map();
  for (const file of walk(path.join(frontendRoot, 'src'))) {
    // Comments mention dead paths on purpose (see QuickCashAdvanceModal); only code counts.
    const source = fs.readFileSync(file, 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/(^|[^:])\/\/.*$/gm, '$1');
    for (const match of source.matchAll(/['"`](\/api\/[A-Za-z0-9_\-/]*)(['"`]|\$\{)/g)) {
      const apiPath = match[1].replace(/\/+$/, '');
      const isPrefix = match[2] === '${';
      const rel = path.relative(frontendRoot, file).split(path.sep).join('/');
      const key = `${apiPath}${isPrefix ? '/…' : ''}   <- ${rel}`;
      if (!calls.has(key)) calls.set(key, { apiPath, isPrefix });
    }
  }
  return calls;
}

function backendRoutes() {
  const routes = new Set();
  for (const file of walk(backendSrc)) {
    if (!file.endsWith('.controller.ts')) continue;
    const source = fs.readFileSync(file, 'utf8');
    const prefixes = [];
    for (const match of source.matchAll(/@Controller\(\s*(\[[^\]]*\]|['"][^'"]*['"])\s*\)/g)) {
      for (const part of match[1].replace(/[[\]'"]/g, '').split(',')) prefixes.push(part.trim());
    }
    if (!prefixes.length) prefixes.push('');

    const add = (prefix, sub) => routes.add(`/${prefix}/${sub}`.replace(/\/+/g, '/').replace(/(.)\/$/, '$1'));
    for (const match of source.matchAll(/@(Get|Post|Put|Delete|Patch)\(\s*(\[[^\]]*\]|['"][^'"]*['"])?\s*\)/g)) {
      const raw = match[2];
      const subs = raw ? raw.replace(/[[\]'"]/g, '').split(',').map((s) => s.trim()) : [''];
      for (const prefix of prefixes) for (const sub of subs) add(prefix, sub);
    }
  }
  return [...routes];
}

const routes = backendRoutes();
const violations = [];
for (const [label, call] of frontendCalls()) {
  const wanted = call.apiPath.split('/');
  const found = routes.some((route) => {
    const parts = route.split('/');
    if (call.isPrefix ? parts.length < wanted.length : parts.length !== wanted.length) return false;
    return wanted.every((segment, i) => parts[i] === segment || (parts[i] || '').startsWith(':'));
  });
  if (!found) violations.push(label);
}

enforceWithBaseline({
  name: 'Frontend API call coverage check',
  baselineFile: path.join(frontendRoot, 'scripts', 'baselines', 'api-call-coverage.json'),
  violations,
  hint: 'This path has no matching backend route: it will 404 at runtime. Fix the path, add the route, or (only for a base URL / mock) update the baseline.',
});
