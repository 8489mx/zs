import { ReactNode, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface ClientPortalProps {
  children: ReactNode;
  targetId: string;
}

export function ClientPortal({ children, targetId }: ClientPortalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!mounted) return null;

  const targetElement = document.getElementById(targetId);
  if (!targetElement) {
    console.warn(`ClientPortal: target with id "${targetId}" not found in the DOM.`);
    return null;
  }

  return createPortal(children, targetElement);
}
