import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // 1. Quality Control Points (Specs, Standards, and Tolerance criteria)
  await db.schema
    .createTable('quality_control_points')
    .ifNotExists()
    .addColumn('id', 'varchar(128)', (col) => col.primaryKey())
    .addColumn('tenant_id', 'varchar(64)', (col) => col.notNull())
    .addColumn('name', 'varchar(255)', (col) => col.notNull())
    .addColumn('product_id', 'integer')
    .addColumn('trigger_stage', 'varchar(32)', (col) => col.notNull().defaultTo('receipt'))
    .addColumn('test_type', 'varchar(32)', (col) => col.notNull().defaultTo('pass_fail'))
    .addColumn('norm_measure_min', 'numeric(14, 4)')
    .addColumn('norm_measure_max', 'numeric(14, 4)')
    .addColumn('measure_unit', 'varchar(32)')
    .addColumn('instructions', 'text')
    .addColumn('is_mandatory', 'boolean', (col) => col.notNull().defaultTo(true))
    .addColumn('created_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .execute();

  await db.schema
    .createIndex('idx_qc_points_tenant_stage')
    .ifNotExists()
    .on('quality_control_points')
    .columns(['tenant_id', 'trigger_stage'])
    .execute();

  await db.schema
    .createIndex('idx_qc_points_tenant_prod')
    .ifNotExists()
    .on('quality_control_points')
    .columns(['tenant_id', 'product_id'])
    .execute();

  // 2. Quality Inspections & Checks
  await db.schema
    .createTable('quality_inspections')
    .ifNotExists()
    .addColumn('id', 'varchar(128)', (col) => col.primaryKey())
    .addColumn('tenant_id', 'varchar(64)', (col) => col.notNull())
    .addColumn('point_id', 'varchar(128)')
    .addColumn('reference_doc_type', 'varchar(64)', (col) => col.notNull())
    .addColumn('reference_doc_id', 'varchar(128)', (col) => col.notNull())
    .addColumn('product_id', 'integer', (col) => col.notNull())
    .addColumn('inspected_qty', 'numeric(14, 4)', (col) => col.notNull().defaultTo(1))
    .addColumn('accepted_qty', 'numeric(14, 4)', (col) => col.notNull().defaultTo(0))
    .addColumn('rejected_qty', 'numeric(14, 4)', (col) => col.notNull().defaultTo(0))
    .addColumn('measured_value', 'numeric(14, 4)')
    .addColumn('status', 'varchar(32)', (col) => col.notNull().defaultTo('passed'))
    .addColumn('inspector_id', 'varchar(64)')
    .addColumn('notes', 'text')
    .addColumn('created_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .execute();

  await db.schema
    .createIndex('idx_qc_inspections_tenant_ref')
    .ifNotExists()
    .on('quality_inspections')
    .columns(['tenant_id', 'reference_doc_type', 'reference_doc_id'])
    .execute();

  await db.schema
    .createIndex('idx_qc_inspections_tenant_status')
    .ifNotExists()
    .on('quality_inspections')
    .columns(['tenant_id', 'status'])
    .execute();

  // 3. Quality Non-Conformance Reports (NCR)
  await db.schema
    .createTable('quality_non_conformance_reports')
    .ifNotExists()
    .addColumn('id', 'varchar(128)', (col) => col.primaryKey())
    .addColumn('tenant_id', 'varchar(64)', (col) => col.notNull())
    .addColumn('ncr_number', 'varchar(64)', (col) => col.notNull())
    .addColumn('inspection_id', 'varchar(128)')
    .addColumn('product_id', 'integer', (col) => col.notNull())
    .addColumn('defect_description', 'text', (col) => col.notNull())
    .addColumn('severity', 'varchar(32)', (col) => col.notNull().defaultTo('major'))
    .addColumn('root_cause', 'text')
    .addColumn('disposition_action', 'varchar(64)', (col) => col.notNull().defaultTo('quarantine_scrap'))
    .addColumn('status', 'varchar(32)', (col) => col.notNull().defaultTo('open'))
    .addColumn('resolution_notes', 'text')
    .addColumn('assigned_to', 'varchar(64)')
    .addColumn('closed_at', 'timestamptz')
    .addColumn('created_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .addColumn('updated_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .execute();

  await db.schema
    .createIndex('idx_qc_ncr_tenant_number')
    .ifNotExists()
    .on('quality_non_conformance_reports')
    .columns(['tenant_id', 'ncr_number'])
    .unique()
    .execute();

  await db.schema
    .createIndex('idx_qc_ncr_tenant_status')
    .ifNotExists()
    .on('quality_non_conformance_reports')
    .columns(['tenant_id', 'status'])
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('quality_non_conformance_reports').ifExists().execute();
  await db.schema.dropTable('quality_inspections').ifExists().execute();
  await db.schema.dropTable('quality_control_points').ifExists().execute();
}
