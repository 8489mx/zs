import { Inject, Injectable } from '@nestjs/common';
import { createHmac } from 'crypto';
import { Kysely, sql } from '../../database/kysely';
import { KYSELY_DB } from '../../database/database.constants';
import { Database } from '../../database/database.types';
import { AppError } from '../../common/errors/app-error';

export interface MobileAttendanceUser {
  employeeId: number;
  employeeNo: string;
  name: string;
  phone: string;
  branchId: number | null;
  branchName: string;
  tenantId: string;
  accountId: string;
  branchLat: number | null;
  branchLng: number | null;
  geofenceRadiusMeters: number;
}

export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

@Injectable()
export class MobileAttendanceService {
  constructor(@Inject(KYSELY_DB) private readonly db: Kysely<Database>) {}

  private get anyDb(): any {
    return this.db as any;
  }

  /**
   * Fast employee mobile login using phone and 4-digit PIN
   */
  async employeeLogin(payload: { phone: string; pinCode: string; companyCode?: string; tenantId?: string }): Promise<{
    token: string;
    employee: MobileAttendanceUser;
    todayStatus: {
      hasCheckedIn: boolean;
      hasCheckedOut: boolean;
      checkInTime?: string;
      checkOutTime?: string;
      distanceMeters?: number;
    };
  }> {
    const rawPhone = String(payload?.phone || '').trim();
    const pinCode = String(payload?.pinCode || '').trim();
    const companyScope = payload?.companyCode || payload?.tenantId;

    if (!rawPhone || !pinCode) {
      throw new AppError('رقم الهاتف ورمز الدخول السريع (PIN) مطلوبان', 'INVALID_CREDENTIALS', 400);
    }

    const cleanDigits = rawPhone.replace(/\D/g, '');
    const cleanNoCountry = cleanDigits.startsWith('20')
      ? cleanDigits.slice(2)
      : cleanDigits.startsWith('0')
      ? cleanDigits.slice(1)
      : cleanDigits;

    // Search active employees with matching contact phone
    let employeesQuery = this.anyDb
      .selectFrom('hr_employees as e')
      .leftJoin('branches as b', 'b.id', 'e.branch_id')
      .select([
        'e.id as employee_id',
        'e.employee_no',
        'e.display_name',
        'e.first_name',
        'e.last_name',
        'e.pin_code',
        'e.mobile_punch_enabled',
        'e.tenant_id',
        'e.account_id',
        'e.branch_id',
        'b.name as branch_name',
        'b.latitude as branch_lat',
        'b.longitude as branch_lng',
        'b.geofence_radius_meters',
      ])
      .where('e.status', '=', 'active');

    if (companyScope) {
      employeesQuery = employeesQuery.where('e.tenant_id', '=', String(companyScope).trim());
    }

    const employees = await employeesQuery.execute();

    // Fetch phone contacts
    const contacts = await this.anyDb
      .selectFrom('hr_employee_contacts')
      .select(['employee_id', 'value'])
      .where('contact_type', '=', 'phone')
      .execute();

    const empPhonesMap = new Map<number, string[]>();
    for (const c of contacts) {
      const eid = Number(c.employee_id);
      const list = empPhonesMap.get(eid) || [];
      list.push(String(c.value));
      empPhonesMap.set(eid, list);
    }

    const matchedList = employees.filter((emp: any) => {
      const pinsMatch = String(emp.pin_code || '').trim() === pinCode;
      if (!pinsMatch) return false;

      const phones = empPhonesMap.get(Number(emp.employee_id)) || [];
      return phones.some((p) => {
        const pDigits = p.replace(/\D/g, '');
        const pNoCountry = pDigits.startsWith('20')
          ? pDigits.slice(2)
          : pDigits.startsWith('0')
          ? pDigits.slice(1)
          : pDigits;
        return pDigits === cleanDigits || pNoCountry === cleanNoCountry;
      });
    });

    if (!matchedList || matchedList.length === 0) {
      throw new AppError('بيانات الدخول غير صحيحة أو رمز الـ PIN غير مطابق', 'UNAUTHORIZED_EMPLOYEE', 401);
    }

    if (matchedList.length > 1) {
      throw new AppError(
        'رقم الهاتف مسجل لدى أكثر من منشأة. يرجى استخدام رابط محلك المحدد لتسجيل البصمة لمنع تداخل الحسابات.',
        'AMBIGUOUS_EMPLOYEE_TENANT',
        409,
      );
    }

    const matched = matchedList[0];

    if (matched.mobile_punch_enabled === false) {
      throw new AppError('تسجيل البصمة عبر الموبايل غير مفعل لهذا الموظف', 'MOBILE_PUNCH_DISABLED', 403);
    }

    const employeeUser: MobileAttendanceUser = {
      employeeId: Number(matched.employee_id),
      employeeNo: matched.employee_no || `EMP-${matched.employee_id}`,
      name: matched.display_name || `${matched.first_name} ${matched.last_name}`.trim(),
      phone: rawPhone,
      branchId: matched.branch_id ? Number(matched.branch_id) : null,
      branchName: matched.branch_name || 'الفرع الرئيسي',
      tenantId: matched.tenant_id,
      accountId: matched.account_id,
      branchLat: matched.branch_lat ? Number(matched.branch_lat) : null,
      branchLng: matched.branch_lng ? Number(matched.branch_lng) : null,
      geofenceRadiusMeters: Number(matched.geofence_radius_meters || 100),
    };

    // Check today's punch status
    const today = new Date().toISOString().slice(0, 10);
    const record = await this.anyDb
      .selectFrom('hr_attendance_records')
      .selectAll()
      .where('employee_id', '=', employeeUser.employeeId)
      .where('work_date', '=', today)
      .where('tenant_id', '=', employeeUser.tenantId)
      .executeTakeFirst();

    const todayStatus = {
      hasCheckedIn: Boolean(record?.check_in_at),
      hasCheckedOut: Boolean(record?.check_out_at),
      checkInTime: record?.check_in_at ? new Date(record.check_in_at).toLocaleTimeString('ar-EG') : undefined,
      checkOutTime: record?.check_out_at ? new Date(record.check_out_at).toLocaleTimeString('ar-EG') : undefined,
      distanceMeters: record?.distance_meters ? Number(record.distance_meters) : undefined,
    };

    const token = this.generateToken(employeeUser);

    return {
      token,
      employee: employeeUser,
      todayStatus,
    };
  }

  /**
   * Generates a tamper-proof HMAC auth token for the mobile session
   */
  private generateToken(user: MobileAttendanceUser): string {
    const payload = {
      employeeId: user.employeeId,
      employeeNo: user.employeeNo,
      name: user.name,
      tenantId: user.tenantId,
      accountId: user.accountId,
      branchId: user.branchId,
      branchName: user.branchName,
      branchLat: user.branchLat,
      branchLng: user.branchLng,
      geofenceRadiusMeters: user.geofenceRadiusMeters,
      iat: Date.now(),
      exp: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
    };

    const secret = process.env.SESSION_SECRET || 'zs-attendance-mobile-punch-secret-2026';
    const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = createHmac('sha256', secret).update(encoded).digest('base64url');
    return `${encoded}.${signature}`;
  }

  /**
   * Validates mobile employee token from Authorization header
   */
  verifyToken(authHeader?: string): MobileAttendanceUser {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('يرجى تسجيل الدخول أولاً', 'UNAUTHORIZED', 401);
    }
    const token = authHeader.replace('Bearer ', '').trim();
    const [encoded, signature] = token.split('.');
    if (!encoded || !signature) {
      throw new AppError('رمز الجلسة غير صالح', 'INVALID_TOKEN', 401);
    }

    const secret = process.env.SESSION_SECRET || 'zs-attendance-mobile-punch-secret-2026';
    const expected = createHmac('sha256', secret).update(encoded).digest('base64url');
    if (signature !== expected) {
      throw new AppError('رمز الجلسة مزور أو غير صالح', 'INVALID_SIGNATURE', 401);
    }

    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf-8'));
    if (payload.exp && Date.now() > payload.exp) {
      throw new AppError('انتهت صلاحية الجلسة، يرجى تسجيل الدخول ثانية', 'TOKEN_EXPIRED', 401);
    }

    return {
      employeeId: payload.employeeId,
      employeeNo: payload.employeeNo,
      name: payload.name,
      phone: payload.phone || '',
      branchId: payload.branchId,
      branchName: payload.branchName,
      tenantId: payload.tenantId,
      accountId: payload.accountId,
      branchLat: payload.branchLat,
      branchLng: payload.branchLng,
      geofenceRadiusMeters: payload.geofenceRadiusMeters || 100,
    };
  }

  /**
   * Returns current employee's attendance status for today
   */
  async getTodayStatus(user: MobileAttendanceUser) {
    const today = new Date().toISOString().slice(0, 10);
    const record = await this.anyDb
      .selectFrom('hr_attendance_records')
      .selectAll()
      .where('employee_id', '=', user.employeeId)
      .where('work_date', '=', today)
      .where('tenant_id', '=', user.tenantId)
      .executeTakeFirst();

    // Get live branch coordinates in case manager updated them
    let branchLat = user.branchLat;
    let branchLng = user.branchLng;
    let geofenceRadius = user.geofenceRadiusMeters;

    if (user.branchId) {
      const br = await this.anyDb
        .selectFrom('branches')
        .select(['latitude', 'longitude', 'geofence_radius_meters'])
        .where('id', '=', user.branchId)
        .executeTakeFirst();
      if (br) {
        branchLat = br.latitude ? Number(br.latitude) : branchLat;
        branchLng = br.longitude ? Number(br.longitude) : branchLng;
        geofenceRadius = br.geofence_radius_meters ? Number(br.geofence_radius_meters) : geofenceRadius;
      }
    }

    return {
      workDate: today,
      hasCheckedIn: Boolean(record?.check_in_at),
      hasCheckedOut: Boolean(record?.check_out_at),
      checkInTime: record?.check_in_at ? new Date(record.check_in_at).toLocaleTimeString('ar-EG') : null,
      checkOutTime: record?.check_out_at ? new Date(record.check_out_at).toLocaleTimeString('ar-EG') : null,
      checkInSelfie: record?.check_in_selfie_url || null,
      checkOutSelfie: record?.check_out_selfie_url || null,
      distanceMeters: record?.distance_meters ? Number(record.distance_meters) : null,
      branch: {
        id: user.branchId,
        name: user.branchName,
        lat: branchLat,
        lng: branchLng,
        geofenceRadius,
      },
    };
  }

  /**
   * Records Check-In or Check-Out with GPS geofence validation and Selfie capture
   */
  async recordPunch(
    user: MobileAttendanceUser,
    payload: {
      type: 'check_in' | 'check_out';
      latitude: number;
      longitude: number;
      selfieDataUrl?: string;
      notes?: string;
    },
  ) {
    const punchType = payload.type;
    const lat = Number(payload.latitude);
    const lng = Number(payload.longitude);

    if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) {
      throw new AppError('إحداثيات الـ GPS غير صالحة، يرجى تفعيل الموقع الجغرافي بالهاتف', 'GPS_REQUIRED', 400);
    }

    // Refresh branch coordinates
    let targetLat = user.branchLat;
    let targetLng = user.branchLng;
    let radius = user.geofenceRadiusMeters || 100;

    if (user.branchId) {
      const br = await this.anyDb
        .selectFrom('branches')
        .select(['latitude', 'longitude', 'geofence_radius_meters'])
        .where('id', '=', user.branchId)
        .executeTakeFirst();
      if (br && br.latitude != null && br.longitude != null) {
        targetLat = Number(br.latitude);
        targetLng = Number(br.longitude);
        radius = Number(br.geofence_radius_meters || 100);
      }
    }

    let distanceMeters = 0;
    if (targetLat != null && targetLng != null && targetLat !== 0 && targetLng !== 0) {
      distanceMeters = calculateDistanceMeters(lat, lng, targetLat, targetLng);
      if (distanceMeters > radius) {
        throw new AppError(
          `أنت خارج نطاق الفرع! المسافة الحالية (${distanceMeters} متر)، والحد الأقصى المسموح للبصمة هو (${radius} متر).`,
          'OUTSIDE_GEOFENCE',
          403,
        );
      }
    }

    const today = new Date().toISOString().slice(0, 10);
    const now = new Date();

    const existing = await this.anyDb
      .selectFrom('hr_attendance_records')
      .selectAll()
      .where('employee_id', '=', user.employeeId)
      .where('work_date', '=', today)
      .where('tenant_id', '=', user.tenantId)
      .executeTakeFirst();

    if (punchType === 'check_in') {
      if (existing?.check_in_at) {
        throw new AppError(
          `تم تسجيل الحضور اليوم بالفعل في تمام الساعة: ${new Date(existing.check_in_at).toLocaleTimeString('ar-EG')}`,
          'ALREADY_CHECKED_IN',
          400,
        );
      }

      if (existing) {
        await this.anyDb
          .updateTable('hr_attendance_records')
          .set({
            status: 'present',
            check_in_at: now,
            check_in_gps_lat: lat,
            check_in_gps_lng: lng,
            check_in_selfie_url: payload.selfieDataUrl || null,
            branch_id: user.branchId,
            distance_meters: distanceMeters,
            source: 'mobile_gps',
            is_geofence_verified: true,
            notes: payload.notes || 'بصمة حضور ذكية عبر الموبايل',
            updated_at: now,
          })
          .where('id', '=', existing.id)
          .execute();
      } else {
        await this.anyDb
          .insertInto('hr_attendance_records')
          .values({
            employee_id: user.employeeId,
            work_date: today,
            status: 'present',
            check_in_at: now,
            check_in_gps_lat: lat,
            check_in_gps_lng: lng,
            check_in_selfie_url: payload.selfieDataUrl || null,
            branch_id: user.branchId,
            distance_meters: distanceMeters,
            source: 'mobile_gps',
            is_geofence_verified: true,
            notes: payload.notes || 'بصمة حضور ذكية عبر الموبايل',
            tenant_id: user.tenantId,
            account_id: user.accountId,
            created_at: now,
            updated_at: now,
          })
          .execute();
      }

      return {
        ok: true,
        type: 'check_in',
        time: now.toLocaleTimeString('ar-EG'),
        distanceMeters,
        message: 'تم تسجيل حضورك بنجاح داخل نطاق الفرع ✓',
      };
    } else {
      // check_out
      if (!existing?.check_in_at) {
        throw new AppError('يجب تسجيل الحضور أولاً قبل تسجيل الانصراف', 'CHECK_IN_FIRST', 400);
      }
      if (existing?.check_out_at) {
        throw new AppError(
          `تم تسجيل الانصراف مسبقاً في تمام الساعة: ${new Date(existing.check_out_at).toLocaleTimeString('ar-EG')}`,
          'ALREADY_CHECKED_OUT',
          400,
        );
      }

      await this.anyDb
        .updateTable('hr_attendance_records')
        .set({
          check_out_at: now,
          check_out_gps_lat: lat,
          check_out_gps_lng: lng,
          check_out_selfie_url: payload.selfieDataUrl || null,
          distance_meters: distanceMeters,
          updated_at: now,
        })
        .where('id', '=', existing.id)
        .execute();

      return {
        ok: true,
        type: 'check_out',
        time: now.toLocaleTimeString('ar-EG'),
        distanceMeters,
        message: 'تم تسجيل انصرافك بنجاح. يوم سعيد! ✓',
      };
    }
  }

  /**
   * Updates branch geofence coordinates from admin or manager
   */
  async updateBranchGeofence(
    branchId: number,
    tenantId: string,
    payload: { latitude: number; longitude: number; geofenceRadiusMeters?: number },
  ) {
    await this.anyDb
      .updateTable('branches')
      .set({
        latitude: payload.latitude,
        longitude: payload.longitude,
        geofence_radius_meters: payload.geofenceRadiusMeters || 100,
        updated_at: new Date(),
      })
      .where('id', '=', branchId)
      .execute();

    return { ok: true, message: 'تم تحديث النطاق الجغرافي للفرع بنجاح' };
  }

  /**
   * Sets or updates employee mobile punch PIN code
   */
  async setEmployeePin(employeeId: number, tenantId: string, pinCode: string) {
    const cleanPin = String(pinCode || '').trim();
    if (!cleanPin || cleanPin.length < 4) {
      throw new AppError('رمز الـ PIN يجب أن يتكون من 4 أرقام على الأقل', 'INVALID_PIN', 400);
    }

    await this.anyDb
      .updateTable('hr_employees')
      .set({
        pin_code: cleanPin,
        mobile_punch_enabled: true,
        updated_at: new Date(),
      })
      .where('id', '=', employeeId)
      .where('tenant_id', '=', tenantId)
      .execute();

    return { ok: true, message: 'تم تعيين رمز الدخول السريع للموظف بنجاح' };
  }
}
