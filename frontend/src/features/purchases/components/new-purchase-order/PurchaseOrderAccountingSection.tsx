import type { RefObject } from 'react';
import { SearchableCombobox } from '@/shared/ui/searchable-combobox';
import { useTranslation } from '../../utils/i18n-purchase-prototype';
import { normalizeSearchText, includesNormalized, searchCostCenter, searchProject } from './newPurchaseOrder.helpers';
import type { CostCenterOption, ProjectOption, QuickCreateState } from './newPurchaseOrder.types';

interface AccountingSectionProps {
  costCenter: string;
  setCostCenter: (val: string) => void;
  costCenters: CostCenterOption[];
  onCostCenterSelect: (c: CostCenterOption) => void;
  project: string;
  setProject: (val: string) => void;
  projects: ProjectOption[];
  onProjectSelect: (p: ProjectOption) => void;
  termsTemplate: string;
  setTermsTemplate: (val: string) => void;
  onOpenQuickCreate: (kind: Exclude<QuickCreateState, null>['kind'], query: string) => void;
  markDocumentDirty: () => void;
  costCenterInputRef: RefObject<HTMLInputElement | null>;
  projectInputRef: RefObject<HTMLInputElement | null>;
  purchaseDropdownClassName: string;
}

export function PurchaseOrderAccountingSection(props: AccountingSectionProps) {
  const { t } = useTranslation();

  return (
    <>
      <section className="document-prototype-section">
        <h3 className="document-prototype-section-title">{t('accounting_section')}</h3>
        <div className="document-prototype-grid compact-grid-2">
          <SearchableCombobox
            label={t('cost_center')}
            placeholder={t('search_cost_center')}
            value={props.costCenter}
            onChange={(value) => {
              props.markDocumentDirty();
              props.setCostCenter(value);
            }}
            options={props.costCenters}
            search={searchCostCenter}
            getLabel={(option) => option.name}
            getMeta={(option) => option.code}
            onSelect={props.onCostCenterSelect}
            onCreate={(query) => props.onOpenQuickCreate('costCenter', query)}
            createLabel={(query) => `+ إنشاء مركز تكلفة جديد "${query}"`}
            inputRef={props.costCenterInputRef}
            inputClassName="purchase-prototype-field-input purchase-prototype-cost-center-input"
            dropdownClassName={props.purchaseDropdownClassName}
          />
          <SearchableCombobox
            label={t('project')}
            placeholder={t('search_project')}
            value={props.project}
            onChange={(value) => {
              props.markDocumentDirty();
              props.setProject(value);
            }}
            options={props.projects}
            search={searchProject}
            getLabel={(option) => option.name}
            getMeta={(option) => option.code}
            onSelect={props.onProjectSelect}
            onCreate={(query) => props.onOpenQuickCreate('project', query)}
            createLabel={(query) => `+ إنشاء مشروع جديد "${query}"`}
            inputRef={props.projectInputRef}
            inputClassName="purchase-prototype-field-input purchase-prototype-project-input"
            dropdownClassName={props.purchaseDropdownClassName}
          />
        </div>
      </section>

      <section className="document-prototype-section">
        <h3 className="document-prototype-section-title">{t('terms_conditions')}</h3>
        <SearchableCombobox
          label={t('terms_template')}
          placeholder={t('search_terms_template')}
          value={props.termsTemplate}
          onChange={(value) => {
            props.markDocumentDirty();
            props.setTermsTemplate(value);
          }}
          options={[
            { id: 'term-1', name: 'Standard PO Template' },
            { id: 'term-2', name: 'شروط توريد مختصرة' }
          ]}
          search={(option, query) => (normalizeSearchText(query) ? includesNormalized(option.name, query) : true)}
          getLabel={(option) => option.name}
          onSelect={(option) => props.setTermsTemplate(option.name)}
          onCreate={(query) => props.onOpenQuickCreate('project', query)}
          createLabel={(query) => `+ إنشاء نموذج شروط جديد "${query}"`}
          inputClassName="purchase-prototype-field-input purchase-prototype-terms-input"
          dropdownClassName={props.purchaseDropdownClassName}
        />
      </section>
    </>
  );
}
