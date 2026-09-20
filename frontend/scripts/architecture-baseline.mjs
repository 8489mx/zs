import fs from 'node:fs';
import path from 'node:path';

/**
 * Ratchet helper for architecture checks that already have a backlog of violations.
 *
 * The rule we actually want to enforce is "do not add NEW violations". Failing on the
 * whole historical backlog would make the check permanently red, so it would simply be
 * switched off — which is how these checks ended up outside CI in the first place.
 *
 * Baseline entries are the exact violation strings that existed when the ratchet was
 * introduced. Anything not in that list fails the build. Regenerate with:
 *   node scripts/<check>.mjs --update-baseline
 */
export function enforceWithBaseline({ name, baselineFile, violations, hint }) {
  const baselinePath = path.resolve(baselineFile);
  const shouldUpdate = process.argv.includes('--update-baseline') || process.env.UPDATE_ARCH_BASELINE === '1';
  const current = [...new Set(violations)].sort();

  if (shouldUpdate) {
    fs.mkdirSync(path.dirname(baselinePath), { recursive: true });
    fs.writeFileSync(baselinePath, `${JSON.stringify(current, null, 2)}\n`, 'utf8');
    console.log(`\n${name}: baseline updated with ${current.length} accepted violation(s).`);
    return;
  }

  let baseline = [];
  if (fs.existsSync(baselinePath)) {
    baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
  }
  const accepted = new Set(baseline);
  const added = current.filter((entry) => !accepted.has(entry));
  const fixed = baseline.filter((entry) => !current.includes(entry));

  if (added.length) {
    console.error(`\n${name} failed: ${added.length} NEW violation(s) introduced.\n`);
    added.forEach((entry) => console.error(`- ${entry}`));
    if (hint) console.error(`\n${hint}`);
    console.error('\nFix the new violation, or (only if it is a deliberate, reviewed exception) run the check with --update-baseline.');
    process.exit(1);
  }

  if (fixed.length) {
    console.log(`\n${name}: ${fixed.length} baseline violation(s) no longer exist. Run with --update-baseline to shrink the baseline.`);
  }

  console.log(`\n${name} passed (${current.length} accepted legacy violation(s), 0 new).`);
}
