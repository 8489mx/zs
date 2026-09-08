import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/shared/components/page-header';
import { Button } from '@/shared/ui/button';
import { useAppToolbar } from '@/stores/toolbar-store';
import { pharmacyApi } from '../api/pharmacy.api';
import type { PharmacyPrescription, PrescribedItem } from '../types/pharmacy.types';
import { INSURANCE_PROVIDERS } from '../constants/pharmacy.constants';
import { DoseStickerPrintModal } from '../components/DoseStickerPrintModal';
import { IconPlus, IconRefresh } from '../components/PharmacyIcons';
import { PrescriptionsKpiGrid } from '../components/prescriptions/PrescriptionsKpiGrid';
import { PrescriptionsFilterBar } from '../components/prescriptions/PrescriptionsFilterBar';
import { PrescriptionsTable } from '../components/prescriptions/PrescriptionsTable';
import { PrescriptionModal } from '../components/prescriptions/PrescriptionModal';

export default function PharmacyPrescriptionsPage() {
  useAppToolbar([
    { label: 'الرئيسية', to: '/' },
    { label: 'الصيدلية والأدوية', to: '/pharmacy' },
    { label: 'الروشتات والتأمين' },
  ]);
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [insuranceFilter, setInsuranceFilter] = useState('all');
  const [page, setPage] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingRx, setEditingRx] = useState<Partial<PharmacyPrescription> & { items?: PrescribedItem[] } | null>(null);

  const [stickerMed, setStickerMed] = useState('');
  const [stickerPatient, setStickerPatient] = useState('');
  const [stickerOpen, setStickerOpen] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['pharmacy', 'prescriptions', searchQuery, insuranceFilter, page],
    queryFn: () =>
      pharmacyApi.listPrescriptions({
        q: searchQuery,
        insuranceProvider: insuranceFilter,
        page,
        pageSize: 20,
      }),
  });

  const upsertMutation = useMutation({
    mutationFn: pharmacyApi.upsertPrescription,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pharmacy', 'prescriptions'] });
      queryClient.invalidateQueries({ queryKey: ['pharmacy', 'stats'] });
      setModalOpen(false);
      setEditingRx(null);
    },
  });

  const totalItems = data?.pagination?.totalItems || (data?.prescriptions?.length || 0);
  const prescriptionsList = data?.prescriptions || [];

  const totalAmountSum = prescriptionsList.reduce((acc: number, r: PharmacyPrescription) => acc + (Number(r.total_amount) || 0), 0);
  const totalPatientSum = prescriptionsList.reduce((acc: number, r: PharmacyPrescription) => acc + (Number(r.patient_amount) || 0), 0);
  const totalInsuranceSum = prescriptionsList.reduce((acc: number, r: PharmacyPrescription) => acc + (Number(r.insurance_amount) || 0), 0);

  const handleOpenAdd = () => {
    setEditingRx({
      customer_name: '',
      customer_phone: '',
      doctor_name: '',
      doctor_specialty: 'باطنة عامة',
      diagnosis: '',
      insurance_provider: INSURANCE_PROVIDERS[0],
      insurance_card_no: '',
      approval_code: '',
      patient_copay_percent: 0,
      total_amount: 0,
      patient_amount: 0,
      insurance_amount: 0,
      status: 'dispensed',
      items: [
        { drugName: '', dosage: 'قرص', frequency: 'مرتين يومياً', duration: 'لمدة أسبوع', price: 0 }
      ],
      dispensed_by: 'د. الصيدلي المناوب',
    });
    setModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRx || !editingRx.customer_name) return;
    upsertMutation.mutate(editingRx);
  };

  return (
    <div className="page-stack page-shell" dir="rtl">
      <main className="document-prototype-column" style={{ paddingBottom: '80px', maxWidth: '1280px', margin: '0 auto', width: '100%' }}>
        <PageHeader
          title="الروشتات الطبية والتأمين الصحي والنقابات"
          description="تسجيل وصرف الروشتات الطبية، حساب نسبة تحمل المريض (Co-Pay) ومطالبات شركات التأمين"
          badge={<span className="cashier-chip" style={{ fontWeight: 700, color: 'var(--primary, #1e1b4b)', background: '#f1f5f9', border: '1px solid #e2e8f0' }}>{totalItems} روشتة مسجلة</span>}
          actions={
            <div className="actions compact-actions">
              <Button
                variant="primary"
                onClick={handleOpenAdd}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <IconPlus size={15} />
                <span>صرف روشتة جديدة</span>
              </Button>
              <Button
                variant="secondary"
                onClick={() => void refetch()}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <IconRefresh size={15} />
                <span>تحديث</span>
              </Button>
            </div>
          }
        />

        <PrescriptionsKpiGrid
          totalItems={totalItems}
          totalAmountSum={totalAmountSum}
          totalPatientSum={totalPatientSum}
          totalInsuranceSum={totalInsuranceSum}
        />

        <PrescriptionsFilterBar
          totalItems={totalItems}
          insuranceFilter={insuranceFilter}
          setInsuranceFilter={setInsuranceFilter}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onResetPage={() => setPage(1)}
        />

        <PrescriptionsTable
          isLoading={isLoading}
          prescriptions={prescriptionsList}
          onPrintSticker={(rx) => {
            setStickerPatient(rx.customer_name);
            setStickerMed('علاج الروشتة');
            setStickerOpen(true);
          }}
        />

        {modalOpen && editingRx && (
          <PrescriptionModal
            isOpen={modalOpen}
            onClose={() => setModalOpen(false)}
            editingRx={editingRx}
            setEditingRx={setEditingRx}
            onSave={handleSave}
            isPending={upsertMutation.isPending}
          />
        )}

        <DoseStickerPrintModal
          open={stickerOpen}
          onClose={() => setStickerOpen(false)}
          drugName={stickerMed}
          customerName={stickerPatient}
        />
      </main>
    </div>
  );
}
