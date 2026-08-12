import { useState } from 'react';
import { PageHeader } from '@/shared/components/page-header';
import { StatsGrid } from '@/shared/components/stats-grid';
import { FormSection } from '@/shared/components/form-section';
import { Button } from '@/shared/ui/button';
import { formatCurrency } from '@/lib/format';
import { useSuppliersQuery } from '@/shared/hooks/use-catalog-queries';
import { useTreasury } from '@/features/treasury/hooks/useTreasury';
import { useRecordForeignTransferMutation, useForeignTransfersQuery } from './api/shipments.api';
import { DataTable } from '@/shared/ui/data-table';

export default function SupplierCredit() {
  const suppliersQuery = useSuppliersQuery();
  const treasuryQuery = useTreasury({});
  const transferMutation = useRecordForeignTransferMutation();
  const transfersQuery = useForeignTransfersQuery();

  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [amountEgp, setAmountEgp] = useState('');
  const [amountForeign, setAmountForeign] = useState('');
  const [notes, setNotes] = useState('');

  const factories = suppliersQuery.data?.filter(s => s.metadata?.supplierType === 'factory') || [];
  const totalDebtForeign = factories.reduce((sum, s) => sum + Number(s.balance || 0), 0);
  const availableEgp = treasuryQuery.data?.summary?.net || 0;

  const egpNum = Number(amountEgp) || 0;
  const foreignNum = Number(amountForeign) || 0;
  const exchangeRate = egpNum > 0 && foreignNum > 0 ? (egpNum / foreignNum).toFixed(2) : '0.00';

  const stats = [
    { key: 'debt_usd', label: 'إجمالي مديونية المصانع', value: formatCurrency(totalDebtForeign) },
    { key: 'available', label: 'الرصيد المتاح للتحويل بالدرج', value: formatCurrency(availableEgp) },
    { key: 'debt_local', label: 'المصانع المسجلة', value: factories.length.toString() },
  ] as const;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplier) return alert('يرجى اختيار المصنع');
    if (egpNum <= 0) return alert('المبلغ المسحوب يجب أن يكون أكبر من صفر');
    if (foreignNum <= 0) return alert('المبلغ المحول يجب أن يكون أكبر من صفر');

    transferMutation.mutate({
      supplierId: selectedSupplier,
      amountEgp: egpNum,
      amountForeign: foreignNum,
      notes
    }, {
      onSuccess: () => {
        alert('تم تسجيل الحوالة بنجاح');
        setAmountEgp('');
        setAmountForeign('');
        setNotes('');
      }
    });
  };

  return (
    <div className="page-stack page-shell import-sales-page" dir="rtl">
      <main className="document-prototype-column" style={{ paddingBottom: '100px' }}>
        <PageHeader 
          title="محفظة سداد موردي الخارج" 
          description="متابعة ديون المصانع الأجنبية وتسجيل حوالات الدفع وتدبير العملة."
          actions={
            <div className="actions compact-actions">
              <Button variant="primary" disabled={suppliersQuery.isLoading}>تحديث البيانات</Button>
            </div>
          } 
        />
        <StatsGrid items={stats} />

        <FormSection 
          title="تسجيل حوالة بنكية جديدة (تدبير عملة)" 
          description="هذه العملية ستقوم بخصم المبلغ بالجنيه من الخزينة، وتخفيض مديونية المصنع بالعملة الأجنبية بشكل تلقائي."
        >
          <form onSubmit={handleSubmit} className="p-4 space-y-4 bg-white dark:bg-slate-900 rounded-lg border">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">المصنع / المورد الأجنبي *</label>
                <select 
                  className="w-full border rounded p-2 bg-transparent"
                  value={selectedSupplier}
                  onChange={e => setSelectedSupplier(e.target.value)}
                  required
                  disabled={transferMutation.isPending}
                >
                  <option value="">-- اختر المصنع --</option>
                  {factories.map(f => (
                    <option key={f.id} value={f.id}>{f.name} (مديونية: {formatCurrency(f.balance || 0)})</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">المبلغ المسحوب من الخزينة (جنيه) *</label>
                <input 
                  type="number" 
                  min="0" 
                  step="0.01" 
                  className="w-full border rounded p-2 bg-transparent"
                  value={amountEgp}
                  onChange={e => setAmountEgp(e.target.value)}
                  required
                  disabled={transferMutation.isPending}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">المبلغ المحول للمصنع (عملة أجنبية) *</label>
                <input 
                  type="number" 
                  min="0" 
                  step="0.01" 
                  className="w-full border rounded p-2 bg-transparent"
                  value={amountForeign}
                  onChange={e => setAmountForeign(e.target.value)}
                  required
                  disabled={transferMutation.isPending}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">سعر الصرف المحتسب للحوالة</label>
                <div className="w-full border rounded p-2 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono">
                  {exchangeRate}
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">ملاحظات التحويل</label>
                <input 
                  type="text" 
                  className="w-full border rounded p-2 bg-transparent"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="رقم الحوالة، البنك، الخ..."
                  disabled={transferMutation.isPending}
                />
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <Button type="submit" variant="primary" disabled={transferMutation.isPending}>
                {transferMutation.isPending ? 'جاري التسجيل...' : 'تأكيد تسجيل الحوالة'}
              </Button>
            </div>
          </form>
        </FormSection>

        <FormSection 
          title="سجل حوالات المصانع الأجنبية"
          description="تاريخ التحويلات التي تمت لموردي الخارج"
        >
          <DataTable 
            rows={transfersQuery.data || []}
            rowKey={(r) => r.id}
            columns={[
              { key: 'payment_date', header: 'تاريخ التحويل', cell: (r) => new Date(r.payment_date).toLocaleDateString('ar-EG') },
              { key: 'supplier_name', header: 'المصنع', cell: (r) => r.supplier_name },
              { key: 'amount', header: 'المبلغ (عملة أجنبية)', cell: (r) => formatCurrency(r.amount) },
              { key: 'note', header: 'البيان', cell: (r) => r.note || '-' }
            ]}
          />
        </FormSection>
      </main>
    </div>
  );
}
