import { useNavigate } from 'react-router-dom';
import { useContracting } from '../context/ContractingContext';
import { ContractingProjectsTab } from '../components/ContractingProjectsTab';
import { CashForecastCard } from '../components/CashForecastCard';

export function ContractingProjectsPage() {
  const { projects, loading, setSelectedProjectId, setIsCreateProjectOpen } = useContracting();
  const navigate = useNavigate();

  const handleSelectProject = (projectId: string, targetTab: string = 'boq') => {
    setSelectedProjectId(projectId);
    const targetPath = targetTab === 'projects' ? '/contracting' : `/contracting/${targetTab}`;
    navigate(`${targetPath}?projectId=${projectId}`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }} dir="rtl">
      {/* توقعات التدفق النقدي - Cross Projects Summary */}
      <CashForecastCard />

      {/* جدول المشاريع */}
      <ContractingProjectsTab
        projects={projects}
        loading={loading}
        onSelectProject={handleSelectProject}
        onNewProject={() => setIsCreateProjectOpen(true)}
      />
    </div>
  );
}
