import { useNavigate } from 'react-router-dom';
import {
  DriverNewLoadRequisitionView,
  RequisitionLineItem,
} from '../components/DriverNewLoadRequisitionView';

export type { RequisitionLineItem };

export interface DriverNewLoadRequisitionPageProps {
  onBack?: () => void;
  onRequisitionSubmitted?: (docNo: string) => void;
}

export function DriverNewLoadRequisitionPage({
  onBack,
  onRequisitionSubmitted,
}: DriverNewLoadRequisitionPageProps) {
  const navigate = useNavigate();

  return (
    <DriverNewLoadRequisitionView
      onBack={onBack || (() => navigate('/van-sales'))}
      onRequisitionSubmitted={onRequisitionSubmitted || (() => navigate('/van-sales'))}
    />
  );
}

export default DriverNewLoadRequisitionPage;
