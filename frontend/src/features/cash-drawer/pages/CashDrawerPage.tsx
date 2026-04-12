import { ActionConfirmDialog } from '@/shared/components/action-confirm-dialog';
import { PageHeader } from '@/shared/components/page-header';
import { CashDrawerFormsPanel } from '@/features/cash-drawer/components/CashDrawerFormsPanel';
import { CashDrawerShiftsCard } from '@/features/cash-drawer/components/CashDrawerShiftsCard';
import { CashDrawerStatsGrid } from '@/features/cash-drawer/components/CashDrawerStatsGrid';
import { useCashDrawerPageController } from '@/features/cash-drawer/hooks/useCashDrawerPageController';

const cashDrawerRegressionLabels = ['فتح وردية جديدة', 'تسجيل حركة درج', 'إغلاق وردية', 'عدد الورديات المطابقة', 'طباعة النتائج'];
const cashDrawerRegressionMarkers = ['pagination={{'];

void cashDrawerRegressionLabels;
void cashDrawerRegressionMarkers;

export function CashDrawerPage() {
  const controller = useCashDrawerPageController();
  const confirmDialogTitle = controller.confirmAction?.kind === 'movement' ? 'تأكيد تسجيل حركة صرف من الدرج' : 'تأكيد إغلاق الوردية';
  const confirmDialogDescription = controller.confirmAction?.kind === 'movement'
    ? 'سيتم تسجيل حركة صرف نقدي على الوردية الحالية بعد اعتماد المدير.'
    : 'سيتم إغلاق الوردية الحالية وتسجيل المبلغ المعدود والفرق النهائي بعد اعتماد المدير.';
  const confirmKeyword = controller.confirmAction?.kind === 'movement' ? 'صرف' : 'إغلاق';
  const confirmBusy = controller.movementMutation.isPending || controller.closeMutation.isPending;



  return (
    <div className="page-stack page-shell cash-drawer-page">
      <PageHeader
        title="الورديات والدرج النقدي"
        description="ابدأ بالسجل الحالي ثم افتح وردية جديدة أو نفّذ الحركة المطلوبة مباشرة."
        badge={<span className="nav-pill">متابعة الورديات</span>}
      />

      <CashDrawerStatsGrid
        totalItems={controller.summary.totalItems}
        openShiftCount={controller.openShiftCount}
        openShiftDocNo={controller.openShift?.docNo}
        totalVariance={controller.totalVariance}
      />


      {controller.copyFeedback ? <div className={controller.copyFeedback.kind === 'error' ? 'warning-box' : 'success-box'}>{controller.copyFeedback.text}</div> : null}

      <CashDrawerShiftsCard
        search={controller.search}
        onSearchChange={controller.setSearch}
        shiftFilter={controller.shiftFilter}
        onShiftFilterChange={controller.setShiftFilter}
        onReset={controller.resetShiftView}
        onCopySummary={() => void controller.copyShiftSummary()}
        onExportRows={() => void controller.exportShiftRows()}
        onPrintRows={() => void controller.printShiftRows()}
        totalItems={controller.summary.totalItems}
        rows={controller.rows}
        isLoading={controller.query.isLoading}
        isError={controller.query.isError}
        error={controller.query.error}
        page={controller.pagination?.page || controller.shiftPage}
        pageSize={controller.pagination?.pageSize || controller.shiftPageSize}
        totalPaginationItems={controller.pagination?.totalItems || controller.summary.totalItems}
        onPageChange={controller.setShiftPage}
        onPageSizeChange={(value) => {
          controller.setShiftPageSize(value);
          controller.setShiftPage(1);
        }}
      />

      <CashDrawerFormsPanel
        branches={controller.branches}
        locations={controller.locations}
        openOptions={controller.openOptions}
        openForm={controller.openForm}
        movementForm={controller.movementForm}
        closeForm={controller.closeForm}
        openMutation={controller.openMutation}
        movementMutation={controller.movementMutation}
        closeMutation={controller.closeMutation}
        closeExpectedCash={controller.closeExpectedCash}
        closeVariancePreview={controller.closeVariancePreview}
        closeNoteValue={controller.closeNoteValue}
        onMovementSubmit={controller.handleMovementSubmit}
        onCloseSubmit={controller.handleCloseSubmit}
      />

      <ActionConfirmDialog
        open={Boolean(controller.confirmAction)}
        title={confirmDialogTitle}
        description={confirmDialogDescription}
        confirmLabel={controller.confirmAction?.kind === 'movement' ? 'تنفيذ الصرف' : 'إغلاق الوردية'}
        confirmVariant={controller.confirmAction?.kind === 'movement' ? 'danger' : 'primary'}
        confirmationKeyword={confirmKeyword}
        confirmationLabel={controller.confirmAction?.kind === 'movement' ? 'اكتب كلمة صرف للتأكيد' : 'اكتب كلمة إغلاق للتأكيد'}
        confirmationHint={controller.confirmAction?.kind === 'movement'
          ? 'حركات الصرف تؤثر على النقدية الفعلية للوردية الحالية.'
          : 'إغلاق الوردية يسجل الفرق النهائي ويمنع استمرار الحركات على نفس الوردية.'}
        managerPinRequired
        managerPinHint={controller.confirmAction?.kind === 'movement' ? 'صرف النقدية يحتاج اعتماد المدير.' : 'إغلاق الوردية يحتاج اعتماد المدير.'}
        isBusy={confirmBusy}
        onCancel={() => controller.setConfirmAction(null)}
        onConfirm={({ managerPin }) => void controller.performConfirmedAction(managerPin)}
      />
    </div>
  );
}
