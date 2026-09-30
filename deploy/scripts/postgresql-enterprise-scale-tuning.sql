-- ============================================================================
-- Z-Systems ERP: Enterprise PostgreSQL 10-Year Scalability & Partitioning Suite
-- Target: Oracle Cloud VPS PostgreSQL 16+
-- Capacity: 10,000 invoices/day per tenant (~36.5M invoices / ~150M items per decade)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- SECTION 1: High-Performance Engine Tuning (postgresql.conf settings)
-- ----------------------------------------------------------------------------
-- Apply via ALTER SYSTEM or edit postgresql.conf on the Oracle Cloud VPS:

-- 1.1 Memory Configuration (Assumes 16GB - 32GB RAM VPS)
-- shared_buffers: 25% of total system RAM
ALTER SYSTEM SET shared_buffers = '4GB';
-- effective_cache_size: 75% of total system RAM (hints planner on kernel cache)
ALTER SYSTEM SET effective_cache_size = '12GB';
-- work_mem: Memory per sort/hash operation (prevents temp disk spill on GROUP BY)
ALTER SYSTEM SET work_mem = '64MB';
-- maintenance_work_mem: Memory for VACUUM, CREATE INDEX, and ALTER TABLE
ALTER SYSTEM SET maintenance_work_mem = '1GB';

-- 1.2 Storage & IO Optimization (Oracle Cloud NVMe Block Storage)
-- Fast SSD / NVMe seek cost
ALTER SYSTEM SET random_page_cost = 1.1;
-- Asynchronous prefetching for sequential and bitmap index scans
ALTER SYSTEM SET effective_io_concurrency = 200;

-- 1.3 Write-Ahead Log (WAL) & Checkpoint Smoothing
-- Prevent disk IO spikes by spreading checkpoints evenly
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET checkpoint_timeout = '15min';
ALTER SYSTEM SET max_wal_size = '16GB';
ALTER SYSTEM SET min_wal_size = '2GB';
ALTER SYSTEM SET wal_buffers = '16MB';

-- 1.4 Autovacuum Aggressive Tuning for High-Volume Tables
-- Prevent bloat and table locks under 10k transactions/day
ALTER SYSTEM SET autovacuum_max_workers = 4;
ALTER SYSTEM SET autovacuum_vacuum_scale_factor = 0.05;
ALTER SYSTEM SET autovacuum_analyze_scale_factor = 0.02;
ALTER SYSTEM SET autovacuum_vacuum_cost_limit = 2000;
ALTER SYSTEM SET autovacuum_vacuum_cost_delay = 2;

-- 1.5 Query Planner & Partition Pruning
-- Guarantees the query planner skips unneeded partitions entirely
ALTER SYSTEM SET enable_partition_pruning = on;
ALTER SYSTEM SET enable_partitionwise_join = on;
ALTER SYSTEM SET enable_partitionwise_aggregate = on;

-- Reload configuration without restarting database:
-- SELECT pg_reload_conf();


-- ----------------------------------------------------------------------------
-- SECTION 2: Declarative Range Partitioning Strategy (sales & sale_items)
-- ----------------------------------------------------------------------------
-- Architectural Note: When migrating an existing unpartitioned table with 10M+ rows,
-- use zero-downtime shadow swapping (create partitioned table -> backfill -> rename).

-- 2.1 Partitioned Sales Table Template
/*
CREATE TABLE IF NOT EXISTS sales_v2 (
    id BIGSERIAL,
    tenant_id VARCHAR(128) NOT NULL,
    account_id VARCHAR(160) NOT NULL,
    doc_no VARCHAR(100) NOT NULL,
    customer_id BIGINT,
    customer_name VARCHAR(255),
    customer_phone VARCHAR(50),
    customer_address TEXT,
    payment_type VARCHAR(50) NOT NULL DEFAULT 'cash',
    payment_channel VARCHAR(50),
    subtotal NUMERIC(15, 2) NOT NULL DEFAULT 0,
    discount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    tax_rate NUMERIC(6, 2) NOT NULL DEFAULT 0,
    tax_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    prices_include_tax BOOLEAN NOT NULL DEFAULT FALSE,
    total NUMERIC(15, 2) NOT NULL DEFAULT 0,
    paid_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    tendered_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    change_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    store_credit_used NUMERIC(15, 2) NOT NULL DEFAULT 0,
    delivery_fee NUMERIC(15, 2) NOT NULL DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'completed',
    note TEXT,
    table_number VARCHAR(50),
    order_type VARCHAR(50) NOT NULL DEFAULT 'takeaway',
    branch_id BIGINT,
    location_id BIGINT,
    created_by BIGINT,
    delivery_rep_id BIGINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Yearly Partition Slices
CREATE TABLE sales_y2023 PARTITION OF sales_v2
    FOR VALUES FROM ('2023-01-01 00:00:00+00') TO ('2024-01-01 00:00:00+00');

CREATE TABLE sales_y2024 PARTITION OF sales_v2
    FOR VALUES FROM ('2024-01-01 00:00:00+00') TO ('2025-01-01 00:00:00+00');

CREATE TABLE sales_y2025 PARTITION OF sales_v2
    FOR VALUES FROM ('2025-01-01 00:00:00+00') TO ('2026-01-01 00:00:00+00');

CREATE TABLE sales_y2026 PARTITION OF sales_v2
    FOR VALUES FROM ('2026-01-01 00:00:00+00') TO ('2027-01-01 00:00:00+00');

CREATE TABLE sales_y2027 PARTITION OF sales_v2
    FOR VALUES FROM ('2027-01-01 00:00:00+00') TO ('2028-01-01 00:00:00+00');

CREATE TABLE sales_default PARTITION OF sales_v2 DEFAULT;

-- Partitioned Indexes (Automatically created on each partition)
CREATE INDEX idx_sales_v2_tenant_id_desc ON sales_v2 (tenant_id, id DESC);
CREATE INDEX idx_sales_v2_tenant_date ON sales_v2 (tenant_id, created_at DESC);
CREATE INDEX idx_sales_v2_tenant_customer ON sales_v2 (tenant_id, customer_id) WHERE customer_id IS NOT NULL;
*/


-- ----------------------------------------------------------------------------
-- SECTION 3: Autonomous Next-Year Partition Maintenance Procedure
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION ensure_upcoming_yearly_partitions()
RETURNS void AS $$
DECLARE
    next_year INT := EXTRACT(YEAR FROM NOW()) + 1;
    start_date TEXT := next_year || '-01-01 00:00:00+00';
    end_date TEXT := (next_year + 1) || '-01-01 00:00:00+00';
    tbl_name TEXT := 'sales_y' || next_year;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = tbl_name) THEN
        EXECUTE format(
            'CREATE TABLE IF NOT EXISTS %I PARTITION OF sales_v2 FOR VALUES FROM (%L) TO (%L);',
            tbl_name, start_date, end_date
        );
        RAISE NOTICE 'Created partition % for year %', tbl_name, next_year;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- To test or run manually:
-- SELECT ensure_upcoming_yearly_partitions();
