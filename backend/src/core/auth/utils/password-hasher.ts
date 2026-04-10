import { compare, genSalt, hash } from 'bcryptjs';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

const BCRYPT_ROUNDS = 12;
const LEGACY_SALT_BYTES = 16;
const BCRYPT_PREFIXES = ['$2a$', '$2b$', '$2y$'];

export type PasswordHashVerification = {
  valid: boolean;
  needsRehash: boolean;
};

function isBcryptHash(value: string): boolean {
  return BCRYPT_PREFIXES.some((prefix) => value.startsWith(prefix));
}

function legacyHashPassword(password: string, salt: string): string {
  return createHash('sha256').update(`${password}:${salt}`).digest('hex');
}

function safeStringEquals(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left, 'utf8');
  const rightBuffer = Buffer.from(right, 'utf8');

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

export async function createPasswordRecord(password: string): Promise<{ hash: string; salt: string }> {
  const bcryptSalt = await genSalt(BCRYPT_ROUNDS);
  const passwordHash = await hash(password, bcryptSalt);

  return {
    hash: passwordHash,
    salt: randomBytes(LEGACY_SALT_BYTES).toString('hex'),
  };
}

export async function verifyPassword(
  password: string,
  storedHash: string,
  storedSalt: string,
): Promise<PasswordHashVerification> {
  if (!storedHash) {
    return { valid: false, needsRehash: false };
  }

  if (isBcryptHash(storedHash)) {
    return {
      valid: await compare(password, storedHash),
      needsRehash: false,
    };
  }

  if (!storedSalt) {
    return { valid: false, needsRehash: false };
  }

  const legacyHash = legacyHashPassword(password, storedSalt);
  const valid = safeStringEquals(legacyHash, storedHash);

  return {
    valid,
    needsRehash: valid,
  };
}
