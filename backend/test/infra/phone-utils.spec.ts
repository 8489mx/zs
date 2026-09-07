import { strict as assert } from 'node:assert';
import {
  detectCountryFromPhone,
  generatePhoneSearchVariants,
  SUPPORTED_COUNTRIES,
  validateAndNormalizePhone,
} from '../../src/core/utils/phone-utils';

async function run() {
  // 1. Egypt Validation
  const egValid1 = validateAndNormalizePhone('01012345678', 'EG');
  assert.equal(egValid1.isValid, true);
  assert.equal(egValid1.normalized, '+201012345678');
  assert.equal(egValid1.nationalNumber, '01012345678');

  const egValid2 = validateAndNormalizePhone('01155554444', 'EG');
  assert.equal(egValid2.isValid, true);
  assert.equal(egValid2.normalized, '+201155554444');

  const egValid3 = validateAndNormalizePhone('01200001111', 'EG');
  assert.equal(egValid3.isValid, true);

  const egValid4 = validateAndNormalizePhone('01599998888', 'EG');
  assert.equal(egValid4.isValid, true);

  const egValid5 = validateAndNormalizePhone('+201012345678', 'EG');
  assert.equal(egValid5.isValid, true);
  assert.equal(egValid5.normalized, '+201012345678');

  // Egypt Invalid cases
  const egInvalidPrefix = validateAndNormalizePhone('01312345678', 'EG');
  assert.equal(egInvalidPrefix.isValid, false);
  assert.match(egInvalidPrefix.error || '', /010 أو 011 أو 012 أو 015/);

  const egInvalidShort = validateAndNormalizePhone('0101234567', 'EG');
  assert.equal(egInvalidShort.isValid, false);

  const egInvalidLong = validateAndNormalizePhone('010123456789', 'EG');
  assert.equal(egInvalidLong.isValid, false);

  // 2. Saudi Validation
  const saValid = validateAndNormalizePhone('0512345678', 'SA');
  assert.equal(saValid.isValid, true);
  assert.equal(saValid.normalized, '+966512345678');

  const saValidShort = validateAndNormalizePhone('512345678', 'SA');
  assert.equal(saValidShort.isValid, true);
  assert.equal(saValidShort.normalized, '+966512345678');

  const saInvalidPrefix = validateAndNormalizePhone('0612345678', 'SA');
  assert.equal(saInvalidPrefix.isValid, false);

  // 3. Qatar Validation
  const qaValid = validateAndNormalizePhone('33123456', 'QA');
  assert.equal(qaValid.isValid, true);
  assert.equal(qaValid.normalized, '+97433123456');

  const qaInvalid = validateAndNormalizePhone('22123456', 'QA');
  assert.equal(qaInvalid.isValid, false);

  // 4. UAE Validation
  const aeValid = validateAndNormalizePhone('0501234567', 'AE');
  assert.equal(aeValid.isValid, true);
  assert.equal(aeValid.normalized, '+971501234567');

  // 5. Kuwait Validation
  const kwValid = validateAndNormalizePhone('91234567', 'KW');
  assert.equal(kwValid.isValid, true);
  assert.equal(kwValid.normalized, '+96591234567');

  // 6. Oman Validation
  const omValid = validateAndNormalizePhone('91234567', 'OM');
  assert.equal(omValid.isValid, true);
  assert.equal(omValid.normalized, '+96891234567');

  // 7. Bahrain Validation
  const bhValid = validateAndNormalizePhone('31234567', 'BH');
  assert.equal(bhValid.isValid, true);
  assert.equal(bhValid.normalized, '+97331234567');

  // 8. Jordan Validation
  const joValid = validateAndNormalizePhone('0791234567', 'JO');
  assert.equal(joValid.isValid, true);
  assert.equal(joValid.normalized, '+962791234567');

  // 9. Other / International
  const intlValid = validateAndNormalizePhone('+447911123456', 'OTHER');
  assert.equal(intlValid.isValid, true);
  assert.equal(intlValid.normalized, '+447911123456');

  // 10. Auto-Detection
  assert.equal(detectCountryFromPhone('01012345678'), 'EG');
  assert.equal(detectCountryFromPhone('0512345678'), 'SA');
  assert.equal(detectCountryFromPhone('+97433123456'), 'QA');
  assert.equal(detectCountryFromPhone('+971501234567'), 'AE');
  assert.equal(detectCountryFromPhone('0791234567'), 'JO');

  // 11. Search variants generation
  const variants = generatePhoneSearchVariants('01012345678');
  assert.ok(variants.includes('01012345678'));
  assert.ok(variants.includes('+201012345678'));
  assert.ok(variants.includes('201012345678'));
  assert.ok(variants.includes('1012345678'));

  console.log('phone-utils.spec: ok');
}

run();
