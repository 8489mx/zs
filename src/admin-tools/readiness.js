const { config, getDb } = require('./shared');

function createReadinessTools({ buildDiagnostics, buildMaintenanceReport }) {
  function buildLaunchReadiness() {
    const diagnostics = buildDiagnostics();
    const maintenance = buildMaintenanceReport();
    const blockers = [];
    const warnings = [];
    const strengths = [];
    const nextActions = [];
    let score = 100;

    if (diagnostics.security.legacyStateWriteEnabled) {
      blockers.push('Legacy state write ما زال مفعّلًا. يفضّل إغلاقه قبل الإطلاق النهائي.');
      score -= 18;
    } else {
      strengths.push('الكتابة عبر legacy state مغلقة.');
    }

    if (!diagnostics.security.sameOriginProtection) {
      blockers.push('Same-origin protection غير مفعّل لطلبات الكتابة.');
      score -= 14;
    } else {
      strengths.push('حماية same-origin مفعلة على عمليات الكتابة.');
    }

    if (maintenance.summary.customerLedgerMismatches > 0) {
      blockers.push(`يوجد ${maintenance.summary.customerLedgerMismatches} حالة اختلاف بين رصيد العملاء والدفتر.`);
      score -= Math.min(18, maintenance.summary.customerLedgerMismatches * 3);
    } else {
      strengths.push('أرصدة العملاء متسقة مع دفتر الحركة.');
    }

    if (maintenance.summary.supplierLedgerMismatches > 0) {
      blockers.push(`يوجد ${maintenance.summary.supplierLedgerMismatches} حالة اختلاف بين رصيد الموردين والدفتر.`);
      score -= Math.min(18, maintenance.summary.supplierLedgerMismatches * 3);
    } else {
      strengths.push('أرصدة الموردين متسقة مع دفتر الحركة.');
    }

    if (maintenance.summary.negativeStockProducts > 0) {
      blockers.push(`يوجد ${maintenance.summary.negativeStockProducts} صنف برصيد سالب.`);
      score -= Math.min(12, maintenance.summary.negativeStockProducts * 2);
    } else {
      strengths.push('لا توجد أصناف برصيد سالب.');
    }

    if (maintenance.summary.orphanSaleItems > 0 || maintenance.summary.orphanPurchaseItems > 0) {
      blockers.push('هناك عناصر بيع أو شراء orphan تحتاج تنظيفًا قبل الإطلاق.');
      score -= 10;
    } else {
      strengths.push('لا توجد عناصر يتيمة في فواتير البيع أو الشراء.');
    }

    if (maintenance.summary.expiredSessions > 0) {
      warnings.push(`يوجد ${maintenance.summary.expiredSessions} جلسة منتهية يمكن تنظيفها.`);
      score -= Math.min(6, maintenance.summary.expiredSessions > 20 ? 6 : 3);
    } else {
      strengths.push('لا توجد جلسات منتهية متراكمة.');
    }

    if (diagnostics.counts.activeUsers < 1) {
      blockers.push('لا يوجد أي مستخدم نشط داخل النظام.');
      score -= 20;
    }
    if (diagnostics.counts.activeProducts < 1) {
      warnings.push('لا توجد أصناف نشطة مسجلة بعد.');
      score -= 4;
    }
    if (diagnostics.counts.customers < 1) warnings.push('لم يتم تسجيل عملاء بعد.');
    if (diagnostics.counts.suppliers < 1) warnings.push('لم يتم تسجيل موردين بعد.');

    if (diagnostics.finance.treasuryNet < 0) {
      warnings.push('صافي الخزينة بالسالب. راجع قيود الخزينة قبل الإطلاق.');
      score -= 5;
    } else {
      strengths.push('صافي الخزينة غير سالب.');
    }

    if (diagnostics.counts.auditLogs > 0) {
      strengths.push('سجل التدقيق يعمل ويوجد نشاط مسجل.');
    } else {
      warnings.push('لا توجد Audit logs كافية بعد.');
      score -= 3;
    }

    if (blockers.length) nextActions.push('عالج جميع الـ blockers قبل إعلان النسخة Launch Candidate.');
    if (maintenance.summary.expiredSessions > 0) nextActions.push('نفذ cleanup للجلسات المنتهية من شاشة الإدارة أو الـ API.');
    if (diagnostics.security.legacyStateWriteEnabled) nextActions.push('اضبط ALLOW_LEGACY_STATE_WRITE=false في بيئة الإنتاج بعد مراجعة التوافق.');
    if (!diagnostics.security.sameOriginProtection) nextActions.push('فعّل ENFORCE_SAME_ORIGIN_WRITES=true وحدد ALLOWED_ORIGINS بدقة.');
    if (diagnostics.finance.treasuryNet < 0) nextActions.push('راجع حركات الخزينة والمصروفات قبل الإطلاق.');
    if (!nextActions.length) nextActions.push('النسخة الحالية قريبة جدًا من الإطلاق. نفّذ اختبار smoke + integration ثم ابدأ staging.');

    score = Math.max(0, Math.min(100, Math.round(score)));
    let status = 'launch_candidate';
    if (blockers.length) status = 'needs_attention';
    else if (warnings.length) status = 'almost_ready';

    return {
      ok: blockers.length === 0,
      generatedAt: new Date().toISOString(),
      score,
      status,
      blockers,
      warnings,
      strengths,
      nextActions,
      diagnosticsSummary: diagnostics.counts,
      maintenanceSummary: maintenance.summary
    };
  }


  function buildUatReadiness() {
    const launch = buildLaunchReadiness();
    const maintenanceSummary = launch.maintenanceSummary || {};
    const scenarios = [
      { key: 'auth_login', label: 'تسجيل الدخول والخروج', status: launch.score >= 70 ? 'ready' : 'review', note: 'اختبر الدخول والخروج وتبديل الجلسات.' },
      { key: 'sales_flow', label: 'دورة البيع كاملة', status: Number(maintenanceSummary.negativeStockProducts || 0) === 0 ? 'ready' : 'review', note: 'بيع نقدي وآجل وتعديل وإلغاء ومرتجع.' },
      { key: 'purchase_flow', label: 'دورة الشراء كاملة', status: Number(maintenanceSummary.orphanPurchaseItems || 0) === 0 ? 'ready' : 'review', note: 'شراء نقدي وآجل وتعديل وإلغاء ومرتجع.' },
      { key: 'ledger_consistency', label: 'مطابقة الدفاتر', status: (Number(maintenanceSummary.customerLedgerMismatches || 0) + Number(maintenanceSummary.supplierLedgerMismatches || 0)) === 0 ? 'ready' : 'blocked', note: 'راجع كشف العميل والمورد بعد كل حركة.' },
      { key: 'backup_restore', label: 'نسخ احتياطي واسترجاع', status: 'review', note: 'نفذ verify ثم restore على نسخة staging قبل الإطلاق.' },
      { key: 'reports_exports', label: 'التقارير والتصدير', status: 'ready', note: 'راجع CSV والتقارير الرئيسية وLaunch Readiness.' }
    ];
    const blocked = scenarios.filter((item) => item.status === 'blocked').length;
    const review = scenarios.filter((item) => item.status === 'review').length;
    const ready = scenarios.filter((item) => item.status === 'ready').length;
    const score = Math.max(0, Math.min(100, Math.round((ready / scenarios.length) * 100)));
    return {
      ok: blocked === 0,
      generatedAt: new Date().toISOString(),
      score,
      status: blocked ? 'blocked' : (review ? 'in_progress' : 'ready'),
      summary: { ready, review, blocked, total: scenarios.length },
      scenarios,
      recommendation: blocked
        ? 'عالج العناصر المحظورة أولًا ثم أعد تنفيذ UAT.'
        : (review ? 'نفذ سيناريوهات UAT المعلّمة للمراجعة ثم وقّع على نسخة الإطلاق.' : 'حزمة UAT مكتملة تقريبًا. النسخة جاهزة لتوقيع الإطلاق بعد مراجعة نهائية قصيرة.')
    };
  }


  function buildOperationalReadiness() {
    const diagnostics = buildDiagnostics();
    const maintenance = buildMaintenanceReport();
    const launch = buildLaunchReadiness();
    const snapshotCount = Number((getDb().prepare("SELECT COUNT(*) AS c FROM backup_snapshots").get() || {}).c || 0);
    const warnings = [];
    if (diagnostics.database.sizeMb > 250) warnings.push('قاعدة البيانات تجاوزت 250MB. راقب زمن النسخ الاحتياطي والاستعادة.');
    if (maintenance.summary.expiredSessions > 0) warnings.push('هناك جلسات منتهية تحتاج تنظيفًا دوريًا.');
    if (snapshotCount < 1) warnings.push('لا توجد لقطات نسخ احتياطي محفوظة بعد.');
    if (!diagnostics.security.requestLogging) warnings.push('REQUEST_LOGGING مغلق. هذا يضعف قابلية الدعم والتحقيق.');
    return {
      ok: launch.ok && warnings.length === 0,
      generatedAt: new Date().toISOString(),
      uptimeSeconds: Math.round(process.uptime()),
      logging: {
        enabled: diagnostics.security.requestLogging,
        level: config.logLevel,
        format: config.logFormat
      },
      database: diagnostics.database,
      backupSnapshots: snapshotCount,
      maintenanceSummary: maintenance.summary,
      launchSummary: {
        score: launch.score,
        status: launch.status
      },
      warnings
    };
  }

  function buildSupportSnapshot() {
    const diagnostics = buildDiagnostics();
    const maintenance = buildMaintenanceReport();
    const launchReadiness = buildLaunchReadiness();
    const uatReadiness = buildUatReadiness();
    const recentAudit = getDb().prepare(`
      SELECT a.id, a.action, a.details, a.created_at, u.username AS created_by_username
      FROM audit_logs a
      LEFT JOIN users u ON u.id = a.created_by
      ORDER BY a.id DESC LIMIT 20
    `).all();
    const activeSessions = getDb().prepare(`
      SELECT s.id, s.created_at, s.expires_at, s.last_seen_at, u.username
      FROM sessions s JOIN users u ON u.id = s.user_id
      ORDER BY s.created_at DESC LIMIT 20
    `).all();
    return {
      generatedAt: new Date().toISOString(),
      diagnostics,
      maintenance,
      launchReadiness,
      uatReadiness,
      recentAudit,
      activeSessions
    };
  }

  return {
    buildLaunchReadiness,
    buildUatReadiness,
    buildOperationalReadiness,
    buildSupportSnapshot,
  };
}

module.exports = { createReadinessTools };
