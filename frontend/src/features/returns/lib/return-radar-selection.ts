import type { ReturnRecord } from '@/types/domain';

/** Radar rows are not necessarily present in the current 20-row register page. */
export function findReturnInRegisterOrRadar(
  selectedId: string, registerPage: ReturnRecord[], radarRows: ReturnRecord[],
): ReturnRecord | null {
  if (!selectedId) return null;
  return registerPage.find((row) => String(row.id) === selectedId)
    || radarRows.find((row) => String(row.id) === selectedId)
    || null;
}
