function countOf(value) {
  return Array.isArray(value) ? value.length : 0;
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeId(value) {
  return String(value == null ? '' : value).trim();
}

function createMessageCollectors(errors, warnings) {
  const pushUniqueError = (message) => {
    if (!errors.includes(message)) errors.push(message);
  };
  const pushUniqueWarning = (message) => {
    if (!warnings.includes(message)) warnings.push(message);
  };
  return { pushUniqueError, pushUniqueWarning };
}

function requireArrayOfObjects(value, label, errors, { required = false, max = 50000 } = {}) {
  if (value == null) {
    if (required) errors.push(`${label} array is missing`);
    return;
  }
  if (!Array.isArray(value)) {
    errors.push(`${label} must be an array`);
    return;
  }
  if (value.length > max) {
    errors.push(`${label} exceeds maximum supported size`);
    return;
  }
  if (value.some((entry) => entry == null || typeof entry !== 'object' || Array.isArray(entry))) {
    errors.push(`${label} must contain only objects`);
  }
}

module.exports = {
  countOf,
  asArray,
  normalizeId,
  createMessageCollectors,
  requireArrayOfObjects,
};
