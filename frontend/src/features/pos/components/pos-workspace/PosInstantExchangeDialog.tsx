import { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { DialogShell } from '@/shared/components/dialog-shell';
import { Button } from '@/shared/ui/button';
import { toast } from '@/shared/components/system-alert';
import { posApi } from '@/features/pos/api/pos.api';
import { invalidateSalesDomain } from '@/app/query-invalidation';
import type { PosWorkspaceState } from './posWorkspace.helpers';

type SourceSale = Awaited<ReturnType<typeof posApi.getSaleForExchange>>['sale'];

export function PosInstantExchangeDialog({ open, onClose, pos }: {
  open: boolean; onClose: () => void; pos: PosWorkspaceState;
}) {
  const queryClient = useQueryClient();
  const [sourceId, setSourceId] = useState('');
  const [source, setSource] = useState<SourceSale | null>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [serials, setSerials] = useState<Record<string, string>>({});
  const [managerPin, setManagerPin] = useState('');
  const [paymentChannel, setPaymentChannel] = useState<'cash' | 'card'>('cash');
  const [refundMethod, setRefundMethod] = useState<'cash' | 'card' | 'store_credit'>('cash');
  const [pending, setPending] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const requestKey = useRef<string | null>(null);
  const submittedPayload = useRef<Record<string, unknown> | null>(null);

  const returned = (source?.items || []).filter((item) => Number(quantities[item.id] || 0) > 0);
  const returnEstimate = returned.reduce((sum, item) => sum +
    Math.round((Number(item.netLineTotal ?? item.total) + Number(item.allocatedTax || 0)) *
      Number(quantities[item.id]) / Number(item.qty) * 100) / 100, 0);
  const netEstimate = Number((Number(pos.totals.total || 0) - returnEstimate).toFixed(2));

  async function loadSource() {
    if (attempted) { toast.error('أعد محاولة نفس الطلب أولاً لمعرفة نتيجته قبل تحميل فاتورة أخرى'); return; }
    const id = Number(sourceId);
    if (!Number.isInteger(id) || id <= 0) { toast.error('أدخل رقم الفاتورة الأصلية'); return; }
    setPending(true);
    try {
      const result = await posApi.getSaleForExchange(id);
      const sale = result.sale;
      if (sale.status !== 'posted' || !sale.customerId || String(sale.branchId) !== String(pos.branchId) ||
        Number(sale.total) - Number(sale.paidAmount) - Number(sale.storeCreditUsed || 0) > 0.001) {
        throw new Error('يلزم اختيار فاتورة مدفوعة لنفس الفرع وعميل مسجل');
      }
      setSource(sale);
      setQuantities({});
      setSerials({});
      requestKey.current = null;
      submittedPayload.current = null;
      setAttempted(false);
    } catch (error) {
      setSource(null);
      toast.error(error instanceof Error ? error.message : 'تعذر تحميل الفاتورة الأصلية');
    } finally { setPending(false); }
  }

  async function submit() {
    if (!source || pending || !returned.length || !pos.cart.length || !managerPin.trim() ||
      !pos.ownOpenShift || Number(pos.loyaltyPointsRedeemed || 0) > 0 || pos.orderType === 'delivery') {
      toast.error('اختر فاتورة ومرتجعاً وبضاعة جديدة، وافتح وردية وأدخل رمز المشرف');
      return;
    }
    const negativeItems = returned.map((item) => {
      const qty = Number(quantities[item.id]);
      const selected = String(serials[item.id] || '').split(',').map((serial) => serial.trim()).filter(Boolean);
      const original = Array.isArray(item.serials) ? item.serials : [];
      if (original.length && selected.length !== qty) throw new Error(`أدخل سيريالات المرتجع للصنف ${item.name} مفصولة بفاصلة`);
      return { productId: Number(item.productId), originalSaleItemId: Number(item.id), qty: -qty,
        price: 0, serials: selected };
    });
    const items = pos.cart.map((item) => ({
      productId: Number(item.productId), qty: Number(item.qty), price: Number(item.price),
      unitName: item.unitName, unitMultiplier: Number(item.unitMultiplier || 1),
      priceType: item.priceType, notes: item.notes, modifiers: item.modifiers,
      serials: item.serials || [],
    }));
    requestKey.current ||= crypto.randomUUID();
    const payload = submittedPayload.current || {
      exchangeSaleId: Number(source.id), exchangeRefundMethod: refundMethod,
      customerId: Number(source.customerId), branchId: Number(pos.branchId), source: 'pos',
      paymentType: 'cash', paymentChannel, payments: [], tenderedAmount: 0,
      discount: Number(pos.discount || 0), deliveryFee: 0, taxRate: Number(pos.totals.taxRate || 0),
      pricesIncludeTax: Boolean(pos.totals.pricesIncludeTax),
      managerPin: managerPin.trim(), note: `استبدال فاتورة ${source.id}`,
      items: [...items, ...negativeItems],
    };
    submittedPayload.current = payload;
    setAttempted(true);
    setPending(true);
    try {
      await posApi.createSale(payload, undefined, undefined, { 'x-idempotency-key': requestKey.current });
      toast.success('تم تسجيل الاستبدال والمرتجع في معاملة واحدة');
      pos.resetPosDraft();
      void invalidateSalesDomain(queryClient, { includeDashboard: true });
      requestKey.current = null;
      setSource(null);
      onClose();
    } catch (error) {
      const status = typeof error === 'object' && error !== null && 'status' in error
        ? Number((error as { status?: number }).status) : 0;
      if (status >= 400 && status < 500) {
        requestKey.current = null;
        submittedPayload.current = null;
        setAttempted(false);
      }
      toast.error(error instanceof Error ? error.message : 'تعذر تنفيذ الاستبدال');
    } finally { setPending(false); }
  }

  return <DialogShell open={open} onClose={() => { if (!pending) onClose(); }} width="min(700px, 96vw)" ariaLabel="استبدال فوري">
    <div dir="rtl" style={{ padding: 20, maxHeight: 'min(620px, 82vh)', overflowY: 'auto' }}>
      <h2>استبدال فوري</h2>
      <p>البضاعة الجديدة من سلة الكاشير، والمرتجع من فاتورة العميل الأصلية. يُحسب الصافي عند الاعتماد على السيرفر.</p>
      <label htmlFor="exchange-source">رقم الفاتورة الأصلية</label>
      <div style={{ display: 'flex', gap: 8 }}>
        <input id="exchange-source" type="number" min={1} value={sourceId} onChange={(event) => setSourceId(event.target.value)} disabled={pending || attempted} />
        <Button type="button" onClick={() => { void loadSource(); }} disabled={pending || attempted}>تحميل</Button>
      </div>
      {source && <>
        <p>العميل: {source.customerId}، الفاتورة: {source.id}</p>
        <h3>السطور المرتجعة</h3>
        {source.items.map((item) => <div key={item.id} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 90px', gap: 8, marginBottom: 8 }}>
          <span>{item.name}، المباع {item.qty}</span>
          <input type="number" min={0} max={item.qty} step="0.001" value={quantities[item.id] || 0}
          onChange={(event) => setQuantities((current) => ({ ...current, [item.id]: Math.max(0, Math.min(Number(item.qty), Number(event.target.value) || 0)) }))} disabled={pending || attempted} />
          {Number(quantities[item.id] || 0) > 0 && item.serials?.length > 0 &&
            <input aria-label={`سيريالات ${item.name}`} placeholder="الأرقام التسلسلية مفصولة بفاصلة" value={serials[item.id] || ''}
              onChange={(event) => setSerials((current) => ({ ...current, [item.id]: event.target.value }))} disabled={pending || attempted}
              style={{ gridColumn: '1 / -1' }} />}
        </div>)}
        <h3>السطور الجديدة ({pos.cart.length})</h3>
        {pos.cart.map((item) => <div key={item.lineKey}>{item.name} × {item.qty}</div>)}
        <p>تقدير المرتجع: {returnEstimate.toFixed(2)}، تقدير الصافي: {netEstimate.toFixed(2)}</p>
        <label htmlFor="exchange-payment">تحصيل الفرق الموجب</label>
        <select id="exchange-payment" value={paymentChannel} disabled={attempted} onChange={(event) => setPaymentChannel(event.target.value as 'cash' | 'card')}>
          <option value="cash">نقدي</option><option value="card">شبكة</option>
        </select>
        <label htmlFor="exchange-refund">رد الفرق السالب</label>
        <select id="exchange-refund" value={refundMethod} disabled={attempted} onChange={(event) => setRefundMethod(event.target.value as 'cash' | 'card' | 'store_credit')}>
          <option value="cash">حسب وسيلة الدفع الأصلية</option><option value="card">شبكة أولاً</option><option value="store_credit">رصيد متجر</option>
        </select>
        <label htmlFor="exchange-manager-pin">رمز اعتماد المشرف</label>
        <input id="exchange-manager-pin" type="password" value={managerPin} onChange={(event) => setManagerPin(event.target.value)} disabled={pending || attempted} />
        <Button type="button" onClick={() => { void submit().catch((error: unknown) => toast.error(error instanceof Error ? error.message : 'بيانات الاستبدال غير صالحة')); }}
          disabled={pending || !returned.length || !pos.cart.length || !managerPin.trim()}>
          {pending ? 'جارٍ التنفيذ...' : attempted ? 'التحقق من نتيجة الطلب' : 'اعتماد الاستبدال'}
        </Button>
      </>}
    </div>
  </DialogShell>;
}
