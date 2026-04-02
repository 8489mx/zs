interface UnsavedChangesNoticeProps {
  active: boolean;
  message?: string;
}

export function UnsavedChangesNotice({ active, message = 'يوجد تغييرات غير محفوظة. احفظ قبل الإغلاق أو التأكد من التفريغ.' }: UnsavedChangesNoticeProps) {
  if (!active) return null;
  return <div className="warning-box" style={{ marginTop: 12 }}>{message}</div>;
}
