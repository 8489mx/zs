import { useState, useEffect, useCallback } from 'react';
import { maritimeApi, ShippingPort, ShippingLine } from '../api/maritime-freight.api';
import { useMaritime } from '../context/MaritimeContext';
import { MaritimeMasterDataTab } from '../components/MaritimeMasterDataTab';

export function MaritimeLinesPage() {
  const { refreshCounts } = useMaritime();
  const [ports, setPorts] = useState<ShippingPort[]>([]);
  const [lines, setLines] = useState<ShippingLine[]>([]);

  const loadData = useCallback(async () => {
    try {
      const [portsData, linesData] = await Promise.all([
        maritimeApi.getPorts(),
        maritimeApi.getShippingLines(),
      ]);
      setPorts(portsData);
      setLines(linesData);
    } catch (err) {
      console.error('Failed to load maritime master data:', err);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = async () => {
    await loadData();
    await refreshCounts();
  };

  return (
    <MaritimeMasterDataTab
      ports={ports}
      lines={lines}
      onRefresh={handleRefresh}
    />
  );
}
