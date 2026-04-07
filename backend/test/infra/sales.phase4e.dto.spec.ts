import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { HeldSaleDto } from '../../src/modules/sales/dto/held-sale.dto';
import { UpsertSaleDto } from '../../src/modules/sales/dto/upsert-sale.dto';

function assertValid<T>(cls: new () => T, payload: unknown): void {
  const instance = plainToInstance(cls, payload);
  const errors = validateSync(instance as object);
  if (errors.length) throw new Error(`Expected payload to be valid, got ${errors.length} errors`);
}

function assertInvalid<T>(cls: new () => T, payload: unknown): void {
  const instance = plainToInstance(cls, payload);
  const errors = validateSync(instance as object);
  if (!errors.length) throw new Error('Expected payload to be invalid');
}

function run(): void {
  assertValid(UpsertSaleDto, {
    customerId: 1,
    paymentType: 'cash',
    discount: 2,
    taxRate: 15,
    items: [{ productId: 1, qty: 2, price: 10 }],
    payments: [{ paymentChannel: 'cash', amount: 20 }],
  });

  assertInvalid(UpsertSaleDto, {
    items: [],
  });

  assertValid(HeldSaleDto, {
    customerId: 1,
    paymentType: 'cash',
    cashAmount: 10,
    items: [{ productId: 1, qty: 1, price: 10 }],
  });

  assertInvalid(HeldSaleDto, {
    paymentType: 'cash',
    items: [],
  });

  process.stdout.write('sales.phase4e.dto.spec.ts passed\n');
}

try {
  run();
} catch (error) {
  process.stderr.write(`sales.phase4e.dto.spec.ts failed: ${String(error)}\n`);
  process.exit(1);
}
