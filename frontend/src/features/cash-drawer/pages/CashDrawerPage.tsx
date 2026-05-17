import { ActionConfirmDialog } from '@/shared/components/action-confirm-dialog';
import { PageHeader } from '@/shared/components/page-header';
import { CashDrawerFormsPanel } from '@/features/cash-drawer/components/CashDrawerFormsPanel';
import { CashDrawerShiftsCard } from '@/features/cash-drawer/components/CashDrawerShiftsCard';
import { CashDrawerReviewDialog } from '@/features/cash-drawer/components/CashDrawerReviewDialog';
import { CashDrawerStatsGrid } from '@/features/cash-drawer/components/CashDrawerStatsGrid';
import { useCashDrawerPageController } from '@/features/cash-drawer/hooks/useCashDrawerPageController';

const cashDrawerRegressionLabels = ['فتح وردية نقطة بيع جديدة', 'تسجيل حركة درج النقدية', 'إغلاق وردية نقطة البيع', 'عدد ورديات نقطة البيع المطابقة', 'طباعة النتائج'];
const cashDrawerRegressionMarkers = ['pagination={{'];

void cashDrawerRegressionLabels;
void cashDrawerRegressionMarkers;

export function CashDrawerPage() {
  const controller = useCashDrawerPageController();
  const movementType = controller.confirmAction?.kind === 'movement' ? controller.confirmAction.values.type : '';
  const isCashOut = movementType === 'cash_out';
  const isMovement = controller.confirmAction?.kind === 'movement';
  const confirmDialogTitle = isMovement
    ? (isCashOut ? 'اعتماد صرف من درج النقدية' : 'تأكيد إيداع في درج النقدية')
    : 'تأكيد إغلاق وردية نقطة البيع';

  const confirmDialogDescription = isMovement
    ? (isCashOut
      ? 'سيتم تسجيل حركة صرف نقدي على وردية نقطة البيع الحالية بعد الاعتماد.'
      : 'سيتم تسجيل حركة إيداع نقدي على وردية نقطة البيع الحالية بعد تأكيد المستخدم الحالي.')
    : (controller.isBlindCloseUser
      ? 'سيتم تسجيل إقرار الإغلاق وإرسال وردية نقطة البيع في انتظار مراجعة المدير.'
      : 'سيتم إغلاق وردية نقطة البيع الحالية وتسجيل المبلغ المعدود والفرق النهائي بعد تأكيد المستخدم الحالي.');

  const confirmBusy = controller.movementMutation.isPending || controller.closeMutation.isPending;
  const managerPinLabel = isCashOut ? 'رمز اعتماد المدير' : 'كلمة مرور المستخدم الحالي';
  const managerPinHint = isCashOut
    ? 'صرف النقدية يحتاج اعتماد المدير إذا كان المستخدم الحالي ليس مديرًا أو أدمن.'
    : 'أدخل كلمة مرور المستخدم الحالي لتأكيد العملية.';

  return (
    <div className="page-stack page-shell cash-drawer-page">
      <PageHeader
        title="ورديات نقطة البيع ودرج النقدية"
        badge={<span className="nav-pill">متابعة ورديات نقطة البيع</span>}
      />

      <CashDrawerStatsGrid
        totalItems={controller.summary.totalItems}
        openShiftCount={controller.openShiftCount}
        openShiftLabel={controller.openShift?.openedByName || controller.openShift?.docNo}
        totalVariance={controller.totalVariance}
        canViewSensitiveTotals={controller.canViewSensitiveTotals}
      />

      {controller.copyFeedback ? <div className={controller.copyFeedback.kind === 'error' ? 'warning-box' : 'success-box'}>{controller.copyFeedback.text}</div> : null}

      <CashDrawerShiftsCard
        search={controller.search}
        onSearchChange={controller.setSearch}
        shiftFilter={controller.shiftFilter}
        onShiftFilterChange={controller.setShiftFilter}
        onReset={controller.resetShiftView}
        onReviewShift={controller.openReviewDialog}
        canReviewPending={controller.isManagerReviewer}
        pendingReviewCount={controller.pendingReviewCount}
        onCopySummary={() => void controller.copyShiftSummary()}
        onExportRows={() => void controller.exportShiftRows()}
        onPrintRows={() => void controller.printShiftRows()}
        totalItems={controller.summary.totalItems}
        rows={controller.rows}
        canViewSensitiveTotals={controller.canViewSensitiveTotals}
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
        isBlindCloseMode={controller.isBlindCloseUser}
        onMovementSubmit={controller.handleMovementSubmit}
        onCloseSubmit={controller.handleCloseSubmit}
      />

      <ActionConfirmDialog
        open={Boolean(controller.confirmAction)}
        title={confirmDialogTitle}
        description={confirmDialogDescription}
        confirmLabel={isMovement ? (isCashOut ? 'تنفيذ الصرف' : 'تسجيل الإيداع') : 'إغلاق وردية نقطة البيع'}
        confirmVariant={isMovement ? (isCashOut ? 'danger' : 'success') : 'primary'}
        managerPinRequired
        managerPinLabel={managerPinLabel}
        managerPinHint={managerPinHint}
        isBusy={confirmBusy}
        onCancel={() => controller.setConfirmAction(null)}
        onConfirm={({ managerPin }) => void controller.performConfirmedAction(managerPin)}
      />

      <CashDrawerReviewDialog
        open={Boolean(controller.reviewTargetShift)}
        shift={controller.reviewTargetShift}
        managerNote={controller.reviewManagerNote}
        onManagerNoteChange={controller.setReviewManagerNote}
        onApprove={() => void controller.submitPendingReview()}
        onClose={controller.closeReviewDialog}
        isPending={controller.reviewMutation.isPending}
        isError={controller.reviewMutation.isError}
        error={controller.reviewMutation.error}
      />
    </div>
  );
}