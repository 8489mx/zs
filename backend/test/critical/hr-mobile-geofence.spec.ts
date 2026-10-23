import assert from 'node:assert/strict';
import { MobileAttendanceService, type MobileAttendanceUser } from '../../src/modules/hr/mobile-attendance.service';

const user: MobileAttendanceUser = {
  employeeId: 7, employeeNo: 'EMP-7', name: 'Test', phone: '', branchId: 3,
  branchName: 'Branch', tenantId: 'tenant-a', accountId: 'tenant-a',
  branchLat: null, branchLng: null, geofenceRadiusMeters: 100,
};

async function main(): Promise<void> {
  let branchRadius: number | null = Infinity;
  const db: any = {
    selectFrom: () => {
      const query: any = {
        select: () => query, where: () => query,
        executeTakeFirst: async () => ({ latitude: 30, longitude: 31, geofence_radius_meters: branchRadius }),
      };
      return query;
    },
  };
  const service = new MobileAttendanceService(db);
  const punch = (person: MobileAttendanceUser, latitude: number, longitude: number) =>
    service.recordPunch(person, { type: 'check_in', latitude, longitude });

  await assert.rejects(() => punch(user, Infinity, 31), (error: any) => error.code === 'GPS_REQUIRED');
  await assert.rejects(() => punch(user, 91, 31), (error: any) => error.code === 'GPS_REQUIRED');
  await assert.rejects(() => punch(user, '' as any, 31), (error: any) => error.code === 'GPS_REQUIRED');
  await assert.rejects(() => punch({ ...user, branchId: null }, 30, 31),
    (error: any) => error.code === 'GEOFENCE_NOT_CONFIGURED');
  await assert.rejects(() => punch(user, 30, 31), (error: any) => error.code === 'GEOFENCE_NOT_CONFIGURED');
  branchRadius = null;
  await assert.rejects(() => punch(user, 30, 32), (error: any) => error.code === 'OUTSIDE_GEOFENCE');
  console.log('HR mobile attendance GPS/geofence safeguards passed');
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
