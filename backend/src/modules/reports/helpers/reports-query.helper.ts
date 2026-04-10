import { ReportRangeQueryDto } from '../dto/report-query.dto';
import { getPagination, parseRange } from './reports-range.helper';

export type ReportListState = {
  range?: { from: string; to: string };
  fromDate?: Date;
  toDate?: Date;
  search: string;
  searchPattern?: string;
  filter: string;
  page: number;
  pageSize: number;
  offset: number;
};

export function buildReportListState(
  query: ReportRangeQueryDto,
  defaultPageSize: number,
  options?: {
    includeRange?: boolean;
    defaultFilter?: string;
  },
): ReportListState {
  const includeRange = options?.includeRange !== false;
  const defaultFilter = String(options?.defaultFilter || 'all').toLowerCase();
  const { page, pageSize } = getPagination(query, defaultPageSize);
  const state: ReportListState = {
    search: String(query.search || '').trim().toLowerCase(),
    filter: String(query.filter || defaultFilter).toLowerCase(),
    page,
    pageSize,
    offset: Math.max(0, (page - 1) * pageSize),
  };

  if (state.search) {
    state.searchPattern = `%${state.search}%`;
  }

  if (includeRange) {
    const range = parseRange(query);
    state.range = range;
    state.fromDate = new Date(range.from);
    state.toDate = new Date(range.to);
  }

  return state;
}
