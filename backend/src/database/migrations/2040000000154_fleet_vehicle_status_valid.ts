import { sql, type Kysely } from 'kysely';

/**
 * Migration 2040000000154: CHECK constraint on fleet_vehicles.status.
 *
 * Every other status-like column in this codebase (van_sales_trips.status, stock_locations.location_type)
 * is guarded by a DB CHECK constraint — fleet_vehicles.status (migration 153) was added as a bare
 * `VARCHAR(30) NOT NULL DEFAULT 'available'` with no validation anywhere, DB or application, so any
 * string from an API client would have been accepted and silently broken the fleet dashboard's
 * available/assigned/maintenance/retired filtering.
 */
export const migration = {
  up: async (db: Kysely<any>): Promise<void> => {
    await sql`
      ALTER TABLE fleet_vehicles
      ADD CONSTRAINT fleet_vehicles_status_valid
      CHECK (status IN ('available', 'assigned', 'maintenance', 'retired'))
    `.execute(db);
  },

  down: async (db: Kysely<any>): Promise<void> => {
    await sql`ALTER TABLE fleet_vehicles DROP CONSTRAINT IF EXISTS fleet_vehicles_status_valid`.execute(db);
  },
};
