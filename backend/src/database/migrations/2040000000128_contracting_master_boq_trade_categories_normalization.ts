import { sql, type Kysely } from 'kysely';

export const migration = {
  async up(db: Kysely<unknown>): Promise<void> {
    // 1. Site Mobilization & Enabling Works (تجهيزات الموقع والأعمال التمهيدية)
    await sql`
      UPDATE contracting_master_boq_library
      SET trade_category = 'site_mobilization',
          trade_name_ar = 'تجهيزات الموقع والأعمال التمهيدية'
      WHERE trade_category IN ('site_mobilization')
         OR item_code LIKE 'MOB-%';
    `.execute(db);

    // 2. Civil & Concrete (الأعمال المدنية والخرسانات)
    await sql`
      UPDATE contracting_master_boq_library
      SET trade_category = 'civil_concrete',
          trade_name_ar = 'الأعمال المدنية والخرسانات'
      WHERE trade_category IN ('civil_concrete', 'civil')
         OR item_code LIKE 'CIV-%';
    `.execute(db);

    // 3. Masonry & Insulation (أعمال المباني والعزل والفواصل)
    await sql`
      UPDATE contracting_master_boq_library
      SET trade_category = 'masonry_insulation',
          trade_name_ar = 'أعمال المباني والعزل والفواصل'
      WHERE trade_category IN ('masonry_insulation', 'masonry')
         OR item_code LIKE 'MAS-%';
    `.execute(db);

    // 4. Steel Structures & Metalworks (المنشآت المعدنية والجمالونات)
    await sql`
      UPDATE contracting_master_boq_library
      SET trade_category = 'steel_structure',
          trade_name_ar = 'المنشآت المعدنية والجمالونات'
      WHERE trade_category IN ('steel_structure', 'steel_structures')
         OR item_code LIKE 'STL-%';
    `.execute(db);

    // 5. Architectural Finishes & Decor (التشطيبات المعمارية والديكور)
    await sql`
      UPDATE contracting_master_boq_library
      SET trade_category = 'finishing_decor',
          trade_name_ar = 'التشطيبات المعمارية والديكور'
      WHERE trade_category IN ('finishing_decor', 'finishes')
         OR item_code LIKE 'FIN-%';
    `.execute(db);

    // 6. Doors, Windows & Facades (الأبواب والشبابيك والواجهات)
    await sql`
      UPDATE contracting_master_boq_library
      SET trade_category = 'doors_windows_aluminum',
          trade_name_ar = 'الأبواب والشبابيك والواجهات'
      WHERE trade_category IN ('doors_windows_aluminum', 'doors_windows_facades', 'doors_windows')
         OR item_code LIKE 'ALU-%' OR item_code LIKE 'FAC-%';
    `.execute(db);

    // 7. Electrical & Lighting (الأعمال الكهربائية والإنارة)
    await sql`
      UPDATE contracting_master_boq_library
      SET trade_category = 'electrical_lighting',
          trade_name_ar = 'الأعمال الكهربائية والإنارة'
      WHERE trade_category IN ('electrical_lighting', 'electrical_lighting_mep', 'electrical', 'electric', 'electrical_power')
         OR item_code LIKE 'ELE-%';
    `.execute(db);

    // 8. ELV & Smart Systems (التيار الخفيف والأنظمة الذكية)
    await sql`
      UPDATE contracting_master_boq_library
      SET trade_category = 'smart_elv_systems',
          trade_name_ar = 'التيار الخفيف والأنظمة الذكية (ELV)'
      WHERE trade_category IN ('smart_elv_systems', 'smart_systems_elv', 'elv')
         OR item_code LIKE 'ELV-%';
    `.execute(db);

    // 9. Plumbing & Sanitary (الأعمال الصحية وتغذية وصرف المياه)
    await sql`
      UPDATE contracting_master_boq_library
      SET trade_category = 'plumbing_sanitary',
          trade_name_ar = 'الأعمال الصحية وتغذية وصرف المياه'
      WHERE trade_category IN ('plumbing_sanitary', 'plumbing_sanitary_mep', 'plumbing')
         OR item_code LIKE 'SAN-%' OR item_code LIKE 'PLM-%' OR item_code LIKE 'PLU-%';
    `.execute(db);

    // 10. Fire Fighting & Life Safety (شبكات مكافحة وإطفاء الحريق)
    await sql`
      UPDATE contracting_master_boq_library
      SET trade_category = 'fire_fighting',
          trade_name_ar = 'شبكات مكافحة وإطفاء الحريق'
      WHERE trade_category IN ('fire_fighting', 'fire_fighting_mep')
         OR item_code LIKE 'FF-%'
         OR item_code IN ('HVC-004', 'HVC-005', 'HVC-006', 'HVC-009', 'HVC-010', 'HVC-011');
    `.execute(db);

    // 11. HVAC & Mechanical Ventilation (التكييف والتهوية الميكانيكية)
    await sql`
      UPDATE contracting_master_boq_library
      SET trade_category = 'hvac_mechanical',
          trade_name_ar = 'التكييف والتهوية الميكانيكية'
      WHERE (trade_category IN ('hvac_mechanical', 'hvac_mechanical_mep', 'hvac', 'hvac_firefighting')
             OR item_code LIKE 'HVC-%' OR item_code LIKE 'HVAC-%' OR item_code LIKE 'MEP-%')
        AND item_code NOT IN ('HVC-004', 'HVC-005', 'HVC-006', 'HVC-009', 'HVC-010', 'HVC-011');
    `.execute(db);

    // 12. Site Landscape & Infrastructure (الموقع العام واللاندسكيب والبنية التحتية)
    await sql`
      UPDATE contracting_master_boq_library
      SET trade_category = 'site_infrastructure',
          trade_name_ar = 'الموقع العام واللاندسكيب والبنية التحتية'
      WHERE trade_category IN ('site_infrastructure', 'site_landscape', 'landscape_infrastructure')
         OR item_code LIKE 'LAN-%' OR item_code LIKE 'INF-%';
    `.execute(db);
  },

  async down(db: Kysely<unknown>): Promise<void> {
    // No-op rollback: category unification is forward-compatible
  },
};
