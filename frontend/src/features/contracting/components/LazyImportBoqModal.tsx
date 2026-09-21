import { lazy, Suspense, type ComponentProps } from 'react';
import type { ImportBoqModal as ImportBoqModalImpl } from './ImportBoqModal';

// PERF-8 (ARCHITECTURE_INVARIANTS.md §2.6): ImportBoqModal pulls pdfjs-dist (~1MB) and the BOQ parsers.
// A static import put all of it in the contracting layout chunk, downloaded on every contracting page
// even though the dialog is opened rarely. Consumers import from here; the dialog chunk loads on open.
const ImportBoqModalChunk = lazy(() => import('./ImportBoqModal').then((module) => ({ default: module.ImportBoqModal })));

export function ImportBoqModal(props: ComponentProps<typeof ImportBoqModalImpl>) {
  return (
    <Suspense fallback={null}>
      <ImportBoqModalChunk {...props} />
    </Suspense>
  );
}
