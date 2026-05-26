import {
  API_DB_CODE_FALLBACK_MESSAGES,
  API_FIELD_REQUIRED_MESSAGES,
  API_TECHNICAL_MESSAGE_PREFIXES,
  API_UNIQUE_CONSTRAINT_MESSAGES,
} from '@/lib/api-error-mapping';

type AnyRecord = Record<string, unknown>;

const MSG_REQUIRED_FIELD = '\u064a\u0648\u062c\u062f \u062d\u0642\u0644 \u0645\u0637\u0644\u0648\u0628 \u0644\u0645 \u064a\u062a\u0645 \u0625\u062f\u062e\u0627\u0644\u0647.';
const MSG_DUP_GENERIC = '\u0647\u0630\u0647 \u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a \u0645\u0633\u062a\u062e\u062f\u0645\u0629 \u0628\u0627\u0644\u0641\u0639\u0644.';
const MSG_FOREIGN_KEY = '\u0644\u0627 \u064a\u0645\u0643\u0646 \u062a\u0646\u0641\u064a\u0630 \u0627\u0644\u0639\u0645\u0644\u064a\u0629 \u0644\u0623\u0646 \u0647\u0646\u0627\u0643 \u0628\u064a\u0627\u0646\u0627\u062a \u0645\u0631\u062a\u0628\u0637\u0629 \u0628\u0647\u0627.';
const MSG_INVALID_FIELD = '\u0642\u064a\u0645\u0629 \u063a\u064a\u0631 \u0635\u062d\u064a\u062d\u0629 \u0641\u064a \u0623\u062d\u062f \u0627\u0644\u062d\u0642\u0648\u0644.';
const MSG_UNDEFINED_TABLE = '\u062c\u062f\u0648\u0644 \u0645\u0637\u0644\u0648\u0628 \u063a\u064a\u0631 \u0645\u0648\u062c\u0648\u062f. \u0631\u0627\u062c\u0639 \u062a\u062d\u062f\u064a\u062b\u0627\u062a \u0642\u0627\u0639\u062f\u0629 \u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a.';
const MSG_UNDEFINED_COLUMN = '\u064a\u0648\u062c\u062f \u0639\u062f\u0645 \u062a\u0648\u0627\u0641\u0642 \u0641\u064a \u0642\u0627\u0639\u062f\u0629 \u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a. \u0631\u0627\u062c\u0639 \u062a\u062d\u062f\u064a\u062b\u0627\u062a \u0627\u0644\u0646\u0638\u0627\u0645.';
const MSG_TEXT_TOO_LONG = '\u0627\u0644\u0646\u0635 \u0627\u0644\u0645\u062f\u062e\u0644 \u0623\u0637\u0648\u0644 \u0645\u0646 \u0627\u0644\u0645\u0633\u0645\u0648\u062d.';
const MSG_OPERATION_FAILED = '\u062a\u0639\u0630\u0631 \u062a\u0646\u0641\u064a\u0630 \u0627\u0644\u0639\u0645\u0644\u064a\u0629 \u0627\u0644\u0645\u0637\u0644\u0648\u0628\u0629.';

function isObject(value: unknown): value is AnyRecord {
  return Boolean(value) && typeof value === 'object';
}

function firstMessageInArray(values: unknown[]): string {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (Array.isArray(value)) {
      const nested = firstMessageInArray(value);
      if (nested) return nested;
    }
    if (isObject(value)) {
      const nested = firstNonEmpty(
        value.message,
        (value.error as AnyRecord | undefined)?.message,
        (value.details as AnyRecord | undefined)?.message,
      );
      if (nested) return nested;
    }
  }
  return '';
}

function firstNonEmpty(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (Array.isArray(value)) {
      const nested = firstMessageInArray(value);
      if (nested) return nested;
    }
  }
  return '';
}

function extractResponseData(error: unknown): AnyRecord | null {
  if (!isObject(error)) return null;
  const response = error.response;
  if (!isObject(response)) return null;
  const data = response.data;
  return isObject(data) ? data : null;
}

function extractPreferredMessage(error: unknown): string {
  const responseData = extractResponseData(error);
  if (responseData) {
    const fromResponse = firstNonEmpty(
      responseData.message,
      (responseData.error as AnyRecord | undefined)?.message,
      (responseData.details as AnyRecord | undefined)?.message,
    );
    if (fromResponse) return fromResponse;
  }

  if (isObject(error)) {
    const directMessage = firstNonEmpty(error.message);
    if (directMessage) return directMessage;

    const nested = firstNonEmpty(
      (error.error as AnyRecord | undefined)?.message,
      (error.details as AnyRecord | undefined)?.message,
      error.errors,
    );
    if (nested) return nested;
  }

  if (typeof error === 'string' && error.trim()) return error.trim();
  if (Array.isArray(error)) return firstMessageInArray(error);
  return '';
}

function extractErrorCode(error: unknown): string {
  const responseData = extractResponseData(error);
  if (responseData) {
    const fromResponse = firstNonEmpty(
      responseData.code,
      (responseData.error as AnyRecord | undefined)?.code,
      (responseData.details as AnyRecord | undefined)?.code,
    );
    if (fromResponse) return fromResponse;
  }

  if (isObject(error)) {
    return firstNonEmpty(
      error.code,
      (error.error as AnyRecord | undefined)?.code,
      (error.details as AnyRecord | undefined)?.code,
    );
  }

  return '';
}

function extractColumnFromText(message: string): string {
  return (message.match(/column\s+"?([a-zA-Z0-9_]+)"?/i)?.[1] || '').toLowerCase();
}

function extractConstraintHint(error: unknown, message: string): string {
  const responseData = extractResponseData(error);
  const details = responseData?.details;
  const detailsObject = isObject(details) ? details : null;

  const fromPayload = firstNonEmpty(
    detailsObject?.constraint,
    (responseData?.error as AnyRecord | undefined)?.constraint,
    (responseData?.details as AnyRecord | undefined)?.source,
  );
  if (fromPayload) return fromPayload.toLowerCase();

  const fromMessage = message.match(/\(([^)]+)\)=\(([^)]*)\)/)?.[1];
  if (fromMessage) return fromMessage.toLowerCase();

  return message.toLowerCase();
}

function mapNotNullMessage(error: unknown, message: string): string {
  const responseData = extractResponseData(error);
  const detailsObject = isObject(responseData?.details) ? (responseData?.details as AnyRecord) : null;
  const field = firstNonEmpty(detailsObject?.column, extractColumnFromText(message)).toLowerCase();
  if (field && API_FIELD_REQUIRED_MESSAGES[field]) return API_FIELD_REQUIRED_MESSAGES[field];
  return MSG_REQUIRED_FIELD;
}

function mapUniqueMessage(error: unknown, message: string): string {
  const hint = extractConstraintHint(error, message);
  const match = API_UNIQUE_CONSTRAINT_MESSAGES.find((entry) => entry.matcher.test(hint));
  return match?.message || MSG_DUP_GENERIC;
}

function isTechnicalMessage(message: string): boolean {
  const normalized = message.trim().toLowerCase();
  return (
    API_TECHNICAL_MESSAGE_PREFIXES.some((prefix) => normalized.startsWith(prefix))
    || normalized.includes('violates unique constraint')
    || normalized.includes('violates check constraint')
    || normalized.includes('invalid input syntax')
  );
}

function mapByCode(errorCode: string, error: unknown, message: string): string {
  if (!errorCode) return '';

  const normalized = errorCode.trim().toUpperCase();
  if (normalized === '23502' || normalized === 'DB_NOT_NULL_VIOLATION') return mapNotNullMessage(error, message);
  if (normalized === '23505' || normalized.startsWith('DUPLICATE_') || normalized === 'DB_UNIQUE_VIOLATION') {
    const mapped = mapUniqueMessage(error, message);
    if (mapped === MSG_DUP_GENERIC && message && !isTechnicalMessage(message)) return message;
    return mapped;
  }
  if (normalized in API_DB_CODE_FALLBACK_MESSAGES) return API_DB_CODE_FALLBACK_MESSAGES[normalized];
  return '';
}

function mapByTechnicalMessage(error: unknown, message: string): string {
  const normalized = message.toLowerCase();
  if (normalized.startsWith('null value in column') || normalized.includes('violates not-null constraint')) {
    return mapNotNullMessage(error, message);
  }
  if (normalized.startsWith('duplicate key value') || normalized.includes('violates unique constraint')) {
    return mapUniqueMessage(error, message);
  }
  if (normalized.includes('violates foreign key constraint')) {
    return MSG_FOREIGN_KEY;
  }
  if (normalized.includes('violates check constraint')) {
    return MSG_INVALID_FIELD;
  }
  if (normalized.includes('relation') && normalized.includes('does not exist')) {
    return MSG_UNDEFINED_TABLE;
  }
  if (normalized.includes('column') && normalized.includes('does not exist')) {
    return MSG_UNDEFINED_COLUMN;
  }
  if (normalized.includes('value too long') || normalized.includes('too long for type')) {
    return MSG_TEXT_TOO_LONG;
  }
  if (normalized.includes('invalid input syntax')) {
    return MSG_INVALID_FIELD;
  }
  return MSG_OPERATION_FAILED;
}

export function getFriendlyApiErrorMessage(error: unknown, fallback = MSG_OPERATION_FAILED): string {
  if (!error) return fallback;

  const message = extractPreferredMessage(error);
  const code = extractErrorCode(error);

  const fromCode = mapByCode(code, error, message);
  if (fromCode) return fromCode;

  if (message) {
    if (isTechnicalMessage(message)) {
      return mapByTechnicalMessage(error, message);
    }
    return message;
  }

  return fallback;
}