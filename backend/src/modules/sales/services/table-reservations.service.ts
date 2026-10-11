import { Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Kysely } from 'kysely';
import { KYSELY_DB } from '../../../database/database.constants';
import { Database } from '../../../database/database.types';
import { CreateTableReservationDto, UpdateTableReservationStatusDto } from '../dto/table-reservation.dto';

@Injectable()
export class TableReservationsService {
  constructor(
    @Inject(KYSELY_DB) private readonly db: Kysely<Database>,
  ) {}

  async listReservations(tenantId: string, branchId?: number, date?: string, type?: string) {
    let query = this.db
      .selectFrom('restaurant_table_reservations')
      .selectAll()
      .where('tenant_id', '=', tenantId);

    if (type) {
      query = query.where('reservation_type', '=', type);
    }

    if (branchId) {
      query = query.where('branch_id', '=', branchId);
    }

    if (date) {
      const startOfDay = new Date(`${date}T00:00:00.000Z`);
      const endOfDay = new Date(`${date}T23:59:59.999Z`);
      query = query
        .where('reservation_time', '>=', startOfDay)
        .where('reservation_time', '<=', endOfDay);
    }

    return query.orderBy('reservation_time', 'asc').execute();
  }

  async createReservation(tenantId: string, userId: number, dto: CreateTableReservationDto) {
    const isWaitlist = dto.reservationType === 'waitlist';
    if (!dto.guestName) {
      throw new BadRequestException('اسم الضيف إلزامي.');
    }
    if (!isWaitlist && (!dto.tableNumber || !dto.reservationTime)) {
      throw new BadRequestException('بيانات الحجز غير مكتملة (رقم الطاولة، اسم الضيف، ووقت الحجز إلزامية).');
    }

    const reservationTime = dto.reservationTime ? new Date(dto.reservationTime) : new Date();
    if (isNaN(reservationTime.getTime())) {
      throw new BadRequestException('توقيت الحجز غير صالح.');
    }

    const [created] = await this.db
      .insertInto('restaurant_table_reservations')
      .values({
        tenant_id: tenantId,
        branch_id: dto.branchId || null,
        table_number: dto.tableNumber ? String(dto.tableNumber).trim() : 'قائمة انتظار',
        guest_name: String(dto.guestName).trim(),
        guest_phone: dto.guestPhone ? String(dto.guestPhone).trim() : null,
        guest_count: Math.max(1, Number(dto.guestCount || 1)),
        reservation_time: reservationTime,
        status: 'confirmed',
        special_requests: dto.specialRequests ? String(dto.specialRequests).trim() : null,
        reservation_type: dto.reservationType || 'reservation',
        created_by: userId,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returningAll()
      .execute();

    return created;
  }

  async updateStatus(tenantId: string, id: number, dto: UpdateTableReservationStatusDto) {
    const existing = await this.db
      .selectFrom('restaurant_table_reservations')
      .selectAll()
      .where('id', '=', id)
      .where('tenant_id', '=', tenantId)
      .executeTakeFirst();

    if (!existing) {
      throw new NotFoundException('الحجز غير موجود.');
    }

    const [updated] = await this.db
      .updateTable('restaurant_table_reservations')
      .set({
        status: dto.status,
        ...(dto.tableNumber ? { table_number: String(dto.tableNumber).trim() } : {}),
        updated_at: new Date(),
      })
      .where('id', '=', id)
      .where('tenant_id', '=', tenantId)
      .returningAll()
      .execute();

    return updated;
  }

  async deleteReservation(tenantId: string, id: number) {
    const existing = await this.db
      .selectFrom('restaurant_table_reservations')
      .select('id')
      .where('id', '=', id)
      .where('tenant_id', '=', tenantId)
      .executeTakeFirst();

    if (!existing) {
      throw new NotFoundException('الحجز غير موجود.');
    }

    await this.db
      .deleteFrom('restaurant_table_reservations')
      .where('id', '=', id)
      .where('tenant_id', '=', tenantId)
      .execute();

    return { success: true };
  }
}
