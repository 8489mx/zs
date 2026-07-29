import { useEffect, useState } from 'react';
import { DialogShell } from '@/shared/components/dialog-shell';
import { Button } from '@/shared/ui/button';


type AlertState = {
  isOpen: boolean;
  message: string;
  title?: string;
  variant?: 'info' | 'error' | 'warning' | 'success';
};

let globalSetAlert: ((state: AlertState) => void) | null = null;

export function systemAlert(message: string, title: string = 'تنبيه', variant: AlertState['variant'] = 'info') {
  if (globalSetAlert) {
    globalSetAlert({ isOpen: true, message, title, variant });
  } else {
    // Fallback if provider is not mounted
    window.alert(message);
  }
}

export function SystemAlertProvider({ children }: { children: React.ReactNode }) {
  const [alertState, setAlertState] = useState<AlertState>({
    isOpen: false,
    message: '',
    title: 'تنبيه',
    variant: 'info'
  });

  useEffect(() => {
    globalSetAlert = setAlertState;
    return () => {
      globalSetAlert = null;
    };
  }, []);

  return (
    <>
      {children}
      <DialogShell open={alertState.isOpen} onClose={() => setAlertState({ ...alertState, isOpen: false })} width="400px" zIndex={9999}>
        <div style={{ padding: '24px', textAlign: 'center' }}>
          <h3 style={{ marginTop: 0, marginBottom: '16px' }}>{alertState.title}</h3>
          <p style={{ marginBottom: '24px', fontSize: '15px' }}>{alertState.message}</p>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <Button onClick={() => setAlertState({ ...alertState, isOpen: false })} variant="primary">موافق</Button>
          </div>
        </div>
      </DialogShell>
    </>
  );
}
