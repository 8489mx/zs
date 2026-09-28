import { sql, type Kysely } from 'kysely';

/**
 * Migration 2040000000162: Normalize Legacy Van Sales Document Numbers
 *
 * Re-aligns any legacy VAN sales document numbers that were created using
 * global table auto-increment serial IDs (e.g. VAN-260928-64989) into proper
 * 4-digit daily tenant sequences (e.g. VAN-260928-0001).
 * Also updates references in customer_ledger.note.
 */
export const migration = {
  up: async (db: Kysely<any>): Promise<void> => {
    await sql`
      DO $$
      DECLARE
        r RECORD;
        curr_tenant TEXT := '';
        curr_date TEXT := '';
        seq INT := 1;
        new_doc TEXT;
        date_part TEXT;
      BEGIN
        FOR r IN 
          SELECT id, tenant_id, doc_no 
          FROM sales 
          WHERE doc_no ~ '^VAN-[0-9]{6}-[0-9]{5,}$'
          ORDER BY tenant_id, doc_no ASC, id ASC
        LOOP
          date_part := SPLIT_PART(r.doc_no, '-', 2);
          IF curr_tenant != r.tenant_id OR curr_date != date_part THEN
            curr_tenant := r.tenant_id;
            curr_date := date_part;
            seq := 1;
          END IF;

          new_doc := 'VAN-' || date_part || '-' || LPAD(seq::text, 4, '0');
          
          UPDATE sales 
          SET doc_no = new_doc 
          WHERE id = r.id AND tenant_id = r.tenant_id;

          UPDATE customer_ledger 
          SET note = replace(note, r.doc_no, new_doc) 
          WHERE tenant_id = r.tenant_id AND note LIKE '%' || r.doc_no || '%';

          seq := seq + 1;
        END LOOP;
      END $$;
    `.execute(db);
  },

  down: async (_db: Kysely<any>): Promise<void> => {
    // Document normalization; no rollback required
  },
};
