import React, { useState } from 'react';
import {
  useCustomsBrokersQuery,
  useCreateCustomsBrokerMutation,
  useDisburseBrokerAdvanceMutation,
  useLiquidateBrokerExpenseMutation,
  useCustomsBrokerStatementQuery,
  CustomsBroker,
} from './api/shipments.api';
import { StandardDialog } from '@/shared/components/StandardDialog';
import { formatCurrency } from '@/lib/format';
import {
  PlusCircleIcon,
  CheckCircleIcon,
  RefreshCwIcon,
} from '@/shared/components/icons/AppIcons';
import { toast } from '@/shared/components/system-alert';
import { useQuery } from '@tanstack/react-query';
import { http } from '@/lib/http';

export function CustomsBrokerManager() {
  const { data: brokers = [], refetch } = useCustomsBrokersQuery();
  const createBrokerMutation = useCreateCustomsBrokerMutation();
  const disburseAdvanceMutation = useDisburseBrokerAdvanceMutation();
  const liquidateExpenseMutation = useLiquidateBrokerExpenseMutation();

  // Modals
  const [isCreateBrokerOpen, setIsCreateBrokerOpen] = useState(false);
  const [isDisburseOpen, setIsDisburseOpen] = useState(false);
  const [isLiquidateOpen, setIsLiquidateOpen] = useState(false);
  const [selectedBrokerForStatement, setSelectedBrokerForStatement] = useState<CustomsBroker | null>(null);

  // Create Broker State
  const [brokerName, setBrokerName] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [portName, setPortName] = useState('Alexandria');
  const [brokerNotes, setBrokerNotes] = useState('');

  // Disburse Advance State
  const [selectedBrokerId, setSelectedBrokerId] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedShipmentId, setSelectedShipmentId] = useState('');
  const [advanceNo, setAdvanceNo] = useState('');
  const [advanceAmountEgp, setAdvanceAmountEgp] = useState<number>(100000);
  const [treasuryAccountId, setTreasuryAccountId] = useState('');
  const [advanceNotes, setAdvanceNotes] = useState('');

  // Liquidate Expense State
  const [liquidateReceiptNo, setLiquidateReceiptNo] = useState('');
  const [liquidateCategory, setLiquidateCategory] = useState('customs_duty');
  const [liquidateAmountEgp, setLiquidateAmountEgp] = useState<number>(50000);
  const [isCapitalized, setIsCapitalized] = useState(true);
  const [liquidateNotes, setLiquidateNotes] = useState('');

  // Fetch Projects and Shipments
  const { data: projects = [] } = useQuery({
    queryKey: ['import-projects'],
    queryFn: async () => {
      const res = await http<any[]>('/api/import-sales/projects');
      return Array.isArray(res) ? res : (res as any)?.items || [];
    },
  });

  const { data: shipments = [] } = useQuery({
    queryKey: ['import-shipments'],
    queryFn: async () => {
      const res = await http<any[]>('/api/import-sales/shipments');
      return Array.isArray(res) ? res : (res as any)?.items || [];
    },
  });

  // Fetch treasury accounts
  const { data: accountsData } = useQuery({
    queryKey: ['accounts-list'],
    queryFn: () => http<any>('/api/accounting/accounts').catch(() => ({ accounts: [] })),
  });
  const treasuryAccounts = (accountsData?.accounts || (Array.isArray(accountsData) ? accountsData : [])).filter(
    (a: any) => a.accountGroup === 'current_assets' || a.isCashBank
  );

  const { data: brokerStatement, isLoading: isStatementLoading } = useCustomsBrokerStatementQuery(
    selectedBrokerForStatement?.id || ''
  );

  const handleCreateBroker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!brokerName.trim()) {
      toast.error('اسم المخلص مطلوب');
      return;
    }
    try {
      await createBrokerMutation.mutateAsync({
        name: brokerName.trim(),
        licenseNumber: licenseNumber || undefined,
        phone: phone || undefined,
        portName,
        notes: brokerNotes || undefined,
      });
      toast.success('تم تسجيل المخلص الجمركي بنجاح');
      setIsCreateBrokerOpen(false);
      setBrokerName('');
      setLicenseNumber('');
      setPhone('');
      refetch();
    } catch (err: any) {
      toast.error('فشل تسجيل المخلص: ' + (err.message || 'خطأ'));
    }
  };

  const handleDisburseAdvance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBrokerId) {
      toast.error('يرجى اختيار المخلص الجمركي');
      return;
    }
    if (advanceAmountEgp <= 0) {
      toast.error('مبلغ العهدة يجب أن يكون أكبر من صفر');
      return;
    }
    try {
      await disburseAdvanceMutation.mutateAsync({
        brokerId: selectedBrokerId,
        projectId: selectedProjectId || undefined,
        shipmentId: selectedShipmentId || undefined,
        advanceNo: advanceNo || undefined,
        amountEgp: Number(advanceAmountEgp),
        treasuryAccountId: treasuryAccountId || undefined,
        notes: advanceNotes || undefined,
      });
      toast.success('تم صرف وقيد عهدة التخليص الجمركي بنجاح');
      setIsDisburseOpen(false);
      refetch();
    } catch (err: any) {
      toast.error('فشل صرف العهدة: ' + (err.message || 'خطأ'));
    }
  };

  const handleLiquidateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBrokerId) {
      toast.error('يرجى اختيار المخلص الجمركي');
      return;
    }
    if (!liquidateReceiptNo.trim()) {
      toast.error('رقم الإيصال / الفاتورة مطلوب');
      return;
    }
    if (liquidateAmountEgp <= 0) {
      toast.error('مبلغ التصفية يجب أن يكون أكبر من صفر');
      return;
    }
    try {
      await liquidateExpenseMutation.mutateAsync({
        brokerId: selectedBrokerId,
        projectId: selectedProjectId || undefined,
        shipmentId: selectedShipmentId || undefined,
        receiptNo: liquidateReceiptNo.trim(),
        category: liquidateCategory,
        amountEgp: Number(liquidateAmountEgp),
        isCapitalized,
        notes: liquidateNotes || undefined,
      });
      toast.success('تمت تصفية وقيد المصروف الجمركي وخصمه من رصيد العهدة');
      setIsLiquidateOpen(false);
      setLiquidateReceiptNo('');
      refetch();
    } catch (err: any) {
      toast.error('فشل تصفية المصروف: ' + (err.message || 'خطأ'));
    }
  };

  const totalUnliquidatedAll = brokers.reduce((sum: number, b: any) => sum + Number(b.unliquidated_balance_egp || 0), 0);

  return (
    <div dir="rtl" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Top Action & KPI Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 16px' }}>
            <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>إجمالي العهد المعلقة طرف المخلصين: </span>
            <span style={{ fontSize: 15, fontWeight: 800, color: totalUnliquidatedAll > 0 ? '#b91c1c' : '#15803d' }}>
              {formatCurrency(totalUnliquidatedAll)}
            </span>
          </div>
          <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 16px' }}>
            <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>عدد المخلصين المعتمدين: </span>
            <span style={{ fontSize: 15, fontWeight: 800, color: '#170e5e' }}>{brokers.length}</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            onClick={() => setIsDisburseOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '7px 14px',
              backgroundColor: '#0284c7',
              color: '#ffffff',
              border: 'none',
              borderRadius: 6,
              fontSize: 12.5,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <PlusCircleIcon size={14} />
            صرف عهدة تسيير جمركي
          </button>

          <button
            type="button"
            onClick={() => setIsLiquidateOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '7px 14px',
              backgroundColor: '#15803d',
              color: '#ffffff',
              border: 'none',
              borderRadius: 6,
              fontSize: 12.5,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <CheckCircleIcon size={14} />
            تصفية مصاريف بإيصالات رسمية
          </button>

          <button
            type="button"
            onClick={() => setIsCreateBrokerOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '7px 14px',
              backgroundColor: '#170e5e',
              color: '#ffffff',
              border: 'none',
              borderRadius: 6,
              fontSize: 12.5,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <PlusCircleIcon size={14} />
            إضافة مخلص جمركي
          </button>
        </div>
      </div>

      {/* Brokers Table */}
      <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
          <thead>
            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>
              <th style={{ padding: '10px 14px', color: '#475569', fontWeight: 600 }}>اسم المخلص / المكتب</th>
              <th style={{ padding: '10px 14px', color: '#475569', fontWeight: 600 }}>رقم الرخصة</th>
              <th style={{ padding: '10px 14px', color: '#475569', fontWeight: 600 }}>الميناء الرئيسي</th>
              <th style={{ padding: '10px 14px', color: '#475569', fontWeight: 600 }}>الهاتف</th>
              <th style={{ padding: '10px 14px', color: '#475569', fontWeight: 600 }}>إجمالي المنصرف (عهد)</th>
              <th style={{ padding: '10px 14px', color: '#475569', fontWeight: 600 }}>المصروفات المصفاة</th>
              <th style={{ padding: '10px 14px', color: '#475569', fontWeight: 600 }}>الرصيد المتبقي طرفه</th>
              <th style={{ padding: '10px 14px', color: '#475569', fontWeight: 600, textAlign: 'center' }}>الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {brokers.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>
                  لا يوجد مخلصون جمركيون مسجلون حالياً. انقر على "إضافة مخلص جمركي" للبدء.
                </td>
              </tr>
            ) : (
              brokers.map((broker: any) => (
                <tr key={broker.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '10px 14px', fontWeight: 700, color: '#0f172a' }}>{broker.name}</td>
                  <td style={{ padding: '10px 14px', fontFamily: 'monospace' }}>{broker.license_number || '—'}</td>
                  <td style={{ padding: '10px 14px' }}>{broker.port_name}</td>
                  <td style={{ padding: '10px 14px', direction: 'ltr', textAlign: 'right' }}>{broker.phone || '—'}</td>
                  <td style={{ padding: '10px 14px', fontWeight: 600 }}>{formatCurrency(broker.total_advances_egp)}</td>
                  <td style={{ padding: '10px 14px', color: '#15803d', fontWeight: 600 }}>
                    {formatCurrency(broker.total_liquidated_egp)}
                  </td>
                  <td
                    style={{
                      padding: '10px 14px',
                      fontWeight: 800,
                      color: Number(broker.unliquidated_balance_egp) > 0 ? '#b91c1c' : '#15803d',
                    }}
                  >
                    {formatCurrency(broker.unliquidated_balance_egp)}
                  </td>
                  <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                    <button
                      type="button"
                      onClick={() => setSelectedBrokerForStatement(broker)}
                      style={{
                        padding: '4px 10px',
                        backgroundColor: '#f1f5f9',
                        border: '1px solid #cbd5e1',
                        borderRadius: 4,
                        fontSize: 11.5,
                        fontWeight: 600,
                        cursor: 'pointer',
                        color: '#170e5e',
                      }}
                    >
                      كشف حساب العهدة
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal: Create Customs Broker */}
      <StandardDialog
        isOpen={isCreateBrokerOpen}
        onClose={() => setIsCreateBrokerOpen(false)}
        title="إضافة مخلص جمركي معتمد"
        subtitle="تسجيل بيانات مكتب أو مخلص التخليص الجمركي وإدراج حسابه بدفتر الأستاذ"
        width="600px"
        compact
      >
        <form onSubmit={handleCreateBroker} dir="rtl" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
              اسم المخلص أو المكتب: *
            </label>
            <input
              type="text"
              className="input"
              style={{ width: '100%', padding: '7px 10px', fontSize: 13 }}
              value={brokerName}
              placeholder="مثال: مكتب النصر للتخليص الجمركي والشحن"
              onChange={(e) => setBrokerName(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                رقم الرخصة الجمركية:
              </label>
              <input
                type="text"
                className="input"
                style={{ width: '100%', padding: '7px 10px', fontSize: 13 }}
                value={licenseNumber}
                placeholder="مثال: LIC-EG-ALEX-9921"
                onChange={(e) => setLicenseNumber(e.target.value)}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                الميناء الرئيسي:
              </label>
              <select
                className="input"
                style={{ width: '100%', padding: '7px 10px', fontSize: 13 }}
                value={portName}
                onChange={(e) => setPortName(e.target.value)}
              >
                <option value="Alexandria">ميناء الإسكندرية البحري</option>
                <option value="Dekheila">ميناء الدخيلة</option>
                <option value="Port Said East">ميناء شرق بورسعيد</option>
                <option value="Port Said West">ميناء غرب بورسعيد</option>
                <option value="Damietta">ميناء دمياط</option>
                <option value="Sokhna">ميناء العين السخنة</option>
                <option value="Cairo Airport">قرية البضائع - مطار القاهرة</option>
              </select>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
              رقم الهاتف المحمول:
            </label>
            <input
              type="text"
              className="input"
              style={{ width: '100%', padding: '7px 10px', fontSize: 13 }}
              value={phone}
              placeholder="مثال: 01012345678"
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
              ملاحظات:
            </label>
            <input
              type="text"
              className="input"
              style={{ width: '100%', padding: '7px 10px', fontSize: 13 }}
              value={brokerNotes}
              placeholder="مثال: خبير في الإفراج عن الأدوات الكهربائية والأجهزة المنزلية"
              onChange={(e) => setBrokerNotes(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
            <button
              type="button"
              onClick={() => setIsCreateBrokerOpen(false)}
              style={{ padding: '7px 14px', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 12.5, cursor: 'pointer' }}
            >
              إلغاء
            </button>
            <button
              type="submit"
              style={{ padding: '7px 16px', backgroundColor: '#170e5e', color: '#ffffff', border: 'none', borderRadius: 6, fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}
            >
              حفظ المخلص
            </button>
          </div>
        </form>
      </StandardDialog>

      {/* Modal: Disburse Advance */}
      <StandardDialog
        isOpen={isDisburseOpen}
        onClose={() => setIsDisburseOpen(false)}
        title="صرف عهدة نقدية لمخلص جمركي"
        subtitle="تحويل أو صرف مبالغ لتسديد الرسوم الجمركية ومصاريف الموانئ مقدماً"
        width="620px"
        compact
      >
        <form onSubmit={handleDisburseAdvance} dir="rtl" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
              المخلص الجمركي المستلم للعهدة: *
            </label>
            <select
              className="input"
              style={{ width: '100%', padding: '7px 10px', fontSize: 13 }}
              value={selectedBrokerId}
              onChange={(e) => setSelectedBrokerId(e.target.value)}
              required
            >
              <option value="">-- اختر المخلص --</option>
              {brokers.map((b: any) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.port_name}) - رصيد معلق: {formatCurrency(b.unliquidated_balance_egp)}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                ربط بمشروع استيراد:
              </label>
              <select
                className="input"
                style={{ width: '100%', padding: '7px 10px', fontSize: 13 }}
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
              >
                <option value="">-- اختياري --</option>
                {projects.map((p: any) => (
                  <option key={p.id} value={p.id}>
                    {p.project_no} - {p.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                ربط بحاوية / شحنة:
              </label>
              <select
                className="input"
                style={{ width: '100%', padding: '7px 10px', fontSize: 13 }}
                value={selectedShipmentId}
                onChange={(e) => setSelectedShipmentId(e.target.value)}
              >
                <option value="">-- اختياري --</option>
                {shipments.map((s: any) => (
                  <option key={s.id} value={s.id}>
                    {s.container_number} ({s.status})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                مبلغ العهدة (ج.م): *
              </label>
              <input
                type="number"
                className="input"
                style={{ width: '100%', padding: '7px 10px', fontSize: 13 }}
                value={advanceAmountEgp}
                onChange={(e) => setAdvanceAmountEgp(Number(e.target.value))}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                خزينة / بنك الصرف:
              </label>
              <select
                className="input"
                style={{ width: '100%', padding: '7px 10px', fontSize: 13 }}
                value={treasuryAccountId}
                onChange={(e) => setTreasuryAccountId(e.target.value)}
              >
                <option value="">-- الصندوق الرئيسي --</option>
                {treasuryAccounts.map((acc: any) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.nameAr || acc.nameEn || acc.code}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
              رقم إذن الصرف أو الشيك:
            </label>
            <input
              type="text"
              className="input"
              style={{ width: '100%', padding: '7px 10px', fontSize: 13 }}
              value={advanceNo}
              placeholder="مثال: ADV-ALEX-2026-001"
              onChange={(e) => setAdvanceNo(e.target.value)}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
              البيان والغرض:
            </label>
            <input
              type="text"
              className="input"
              style={{ width: '100%', padding: '7px 10px', fontSize: 13 }}
              value={advanceNotes}
              placeholder="مثال: عهدة تسديد ضرائب جمركية ورسوم إفراج تحت الحساب"
              onChange={(e) => setAdvanceNotes(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
            <button
              type="button"
              onClick={() => setIsDisburseOpen(false)}
              style={{ padding: '7px 14px', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 12.5, cursor: 'pointer' }}
            >
              إلغاء
            </button>
            <button
              type="submit"
              style={{ padding: '7px 16px', backgroundColor: '#0284c7', color: '#ffffff', border: 'none', borderRadius: 6, fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}
            >
              تأكيد صرف العهدة
            </button>
          </div>
        </form>
      </StandardDialog>

      {/* Modal: Liquidate Expense */}
      <StandardDialog
        isOpen={isLiquidateOpen}
        onClose={() => setIsLiquidateOpen(false)}
        title="تصفية مصاريف جمركية بإيصالات رسمية"
        subtitle="إثبات الفواتير والإيصالات الحكومية والمهنية وتخفيض رصيد العهدة المعلق"
        width="620px"
        compact
      >
        <form onSubmit={handleLiquidateExpense} dir="rtl" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
              المخلص الجمركي صاحب العهدة: *
            </label>
            <select
              className="input"
              style={{ width: '100%', padding: '7px 10px', fontSize: 13 }}
              value={selectedBrokerId}
              onChange={(e) => setSelectedBrokerId(e.target.value)}
              required
            >
              <option value="">-- اختر المخلص --</option>
              {brokers.map((b: any) => (
                <option key={b.id} value={b.id}>
                  {b.name} (الرصيد المعلق: {formatCurrency(b.unliquidated_balance_egp)})
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                تصنيف المصروف: *
              </label>
              <select
                className="input"
                style={{ width: '100%', padding: '7px 10px', fontSize: 13 }}
                value={liquidateCategory}
                onChange={(e) => setLiquidateCategory(e.target.value)}
              >
                <option value="customs_duty">ضرائب ورسوم جمركية (Customs Duty)</option>
                <option value="vat">ضريبة القيمة المضافة 14%</option>
                <option value="port_fees">عوايد ورسوم هيئة الميناء (Port Authority)</option>
                <option value="inspection">رسوم الفحص والرقابة على الصادرات والواردات (GOEIC)</option>
                <option value="storage">أرضيات ومخازن الميناء</option>
                <option value="brokerage_fee">أتعاب التخليص الجمركي</option>
                <option value="transport">نقل وتعتيق داخلي</option>
                <option value="demurrage">غرامات تأخير حاويات (Demurrage)</option>
                <option value="other">مصروفات إدارية ورسوم أخرى</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                رقم الإيصال / قسيمة السداد: *
              </label>
              <input
                type="text"
                className="input"
                style={{ width: '100%', padding: '7px 10px', fontSize: 13 }}
                value={liquidateReceiptNo}
                placeholder="مثال: RCP-EGY-PORT-0492"
                onChange={(e) => setLiquidateReceiptNo(e.target.value)}
                required
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                المبلغ المسدد (ج.م): *
              </label>
              <input
                type="number"
                className="input"
                style={{ width: '100%', padding: '7px 10px', fontSize: 13 }}
                value={liquidateAmountEgp}
                onChange={(e) => setLiquidateAmountEgp(Number(e.target.value))}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                المعالجة المحاسبية:
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, marginTop: 8, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={isCapitalized}
                  onChange={(e) => setIsCapitalized(e.target.checked)}
                />
                رسملة على تكلفة البضاعة الواصلة (Landed Cost)
              </label>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
              البيان والملاحظات:
            </label>
            <input
              type="text"
              className="input"
              style={{ width: '100%', padding: '7px 10px', fontSize: 13 }}
              value={liquidateNotes}
              placeholder="مثال: سداد قسيمة فحص الصادرات والواردات طبقاً لنموذج 4"
              onChange={(e) => setLiquidateNotes(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
            <button
              type="button"
              onClick={() => setIsLiquidateOpen(false)}
              style={{ padding: '7px 14px', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 12.5, cursor: 'pointer' }}
            >
              إلغاء
            </button>
            <button
              type="submit"
              style={{ padding: '7px 16px', backgroundColor: '#15803d', color: '#ffffff', border: 'none', borderRadius: 6, fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}
            >
              تأكيد تصفية المصروف
            </button>
          </div>
        </form>
      </StandardDialog>

      {/* Modal: Broker Statement */}
      {selectedBrokerForStatement && (
        <StandardDialog
          isOpen={!!selectedBrokerForStatement}
          onClose={() => setSelectedBrokerForStatement(null)}
          title={`كشف حساب العهدة: ${selectedBrokerForStatement.name}`}
          subtitle={`الميناء: ${selectedBrokerForStatement.port_name} | الرخصة: ${selectedBrokerForStatement.license_number || '—'}`}
          width="900px"
          compact
        >
          {isStatementLoading || !brokerStatement ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
              <RefreshCwIcon size={24} className="spin" />
              <p style={{ marginTop: 8, fontSize: 13 }}>جاري تحميل كشف الحساب وتفاصيل الإيصالات...</p>
            </div>
          ) : (
            <div dir="rtl" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Summary KPIs */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 12 }}>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>إجمالي العهد المنصرفة</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#170e5e', marginTop: 4 }}>
                    {formatCurrency(brokerStatement.totalAdvances)}
                  </div>
                </div>

                <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 12 }}>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>إجمالي المصروفات المصفاة بإيصالات</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#15803d', marginTop: 4 }}>
                    {formatCurrency(brokerStatement.totalExpenses)}
                  </div>
                </div>

                <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 12 }}>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>صافي الرصيد المتبقي طرف المخلص</div>
                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: 800,
                      color: brokerStatement.netBalanceDue > 0 ? '#b91c1c' : '#15803d',
                      marginTop: 4,
                    }}
                  >
                    {formatCurrency(brokerStatement.netBalanceDue)}
                  </div>
                </div>
              </div>

              {/* Advances and Expenses List */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
                <div style={{ backgroundColor: '#f8fafc', padding: '8px 12px', borderBottom: '1px solid #e2e8f0', fontSize: 12.5, fontWeight: 700, color: '#0f172a' }}>
                  بيان إيصالات ومصروفات التصفية ({brokerStatement.expenses.length})
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>
                      <th style={{ padding: '8px 10px', color: '#475569', fontWeight: 600 }}>رقم الإيصال</th>
                      <th style={{ padding: '8px 10px', color: '#475569', fontWeight: 600 }}>التصنيف</th>
                      <th style={{ padding: '8px 10px', color: '#475569', fontWeight: 600 }}>المبلغ</th>
                      <th style={{ padding: '8px 10px', color: '#475569', fontWeight: 600 }}>المعالجة</th>
                      <th style={{ padding: '8px 10px', color: '#475569', fontWeight: 600 }}>البيان</th>
                      <th style={{ padding: '8px 10px', color: '#475569', fontWeight: 600 }}>التاريخ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {brokerStatement.expenses.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>
                          لا توجد إيصالات مصفاة مسجلة حتى الآن
                        </td>
                      </tr>
                    ) : (
                      brokerStatement.expenses.map((exp: any) => (
                        <tr key={exp.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '8px 10px', fontFamily: 'monospace', fontWeight: 600 }}>{exp.receipt_number}</td>
                          <td style={{ padding: '8px 10px' }}>{exp.category}</td>
                          <td style={{ padding: '8px 10px', fontWeight: 700, color: '#15803d' }}>{formatCurrency(exp.amount_egp)}</td>
                          <td style={{ padding: '8px 10px' }}>
                            <span style={{ fontSize: 11, padding: '2px 6px', borderRadius: 4, backgroundColor: exp.is_capitalized ? '#eef2ff' : '#fef3c7', color: exp.is_capitalized ? '#3730a3' : '#b45309' }}>
                              {exp.is_capitalized ? 'رسملة على البضاعة' : 'مصروف فترة'}
                            </span>
                          </td>
                          <td style={{ padding: '8px 10px', color: '#64748b' }}>{exp.notes || '—'}</td>
                          <td style={{ padding: '8px 10px', color: '#64748b' }}>{new Date(exp.created_at).toLocaleDateString('ar-EG')}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </StandardDialog>
      )}
    </div>
  );
}
