import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { StandardDialog } from '@/shared/components/StandardDialog';
import {
  tableReservationsApi,
  TableReservation,
  CreateTableReservationPayload,
} from '@/features/pos/api/table-reservations.api';
import {
  CalendarIcon,
  CheckCircleIcon,
  ClockIcon,
  PlusCircleIcon,
  UserIcon,
  UsersIcon,
  PhoneIcon,
  SlidersIcon,
  TrashIcon,
} from '@/shared/components/icons/AppIcons';
import { toast } from '@/shared/components/system-alert';
import { systemConfirm } from '@/shared/components/system-alert';

interface PosTableReservationsModalProps {
  open: boolean;
  onClose: () => void;
  branchId?: number;
  tablesCount?: number;
  onSeatGuest?: (reservation: TableReservation) => void;
}

export function PosTableReservationsModal({
  open,
  onClose,
  branchId,
  tablesCount = 30,
  onSeatGuest,
}: PosTableReservationsModalProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'reservations' | 'waitlist'>('reservations');
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [seatTableSelections, setSeatTableSelections] = useState<Record<number, string>>({});

  // Form State
  const [tableNumber, setTableNumber] = useState('1');
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestCount, setGuestCount] = useState(2);
  const [reservationTime, setReservationTime] = useState(() => {
    const d = new Date();
    d.setHours(d.getHours() + 1, 0, 0, 0);
    return `${d.toISOString().slice(0, 10)}T${String(d.getHours()).padStart(2, '0')}:00`;
  });
  const [specialRequests, setSpecialRequests] = useState('');

  const { data: reservations = [], isLoading } = useQuery({
    queryKey: ['table-reservations', branchId, selectedDate],
    queryFn: () => tableReservationsApi.listReservations({ branchId, date: selectedDate }),
    enabled: open,
    refetchInterval: open ? 15000 : false,
  });

  const createMutation = useMutation({
    mutationFn: (payload: CreateTableReservationPayload) => tableReservationsApi.createReservation(payload),
    onSuccess: () => {
      toast.success(activeTab === 'waitlist' ? 'تم تسجيل الضيف في قائمة الانتظار بنجاح.' : 'تم تسجيل حجز الطاولة بنجاح.');
      queryClient.invalidateQueries({ queryKey: ['table-reservations'] });
      setIsAddingNew(false);
      setGuestName('');
      setGuestPhone('');
      setSpecialRequests('');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'فشل تسجيل الحجز.');
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status, tableNumber }: { id: number; status: 'confirmed' | 'seated' | 'cancelled' | 'no_show'; tableNumber?: string }) =>
      tableReservationsApi.updateStatus(id, status, tableNumber),
    onSuccess: () => {
      toast.success('تم تحديث حالة الحجز.');
      queryClient.invalidateQueries({ queryKey: ['table-reservations'] });
    },
    onError: () => toast.error('فشل تحديث حالة الحجز.'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => tableReservationsApi.deleteReservation(id),
    onSuccess: () => {
      toast.success('تم حذف السجل.');
      queryClient.invalidateQueries({ queryKey: ['table-reservations'] });
    },
    onError: () => toast.error('فشل حذف السجل.'),
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName.trim()) {
      toast.warning('يرجى إدخال اسم الضيف.');
      return;
    }
    const isWaitlist = activeTab === 'waitlist';
    createMutation.mutate({
      tableNumber: isWaitlist ? (tableNumber || 'قائمة انتظار') : tableNumber,
      guestName: guestName.trim(),
      guestPhone: guestPhone.trim() || undefined,
      guestCount,
      reservationTime: isWaitlist ? new Date().toISOString() : new Date(reservationTime).toISOString(),
      reservationType: isWaitlist ? 'waitlist' : 'reservation',
      specialRequests: specialRequests.trim() || undefined,
      branchId,
    });
  };

  const handleSeat = async (res: TableReservation, assignedTable?: string) => {
    const finalTable = assignedTable || res.table_number || '1';
    statusMutation.mutate({ id: res.id, status: 'seated', tableNumber: finalTable });
    if (onSeatGuest) {
      onSeatGuest({ ...res, table_number: finalTable });
      onClose();
    }
  };

  const handleDelete = async (res: TableReservation) => {
    const ok = await systemConfirm({
      title: 'حذف السجل',
      message: `هل أنت متأكد من حذف سجل الضيف ${res.guest_name}؟`,
      confirmText: 'حذف السجل',
      cancelText: 'تراجع',
    });
    if (ok) {
      deleteMutation.mutate(res.id);
    }
  };

  const reservationsList = reservations.filter((r) => r.reservation_type !== 'waitlist');
  const waitlistList = reservations.filter((r) => r.reservation_type === 'waitlist');
  const displayedList = activeTab === 'reservations' ? reservationsList : waitlistList;

  const confirmedCount = displayedList.filter((r) => r.status === 'confirmed').length;
  const seatedCount = displayedList.filter((r) => r.status === 'seated').length;
  const cancelledCount = displayedList.filter((r) => r.status === 'cancelled' || r.status === 'no_show').length;

  return (
    <StandardDialog
      open={open}
      onClose={onClose}
      title="إدارة وتدفق حجوزات الطاولات (Table Reservations)"
      subtitle="تنظيم حجوزات الصالة، إجلاس الضيوف، ومطابقة الطاولات اللحظية لمنع التضارب"
      width="1060px"
      bodyStyle={{ padding: '16px 20px', minHeight: '520px', maxHeight: '82vh', overflowY: 'auto' }}
    >
      <div dir="rtl" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {/* Tab Switcher: Reservations vs Waitlist */}
        <div style={{ display: 'flex', borderBottom: '2px solid #e2e8f0', gap: '8px' }}>
          <button
            type="button"
            onClick={() => { setActiveTab('reservations'); setIsAddingNew(false); }}
            style={{
              padding: '8px 16px',
              border: 'none',
              background: 'transparent',
              borderBottom: activeTab === 'reservations' ? '3px solid #170e5e' : '3px solid transparent',
              color: activeTab === 'reservations' ? '#170e5e' : '#64748b',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              marginBottom: '-2px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <CalendarIcon size={14} color={activeTab === 'reservations' ? '#170e5e' : '#64748b'} />
            <span>حجوزات الصالة المسبقة</span>
            <span style={{
              background: activeTab === 'reservations' ? '#170e5e' : '#e2e8f0',
              color: activeTab === 'reservations' ? '#ffffff' : '#475569',
              borderRadius: '10px',
              padding: '1px 7px',
              fontSize: '11px',
              fontWeight: 800,
            }}>
              {reservationsList.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('waitlist'); setIsAddingNew(false); }}
            style={{
              padding: '8px 16px',
              border: 'none',
              background: 'transparent',
              borderBottom: activeTab === 'waitlist' ? '3px solid #170e5e' : '3px solid transparent',
              color: activeTab === 'waitlist' ? '#170e5e' : '#64748b',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              marginBottom: '-2px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <ClockIcon size={14} color={activeTab === 'waitlist' ? '#170e5e' : '#64748b'} />
            <span>قائمة الانتظار اللحظية (Waitlist)</span>
            <span style={{
              background: activeTab === 'waitlist' ? '#ea580c' : '#e2e8f0',
              color: activeTab === 'waitlist' ? '#ffffff' : '#475569',
              borderRadius: '10px',
              padding: '1px 7px',
              fontSize: '11px',
              fontWeight: 800,
            }}>
              {waitlistList.filter((r) => r.status === 'confirmed').length}
            </span>
          </button>
        </div>

        {/* Action Bar & Date Filter */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '8px 14px', minWidth: '110px' }}>
              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>إجمالي {activeTab === 'reservations' ? 'الحجوزات' : 'الانتظار'}</div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>{displayedList.length}</div>
            </div>
            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '10px', padding: '8px 14px', minWidth: '110px' }}>
              <div style={{ fontSize: '11px', color: '#1d4ed8', fontWeight: 600 }}>{activeTab === 'reservations' ? 'مؤكدة (بانتظار الوصول)' : 'بانتظار طاولة'}</div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#1e40af' }}>{confirmedCount}</div>
            </div>
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '8px 14px', minWidth: '110px' }}>
              <div style={{ fontSize: '11px', color: '#15803d', fontWeight: 600 }}>تم الإجلاس (بالصالة)</div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#166534' }}>{seatedCount}</div>
            </div>
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '8px 14px', minWidth: '110px' }}>
              <div style={{ fontSize: '11px', color: '#b91c1c', fontWeight: 600 }}>ملغية / مغادرة</div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#991b1b' }}>{cancelledCount}</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {activeTab === 'reservations' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '4px 10px' }}>
                <CalendarIcon size={14} color="#64748b" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  style={{ border: 'none', outline: 'none', fontSize: '12.5px', fontWeight: 700, color: '#1e293b' }}
                />
              </div>
            )}
            <button
              type="button"
              onClick={() => setIsAddingNew(!isAddingNew)}
              style={{
                background: isAddingNew ? '#64748b' : activeTab === 'waitlist' ? '#ea580c' : '#170e5e',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '7px 14px',
                fontSize: '12.5px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <PlusCircleIcon size={15} color="#ffffff" />
              <span>
                {isAddingNew
                  ? 'إلغاء النموذج'
                  : activeTab === 'waitlist'
                  ? 'إضافة ضيف لقائمة الانتظار'
                  : 'تسجيل حجز جديد'}
              </span>
            </button>
          </div>
        </div>

        {/* Collapsible New Reservation / Waitlist Form */}
        {isAddingNew && (
          <form
            onSubmit={handleCreate}
            style={{
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderRadius: '12px',
              padding: '14px 18px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div style={{ fontSize: '13px', fontWeight: 800, color: '#170e5e', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <SlidersIcon size={14} color="#170e5e" />
              <span>{activeTab === 'waitlist' ? 'بيانات إضافة ضيف لقائمة الانتظار اللحظية' : 'بيانات حجز الطاولة المسبق'}</span>
            </div>

            {activeTab === 'waitlist' ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 140px 1.5fr auto', gap: '12px', alignItems: 'flex-end' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                    اسم الضيف *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: تركي الشمري"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    style={{ width: '100%', height: '35px', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 10px', fontSize: '12.5px' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                    رقم الجوال
                  </label>
                  <input
                    type="tel"
                    placeholder="05xxxxxxx"
                    value={guestPhone}
                    onChange={(e) => setGuestPhone(e.target.value)}
                    style={{ width: '100%', height: '35px', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 10px', fontSize: '12.5px' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                    عدد الأفراد
                  </label>
                  <div style={{ display: 'inline-flex', alignItems: 'center', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', height: '35px', width: '100%', justifyContent: 'space-between' }}>
                    <button
                      type="button"
                      onClick={() => setGuestCount((c) => c + 1)}
                      style={{ width: '32px', height: '100%', border: 'none', background: 'transparent', fontSize: '15px', fontWeight: 800, color: '#170e5e', cursor: 'pointer' }}
                    >
                      +
                    </button>
                    <span style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>
                      {guestCount}
                    </span>
                    <button
                      type="button"
                      onClick={() => setGuestCount((c) => Math.max(1, c - 1))}
                      style={{ width: '32px', height: '100%', border: 'none', background: 'transparent', fontSize: '15px', fontWeight: 800, color: '#64748b', cursor: 'pointer' }}
                    >
                      -
                    </button>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                    تفضيل الجلسة / ملاحظات
                  </label>
                  <input
                    type="text"
                    placeholder="مثال: جلسة عائلية / أطفال / كراسي أطفال"
                    value={specialRequests}
                    onChange={(e) => setSpecialRequests(e.target.value)}
                    style={{ width: '100%', height: '35px', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 10px', fontSize: '12.5px' }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  style={{
                    background: '#ea580c',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    height: '35px',
                    padding: '0 18px',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {createMutation.isPending ? 'جاري الإضافة...' : 'تسجيل بالانتظار'}
                </button>
              </div>
            ) : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1.2fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                      رقم الطاولة
                    </label>
                    <select
                      value={tableNumber}
                      onChange={(e) => setTableNumber(e.target.value)}
                      style={{ width: '100%', height: '35px', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 8px', fontSize: '12.5px', fontWeight: 700 }}
                    >
                      {Array.from({ length: tablesCount }, (_, i) => String(i + 1)).map((t) => (
                        <option key={t} value={t}>طاولة رقم {t}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                      اسم الضيف / العميل *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="مثال: أحمد عبد الله"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      style={{ width: '100%', height: '35px', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 10px', fontSize: '12.5px' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                      رقم الجوال
                    </label>
                    <input
                      type="tel"
                      placeholder="05xxxxxxx / 01xxxxxxx"
                      value={guestPhone}
                      onChange={(e) => setGuestPhone(e.target.value)}
                      style={{ width: '100%', height: '35px', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 10px', fontSize: '12.5px' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                      موعد الحجز (التاريخ والوقت) *
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={reservationTime}
                      onChange={(e) => setReservationTime(e.target.value)}
                      style={{ width: '100%', height: '35px', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 8px', fontSize: '12px', fontWeight: 600 }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr auto', gap: '12px', alignItems: 'flex-end' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                      عدد الضيوف (Covers)
                    </label>
                    <div style={{ display: 'inline-flex', alignItems: 'center', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', height: '35px' }}>
                      <button
                        type="button"
                        onClick={() => setGuestCount((c) => c + 1)}
                        style={{ width: '34px', height: '100%', border: 'none', background: 'transparent', fontSize: '15px', fontWeight: 800, color: '#170e5e', cursor: 'pointer' }}
                      >
                        +
                      </button>
                      <span style={{ minWidth: '40px', textAlign: 'center', fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>
                        {guestCount}
                      </span>
                      <button
                        type="button"
                        onClick={() => setGuestCount((c) => Math.max(1, c - 1))}
                        style={{ width: '34px', height: '100%', border: 'none', background: 'transparent', fontSize: '15px', fontWeight: 800, color: '#64748b', cursor: 'pointer' }}
                      >
                        -
                      </button>
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                      المناسبة / طلبات خاصة (اختياري)
                    </label>
                    <input
                      type="text"
                      placeholder="مثال: عشاء عمل / طاولة هادئة جانبية / عيد ميلاد"
                      value={specialRequests}
                      onChange={(e) => setSpecialRequests(e.target.value)}
                      style={{ width: '100%', height: '35px', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 10px', fontSize: '12.5px' }}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={createMutation.isPending}
                    style={{
                      background: '#170e5e',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '6px',
                      height: '35px',
                      padding: '0 18px',
                      fontSize: '12.5px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    {createMutation.isPending ? 'جاري الحفظ...' : 'تأكيد الحجز'}
                  </button>
                </div>
              </>
            )}
          </form>
        )}

        {/* Reservations & Waitlist Table */}
        <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '12.5px' }}>
            <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <tr>
                <th style={{ padding: '10px 12px', fontWeight: 700, color: '#475569' }}>
                  {activeTab === 'waitlist' ? 'الأسبقية' : 'الطاولة'}
                </th>
                <th style={{ padding: '10px 12px', fontWeight: 700, color: '#475569' }}>الضيف</th>
                <th style={{ padding: '10px 12px', fontWeight: 700, color: '#475569' }}>الهاتف</th>
                <th style={{ padding: '10px 12px', fontWeight: 700, color: '#475569' }}>الأفراد</th>
                <th style={{ padding: '10px 12px', fontWeight: 700, color: '#475569' }}>
                  {activeTab === 'waitlist' ? 'وقت التسجيل والانتظار' : 'التوقيت'}
                </th>
                <th style={{ padding: '10px 12px', fontWeight: 700, color: '#475569' }}>الحالة</th>
                <th style={{ padding: '10px 12px', fontWeight: 700, color: '#475569' }}>ملاحظات</th>
                <th style={{ padding: '10px 12px', fontWeight: 700, color: '#475569', textAlign: 'center' }}>
                  {activeTab === 'waitlist' ? 'تسكين الطاولة والإجراءات' : 'الإجراءات'}
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={8} style={{ padding: '36px', textAlign: 'center', color: '#64748b' }}>
                    جاري تحميل البيانات...
                  </td>
                </tr>
              ) : displayedList.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                    {activeTab === 'waitlist'
                      ? 'لا يوجد ضيوف بقائمة الانتظار حالياً.'
                      : `لا توجد حجوزات مسجلة لهذا التاريخ (${selectedDate}). اضغط على "تسجيل حجز جديد" لإضافة حجز.`}
                  </td>
                </tr>
              ) : (
                displayedList.map((r, idx) => {
                  const resTime = new Date(r.reservation_time);
                  const formattedTime = resTime.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
                  const waitMinutes = Math.max(0, Math.floor((Date.now() - resTime.getTime()) / 60000));

                  let statusBadge = (
                    <span style={{ background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 700 }}>
                      {activeTab === 'waitlist' ? 'قيد الانتظار' : 'مؤكد'}
                    </span>
                  );
                  if (r.status === 'seated') {
                    statusBadge = (
                      <span style={{ background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 700 }}>
                        جالس بالصالة
                      </span>
                    );
                  } else if (r.status === 'cancelled') {
                    statusBadge = (
                      <span style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 700 }}>
                        {activeTab === 'waitlist' ? 'غادر' : 'ملغي'}
                      </span>
                    );
                  } else if (r.status === 'no_show') {
                    statusBadge = (
                      <span style={{ background: '#fff7ed', color: '#c2410c', border: '1px solid #fed7aa', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 700 }}>
                        لم يحضر
                      </span>
                    );
                  }

                  return (
                    <tr key={r.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px 12px', fontWeight: 800, color: '#170e5e' }}>
                        {activeTab === 'waitlist' ? (
                          <span style={{ background: '#e0e7ff', color: '#3730a3', padding: '2px 8px', borderRadius: '6px', fontSize: '12px' }}>
                            #{idx + 1}
                          </span>
                        ) : (
                          `طاولة ${r.table_number}`
                        )}
                      </td>
                      <td style={{ padding: '10px 12px', fontWeight: 700, color: '#0f172a' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <UserIcon size={13} color="#64748b" />
                          <span>{r.guest_name}</span>
                        </div>
                      </td>
                      <td style={{ padding: '10px 12px', color: '#475569' }}>
                        {r.guest_phone ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <PhoneIcon size={12} color="#64748b" />
                            <span dir="ltr">{r.guest_phone}</span>
                          </div>
                        ) : '—'}
                      </td>
                      <td style={{ padding: '10px 12px', fontWeight: 700, color: '#334155' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <UsersIcon size={13} color="#64748b" />
                          <span>{r.guest_count} فرد</span>
                        </div>
                      </td>
                      <td style={{ padding: '10px 12px', fontWeight: 700, color: '#0f172a' }}>
                        {activeTab === 'waitlist' ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '12px', color: '#475569' }}>{formattedTime}</span>
                            {r.status === 'confirmed' && (
                              <span style={{
                                background: waitMinutes > 20 ? '#fee2e2' : waitMinutes > 10 ? '#fef3c7' : '#ecfdf5',
                                color: waitMinutes > 20 ? '#991b1b' : waitMinutes > 10 ? '#92400e' : '#065f46',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontWeight: 800,
                              }}>
                                منذ {waitMinutes} د
                              </span>
                            )}
                          </div>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <ClockIcon size={13} color="#64748b" />
                            <span>{formattedTime}</span>
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        {statusBadge}
                      </td>
                      <td style={{ padding: '10px 12px', color: '#64748b', fontSize: '11.5px', maxWidth: '160px' }}>
                        {r.special_requests || '—'}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          {activeTab === 'waitlist' && r.status === 'confirmed' && (
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                              <select
                                value={seatTableSelections[r.id] || '1'}
                                onChange={(e) => setSeatTableSelections({ ...seatTableSelections, [r.id]: e.target.value })}
                                style={{
                                  height: '28px',
                                  borderRadius: '4px',
                                  border: '1px solid #cbd5e1',
                                  padding: '0 6px',
                                  fontSize: '11.5px',
                                  fontWeight: 700,
                                }}
                              >
                                {Array.from({ length: tablesCount }, (_, i) => String(i + 1)).map((t) => (
                                  <option key={t} value={t}>طاولة {t}</option>
                                ))}
                              </select>
                              <button
                                type="button"
                                onClick={() => handleSeat(r, seatTableSelections[r.id] || '1')}
                                style={{
                                  background: '#16a34a',
                                  color: '#ffffff',
                                  border: 'none',
                                  borderRadius: '6px',
                                  padding: '4px 10px',
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  whiteSpace: 'nowrap',
                                }}
                                title="إجلاس الضيف على الطاولة المحددة فوراً"
                              >
                                <CheckCircleIcon size={12} color="#ffffff" />
                                <span>إجلاس بالطاولة</span>
                              </button>
                            </div>
                          )}

                          {activeTab === 'reservations' && r.status === 'confirmed' && (
                            <button
                              type="button"
                              onClick={() => handleSeat(r)}
                              style={{
                                background: '#16a34a',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '6px',
                                padding: '4px 10px',
                                fontSize: '11px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                              title="إجلاس الضيف وفتح الطاولة فورياً في شاشة البيع"
                            >
                              <CheckCircleIcon size={12} color="#ffffff" />
                              <span>إجلاس الضيف</span>
                            </button>
                          )}

                          {r.status === 'confirmed' && (
                            <button
                              type="button"
                              onClick={() => statusMutation.mutate({ id: r.id, status: 'cancelled' })}
                              style={{
                                background: '#fef2f2',
                                color: '#b91c1c',
                                border: '1px solid #fecaca',
                                borderRadius: '6px',
                                padding: '4px 8px',
                                fontSize: '11px',
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                              title={activeTab === 'waitlist' ? 'مغادرة الانتظار' : 'إلغاء الحجز'}
                            >
                              {activeTab === 'waitlist' ? 'مغادرة' : 'إلغاء'}
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleDelete(r)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: '#94a3b8',
                              cursor: 'pointer',
                              padding: '4px',
                            }}
                            title="حذف السجل"
                          >
                            <TrashIcon size={13} color="#94a3b8" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </StandardDialog>
  );
}
