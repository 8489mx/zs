function toTrimmedString(value, fallback = '') {
  return String(value || fallback).trim();
}

function toNullableNumber(value) {
  return value ? Number(value) : null;
}

function toBooleanFlag(value) {
  return value === true || value === 'true' || value === 1;
}

module.exports = { toTrimmedString, toNullableNumber, toBooleanFlag };
