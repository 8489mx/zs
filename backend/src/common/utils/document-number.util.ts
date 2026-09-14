/**
 * Universal Document & Voucher Numbering Standard (دستور الترقيم الموحد للوثائق والأذونات)
 * Constitutional Standard: All document/voucher numbers must strictly embed the 6-digit YYMMDD date.
 * Example: JOB-260914-0001, RFQ-260914-0001, MR-260914-0001, CSH-260914-0001
 */

export function getDailyDocumentPrefix(prefix: string, date: Date = new Date()): string {
  const cleanPrefix = prefix.trim().toUpperCase();
  const yy = String(date.getFullYear()).slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${cleanPrefix}-${yy}${mm}${dd}-`;
}

export function formatDailyDocumentNumber(
  prefix: string,
  sequence: number,
  date: Date = new Date(),
  padding = 4,
): string {
  const dailyPrefix = getDailyDocumentPrefix(prefix, date);
  const seq = String(sequence).padStart(padding, '0');
  return `${dailyPrefix}${seq}`;
}
