/**
 * كشف بيئة التشغيل — بدائية لا تعتمد على شيء.
 *
 * كانت `isDesktopOfflineApp` تسكن في `@/app/router/access`، فكان أي مكوّن ميزة
 * يحتاجها يخترق طبقة الـapp ويكسر حارس `frontend-import-layers`. وهي ليست منطق
 * توجيه ولا صلاحيات: مجرد سؤال «هل نحن داخل الديسكتوب؟». فمحلها الطبقة المشتركة،
 * و`access.ts` يعيد تصديرها حتى تبقى كل الاستيرادات القائمة تعمل.
 */
export function isDesktopOfflineApp(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean(
    (window as any).electronRuntime ||
    (window as any).electronAPI ||
    (window as any).process?.versions?.electron ||
    (window.navigator?.userAgent && window.navigator.userAgent.toLowerCase().includes('electron')) ||
    import.meta.env.MODE === 'electron' ||
    import.meta.env.MODE === 'portable'
  );
}
