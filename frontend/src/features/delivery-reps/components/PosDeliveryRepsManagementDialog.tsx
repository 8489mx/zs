import { useState } from 'react';
import { DialogShell } from '@/shared/components/dialog-shell';
import { DeliveryRepsList } from './DeliveryRepsList';
import { DeliveryRepOrders } from './DeliveryRepOrders';

interface PosDeliveryRepsManagementDialogProps {
  onClose: () => void;
}

export function PosDeliveryRepsManagementDialog({ onClose }: PosDeliveryRepsManagementDialogProps) {
  const [selectedRepId, setSelectedRepId] = useState<number | null>(null);

  return (
    <DialogShell open={true} onClose={onClose} width="1100px" ariaLabel="إدارة مناديب التوصيل">
      <header className="dialog-header">
        <h2 className="dialog-title">إدارة مناديب التوصيل</h2>
      </header>
      <div style={{ display: 'flex', height: '650px', background: '#f8fafc' }}>
        
        {/* Sidebar: Reps List */}
        <div style={{ width: '280px', background: 'white', borderLeft: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '16px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
            <h3 style={{ margin: 0, fontSize: '14px', color: '#475569' }}>قائمة المناديب</h3>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <DeliveryRepsList 
              selectedRepId={selectedRepId} 
              onSelectRep={setSelectedRepId} 
            />
          </div>
        </div>

        {/* Main Area: Orders & Settlement */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', padding: '24px', background: 'white' }}>
          <DeliveryRepOrders repId={selectedRepId} />
        </div>

      </div>
    </DialogShell>
  );
}
