import 'reflect-metadata';
import { strict as assert } from 'node:assert';
import { SettingsImportService } from '../../src/modules/settings/services/settings-import.service';

type CustomerRow = {
  id: number;
  name: string;
  phone: string;
  address: string;
  customer_type: 'cash' | 'vip';
  credit_limit: number;
  company_name: string;
  tax_number: string;
  balance: number;
  store_credit_balance: number;
  is_active: boolean;
};

type CustomerLedgerRow = {
  customer_id: number;
  amount: number;
  balance_after: number;
  note: string;
  reference_type: string;
  reference_id: number;
  created_by: number;
};

type DbState = {
  customers: CustomerRow[];
  customer_ledger: CustomerLedgerRow[];
  nextIds: { customer: number };
};

function createState(): DbState {
  return {
    customers: [],
    customer_ledger: [],
    nextIds: { customer: 1 },
  };
}

function cloneState(state: DbState): DbState {
  return JSON.parse(JSON.stringify(state)) as DbState;
}

class FakeSelectBuilder {
  private conditions: Array<{ column: unknown; value: unknown }> = [];

  constructor(private readonly state: DbState) {}

  select(): this {
    return this;
  }

  where(column: unknown, _op: string, value: unknown): this {
    this.conditions.push({ column, value });
    return this;
  }

  async executeTakeFirst() {
    const activeOnly = this.conditions.some((entry) => entry.column === 'is_active' && entry.value === true);
    const loweredName = this.conditions.find((entry) => typeof entry.column !== 'string')?.value;
    if (typeof loweredName !== 'string') return undefined;
    return this.state.customers.find((row) => row.is_active === activeOnly && row.name.toLowerCase() === loweredName) || undefined;
  }
}

class FakeInsertBuilder {
  private payload: Record<string, unknown> = {};

  constructor(
    private readonly table: 'customers' | 'customer_ledger',
    private readonly state: DbState,
    private readonly failOnCustomerNumber: number | null,
  ) {}

  values(payload: Record<string, unknown>): this {
    this.payload = payload;
    return this;
  }

  returning(): this {
    return this;
  }

  async execute() {
    if (this.table !== 'customer_ledger') throw new Error(`Unsupported execute table: ${this.table}`);
    this.state.customer_ledger.push({
      customer_id: Number(this.payload.customer_id || 0),
      amount: Number(this.payload.amount || 0),
      balance_after: Number(this.payload.balance_after || 0),
      note: String(this.payload.note || ''),
      reference_type: String(this.payload.reference_type || ''),
      reference_id: Number(this.payload.reference_id || 0),
      created_by: Number(this.payload.created_by || 0),
    });
  }

  async executeTakeFirstOrThrow() {
    if (this.table !== 'customers') throw new Error(`Unsupported insert table: ${this.table}`);
    const nextId = this.state.nextIds.customer;
    if (this.failOnCustomerNumber === nextId) throw new Error(`forced_customer_insert_failure_${nextId}`);
    this.state.nextIds.customer += 1;
    const row: CustomerRow = {
      id: nextId,
      name: String(this.payload.name || ''),
      phone: String(this.payload.phone || ''),
      address: String(this.payload.address || ''),
      customer_type: String(this.payload.customer_type || '') === 'vip' ? 'vip' : 'cash',
      credit_limit: Number(this.payload.credit_limit || 0),
      company_name: String(this.payload.company_name || ''),
      tax_number: String(this.payload.tax_number || ''),
      balance: Number(this.payload.balance || 0),
      store_credit_balance: Number(this.payload.store_credit_balance || 0),
      is_active: Boolean(this.payload.is_active),
    };
    this.state.customers.push(row);
    return { id: row.id };
  }
}

class FakeUpdateBuilder {
  private payload: Record<string, unknown> = {};
  private customerId = 0;

  constructor(private readonly state: DbState) {}

  set(payload: Record<string, unknown>): this {
    this.payload = payload;
    return this;
  }

  where(_column: string, _op: string, value: unknown): this {
    this.customerId = Number(value || 0);
    return this;
  }

  async execute() {
    const row = this.state.customers.find((entry) => entry.id === this.customerId);
    if (!row) return;
    if (typeof this.payload.balance === 'number') row.balance = Number(this.payload.balance);
    if (typeof this.payload.store_credit_balance === 'number') row.store_credit_balance = Number(this.payload.store_credit_balance);
    if (typeof this.payload.phone === 'string') row.phone = String(this.payload.phone);
    if (typeof this.payload.address === 'string') row.address = String(this.payload.address);
    if (typeof this.payload.name === 'string') row.name = String(this.payload.name);
    if (typeof this.payload.customer_type === 'string') row.customer_type = this.payload.customer_type === 'vip' ? 'vip' : 'cash';
    if (typeof this.payload.credit_limit === 'number') row.credit_limit = Number(this.payload.credit_limit);
    if (typeof this.payload.company_name === 'string') row.company_name = String(this.payload.company_name);
    if (typeof this.payload.tax_number === 'string') row.tax_number = String(this.payload.tax_number);
  }
}

class FakeDb {
  constructor(
    public state: DbState,
    private readonly failOnCustomerNumber: number | null = null,
  ) {}

  selectFrom(table: 'customers') {
    if (table !== 'customers') throw new Error(`Unsupported select table: ${table}`);
    return new FakeSelectBuilder(this.state);
  }

  insertInto(table: 'customers' | 'customer_ledger') {
    return new FakeInsertBuilder(table, this.state, this.failOnCustomerNumber);
  }

  updateTable(table: 'customers') {
    if (table !== 'customers') throw new Error(`Unsupported update table: ${table}`);
    return new FakeUpdateBuilder(this.state);
  }

  transaction() {
    return {
      execute: async <T>(work: (trx: FakeDb) => Promise<T>) => {
        const snapshot = cloneState(this.state);
        const trx = new FakeDb(snapshot, this.failOnCustomerNumber);
        const result = await work(trx);
        this.state = snapshot;
        return result;
      },
    };
  }
}

function createService(failOnCustomerNumber: number | null = null) {
  const db = new FakeDb(createState(), failOnCustomerNumber);
  const auditCalls: string[] = [];
  const service = new SettingsImportService(
    db as any,
    { log: async (action: string) => { auditCalls.push(action); } } as any,
  );
  return { db, service, auditCalls };
}

const actor = {
  userId: 7,
  username: 'owner',
  role: 'super_admin',
  permissions: ['settings'],
} as any;

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
    assert.equal(db.state.customers[0]?.balance, 25);
    assert.equal(db.state.customers[1]?.balance, 40);
    assert.equal(auditCalls.length, 1);
  }

  console.log('settings-import.service.spec: ok');
}

void run();
