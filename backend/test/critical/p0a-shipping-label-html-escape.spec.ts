import { strict as assert } from 'node:assert';
import { escapeHtml } from '../../src/common/utils/escape-html';
import { escapeHtml as escapeSandbox } from '../../src/modules/tenant-subscription/sandbox-checkout-render.util';

function run(): void {
  const payload = '<img src=x onerror="alert(1)">';
  assert.equal(escapeHtml(payload), '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
  assert.equal(escapeSandbox(payload), escapeHtml(payload), 'Sandbox and shipping labels must share encoding');
  assert.equal(escapeHtml("x'&"), 'x&#39;&amp;');
}
run();
