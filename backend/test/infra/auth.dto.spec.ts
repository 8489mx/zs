import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { ChangePasswordDto } from '../../src/modules/sessions/dto/change-password.dto';
import { UpsertUserDto } from '../../src/modules/users/dto/upsert-user.dto';
import { MIN_PASSWORD_LENGTH } from '../../src/core/auth/utils/password-policy';

function assertValid<T>(cls: new () => T, payload: unknown): void {
  const instance = plainToInstance(cls, payload);
  const errors = validateSync(instance as object);
  if (errors.length) throw new Error(`Expected valid payload, got ${errors.length} errors`);
}

function assertInvalid<T>(cls: new () => T, payload: unknown): void {
  const instance = plainToInstance(cls, payload);
  const errors = validateSync(instance as object);
  if (!errors.length) throw new Error('Expected invalid payload');
}

function run(): void {
  const strongPassword = 'VeryStrongPass123!';

  assertValid(UpsertUserDto, {
    username: 'owner',
    password: strongPassword,
    role: 'admin',
  });

  assertValid(UpsertUserDto, {
    username: 'owner',
    role: 'admin',
  });

  assertValid(UpsertUserDto, {
    username: 'cashier1',
    password: '1',
    role: 'cashier',
  });

  assertValid(UpsertUserDto, {
    username: 'admin1',
    password: 'a',
    role: 'admin',
  });

  assertValid(ChangePasswordDto, {
    currentPassword: 'CurrentPass123!',
    newPassword: strongPassword,
  });

  assertValid(ChangePasswordDto, {
    currentPassword: 'CurrentPass123!',
    newPassword: '1',
  });

  assertInvalid(ChangePasswordDto, {
    currentPassword: '',
    newPassword: strongPassword,
  });

  assertInvalid(ChangePasswordDto, {
    currentPassword: 'CurrentPass123!',
    newPassword: '',
  });

  if (MIN_PASSWORD_LENGTH !== 1) {
    throw new Error('Password policy minimum should allow one-character passwords');
  }

  process.stdout.write('auth.dto.spec.ts passed\n');
}

try {
  run();
} catch (error: unknown) {
  process.stderr.write(`auth.dto.spec.ts failed: ${String(error)}\n`);
  process.exit(1);
}
