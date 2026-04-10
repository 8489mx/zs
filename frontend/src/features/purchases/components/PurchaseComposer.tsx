import { Card } from '@/shared/ui/card';
import { Field } from '@/shared/ui/field';
import { Button } from '@/shared/ui/button';
import { MutationFeedback } from '@/shared/components/mutation-feedback';
import { QueryFeedback } from '@/shared/components/query-feedback';
import { SubmitButton } from '@/shared/components/submit-button';
import { DraftStateNotice } from '@/shared/components/draft-state-notice';
import type { Product, Supplier, Branch, Location, AppSettings } from '@/types/domain';
import { SINGLE_STORE_MODE } from '@/config/product-scope';
import { usePurchaseComposerController } from '@/features/purchases/components/purchase-composer/usePurchaseComposerController';
import { PurchaseLineComposer } from '@/features/purchases/components/purchase-composer/PurchaseLineComposer';
import { PurchaseItemsList } from '@/features/purchases/components/purchase-composer/PurchaseItemsList';
import { PurchaseTotals } from '@/features/purchases/components/purchase-composer/PurchaseTotals';

interface PurchaseComposerProps {
  products: Product[];
  suppliers: Supplier[];
  branches: Branch[];
  locations: Location[];
  settings?: AppSettings;
  isCatalogLoading: boolean;
  isCatalogError: boolean;
  catalogError?: unknown;
}

export function PurchaseComposer({ products, suppliers, branches, locations, settings, isCatalogLoading, isCatalogError, catalogError }: PurchaseComposerProps) {
  const controller = usePurchaseComposerController({ products, branches, locations, settings });
  const { headerForm, items, lineDraft, mutation, hasDraftChanges, totals, actions } = controller;

  return (
    <Card title="إنشاء فاتورة شراء" actions={<span className="nav-pill">إنشاء مباشر</span>}>
      <QueryFeedback
        isLoading={isCatalogLoading}
        isError={isCatalogError}
        error={catalogError}
        loadingText="جاري تجهيز بيانات الموردين والأصناف..."
        errorTitle="تعذر تحميل بيانات تكوين فاتورة الشراء"
        isEmpty={!products.length || !suppliers.length}
        emptyTitle="لا يمكن إنشاء فاتورة شراء الآن"
        emptyHint="تأكد من وجود مورد واحد وصنف واحد على الأقل قبل إنشاء الفاتورة."
      >
        <form className="form-grid" onSubmit={headerForm.handleSubmit((values) => mutation.mutate({ values, items, taxRate: totals.taxRate, pricesIncludeTax: totals.pricesIncludeTax }))}>
          <DraftStateNotice visible={hasDraftChanges && !mutation.isPending} title="فاتورة الشراء الحالية تحتوي على مسودة غير محفوظة" hint="احفظ الفاتورة أو أعد ضبطها قبل مغادرة الصفحة حتى لا تفقد البنود أو بيانات التوريد." />
          <Field label="المورد" error={headerForm.formState.errors.supplierId?.message}>
            <select {...headerForm.register('supplierId')} disabled={mutation.isPending}>
              <option value="">اختر المورد</option>
              {suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
            </select>
          </Field>
          <Field label="نوع السداد">
            <select {...headerForm.register('paymentType')} disabled={mutation.isPending}>
              <option value="cash">نقدي</option>
              <option value="credit">آجل</option>
            </select>
          </Field>
          {SINGLE_STORE_MODE ? (
            <Field label="المخزن المستلم">
              <input value={locations[0]?.name || 'سيتم الربط تلقائيًا بالمخزن الأساسي'} disabled readOnly />
            </Field>
          ) : (
            <>
              <Field label="الفرع">
                <select {...headerForm.register('branchId')} disabled={mutation.isPending}>
                  <option value="">الفرع الافتراضي</option>
                  {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
                </select>
              </Field>
              <Field label="الموقع">
                <select {...headerForm.register('locationId')} disabled={mutation.isPending}>
                  <option value="">الموقع الافتراضي</option>
                  {locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
                </select>
              </Field>
            </>
          )}
          <Field label="خصم الفاتورة" error={headerForm.formState.errors.discount?.message}><input type="number" step="0.01" {...headerForm.register('discount')} disabled={mutation.isPending} /></Field>
          <Field label="ملاحظات"><textarea rows={3} {...headerForm.register('note')} disabled={mutation.isPending} /></Field>

          <div className="divider" style={{ gridColumn: '1 / -1' }} />

          <PurchaseLineComposer
            products={products}
            lineProductId={lineDraft.lineProductId}
            lineQty={lineDraft.lineQty}
            lineCost={lineDraft.lineCost}
            lineError={lineDraft.lineError}
            isPending={mutation.isPending}
            onProductChange={actions.handleProductChange}
            onQtyChange={actions.setLineQty}
            onCostChange={actions.setLineCost}
            onAddItem={actions.handleAddItem}
          />
          <PurchaseItemsList items={items} isPending={mutation.isPending} onRemoveItem={actions.handleRemoveItem} />
          <PurchaseTotals subTotal={totals.subTotal} discount={totals.discount} taxAmount={totals.taxAmount} total={totals.total} />

          <MutationFeedback
            isError={mutation.isError}
            isSuccess={mutation.isSuccess}
            error={mutation.error}
            errorFallback="تعذر حفظ فاتورة الشراء. راجع السطور والبيانات ثم أعد المحاولة."
            successText="تم حفظ فاتورة الشراء وتحديث المخزون بنجاح."
          />
          <div className="actions sticky-form-actions" style={{ gridColumn: '1 / -1' }}>
            <SubmitButton type="submit" variant="success" disabled={mutation.isPending} idleText="حفظ فاتورة الشراء" pendingText="جارٍ حفظ الفاتورة..." />
            <Button type="button" variant="secondary" disabled={mutation.isPending} onClick={() => actions.handleReset()}>إعادة ضبط</Button>
          </div>
        </form>
      </QueryFeedback>
    </Card>
  );
}
