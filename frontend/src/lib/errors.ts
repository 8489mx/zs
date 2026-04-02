export function getErrorMessage(error: unknown, fallback = 'حدث خطأ غير متوقع.') {
  if (!error) return fallback;
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'string' && error.trim()) return error;
  if (typeof error === 'object') {
    const candidate = error as { message?: unknown; error?: unknown; details?: unknown };
    if (typeof candidate.message === 'string' && candidate.message.trim()) return candidate.message;
    if (typeof candidate.error === 'string' && candidate.error.trim()) return candidate.error;
    if (typeof candidate.details === 'string' && candidate.details.trim()) return candidate.details;
  }
  return fallback;
}
