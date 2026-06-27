import { useState, useEffect } from 'react';
import { Button } from '@/shared/ui/button';
import { SearchableCombobox } from '@/shared/ui/searchable-combobox';
import { FormSection } from '@/shared/components/form-section';

import { http } from '@/lib/http';
import { ManufacturingLayout } from '@/features/manufacturing/components/ManufacturingLayout';

type LocationOption = {
  id: string;
  name: string;
};

export default function ManufacturingSettingsPage() {
  const [locations, setLocations] = useState<LocationOption[]>([]);
  
  const [locationQuery, setLocationQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<LocationOption | null>(null);
  
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    http<{ locations: any[] }>('/api/locations')
    .then(data => {
      if (data.locations) {
        setLocations(data.locations.map((l: any) => ({
          id: String(l.id),
          name: l.name
        })));
      }
    })
    .catch(() => {
      // Mock locations if backend is not available
      setLocations([
        { id: '1', name: 'المخزن الرئيسي' },
        { id: '2', name: 'مخزن الخامات' },
        { id: '3', name: 'مخزن الإنتاج التام' }
      ]);
    });
  }, []);

  useEffect(() => {
    // Load from localStorage if backend is not available
    const savedId = localStorage.getItem('manufacturing.default_production_location');
    if (savedId && locations.length > 0 && !selectedLocation) {
      const loc = locations.find(l => l.id === savedId);
      if (loc) {
        setSelectedLocation(loc);
        setLocationQuery(loc.name);
      }
    }
  }, [locations]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await http('/api/settings', {
        method: 'PUT',
        body: JSON.stringify({
          settings: {
            'manufacturing.default_production_location': selectedLocation?.id || ''
          }
        })
      });
      alert('تم حفظ الإعدادات بنجاح');
    } catch {
      // Fallback to localStorage if backend is not available
      if (selectedLocation?.id) {
        localStorage.setItem('manufacturing.default_production_location', selectedLocation.id);
      } else {
        localStorage.removeItem('manufacturing.default_production_location');
      }
      alert('تم حفظ الإعدادات بنجاح (محلياً)');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ManufacturingLayout
      breadcrumbs={[
        { label: 'التصنيع', to: '/manufacturing/work-orders' },
        { label: 'الإعدادات' }
      ]}
      title="إعدادات التصنيع"
    >
        <FormSection title="المخازن الافتراضية للتصنيع" description="اختر المخزن الافتراضي الذي ستتم عليه عمليات التصنيع وصرف المواد الخام بشكل آلي ما لم يتم تحديد مخزن آخر في أمر الإنتاج.">
          <div style={{ maxWidth: '400px', marginBottom: '24px' }}>
            <SearchableCombobox
              label="المخزن الافتراضي لصالة الإنتاج"
              placeholder="اختر المخزن الافتراضي..."
              value={locationQuery}
              onChange={setLocationQuery}
              options={locations}
              search={(opt, q) => opt.name.toLowerCase().includes(q.toLowerCase())}
              getLabel={(o) => o.name}
              onSelect={(o) => { setSelectedLocation(o); setLocationQuery(o.name); }}
              createLabel={(q) => `إضافة ${q}`}
            />
          </div>

          <Button type="button" variant="primary" onClick={handleSave} disabled={isSaving}>
             {isSaving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
          </Button>
        </FormSection>
    </ManufacturingLayout>
  );
}
