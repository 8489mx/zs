function firstNonEmptyString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        const nested = firstNonEmptyString(item);
        if (nested) return nested;
      }
    }
  }

  return null;
}

function extractNestedMessage(value: unknown): string | null {
  if (!value) return null;

  if (typeof value === 'string') {
    return value.trim() || null;
  }

  if (Array.isArray(value)) {
    return firstNonEmptyString(value);
  }

  if (typeof value === 'object') {
    const candidate = value as {
      message?: unknown;
      error?: unknown;
      details?: unknown;
    };

    const nestedError =
      typeof candidate.error === 'object' && candidate.error
        ? extractNestedMessage(candidate.error)
        : null;

    const nestedDetails =
      typeof candidate.details === 'object' && candidate.details
        ? extractNestedMessage(candidate.details)
        : null;

    return (
      firstNonEmptyString(candidate.message)
      || firstNonEmptyString(candidate.error)
      || nestedError
      || nestedDetails
      || firstNonEmptyString(candidate.details)
      || null
    );
  }

  return null;
}

export function getErrorMessage(error: unknown, fallback = 'حدث خطأ غير متوقع.') {
  if (!error) return fallback;
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'string' && error.trim()) return error;

  const nested = extractNestedMessage(error);
  if (nested) return nested;

  return fallback;
}
