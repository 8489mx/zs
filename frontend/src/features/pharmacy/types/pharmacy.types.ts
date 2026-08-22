export interface PharmacyDrug {
  id: number;
  tenant_id: string;
  account_id: string;
  product_id?: number | null;
  trade_name: string;
  trade_name_ar?: string | null;
  active_ingredient: string;
  active_ingredient_ar?: string | null;
  dosage_form: string;
  strength?: string | null;
  manufacturer?: string | null;
  drug_class?: string | null;
  prescription_required: boolean;
  controlled_level: 'none' | 'table_1' | 'table_2';
  units_per_box: number;
  unit_name: string;
  strip_price: number | string;
  box_price: number | string;
  pregnancy_safety?: string | null;
  storage_condition?: string | null;
  barcode?: string | null;
  indications?: string | null;
  side_effects?: string | null;
  created_at: string;
  updated_at: string;
}

export interface PharmacyBatch {
  id: number;
  tenant_id: string;
  account_id: string;
  product_id?: number | null;
  drug_id?: number | null;
  batch_number: string;
  expiry_date: string;
  quantity: number | string;
  unit_cost: number | string;
  location_id?: number | null;
  supplier_name?: string | null;
  status: 'active' | 'near_expiry' | 'expired' | 'returned';
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface PrescribedItem {
  drugName: string;
  dosage: string;
  frequency: string;
  duration: string;
  notes?: string;
  price?: number;
}

export interface PharmacyPrescription {
  id: number;
  tenant_id: string;
  account_id: string;
  prescription_no: string;
  customer_id?: number | null;
  customer_name: string;
  customer_phone?: string | null;
  doctor_name?: string | null;
  doctor_specialty?: string | null;
  diagnosis?: string | null;
  insurance_provider?: string | null;
  insurance_card_no?: string | null;
  approval_code?: string | null;
  patient_copay_percent: number | string;
  total_amount: number | string;
  patient_amount: number | string;
  insurance_amount: number | string;
  status: 'dispensed' | 'pending' | 'delivered' | 'cancelled';
  items_json: string;
  dispensed_by?: string | null;
  dispensed_at: string;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface PharmacyShortage {
  id: number;
  tenant_id: string;
  account_id: string;
  product_name: string;
  active_ingredient?: string | null;
  dosage_form?: string | null;
  suggested_distributor?: string | null;
  requested_quantity: number | string;
  priority: 'urgent' | 'normal' | 'customer_request';
  customer_name?: string | null;
  customer_phone?: string | null;
  status: 'needed' | 'ordered' | 'received' | 'unavailable';
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface PharmacyClinicalService {
  id: number;
  tenant_id: string;
  account_id: string;
  service_type: 'blood_pressure' | 'blood_glucose' | 'weight_bmi' | 'injection' | 'wound_dressing';
  customer_name: string;
  customer_phone?: string | null;
  metric_value_1?: string | null;
  metric_value_2?: string | null;
  pharmacist_notes?: string | null;
  fee: number | string;
  created_at: string;
}

export interface PharmacyStats {
  totalDrugs: number;
  neededShortages: number;
  dispensedPrescriptions: number;
  totalBatches: number;
}
