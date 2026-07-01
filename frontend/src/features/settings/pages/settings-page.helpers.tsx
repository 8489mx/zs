import type { ReactNode } from 'react';
import { downloadExcelFile } from '@/lib/browser';
import type { BackupSnapshotRecord } from '@/features/settings/components/SettingsWorkspacePrimitives';

export type SettingsConfirmAction =
  | { kind: 'restore-file'; file: File }
  | { kind: 'restore-snapshot'; snapshot: BackupSnapshotRecord }
  | { kind: 'cleanup-expired-sessions' }
  | { kind: 'reconcile-customers' }
  | { kind: 'reconcile-suppliers' }
  | { kind: 'reconcile-all' };

interface SettingsGuidanceInput {
  section: string;
  sectionLabel: string;
  setupMode: boolean;
  setupStepTitle?: string | null;
  branchesCount: number;
  locationsCount: number;
  filteredBranchesCount: number;
  filteredLocationsCount: number;
  storeName?: string | null;
  currentUserRole: string;
  snapshotsCount: number;
}

export function getSettingsSectionDescription(section: string) {
  if (section === 'overview') return 'راجع الملخص وافتح القسم الذي تريد تعديله.';
  if (section === 'core') return 'عدّل بيانات النشاط ثم احفظ.';
  if (section === 'reference') return 'نظّم الفروع والمخازن من نفس الصفحة.';
  if (section === 'users') return 'أدر المستخدمين والصلاحيات من مكان واحد.';
  return 'خذ نسخة احتياطية أو استورد البيانات من نفس الشاشة.';
}

export function buildSettingsGuidanceCards(input: SettingsGuidanceInput) {
  const nextAction = input.setupMode
    ? (input.setupStepTitle || 'أكمل خطوة التهيئة الحالية أولًا')
    : input.section === 'overview'
      ? 'راجع الملخص ثم افتح القسم الذي يحتاج تعديلًا الآن.'
      : input.section === 'core'
        ? 'عدّل بيانات النشاط ثم اضغط حفظ قبل الانتقال.'
        : input.section === 'reference'
          ? 'ابحث عن الفرع أو المخزن المطلوب ثم عدّل أو احذف من نفس الجدول.'
          : input.section === 'users'
            ? 'راجع الحسابات والصلاحيات ثم حدّث المستخدم المطلوب.'
            : 'خذ نسخة أولًا، ثم نفّذ الاستيراد أو الاستعادة بعد التأكد.';

  const focusValue = input.section === 'overview'
    ? `${input.branchesCount} فرع / ${input.locationsCount} مخزن`
    : input.section === 'core'
      ? (input.storeName || 'بيانات النشاط الأساسية')
      : input.section === 'reference'
        ? `${input.filteredBranchesCount} فرع ظاهر / ${input.filteredLocationsCount} مخزن ظاهر`
        : input.section === 'users'
          ? (input.currentUserRole === 'super_admin' ? 'إدارة المستخدمين متاحة' : 'هذه الشاشة مخصصة للمشرف العام')
          : `${input.snapshotsCount} نسخة تلقائية متاحة`;

  const cautionValue = input.section === 'backup'
    ? 'الاستعادة تستبدل البيانات الحالية بالكامل.'
    : input.section === 'users'
      ? 'استخدم أقل صلاحية ممكنة لكل حساب.'
      : input.section === 'reference'
        ? 'احرص أن يكون كل مخزن مرتبطًا بفرع واضح.'
        : 'غيّر ما تحتاجه فقط ثم احفظ.';

  return [
    { key: 'section', label: 'القسم الحالي', value: input.sectionLabel },
    { key: 'next', label: 'الخطوة الأنسب الآن', value: nextAction },
    { key: 'focus', label: 'التركيز الحالي', value: focusValue },
    { key: 'caution', label: 'ملاحظة مهمة', value: cautionValue },
  ];
}

export async function downloadSettingsTemplate(kind: 'products' | 'customers' | 'suppliers' | 'opening-stock') {
  if (kind === 'products') {
    downloadExcelFile('products-template.xlsx', ['اسم الصنف (إجباري)', 'الباركود', 'القسم', 'المورد', 'سعر التكلفة', 'سعر البيع', 'سعر الجملة', 'الحد الأدنى', 'الكمية', 'المخزن', 'وحدة القياس الأساسية', 'وحدة البيع', 'وحدة الشراء', 'اسم وحدة إضافية', 'معامل الوحدة الإضافية', 'باركود الوحدة الإضافية', 'ملاحظات'], [['منتج جديد', '123456789012', 'عام', 'مورد تجريبي', 50, 70, 60, 5, 24, 'المخزن الرئيسي', 'قطعة', 'قطعة', 'كرتونة', 'كرتونة', 12, '123456789013', 'ملاحظات']]);
    return;
  }
  if (kind === 'customers') {
    downloadExcelFile('customers-template.xlsx', ['اسم العميل (إجباري)', 'رقم الموبايل', 'العنوان', 'نوع العميل', 'الحد الائتماني', 'رصيد افتتاحي', 'رصيد محفظة', 'اسم الشركة', 'الرقم الضريبي'], [['عميل جديد', '01000000000', 'القاهرة', 'cash', 0, 1500, 0, 'شركة مثال', '300123456700003']]);
    return;
  }
  if (kind === 'suppliers') {
    downloadExcelFile('suppliers-template.xlsx', ['اسم المورد (إجباري)', 'رقم الموبايل', 'العنوان', 'رصيد افتتاحي', 'ملاحظات'], [['مورد جديد', '01011111111', 'الجيزة', 2500, 'ملاحظات']]);
    return;
  }

  if (kind === 'opening-stock') {
    try {
      const { http } = await import('@/lib/http');
      
      let locationsRes: any = { locations: [] };
      let stocksRes: any = { stocks: [] };
      try {
        locationsRes = await http<any>('/api/locations');
        stocksRes = await http<any>('/api/location-stocks');
      } catch (e) {
        console.warn('Could not fetch location stocks for template', e);
      }

      const locationMap = new Map(
        (locationsRes.locations || []).map((loc: any) => [String(loc.id), loc.name || ''])
      );

      const stocksByProduct = new Map<string, any[]>();
      for (const st of stocksRes.stocks || []) {
        const pId = String(st.productId);
        if (!stocksByProduct.has(pId)) stocksByProduct.set(pId, []);
        stocksByProduct.get(pId)!.push(st);
      }

      let page = 1;
      const allRows: any[][] = [];
      while (true) {
        const res = await http<any>(`/api/products?page=${page}&pageSize=1000`);
        const items = res.products || [];
        for (const p of items) {
          const pId = String(p.id);
          const pStocks = stocksByProduct.get(pId);
          
          if (pStocks && pStocks.length > 0) {
            for (const st of pStocks) {
              const locName = locationMap.get(String(st.locationId)) || 'المخزن الرئيسي';
              allRows.push([p.barcode || '', p.name || '', st.qty || 0, locName]);
            }
          } else {
            allRows.push([p.barcode || '', p.name || '', p.stock || 0, 'المخزن الرئيسي']);
          }
        }
        if (items.length < 1000) break;
        page += 1;
      }
      
      if (allRows.length > 0) {
        downloadExcelFile('opening-stock-template.xlsx', ['الباركود', 'اسم الصنف', 'الكمية', 'المخزن'], allRows);
        return;
      }
    } catch (e) {
      console.error('Failed to export existing products for opening stock', e);
    }
    // Fallback if no products or error
    downloadExcelFile('opening-stock-template.xlsx', ['الباركود', 'اسم الصنف', 'الكمية', 'المخزن'], [['123456789012', 'منتج جديد', 24, 'المخزن الرئيسي']]);
  }
}

export function getSettingsConfirmDialogMeta(confirmAction: SettingsConfirmAction | null, busyState: {
  backupBusy: boolean;
  restoreSnapshotBusy: boolean;
  cleanupBusy: boolean;
  reconcileCustomersBusy: boolean;
  reconcileSuppliersBusy: boolean;
  reconcileAllBusy: boolean;
}) {
  const title = confirmAction?.kind === 'restore-file'
    ? 'تأكيد استعادة نسخة احتياطية من ملف'
    : confirmAction?.kind === 'restore-snapshot'
      ? 'تأكيد استعادة نسخة تلقائية'
      : confirmAction?.kind === 'cleanup-expired-sessions'
        ? 'تأكيد تنظيف الجلسات المنتهية'
        : confirmAction?.kind === 'reconcile-customers'
          ? 'تأكيد مطابقة أرصدة العملاء'
          : confirmAction?.kind === 'reconcile-suppliers'
            ? 'تأكيد مطابقة أرصدة الموردين'
            : confirmAction?.kind === 'reconcile-all'
              ? 'تأكيد مطابقة جميع الأرصدة'
              : '';

  const description: ReactNode = confirmAction?.kind === 'restore-file'
    ? <>سيتم استبدال بيانات التشغيل الحالية بمحتوى الملف <strong>{confirmAction.file.name}</strong> بعد التحقق من صلاحيته. استخدم هذه العملية فقط بعد التأكد من أنك تعمل على النسخة الصحيحة.</>
    : confirmAction?.kind === 'restore-snapshot'
      ? <>سيتم استبدال البيانات الحالية بمحتوى النسخة التلقائية <strong>{new Date(confirmAction.snapshot.createdAt).toLocaleString('ar-EG')}</strong>. راجع تاريخ النسخة قبل المتابعة.</>
      : confirmAction?.kind === 'cleanup-expired-sessions'
        ? 'سيتم حذف الجلسات المنتهية لتقليل البيانات غير النشطة وتحسين الأمان.'
        : confirmAction?.kind === 'reconcile-customers'
          ? 'سيتم إعادة احتساب أرصدة العملاء من الحركات الحالية وتحديث القيم المخزنة.'
          : confirmAction?.kind === 'reconcile-suppliers'
            ? 'سيتم إعادة احتساب أرصدة الموردين من الفواتير والمدفوعات الحالية.'
            : confirmAction?.kind === 'reconcile-all'
              ? 'سيتم تنفيذ المطابقة على العملاء والموردين معًا.'
              : '';

  const isBusy = confirmAction?.kind === 'restore-file'
    ? busyState.backupBusy
    : confirmAction?.kind === 'restore-snapshot'
      ? busyState.restoreSnapshotBusy
      : confirmAction?.kind === 'cleanup-expired-sessions'
        ? busyState.cleanupBusy
        : confirmAction?.kind === 'reconcile-customers'
          ? busyState.reconcileCustomersBusy
          : confirmAction?.kind === 'reconcile-suppliers'
            ? busyState.reconcileSuppliersBusy
            : confirmAction?.kind === 'reconcile-all'
              ? busyState.reconcileAllBusy
              : false;

  return { title, description, isBusy };
}
