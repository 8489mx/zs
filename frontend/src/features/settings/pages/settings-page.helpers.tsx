import type { ReactNode } from 'react';
import { downloadCsvFile } from '@/lib/browser';
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
  if (section === 'core') return 'عدّل بيانات المتجر ثم احفظ.';
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
        ? 'عدّل بيانات المتجر ثم اضغط حفظ قبل الانتقال.'
        : input.section === 'reference'
          ? 'ابحث عن الفرع أو المخزن المطلوب ثم عدّل أو احذف من نفس الجدول.'
          : input.section === 'users'
            ? 'راجع الحسابات والصلاحيات ثم حدّث المستخدم المطلوب.'
            : 'خذ نسخة أولًا، ثم نفّذ الاستيراد أو الاستعادة بعد التأكد.';

  const focusValue = input.section === 'overview'
    ? `${input.branchesCount} فرع / ${input.locationsCount} مخزن`
    : input.section === 'core'
      ? (input.storeName || 'بيانات المتجر الأساسية')
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

export function downloadSettingsTemplate(kind: 'products' | 'customers' | 'suppliers' | 'opening-stock') {
  if (kind === 'products') {
    downloadCsvFile('products-template.csv', ['name', 'barcode', 'category', 'supplier', 'costPrice', 'retailPrice', 'wholesalePrice', 'minStock', 'baseUnit', 'saleUnit', 'purchaseUnit', 'extraUnitName', 'extraUnitMultiplier', 'extraUnitBarcode', 'notes'], [['منتج جديد', '123456789012', 'عام', 'مورد تجريبي', 50, 70, 60, 5, 'قطعة', 'قطعة', 'كرتونة', 'كرتونة', 12, '123456789013', 'ملاحظات']]);
    return;
  }
  if (kind === 'customers') {
    downloadCsvFile('customers-template.csv', ['name', 'phone', 'address', 'type', 'creditLimit', 'openingBalance', 'storeCreditBalance', 'companyName', 'taxNumber'], [['عميل جديد', '01000000000', 'القاهرة', 'cash', 0, 1500, 0, 'شركة مثال', '300123456700003']]);
    return;
  }
  if (kind === 'suppliers') {
    downloadCsvFile('suppliers-template.csv', ['name', 'phone', 'address', 'openingBalance', 'notes'], [['مورد جديد', '01011111111', 'الجيزة', 2500, 'ملاحظات']]);
    return;
  }
  downloadCsvFile('opening-stock-template.csv', ['barcode', 'name', 'qty', 'note'], [['123456789012', 'منتج جديد', 24, 'رصيد افتتاحي']]);
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
