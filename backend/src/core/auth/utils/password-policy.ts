import { AppError } from '../../../common/errors/app-error';

export const MIN_PASSWORD_LENGTH = 1;

export function assertStrongPassword(
  password: string,
  options?: { minLength?: number; code?: string; message?: string },
): void {
  const minLength = options?.minLength ?? MIN_PASSWORD_LENGTH;
  const normalized = String(password ?? '');
  const trimmed = normalized.trim();

  if (!trimmed) {
    throw new AppError('Password is required', 'PASSWORD_REQUIRED', 400);
  }

  if (trimmed.length < minLength) {
    throw new AppError(
      options?.message || `Password must be at least ${minLength} characters long`,
      options?.code || 'PASSWORD_TOO_WEAK',
      400,
      { minLength },
    );
  }
}
