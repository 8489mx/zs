import 'reflect-metadata';
import { strict as assert } from 'node:assert';
import { SettingsImportService } from '../../src/modules/settings/services/settings-import.service';

const tenantId = 'tenant-test';
const accountId = 'account-test';

type DbState = {
  customers: Array<Record<string, unknown>>;
  customer_ledger: Array<Record<string, unknown>>;
  nextCustomerId: number;
};

function createState(): DbState {
  return { customers: [], customer_ledger: [], nextCustomerId: 1 };
}

class FakeSelectBuilder {
  private conditions: Array<{ column: unknown; value: unknown }> = [];
  constructor(private readonly state: DbState) {}
  select(): this { return this; }
  where(column: unknown, _op?: string, value?: unknown): this { this.conditions.push({ column, value }); return this; }
  async executeTakeFirst() {
    const phone = this.conditions.find((entry) => entry.column === 'phone')?.value;
    const loweredName = this.conditions.find((entry) => typeof entry.column !== 'string')?.value;
    const isActive = this.conditions.some((entry) => entry.column === 'is_active' && entry.value === true);
    return this.state.customers.find((row) => {
      if (row.tenant_id !== tenantId || row.is_active !== isActive) return false;
      if (typeof phone === 'string' && phone) return row.phone === phone;
      if (typeof loweredName === 'string') return String(row.name || '').toLowerCase() === loweredName;
      return false;
    });
  }
}

class FakeInsertBuilder {
  private payload: Record<string, unknown> = {};
  constructor(private readonly table: 'customers' | 'customer_ledger', private readonly state: DbState, private readonly failOnCustomerNumber: number | null) {}
  values(payload: Record<string, unknown>): this { this.payload = payload; return this; }
  returning(): this { return this; }
  async execute() {
    if (this.table !== 'customer_ledger') throw new Error(`Unsupported execute table: ${this.table}`);
    this.state.customer_ledger.push({ ...this.payload });
  }
  async executeTakeFirstOrThrow() {
    if (this.table !== 'customers') throw new Error(`Unsupported insert table: ${this.table}`);
    const id = this.state.nextCustomerId;
    if (this.failOnCustomerNumber === id) throw new Error(`forced_customer_insert_failure_${id}`);
    this.state.nextCustomerId += 1;
    const row = { id, ...this.payload };
    this.state.customers.push(row);
    return { id };
  }
}

class FakeUpdateBuilder {
  private payload: Record<string, unknown> = {};
  private customerId = 0;
  constructor(private readonly state: DbState) {}
  set(payload: Record<string, unknown>): this { this.payload = payload; return this; }
  where(column: unknown, _op?: string, value?: unknown): this { if (column === 'id') this.customerId = Number(value || 0); return this; }
  async execute() {
    const row = this.state.customers.find((entry) => entry.id === this.customerId && entry.tenant_id === tenantId);
    if (row) Object.assign(row, this.payload);
  }
}

class FakeDb {
  constructor(public state: DbState, private readonly failOnCustomerNumber: number | null = null) {}
  selectFrom(table: string) { if (table !== 'customers') throw new Error(`Unsupported select table: ${table}`); return new FakeSelectBuilder(this.state); }
  insertInto(table: 'customers' | 'customer_ledger') { return new FakeInsertBuilder(table, this.state, this.failOnCustomerNumber); }
  updateTable(table: string) { if (table !== 'customers') throw new Error(`Unsupported update table: ${table}`); return new FakeUpdateBuilder(this.state); }
  transaction() {
    return { execute: async <T>(work: (trx: FakeDb) => Promise<T>) => {
      const snapshot = JSON.parse(JSON.stringify(this.state)) as DbState;
      const result = await work(new FakeDb(snapshot, this.failOnCustomerNumber));
      this.state = snapshot;
      return result;
    } };
  }
}

function createService(failOnCustomerNumber: number | null = null) {
  const db = new FakeDb(createState(), failOnCustomerNumber);
  const auditCalls: string[] = [];
  const service = new SettingsImportService(db as any, { log: async (action: string) => { auditCalls.push(action); } } as any);
  return { db, service, auditCalls };
}

const actor = { userId: 7, username: 'owner', role: 'super_admin', permissions: ['settings'], tenantId, accountId } as any;

async function run(): Promise<void> {
  {
    const { db, service, auditCalls } = createService(2);
    await assert.rejects(() => service.importCustomers([
      { name: 'Alice', phone: '1', openingBalance: 25 },
      { name: 'Bob', phone: '2', openingBalance: 40 },
    ], actor), /forced_customer_insert_failure_2/);
    assert.equal(db.state.customers.length, 0);
    assert.equal(db.state.customer_ledger.length, 0);
    assert.deepEqual(auditCalls, []);
  }

  {
    const { db, service, auditCalls } = createService();
    const result = await service.importCustomers([
      { name: 'Alice', phone: '1', openingBalance: 25 },
      { name: 'Bob', phone: '2', openingBalance: 40 },
    ], actor);
    assert.equal(result.ok, true);
    assert.equal(result.inserted, 2);
    assert.equal(db.state.customers.length, 2);
    assert.equal(db.state.customer_ledger.length, 2);
    assert.equal(db.state.customers[0]?.tenant_id, tenantId);
    assert.equal(db.state.customers[0]?.account_id, accountId);
    assert.equal(db.state.customer_ledger[0]?.tenant_id, tenantId);
    assert.equal(db.state.customer_ledger[0]?.account_id, accountId);
    assert.equal(Number(db.state.customers[0]?.balance), 25);
    assert.equal(Number(db.state.customers[1]?.balance), 40);
    assert.equal(auditCalls.length, 1);
  }

  console.log('settings-import.service.spec: ok');
}

void run();
