import { Kysely, sql } from 'kysely';

export const migration = {
  up: async (db: Kysely<any>): Promise<void> => {
    // 1. Create pharmacy_drugs table (Medication Master Catalog & Active Ingredients)
    await db.schema
      .createTable('pharmacy_drugs')
      .ifNotExists()
      .addColumn('id', 'serial', (col) => col.primaryKey())
      .addColumn('tenant_id', 'text', (col) => col.notNull())
      .addColumn('account_id', 'text', (col) => col.notNull())
      .addColumn('product_id', 'integer')
      .addColumn('trade_name', 'varchar(255)', (col) => col.notNull())
      .addColumn('trade_name_ar', 'varchar(255)')
      .addColumn('active_ingredient', 'varchar(255)', (col) => col.notNull())
      .addColumn('active_ingredient_ar', 'varchar(255)')
      .addColumn('dosage_form', 'varchar(100)', (col) => col.notNull())
      .addColumn('strength', 'varchar(100)')
      .addColumn('manufacturer', 'varchar(150)')
      .addColumn('drug_class', 'varchar(150)')
      .addColumn('prescription_required', 'boolean', (col) => col.defaultTo(false).notNull())
      .addColumn('controlled_level', 'varchar(50)', (col) => col.defaultTo('none').notNull())
      .addColumn('units_per_box', 'integer', (col) => col.defaultTo(1).notNull())
      .addColumn('unit_name', 'varchar(50)', (col) => col.defaultTo('شريط').notNull())
      .addColumn('strip_price', 'numeric(14, 3)', (col) => col.defaultTo('0').notNull())
      .addColumn('box_price', 'numeric(14, 3)', (col) => col.defaultTo('0').notNull())
      .addColumn('pregnancy_safety', 'varchar(50)')
      .addColumn('storage_condition', 'varchar(150)')
      .addColumn('barcode', 'varchar(120)')
      .addColumn('indications', 'text')
      .addColumn('side_effects', 'text')
      .addColumn('created_at', 'timestamptz', (col) => col.defaultTo(sql`now()`).notNull())
      .addColumn('updated_at', 'timestamptz', (col) => col.defaultTo(sql`now()`).notNull())
      .execute();

    // 2. Create pharmacy_batches table (Batches & Expiry Dates)
    await db.schema
      .createTable('pharmacy_batches')
      .ifNotExists()
      .addColumn('id', 'serial', (col) => col.primaryKey())
      .addColumn('tenant_id', 'text', (col) => col.notNull())
      .addColumn('account_id', 'text', (col) => col.notNull())
      .addColumn('product_id', 'integer')
      .addColumn('drug_id', 'integer')
      .addColumn('batch_number', 'varchar(100)', (col) => col.notNull())
      .addColumn('expiry_date', 'varchar(30)', (col) => col.notNull())
      .addColumn('quantity', 'numeric(14, 3)', (col) => col.defaultTo('0').notNull())
      .addColumn('unit_cost', 'numeric(14, 3)', (col) => col.defaultTo('0').notNull())
      .addColumn('location_id', 'integer')
      .addColumn('supplier_name', 'varchar(150)')
      .addColumn('status', 'varchar(50)', (col) => col.defaultTo('active').notNull())
      .addColumn('notes', 'text')
      .addColumn('created_at', 'timestamptz', (col) => col.defaultTo(sql`now()`).notNull())
      .addColumn('updated_at', 'timestamptz', (col) => col.defaultTo(sql`now()`).notNull())
      .execute();

    // 3. Create pharmacy_prescriptions table (Prescriptions & Medical Insurance)
    await db.schema
      .createTable('pharmacy_prescriptions')
      .ifNotExists()
      .addColumn('id', 'serial', (col) => col.primaryKey())
      .addColumn('tenant_id', 'text', (col) => col.notNull())
      .addColumn('account_id', 'text', (col) => col.notNull())
      .addColumn('prescription_no', 'varchar(60)', (col) => col.notNull())
      .addColumn('customer_id', 'integer')
      .addColumn('customer_name', 'varchar(255)', (col) => col.notNull())
      .addColumn('customer_phone', 'varchar(50)')
      .addColumn('doctor_name', 'varchar(150)')
      .addColumn('doctor_specialty', 'varchar(100)')
      .addColumn('diagnosis', 'text')
      .addColumn('insurance_provider', 'varchar(150)')
      .addColumn('insurance_card_no', 'varchar(100)')
      .addColumn('approval_code', 'varchar(100)')
      .addColumn('patient_copay_percent', 'numeric(5, 2)', (col) => col.defaultTo('0').notNull())
      .addColumn('total_amount', 'numeric(14, 3)', (col) => col.defaultTo('0').notNull())
      .addColumn('patient_amount', 'numeric(14, 3)', (col) => col.defaultTo('0').notNull())
      .addColumn('insurance_amount', 'numeric(14, 3)', (col) => col.defaultTo('0').notNull())
      .addColumn('status', 'varchar(50)', (col) => col.defaultTo('dispensed').notNull())
      .addColumn('items_json', 'text', (col) => col.defaultTo('[]').notNull())
      .addColumn('dispensed_by', 'varchar(150)')
      .addColumn('dispensed_at', 'timestamptz', (col) => col.defaultTo(sql`now()`).notNull())
      .addColumn('notes', 'text')
      .addColumn('created_at', 'timestamptz', (col) => col.defaultTo(sql`now()`).notNull())
      .addColumn('updated_at', 'timestamptz', (col) => col.defaultTo(sql`now()`).notNull())
      .execute();

    // 4. Create pharmacy_shortages table (Digital Shortages Book)
    await db.schema
      .createTable('pharmacy_shortages')
      .ifNotExists()
      .addColumn('id', 'serial', (col) => col.primaryKey())
      .addColumn('tenant_id', 'text', (col) => col.notNull())
      .addColumn('account_id', 'text', (col) => col.notNull())
      .addColumn('product_name', 'varchar(255)', (col) => col.notNull())
      .addColumn('active_ingredient', 'varchar(255)')
      .addColumn('dosage_form', 'varchar(100)')
      .addColumn('suggested_distributor', 'varchar(150)')
      .addColumn('requested_quantity', 'numeric(14, 3)', (col) => col.defaultTo('1').notNull())
      .addColumn('priority', 'varchar(50)', (col) => col.defaultTo('normal').notNull())
      .addColumn('customer_name', 'varchar(150)')
      .addColumn('customer_phone', 'varchar(50)')
      .addColumn('status', 'varchar(50)', (col) => col.defaultTo('needed').notNull())
      .addColumn('notes', 'text')
      .addColumn('created_at', 'timestamptz', (col) => col.defaultTo(sql`now()`).notNull())
      .addColumn('updated_at', 'timestamptz', (col) => col.defaultTo(sql`now()`).notNull())
      .execute();

    // 5. Create pharmacy_clinical_services table (Rapid Health Diagnostics & Nursing)
    await db.schema
      .createTable('pharmacy_clinical_services')
      .ifNotExists()
      .addColumn('id', 'serial', (col) => col.primaryKey())
      .addColumn('tenant_id', 'text', (col) => col.notNull())
      .addColumn('account_id', 'text', (col) => col.notNull())
      .addColumn('service_type', 'varchar(100)', (col) => col.notNull())
      .addColumn('customer_name', 'varchar(255)', (col) => col.notNull())
      .addColumn('customer_phone', 'varchar(50)')
      .addColumn('metric_value_1', 'varchar(100)')
      .addColumn('metric_value_2', 'varchar(100)')
      .addColumn('pharmacist_notes', 'text')
      .addColumn('fee', 'numeric(14, 3)', (col) => col.defaultTo('0').notNull())
      .addColumn('created_at', 'timestamptz', (col) => col.defaultTo(sql`now()`).notNull())
      .execute();

    // 6. Create Performance Indexes
    await db.schema
      .createIndex('idx_pharmacy_drugs_tenant_active')
      .ifNotExists()
      .on('pharmacy_drugs')
      .columns(['tenant_id', 'active_ingredient'])
      .execute();

    await db.schema
      .createIndex('idx_pharmacy_drugs_tenant_trade')
      .ifNotExists()
      .on('pharmacy_drugs')
      .columns(['tenant_id', 'trade_name'])
      .execute();

    await db.schema
      .createIndex('idx_pharmacy_batches_tenant_expiry')
      .ifNotExists()
      .on('pharmacy_batches')
      .columns(['tenant_id', 'expiry_date'])
      .execute();

    await db.schema
      .createIndex('idx_pharmacy_prescriptions_tenant_no')
      .ifNotExists()
      .on('pharmacy_prescriptions')
      .columns(['tenant_id', 'prescription_no'])
      .execute();

    await db.schema
      .createIndex('idx_pharmacy_shortages_tenant_status')
      .ifNotExists()
      .on('pharmacy_shortages')
      .columns(['tenant_id', 'status'])
      .execute();
  },

  down: async (db: Kysely<any>): Promise<void> => {
    await db.schema.dropTable('pharmacy_clinical_services').ifExists().execute();
    await db.schema.dropTable('pharmacy_shortages').ifExists().execute();
    await db.schema.dropTable('pharmacy_prescriptions').ifExists().execute();
    await db.schema.dropTable('pharmacy_batches').ifExists().execute();
    await db.schema.dropTable('pharmacy_drugs').ifExists().execute();
  },
};
