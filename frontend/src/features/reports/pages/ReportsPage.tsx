import { Navigate, useParams } from 'react-router-dom';
import { ReportsWorkspace } from '@/features/reports/components/ReportsWorkspace';
import { isReportsSection, reportsSections } from '@/features/reports/pages/reports.page-config';
import { useSettingsQuery } from '@/shared/hooks/use-catalog-queries';

export function ReportsPage() {
  const { section } = useParams<{ section?: string }>();
  const { data: settings } = useSettingsQuery();
  const isRestaurantActive = settings?.restaurantModuleEnabled === true || ['restaurant', 'cafe', 'food_beverage'].includes(settings?.businessIndustry || '');

  const activeSection = section || 'overview';
  if (!isReportsSection(activeSection)) {
    return <Navigate to="/reports/overview" replace />;
  }

  // Guard restaurant-only sections when restaurant mode is disabled
  const targetConfig = reportsSections.find((s) => s.key === activeSection);
  if (targetConfig?.restaurantOnly && !isRestaurantActive) {
    return <Navigate to="/reports/overview" replace />;
  }

  return <ReportsWorkspace currentSection={activeSection} />;
}
