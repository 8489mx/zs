import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { maritimeApi } from '../api/maritime-freight.api';

interface MaritimeCounts {
  inquiries: number;
  rfqs: number;
  matrixBids: number;
  quotations: number;
  jobs: number;
  containers: number;
  master: number;
  settings: number;
}

interface MaritimeContextType {
  counts: MaritimeCounts;
  refreshCounts: () => Promise<void>;
  refreshKey: number;
  refreshAll: () => Promise<void>;
  isRefreshing: boolean;
  isCreateRfqOpen: boolean;
  setIsCreateRfqOpen: (open: boolean) => void;
  isCreateInquiryOpen: boolean;
  setIsCreateInquiryOpen: (open: boolean) => void;
}

const DEFAULT_COUNTS: MaritimeCounts = {
  inquiries: 0,
  rfqs: 0,
  matrixBids: 0,
  quotations: 0,
  jobs: 0,
  containers: 0,
  master: 0,
  settings: 0,
};

let memoryCachedCounts: MaritimeCounts = { ...DEFAULT_COUNTS };

try {
  if (typeof window !== 'undefined') {
    const saved = sessionStorage.getItem('zs_maritime_counts');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed === 'object') {
        memoryCachedCounts = { ...DEFAULT_COUNTS, ...parsed };
      }
    }
  }
} catch {
  // ignore storage errors
}

const MaritimeContext = createContext<MaritimeContextType | null>(null);

export function MaritimeProvider({ children }: { children: React.ReactNode }) {
  const [counts, setCounts] = useState<MaritimeCounts>(memoryCachedCounts);
  const [isCreateRfqOpen, setIsCreateRfqOpen] = useState(false);
  const [isCreateInquiryOpen, setIsCreateInquiryOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refreshCounts = useCallback(async () => {
    try {
      const [inquiriesData, rfqsData, quotesData, jobsData, containersData, portsData, linesData] = await Promise.all([
        maritimeApi.getInquiries().catch(() => []),
        maritimeApi.getRfqs().catch(() => []),
        maritimeApi.getQuotations().catch(() => []),
        maritimeApi.getJobs().catch(() => []),
        maritimeApi.getContainers().catch(() => []),
        maritimeApi.getPorts().catch(() => []),
        maritimeApi.getShippingLines().catch(() => []),
      ]);

      const totalBids = (rfqsData || []).reduce((acc: number, r: any) => acc + (r.bidsCount || 0), 0);

      const newCounts: MaritimeCounts = {
        inquiries: (inquiriesData || []).length,
        rfqs: (rfqsData || []).length,
        matrixBids: totalBids,
        quotations: (quotesData || []).length,
        jobs: (jobsData || []).length,
        containers: (containersData || []).length,
        master: (portsData || []).length + (linesData || []).length,
        settings: 0,
      };

      memoryCachedCounts = newCounts;
      try {
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('zs_maritime_counts', JSON.stringify(newCounts));
        }
      } catch {}

      setCounts(newCounts);
    } catch (err) {
      console.error('Failed to load maritime counts:', err);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    try {
      setIsRefreshing(true);
      await refreshCounts();
      setRefreshKey((prev) => prev + 1);
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshCounts]);

  useEffect(() => {
    refreshCounts();
  }, [refreshCounts]);

  const value = useMemo(
    () => ({
      counts,
      refreshCounts,
      refreshKey,
      refreshAll,
      isRefreshing,
      isCreateRfqOpen,
      setIsCreateRfqOpen,
      isCreateInquiryOpen,
      setIsCreateInquiryOpen,
    }),
    [counts, refreshCounts, refreshKey, refreshAll, isRefreshing, isCreateRfqOpen, isCreateInquiryOpen]
  );

  return <MaritimeContext.Provider value={value}>{children}</MaritimeContext.Provider>;
}

export function useMaritime() {
  const ctx = useContext(MaritimeContext);
  if (!ctx) {
    throw new Error('useMaritime must be used within a MaritimeProvider');
  }
  return ctx;
}
