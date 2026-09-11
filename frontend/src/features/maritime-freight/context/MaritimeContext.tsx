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
  isCreateRfqOpen: boolean;
  setIsCreateRfqOpen: (open: boolean) => void;
  isCreateInquiryOpen: boolean;
  setIsCreateInquiryOpen: (open: boolean) => void;
}

const MaritimeContext = createContext<MaritimeContextType | null>(null);

export function MaritimeProvider({ children }: { children: React.ReactNode }) {
  const [counts, setCounts] = useState<MaritimeCounts>({
    inquiries: 0,
    rfqs: 0,
    matrixBids: 0,
    quotations: 0,
    jobs: 0,
    containers: 0,
    master: 0,
    settings: 0,
  });
  const [isCreateRfqOpen, setIsCreateRfqOpen] = useState(false);
  const [isCreateInquiryOpen, setIsCreateInquiryOpen] = useState(false);

  const refreshCounts = useCallback(async () => {
    try {
      const [inquiriesData, rfqsData, quotesData, jobsData, containersData, portsData, linesData] = await Promise.all([
        maritimeApi.getInquiries().catch(() => []),
        maritimeApi.getRfqs(),
        maritimeApi.getQuotations(),
        maritimeApi.getJobs(),
        maritimeApi.getContainers(),
        maritimeApi.getPorts(),
        maritimeApi.getShippingLines(),
      ]);

      const totalBids = rfqsData.reduce((acc, r) => acc + (r.bidsCount || 0), 0);

      setCounts({
        inquiries: inquiriesData.length,
        rfqs: rfqsData.length,
        matrixBids: totalBids,
        quotations: quotesData.length,
        jobs: jobsData.length,
        containers: containersData.length,
        master: portsData.length + linesData.length,
        settings: 0,
      });
    } catch (err) {
      console.error('Failed to load maritime counts:', err);
    }
  }, []);

  useEffect(() => {
    refreshCounts();
  }, [refreshCounts]);

  const value = useMemo(
    () => ({
      counts,
      refreshCounts,
      isCreateRfqOpen,
      setIsCreateRfqOpen,
      isCreateInquiryOpen,
      setIsCreateInquiryOpen,
    }),
    [counts, refreshCounts, isCreateRfqOpen, isCreateInquiryOpen]
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
