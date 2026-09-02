import assert from 'node:assert/strict';
import { formatBranchStockLocationName } from '../../src/common/utils/branch-stock.util';

// 1. Test Naming rules
assert.equal(formatBranchStockLocationName('التعاونيات'), 'رصيد فرع التعاونيات');
assert.equal(formatBranchStockLocationName('فرع التعاونيات'), 'رصيد فرع التعاونيات');
assert.equal(formatBranchStockLocationName('الجيزة'), 'رصيد فرع الجيزة');
assert.equal(formatBranchStockLocationName('فرع الجيزة'), 'رصيد فرع الجيزة');
assert.equal(formatBranchStockLocationName('الفرع الرئيسي'), 'رصيد الفرع الرئيسي');
assert.equal(formatBranchStockLocationName('رصيد فرع المعادي'), 'رصيد فرع المعادي');
assert.equal(formatBranchStockLocationName('مخزون فرع النزهة'), 'رصيد فرع النزهة');

console.log('settings-branch-provisioning.spec: ok');
