import { useCallback, useState } from 'react';
import { auditApi } from '@/features/audit/api/audit.api';
import { formatDate } from '@/lib/format';
import { downloadExcelFile, escapeHtml, printHtmlDocument } from '@/lib/browser';
import type { AuditLog } from '@/types/domain';

import { getAuditActionLabel, normalizeAuditDetailText, normalizeAuditUserDisplay } from '@/features/audit/lib/audit-activity-presenter';
import { formatAuditDetails } from '@/features/audit/lib/audit-details-format';

interface Params {
  search: string;
  mode: 'all' | 'today' | 'withDetails';
  userId?: string;
  totalRows: number;
  summary: { distinctUsers: number; todayCount: number };
  rangeStart: number;
  rangeEnd: number;
}

export function useAuditPageActions({ search, mode, userId = '', totalRows, summary, rangeStart, rangeEnd }: Params) {
  const [copyFeedback, setCopyFeedback] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const copyAuditSummary = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return;
    const lines = [
      'ملخص سجل النشاط',
      `إجمالي السجلات المطابقة: ${totalRows}`,
      `عدد المنفذين: ${summary.distinctUsers}`,
      `سجلات اليوم: ${summary.todayCount}`,
      `النطاق المعروض الآن: ${rangeStart}-${rangeEnd}`,
    ];
    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setCopyFeedback({ kind: 'success', text: 'تم نسخ ملخص سجل النشاط.' });
    } catch {
      setCopyFeedback({ kind: 'error', text: 'تعذر نسخ ملخص سجل النشاط.' });
    }
  }, [rangeEnd, rangeStart, summary.distinctUsers, summary.todayCount, totalRows]);

  const exportAuditRows = useCallback(async () => {
    if (!totalRows) return;
    setIsExporting(true);
    try {
      const payload = await auditApi.listAll({ search, mode, userId });
      downloadExcelFile(
        'audit-log-results.csv',
        ['النشاط', 'التفاصيل', 'المنفذ', 'التاريخ'],
        payload.rows.map((row: AuditLog) => [
          getAuditActionLabel(row.action || ''),
          normalizeAuditDetailText(formatAuditDetails(row)),
          normalizeAuditUserDisplay(row),
          row.createdAt || row.created_at || '',
        ])
      );
      setCopyFeedback({ kind: 'success', text: 'تم تجهيز تصدير كامل للسجلات المطابقة.' });
    } catch {
      setCopyFeedback({ kind: 'error', text: 'تعذر تصدير السجلات المطابقة.' });
    } finally {
      setIsExporting(false);
    }
  }, [mode, search, totalRows, userId]);

  const printAuditRows = useCallback(async () => {
    if (!totalRows) return;
    setIsExporting(true);
    try {
      const payload = await auditApi.listAll({ search, mode, userId });
      printHtmlDocument(
        'سجل النشاط',
        `
        <h1>سجل النشاط</h1>
        <div class="meta">إجمالي السجلات المطابقة: ${payload.rows.length} · عدد المنفذين: ${summary.distinctUsers} · سجلات اليوم: ${summary.todayCount}</div>
        <table>
          <thead><tr><th>النشاط</th><th>التفاصيل</th><th>المنفذ</th><th>التاريخ</th></tr></thead>
          <tbody>${payload.rows
            .map(
              (row) =>
                `<tr><td>${escapeHtml(getAuditActionLabel(row.action || '—'))}</td><td>${escapeHtml(
                  normalizeAuditDetailText(formatAuditDetails(row))
                )}</td><td>${escapeHtml(normalizeAuditUserDisplay(row))}</td><td>${escapeHtml(
                  formatDate(row.createdAt || row.created_at || '')
                )}</td></tr>`
            )
            .join('')}</tbody>
        </table>
      `
      );
    } catch {
      setCopyFeedback({ kind: 'error', text: 'تعذر طباعة السجلات المطابقة.' });
    } finally {
      setIsExporting(false);
    }
  }, [mode, search, summary.distinctUsers, summary.todayCount, totalRows, userId]);

  return { copyFeedback, isExporting, copyAuditSummary, exportAuditRows, printAuditRows };
}
