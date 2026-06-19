import { useState, useEffect } from 'react';
import { Button } from '@/shared/ui/button';
import { SearchableCombobox } from '@/shared/ui/searchable-combobox';

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

    http<{ settings: Record<string, any> }>('/api/settings?keys=manufacturing.default_production_location')
    .then(data => {
      if (data.settings && data.settings['manufacturing.default_production_location']) {
        const id = data.settings['manufacturing.default_production_location'];
        setSelectedLocation({ id, name: `مخزن #${id}` });
        setLocationQuery(`مخزن #${id}`);
      }
    })
    .catch(() => {
      // Load from localStorage if backend is not available
      const savedId = localStorage.getItem('manufacturing.default_production_location');
      if (savedId) {
        const locName = savedId === '1' ? 'المخزن الرئيسي' : savedId === '2' ? 'مخزن الخامات' : savedId === '3' ? 'مخزن الإنتاج التام' : `مخزن #${savedId}`;
        setSelectedLocation({ id: savedId, name: locName });
        setLocationQuery(locName);
      }
    });
  }, []);

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
        <section className="document-prototype-section" style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h3 className="document-prototype-section-title" style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px', color: '#111827' }}>المخازن الافتراضية للتصنيع</h3>
          <p style={{ color: '#6b7280', marginBottom: '24px' }}>اختر المخزن الافتراضي الذي ستتم عليه عمليات التصنيع وصرف المواد الخام بشكل آلي ما لم يتم تحديد مخزن آخر في أمر الإنتاج.</p>
          
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
        </section>
    </ManufacturingLayout>
  );
}
