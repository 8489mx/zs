import { useTranslation } from 'react-i18next';
import { FormSection } from '@/shared/components/form-section';
import { Button } from '@/shared/ui/button';
import { formatCurrency } from '@/lib/format';
import type { PurchasesListSummary } from '@/features/purchases/api/purchases.api';

interface BaseProps {
  totalItems: number;
  summary: PurchasesListSummary | null | undefined;
  activeFilterLabel: string;
  scopeRows: Array<{ label: string; value: string | number }>;
  topSuppliers: Array<{ name: string; count: number; total: number }>;
  exportTopSuppliersCsv: () => void;
  printTopSuppliers: () => void;
}

export function PurchasesKpiSection(props: Pick<BaseProps, 'totalItems' | 'summary'>) {
  const { t } = useTranslation();
  return (
    <div className="stats-grid compact-grid workspace-stats-grid purchases-kpi-grid">
      <div className="stat-card"><span>{t('purchases.purchases_workspace.purchases_overview_section.s0', "إجمالي الفواتير")}</span><strong>{props.totalItems}</strong></div>
      <div className="stat-card"><span>{t('purchases.purchases_workspace.purchases_overview_section.s1', "معتمدة")}</span><strong>{props.summary?.posted || 0}</strong></div>
      <div className="stat-card"><span>{t('purchases.purchases_workspace.purchases_overview_section.s2', "مسودات/أخرى")}</span><strong>{props.summary?.draft || 0}</strong></div>
      <div className="stat-card"><span>{t('purchases.purchases_workspace.purchases_overview_section.s3', "ملغاة")}</span><strong>{props.summary?.cancelledCount || 0}</strong></div>
      <div className="stat-card"><span>{t('purchases.purchases_workspace.purchases_overview_section.s4', "إجمالي القيمة")}</span><strong>{formatCurrency(props.summary?.totalAmount || 0)}</strong></div>
      <div className="stat-card"><span>{t('purchases.purchases_workspace.purchases_overview_section.s5', "مشتريات آجلة")}</span><strong>{formatCurrency(props.summary?.creditTotal || 0)}</strong></div>
    </div>
  );
}

export function TopSuppliersCard(props: Pick<BaseProps, 'topSuppliers' | 'exportTopSuppliersCsv' | 'printTopSuppliers'>) {
  const { t } = useTranslation();
  return (
    <FormSection
      title={t('purchases.purchases_workspace.purchases_overview_section.s6', "أعلى الموردين")}
      actions={<div className="actions compact-actions"><Button variant="secondary" onClick={props.exportTopSuppliersCsv} disabled={!props.topSuppliers.length}>CSV</Button><Button variant="secondary" onClick={props.printTopSuppliers} disabled={!props.topSuppliers.length}>{t('purchases.purchases_workspace.purchases_overview_section.s7', "طباعة")}</Button></div>}
      className="workspace-panel purchases-insight-card"
    >
      <div className="list-stack compact-list-stack">
        {props.topSuppliers.length ? props.topSuppliers.map((supplier) => (
          <div className="list-row" key={supplier.name}><div><strong>{supplier.name}</strong><div className="muted small">{supplier.count} {t('purchases.purchases_workspace.purchases_overview_section.s8', "فاتورة")}</div></div><strong>{formatCurrency(supplier.total)}</strong></div>
        )) : <div className="muted">{t('purchases.purchases_workspace.purchases_overview_section.s9', "لا توجد نتائج كافية.")}</div>}
      </div>
    </FormSection>
  );
}
