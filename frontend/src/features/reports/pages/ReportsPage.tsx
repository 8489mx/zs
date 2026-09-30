import { Navigate, useParams } from 'react-router-dom';
import { ReportsWorkspace } from '@/features/reports/components/ReportsWorkspace';
import { isReportsSection } from '@/features/reports/pages/reports.page-config';

export function ReportsPage() {
  const { section } = useParams<{ section?: string }>();
  const activeSection = section || 'overview';
  if (!isReportsSection(activeSection)) {
    return <Navigate to="/reports/overview" replace />;
  }
  return <ReportsWorkspace currentSection={activeSection} />;
}
