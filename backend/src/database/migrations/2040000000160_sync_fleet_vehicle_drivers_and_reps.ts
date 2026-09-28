import { sql, type Kysely } from 'kysely';

/**
 * Migration 2040000000160: Sync Fleet Vehicle Drivers and Delivery Reps
 *
 * Backfills vehicle_plate, van_location_id, and is_van_rep on delivery_representatives
 * from existing multi-driver shift assignments in fleet_vehicle_drivers and fleet_vehicles.
 */
export const migration = {
  up: async (db: Kysely<any>): Promise<void> => {
    // 1. Sync from fleet_vehicle_drivers
    await sql`
      UPDATE delivery_representatives dr
      SET 
        vehicle_plate = fv.plate_number,
        van_location_id = coalesce(dr.van_location_id, fv.van_location_id),
        is_van_rep = true
      FROM fleet_vehicle_drivers fvd
      JOIN fleet_vehicles fv ON fv.id = fvd.vehicle_id
      WHERE dr.id = fvd.rep_id 
        AND dr.tenant_id = fvd.tenant_id
        AND fvd.is_active = true
        AND (dr.vehicle_plate IS NULL OR dr.vehicle_plate = '');
    `.execute(db);

    // 2. Sync from fleet_vehicles.assigned_rep_id
    await sql`
      UPDATE delivery_representatives dr
      SET 
        vehicle_plate = fv.plate_number,
        van_location_id = coalesce(dr.van_location_id, fv.van_location_id),
        is_van_rep = true
      FROM fleet_vehicles fv
      WHERE dr.id = fv.assigned_rep_id 
        AND dr.tenant_id = fv.tenant_id
        AND (dr.vehicle_plate IS NULL OR dr.vehicle_plate = '');
    `.execute(db);
  },

  down: async (_db: Kysely<any>): Promise<void> => {
    // Data sync migration; no destructive schema rollback required
  },
};
