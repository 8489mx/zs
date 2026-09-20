import { MaritimeJob, MaritimeContainer } from '../api/maritime-freight.api';

/**
 * Generates and prints a standardized Maritime Bill of Lading (B/L)
 * conforming to FIATA/BIMCO multimodal freight standards.
 */
export function printOceanBillOfLading(job: MaritimeJob, containers: MaritimeContainer[] = [], companyName = 'منظومة Z-Systems للشحن الملاحي') {
  const printWindow = window.open('', '_blank', 'width=950,height=1000');
  if (!printWindow) return;

  const containersList = containers.length > 0 ? containers : (job.containers || []);
  const totalWeight = containersList.reduce((sum, c) => sum + Number(c.gross_weight_kg || 0), 0);
  const totalCbm = containersList.reduce((sum, c) => sum + Number(c.cbm || 0), 0);

  const containerRowsHtml = containersList.map((c, idx) => `
    <tr>
      <td style="text-align: center; font-weight: 700;">${idx + 1}</td>
      <td style="font-weight: 800; font-family: monospace;">${c.container_number}</td>
      <td>${c.container_type}</td>
      <td style="font-family: monospace;">${c.seal_number || '—'}</td>
      <td style="text-align: right;">${Number(c.gross_weight_kg || 0).toLocaleString()} KG</td>
      <td style="text-align: right;">${Number(c.cbm || 0).toFixed(2)} CBM</td>
    </tr>
  `).join('');

  const html = `
    <!DOCTYPE html>
    <html dir="ltr" lang="en">
      <head>
        <meta charset="utf-8" />
        <title>Bill of Lading - ${job.hbl_number || job.job_number}</title>
        <style>
          @page { size: A4 portrait; margin: 12mm; }
          body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 11px; color: #0f172a; margin: 0; padding: 15px; line-height: 1.35; }
          .bl-container { border: 2px solid #0f172a; padding: 0; }
          .bl-header { display: grid; grid-template-columns: 2fr 1fr; border-bottom: 2px solid #0f172a; }
          .bl-title-box { padding: 14px; background: #f8fafc; border-left: 2px solid #0f172a; text-align: center; }
          .bl-title { font-size: 18px; font-weight: 900; letter-spacing: 1px; color: #170e5e; margin: 0 0 4px; }
          .bl-doc-num { font-size: 14px; font-weight: 800; color: #0f172a; font-family: monospace; }
          .bl-forwarder { padding: 14px; }
          .bl-forwarder h2 { margin: 0 0 4px; font-size: 16px; color: #170e5e; }
          
          .grid-2 { display: grid; grid-template-columns: 1fr 1fr; border-bottom: 1px solid #0f172a; }
          .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; border-bottom: 1px solid #0f172a; }
          .grid-4 { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; border-bottom: 1px solid #0f172a; }
          
          .cell { padding: 7px 10px; border-right: 1px solid #0f172a; }
          .cell:last-child { border-right: none; }
          .cell-label { font-size: 8.5px; font-weight: 800; text-transform: uppercase; color: #475569; margin-bottom: 2px; }
          .cell-content { font-size: 11px; font-weight: 600; min-height: 28px; }
          
          table.cargo-table { width: 100%; border-collapse: collapse; margin: 0; }
          table.cargo-table th { background: #f1f5f9; border-bottom: 2px solid #0f172a; border-right: 1px solid #cbd5e1; padding: 6px 8px; font-size: 9px; font-weight: 800; text-transform: uppercase; text-align: left; }
          table.cargo-table td { padding: 6px 8px; border-bottom: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0; font-size: 10.5px; }
          table.cargo-table th:last-child, table.cargo-table td:last-child { border-right: none; }
          
          .bl-footer { display: grid; grid-template-columns: 2fr 1fr; border-top: 2px solid #0f172a; font-size: 9px; }
          .legal-notice { padding: 10px; color: #64748b; font-size: 8px; line-height: 1.3; border-right: 1px solid #0f172a; }
          .signature-box { padding: 10px; text-align: center; }
          .sign-line { margin-top: 40px; border-top: 1px dashed #475569; padding-top: 4px; font-weight: 700; }
        </style>
      </head>
      <body>
        <div class="bl-container">
          <!-- Header -->
          <div class="bl-header">
            <div class="bl-forwarder">
              <h2>${companyName}</h2>
              <div style="color: #475569; font-size: 9.5px;">INTERNATIONAL FREIGHT FORWARDING & LOGISTICS SERVICES</div>
              <div style="margin-top: 4px; font-size: 10px;">Carrier / Ocean Line: <strong>${job.shipping_line_name}</strong></div>
            </div>
            <div class="bl-title-box">
              <div class="bl-title">BILL OF LADING</div>
              <div class="bl-doc-num">B/L NO: ${job.hbl_number || job.mbl_number || job.job_number}</div>
              <div style="font-size: 9px; color: #64748b; margin-top: 4px;">Job Ref: ${job.job_number}</div>
            </div>
          </div>

          <!-- Parties -->
          <div class="grid-2">
            <div class="cell">
              <div class="cell-label">1. SHIPPER / EXPORTER</div>
              <div class="cell-content">${job.shipper_details || 'AS PER COMMERCIAL INVOICE'}</div>
            </div>
            <div class="cell">
              <div class="cell-label">BOOKING / EXPORT REF NO.</div>
              <div class="cell-content">
                <strong>${job.booking_number || 'BKG-' + job.job_number}</strong>
                ${job.mbl_number ? `<div style="font-size: 9.5px; color: #475569;">MBL: ${job.mbl_number}</div>` : ''}
              </div>
            </div>
          </div>

          <div class="grid-2">
            <div class="cell">
              <div class="cell-label">2. CONSIGNEE (NAME & COMPLETE ADDRESS)</div>
              <div class="cell-content"><strong>${job.customer_name}</strong><br/>${job.consignee_details || 'TO ORDER'}</div>
            </div>
            <div class="cell">
              <div class="cell-label">3. NOTIFY PARTY / LOCAL CLEARANCE AGENT</div>
              <div class="cell-content">${job.notify_party || 'SAME AS CONSIGNEE'}</div>
            </div>
          </div>

          <!-- Vessel & Route -->
          <div class="grid-4">
            <div class="cell">
              <div class="cell-label">VESSEL NAME</div>
              <div class="cell-content">${job.vessel_name || 'TBN (To Be Nominated)'}</div>
            </div>
            <div class="cell">
              <div class="cell-label">VOYAGE NO.</div>
              <div class="cell-content">${job.voyage_number || '—'}</div>
            </div>
            <div class="cell">
              <div class="cell-label">PORT OF LOADING (POL)</div>
              <div class="cell-content"><strong>${job.pol_name}</strong> (${job.pol_code})</div>
            </div>
            <div class="cell">
              <div class="cell-label">PORT OF DISCHARGE (POD)</div>
              <div class="cell-content"><strong>${job.pod_name}</strong> (${job.pod_code})</div>
            </div>
          </div>

          <!-- Cargo and Container Spec -->
          <div style="min-height: 220px; border-bottom: 2px solid #0f172a;">
            <table class="cargo-table">
              <thead>
                <tr>
                  <th style="width: 35px; text-align: center;">Item</th>
                  <th>Container No.</th>
                  <th>Equipment Type</th>
                  <th>Seal No.</th>
                  <th style="text-align: right;">Gross Weight</th>
                  <th style="text-align: right;">Measurement</th>
                </tr>
              </thead>
              <tbody>
                ${containerRowsHtml || '<tr><td colspan="6" style="text-align: center; padding: 25px; color: #94a3b8;">No container equipment registered</td></tr>'}
              </tbody>
            </table>
          </div>

          <!-- Cargo Summary & Terms -->
          <div class="grid-3">
            <div class="cell">
              <div class="cell-label">FREIGHT & CHARGES PAYMENT</div>
              <div class="cell-content" style="text-transform: uppercase; font-weight: 800; color: #170e5e;">
                FREIGHT ${job.payment_term === 'collect' ? 'COLLECT' : 'PREPAID'}
              </div>
            </div>
            <div class="cell">
              <div class="cell-label">NUMBER OF ORIGINAL B/Ls</div>
              <div class="cell-content"><strong>${job.bl_type === 'sea_waybill' ? 'ZERO (SEA WAYBILL)' : 'THREE (3)'}</strong></div>
            </div>
            <div class="cell">
              <div class="cell-label">TOTAL EQUIPMENT & WEIGHT</div>
              <div class="cell-content">
                <strong>${containersList.length} Container(s)</strong> | ${totalWeight.toLocaleString()} KG | ${totalCbm.toFixed(2)} CBM
              </div>
            </div>
          </div>

          <!-- Footer & Signature -->
          <div class="bl-footer">
            <div class="legal-notice">
              Received by the Carrier in apparent good order and condition, unless otherwise noted hereon, the total number of Containers or packages stated above for carriage to the specified destination. In witness whereof, the Carrier has signed the specified number of Bills of Lading, all of this tenor and date, one of which being accomplished, the others to stand void.
            </div>
            <div class="signature-box">
              <div style="font-size: 8.5px; font-weight: 700; color: #475569;">FOR AND ON BEHALF OF THE CARRIER</div>
              <div class="sign-line">${companyName}</div>
              <div style="font-size: 8px; color: #94a3b8; margin-top: 3px;">Date: ${new Date().toLocaleDateString('en-GB')}</div>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
  }, 400);
}

/**
 * Generates and prints an official Delivery Order (إذن التسليم الملاحي - D/O)
 * addressed to the Port Terminal & Customs Clearance Authorities.
 */
export function printDeliveryOrder(job: MaritimeJob, containers: MaritimeContainer[] = [], companyName = 'منظومة Z-Systems للشحن الملاحي') {
  const printWindow = window.open('', '_blank', 'width=950,height=1000');
  if (!printWindow) return;

  const containersList = containers.length > 0 ? containers : (job.containers || []);
  const doNumber = `DO-${job.job_number}`;

  const containerListHtml = containersList.map((c, i) => `
    <tr>
      <td style="text-align: center;">${i + 1}</td>
      <td style="font-family: monospace; font-weight: 800; color: #170e5e;">${c.container_number}</td>
      <td>${c.container_type}</td>
      <td style="font-family: monospace;">${c.seal_number || '—'}</td>
      <td>${c.free_days || 14} يوم</td>
      <td style="font-weight: 700; color: #dc2626;">${c.return_deadline || '—'}</td>
    </tr>
  `).join('');

  const html = `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
      <head>
        <meta charset="utf-8" />
        <title>إذن تسليم ملاحي - ${doNumber}</title>
        <style>
          @page { size: A4 portrait; margin: 12mm; }
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 12px; color: #0f172a; margin: 0; padding: 20px; line-height: 1.5; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #170e5e; padding-bottom: 15px; margin-bottom: 20px; }
          .brand { font-size: 20px; font-weight: 900; color: #170e5e; }
          .do-badge { background: #eff6ff; border: 2px solid #3b82f6; border-radius: 8px; padding: 10px 18px; text-align: center; }
          .do-badge h3 { margin: 0; font-size: 16px; color: #1e40af; }
          .do-badge span { font-family: monospace; font-size: 14px; font-weight: 800; }
          
          .addressee-box { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 14px 18px; margin-bottom: 20px; }
          .addressee-title { font-weight: 800; font-size: 13px; color: #170e5e; margin-bottom: 6px; }
          
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 20px; }
          .info-card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 14px; }
          .info-row { display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 11.5px; }
          .info-row span:first-child { color: #64748b; font-weight: 600; }
          .info-row span:last-child { font-weight: 700; color: #0f172a; }
          
          table { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
          th { background: #f1f5f9; border: 1px solid #cbd5e1; padding: 8px 10px; font-size: 11px; font-weight: 800; color: #334155; text-align: right; }
          td { border: 1px solid #e2e8f0; padding: 8px 10px; font-size: 11.5px; }
          
          .terms-box { border: 1px dashed #f59e0b; background: #fffbeb; padding: 12px 15px; border-radius: 8px; font-size: 11px; color: #92400e; margin-bottom: 25px; line-height: 1.6; }
          .stamp-area { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; text-align: center; margin-top: 30px; }
          .stamp-box { border: 1px dashed #94a3b8; border-radius: 8px; padding: 15px 10px; min-height: 80px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="brand">${companyName}</div>
            <div style="font-size: 11px; color: #64748b; margin-top: 2px;">قطاع الشحن الملاحي واللوجستيات والموانئ</div>
            <div style="font-size: 11px; color: #475569; margin-top: 2px;">تاريخ الإصدار: <strong>${new Date().toLocaleDateString('ar-EG')}</strong></div>
          </div>
          <div class="do-badge">
            <h3>إذن تسليم ملاحي (DELIVERY ORDER)</h3>
            <span>رقم الإذن: ${doNumber}</span>
          </div>
        </div>

        <div class="addressee-box">
          <div class="addressee-title">إلى السادة / هيئة الميناء ومصلحة الجمارك ومحطة الحاويات بميناء (${job.pod_name}):</div>
          <div>نرجو التكرم بتسليم الشحنة والحاويات المبينة بياناتها أدناه إلى السادة: <strong>${job.customer_name}</strong> أو من ينوب عنهم رسمياً من السادة المستخلصين الجمركيين المعتمدين، وذلك بعد سداد كافة الرسوم الجمركية والمصروفات المينائية المقررة طبقاً للأصول المتبعة.</div>
        </div>

        <div class="info-grid">
          <div class="info-card">
            <div class="info-row"><span>رقم أمر التشغيل (Job No):</span><span>${job.job_number}</span></div>
            <div class="info-row"><span>رقم البوليصة الملاحية (B/L):</span><span>${job.hbl_number || job.mbl_number || '—'}</span></div>
            <div class="info-row"><span>الخط الملاحي الناقل:</span><span>${job.shipping_line_name}</span></div>
            <div class="info-row"><span>رقم الحجز (Booking No):</span><span>${job.booking_number || '—'}</span></div>
          </div>
          <div class="info-card">
            <div class="info-row"><span>اسم السفينة (Vessel):</span><span>${job.vessel_name || '—'}</span></div>
            <div class="info-row"><span>رقم الرحلة (Voyage):</span><span>${job.voyage_number || '—'}</span></div>
            <div class="info-row"><span>ميناء الشحن (POL):</span><span>${job.pol_name} (${job.pol_code})</span></div>
            <div class="info-row"><span>ميناء الوصول (POD):</span><span>${job.pod_name} (${job.pod_code})</span></div>
          </div>
        </div>

        <h4 style="margin: 0 0 10px; color: #170e5e; font-size: 13px;">بيان الحاويات المفرجة والمصرح بخروجها:</h4>
        <table>
          <thead>
            <tr>
              <th style="width: 30px; text-align: center;">#</th>
              <th>رقم الحاوية (Container No)</th>
              <th>المقاس والنوع</th>
              <th>رقم السيل الملاحي (Seal)</th>
              <th>أيام السماح (Free Days)</th>
              <th>تاريخ مهلة الإرجاع الأخير</th>
            </tr>
          </thead>
          <tbody>
            ${containerListHtml || '<tr><td colspan="6" style="text-align: center; color: #94a3b8;">لا توجد حاويات مسجلة</td></tr>'}
          </tbody>
        </table>

        <div class="terms-box">
          <strong>تنبيه هام بشأن الحاويات الفارغة:</strong><br/>
          يلتزم المستورد أو المستخلص المفوض بإعادة الحاويات فارغة ونظيفة وبحالة سليمة تماماً إلى ساحة الخط الملاحي المعتمدة بالميناء قبل انقضاء تاريخ مهلة الإرجاع الموضح بالجدول أعلاه، تجنباً لاحتساب غرامات الأرضيات والتأخير اليومية المقررة طبقاً للائحة التوكيل الملاحي.
        </div>

        <div class="stamp-area">
          <div class="stamp-box">
            <div style="font-weight: 700; color: #475569;">توقيع وخاتم التوكيل الملاحي / وكيل الشحن</div>
            <div style="margin-top: 35px; font-weight: 800; color: #170e5e;">${companyName}</div>
          </div>
          <div class="stamp-box">
            <div style="font-weight: 700; color: #475569;">اعتماد مصلحة الجمارك</div>
          </div>
          <div class="stamp-box">
            <div style="font-weight: 700; color: #475569;">أمن وبوابة خروج الميناء</div>
          </div>
        </div>
      </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
  }, 400);
}

/**
 * Generates and prints an Arrival Notice & Cargo Manifest for the consignee.
 */
export function printArrivalNotice(job: MaritimeJob, containers: MaritimeContainer[] = [], companyName = 'منظومة Z-Systems للشحن الملاحي') {
  const printWindow = window.open('', '_blank', 'width=950,height=1000');
  if (!printWindow) return;

  const containersList = containers.length > 0 ? containers : (job.containers || []);

  const html = `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
      <head>
        <meta charset="utf-8" />
        <title>إشعار وصول شحنة - ${job.job_number}</title>
        <style>
          @page { size: A4 portrait; margin: 12mm; }
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 12px; color: #0f172a; margin: 0; padding: 25px; line-height: 1.6; }
          .header { border-bottom: 2px solid #170e5e; padding-bottom: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; }
          .title { font-size: 20px; font-weight: 900; color: #170e5e; }
          .notice-card { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 10px; padding: 15px 20px; margin-bottom: 20px; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px; }
          .card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          th { background: #f8fafc; border: 1px solid #cbd5e1; padding: 8px; font-size: 11px; text-align: right; }
          td { border: 1px solid #e2e8f0; padding: 8px; font-size: 11px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="title">إشعار وصول شحنة ملاحية (ARRIVAL NOTICE)</div>
            <div style="font-size: 11px; color: #64748b;">${companyName} — عمليات الموانئ والتخليص</div>
          </div>
          <div style="text-align: left; font-weight: 700; color: #170e5e;">
            التاريخ: ${new Date().toLocaleDateString('ar-EG')}<br/>
            الملف: #${job.job_number}
          </div>
        </div>

        <div class="notice-card">
          السادة / <strong>${job.customer_name}</strong> المحترمون،<br/>
          يسعدنا إحاطة سيادتكم بوصول السفينة الناقلة لشحنتكم إلى ميناء الوصول المبين أدناه. يرجى التكرم ببدء تجهيز المستندات وسداد الرسوم لاستلام إذن التسليم الملاحي (D/O).
        </div>

        <div class="grid">
          <div class="card">
            <div>السفينة: <strong>${job.vessel_name || '—'}</strong></div>
            <div>رقم الرحلة: <strong>${job.voyage_number || '—'}</strong></div>
            <div>الخط الملاحي: <strong>${job.shipping_line_name}</strong></div>
            <div>رقم البوليصة: <strong>${job.hbl_number || job.mbl_number || '—'}</strong></div>
          </div>
          <div class="card">
            <div>ميناء الشحن: <strong>${job.pol_name}</strong></div>
            <div>ميناء الوصول: <strong>${job.pod_name}</strong></div>
            <div>موعد الوصول الفعلي/المتوقع: <strong>${job.eta || 'قيد المتابعة'}</strong></div>
            <div>شرط السداد: <strong>${job.payment_term === 'collect' ? 'Freight Collect (تحصيل)' : 'Freight Prepaid (مدفوع مقدماً)'}</strong></div>
          </div>
        </div>

        <h4 style="margin: 15px 0 5px; color: #170e5e;">الحاويات ومواصفات الشحنة (${containersList.length} حاوية):</h4>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>رقم الحاوية</th>
              <th>النوع والمقاس</th>
              <th>رقم السيل</th>
              <th>الوزن الإجمالي</th>
              <th>فترة السماح بالميناء</th>
            </tr>
          </thead>
          <tbody>
            ${containersList.map((c, i) => `
              <tr>
                <td>${i + 1}</td>
                <td style="font-family: monospace; font-weight: bold;">${c.container_number}</td>
                <td>${c.container_type}</td>
                <td>${c.seal_number || '—'}</td>
                <td>${Number(c.gross_weight_kg || 0).toLocaleString()} كجم</td>
                <td>${c.free_days || 14} يوم من التفريغ</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div style="margin-top: 35px; border-top: 1px solid #e2e8f0; padding-top: 15px; font-size: 11px; color: #64748b; text-align: center;">
          لأي استفسارات بخصوص إجراءات الإفراج أو سداد النولون يرجى التواصل مع فريق العمليات اللوجستية لدى ${companyName}.
        </div>
      </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
  }, 400);
}

/**
 * Generates and prints a formal Carrier Rate Dispute Notice (مذكرة نزاع مالي مع الخط الملاحي)
 * conforming to international freight forwarding rate audit standards.
 */
export function printCarrierDisputeNote(
  job: MaritimeJob,
  invoice: any,
  dispute: any,
  companyName = 'منظومة Z-Systems للشحن الملاحي',
) {
  const printWindow = window.open('', '_blank', 'width=950,height=1000');
  if (!printWindow) return;

  const disputeNo = dispute?.disputeNumber || dispute?.dispute_number || `DISP-${job.job_number}`;
  const invNo = invoice?.invoiceNumber || invoice?.invoice_number || '—';
  const carrier = invoice?.carrierName || invoice?.carrier_name || job.shipping_line_name || 'Shipping Line';
  const currency = invoice?.currency || 'USD';
  const invoicedTotal = Number(invoice?.totalInvoicedAmount || invoice?.total_invoiced_amount || 0);
  const contractedTotal = Number(invoice?.contractedAmount || invoice?.contracted_amount || 0);
  const varianceAmount = Number(dispute?.disputedAmount || dispute?.disputed_amount || invoice?.varianceAmount || invoice?.variance_amount || (invoicedTotal - contractedTotal));
  const variancePct = contractedTotal > 0 ? ((varianceAmount / contractedTotal) * 100).toFixed(1) : '0.0';
  const reason = dispute?.disputeReason || dispute?.dispute_reason || 'فروق أسعار عن التعرفة المعتمدة ببطاقة الأسعار المتعاقد عليها';

  const html = `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
      <head>
        <meta charset="utf-8" />
        <title>إشعار نزاع مالي - ${disputeNo}</title>
        <style>
          @page { size: A4 portrait; margin: 15mm; }
          body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; font-size: 12px; color: #0f172a; margin: 0; padding: 20px; line-height: 1.5; }
          .dispute-header { border-bottom: 2px solid #170e5e; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-start; }
          .title { font-size: 18px; font-weight: 900; color: #170e5e; margin: 0; }
          .badge-dispute { background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; padding: 4px 10px; border-radius: 6px; font-weight: 800; font-size: 11px; }
          .meta-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin-bottom: 16px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; font-size: 11.5px; }
          .meta-item strong { display: block; color: #64748b; font-size: 10px; text-transform: uppercase; margin-bottom: 2px; }
          .meta-item span { font-weight: 700; color: #0f172a; }
          .table-container { margin: 16px 0; }
          table { width: 100%; border-collapse: collapse; text-align: right; font-size: 11.5px; }
          th { background: #170e5e; color: #ffffff; padding: 8px 10px; font-weight: 700; }
          td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; }
          .overcharge-row { background: #fef2f2; font-weight: 800; color: #b91c1c; }
          .notice-box { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 12px; margin: 16px 0; font-size: 11.5px; color: #1e40af; line-height: 1.6; }
          .sign-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-top: 40px; text-align: center; }
          .sign-box { border-top: 1px dashed #94a3b8; padding-top: 8px; font-size: 11px; font-weight: 700; color: #334155; }
        </style>
      </head>
      <body>
        <div class="dispute-header">
          <div>
            <div class="title">إشعار نزاع مالي وتدقيق تعرفة الشحن (Freight Rate Dispute Notice)</div>
            <div style="font-size: 11px; color: #64748b; margin-top: 4px;">صادر من: ${companyName} | موجه إلى: <strong>${carrier}</strong></div>
          </div>
          <div style="text-align: left;">
            <div class="badge-dispute">مذكرة نزاع رسمي</div>
            <div style="font-family: monospace; font-size: 12px; font-weight: 800; margin-top: 4px;">${disputeNo}</div>
          </div>
        </div>

        <div class="meta-box">
          <div class="meta-item">
            <strong>رقم العملية / الشحنة:</strong>
            <span>${job.job_number}</span>
          </div>
          <div class="meta-item">
            <strong>رقم بوليصة الشحن MBL:</strong>
            <span style="font-family: monospace;">${job.mbl_number || '—'}</span>
          </div>
          <div class="meta-item">
            <strong>رقم الحجز الملاحي:</strong>
            <span style="font-family: monospace;">${job.booking_number || '—'}</span>
          </div>
          <div class="meta-item">
            <strong>السفينة والرحلة:</strong>
            <span>${job.vessel_name || '—'} ${job.voyage_number ? `(${job.voyage_number})` : ''}</span>
          </div>
          <div class="meta-item">
            <strong>مسار الرحلة (POL → POD):</strong>
            <span>${job.pol_name} (${job.pol_code}) ← ${job.pod_name} (${job.pod_code})</span>
          </div>
          <div class="meta-item">
            <strong>رقم فاتورة الناقل المتنازع عليها:</strong>
            <span style="font-family: monospace; color: #b91c1c;">${invNo}</span>
          </div>
        </div>

        <h4 style="margin: 14px 0 6px; color: #170e5e; font-size: 13px;">تفاصيل التدقيق المالي ومقارنة التعرفة المتعاقد عليها:</h4>
        <table>
          <thead>
            <tr>
              <th>بيان المقارنة المالية</th>
              <th>التعرفة المتعاقد عليها (Contracted)</th>
              <th>فاتورة الخط الملاحي (Invoiced)</th>
              <th>الفارق المالي (Variance)</th>
              <th>نسبة الزيادة</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>إجمالي النولون والمصروفات البحرية</td>
              <td style="font-weight: 700;">${currency} ${contractedTotal.toLocaleString()}</td>
              <td style="font-weight: 700; color: #b91c1c;">${currency} ${invoicedTotal.toLocaleString()}</td>
              <td style="font-weight: 800; color: #b91c1c;">+${currency} ${varianceAmount.toLocaleString()}</td>
              <td style="font-weight: 800; color: #b91c1c;">+${variancePct}%</td>
            </tr>
            <tr class="overcharge-row">
              <td colspan="3">المبلغ المتنازع عليه والمطلوب استبعاده / إصدار إشعار دائن به:</td>
              <td colspan="2" style="font-size: 13px;">${currency} ${varianceAmount.toLocaleString()}</td>
            </tr>
          </tbody>
        </table>

        <div class="notice-box">
          <strong>سبب النزاع والمطالبة:</strong><br />
          ${reason}<br /><br />
          نحيطكم علماً بأنه بموجب الاتفاقية وبطاقة الأسعار المعتمدة بين شركتنا والخط الملاحي، فإن التعرفة المتفق عليها لهذه الشحنة هي <strong>${currency} ${contractedTotal.toLocaleString()}</strong>.
          يرجى التكرم بتعديل الفاتورة أو إصدار إشعار دائن (Credit Note) بمبلغ <strong>${currency} ${varianceAmount.toLocaleString()}</strong> لإتمام عملية الصرف والتسوية المالية دون تأخير.
        </div>

        <div class="sign-grid">
          <div class="sign-box">
            قسم تدقيق الحسابات والتعرفات الملاحية<br />
            <strong>${companyName}</strong>
          </div>
          <div class="sign-box">
            اعتماد التوكيل / الخط الملاحي<br />
            <strong>${carrier}</strong>
          </div>
        </div>
      </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
  }, 400);
}

/**
 * Generates and prints a standardized IATA Neutral Air Waybill (AWB)
 * conforming to IATA Cargo Services Conference Resolutions.
 */
export function printAirWaybill(job: MaritimeJob, companyName = 'منظومة Z-Systems للشحن والخدمات اللوجستية') {
  const printWindow = window.open('', '_blank', 'width=950,height=1000');
  if (!printWindow) return;

  const awbNumber = job.mawb_number || job.hawb_number || job.job_number;
  const grossWeight = Number(job.gross_weight_kg || 0);
  const chargeableWeight = Number(job.chargeable_weight_kg || job.gross_weight_kg || 0);
  const totalCbm = Number(job.total_cbm || 0);
  const packages = Number(job.package_count || 1);

  const html = `
    <!DOCTYPE html>
    <html dir="ltr" lang="en">
      <head>
        <meta charset="utf-8" />
        <title>Air Waybill - ${awbNumber}</title>
        <style>
          @page { size: A4 portrait; margin: 10mm; }
          body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 11px; color: #0f172a; margin: 0; padding: 12px; line-height: 1.3; }
          .awb-container { border: 2px solid #0f172a; }
          .awb-header { display: grid; grid-template-columns: 2fr 1.2fr; border-bottom: 2px solid #0f172a; }
          .awb-title-box { padding: 12px; background: #f8fafc; border-left: 2px solid #0f172a; text-align: center; }
          .awb-title { font-size: 17px; font-weight: 900; letter-spacing: 1.5px; color: #170e5e; margin: 0 0 4px; }
          .awb-doc-num { font-size: 15px; font-weight: 800; color: #0f172a; font-family: monospace; }
          .awb-forwarder { padding: 12px; }
          .awb-forwarder h2 { margin: 0 0 2px; font-size: 16px; color: #170e5e; }

          .grid-2 { display: grid; grid-template-columns: 1fr 1fr; border-bottom: 1px solid #0f172a; }
          .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; border-bottom: 1px solid #0f172a; }
          .grid-4 { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; border-bottom: 1px solid #0f172a; }

          .cell { padding: 6px 10px; border-right: 1px solid #0f172a; }
          .cell:last-child { border-right: none; }
          .cell-label { font-size: 8px; font-weight: 800; text-transform: uppercase; color: #475569; margin-bottom: 2px; }
          .cell-content { font-size: 10.5px; font-weight: 600; min-height: 24px; }

          table.cargo-table { width: 100%; border-collapse: collapse; margin: 0; }
          table.cargo-table th { background: #f1f5f9; border-bottom: 2px solid #0f172a; border-right: 1px solid #cbd5e1; padding: 6px 8px; font-size: 8.5px; font-weight: 800; text-transform: uppercase; text-align: left; }
          table.cargo-table td { padding: 7px 8px; border-bottom: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0; font-size: 10.5px; }
          table.cargo-table th:last-child, table.cargo-table td:last-child { border-right: none; }

          .awb-footer { display: grid; grid-template-columns: 2fr 1fr; border-top: 2px solid #0f172a; font-size: 8.5px; }
          .legal-notice { padding: 8px 10px; color: #64748b; font-size: 8px; line-height: 1.25; border-right: 1px solid #0f172a; }
          .signature-box { padding: 8px 10px; text-align: center; }
          .sign-line { margin-top: 36px; border-top: 1px dashed #475569; padding-top: 4px; font-weight: 700; }
        </style>
      </head>
      <body>
        <div class="awb-container">
          <div class="awb-header">
            <div class="awb-forwarder">
              <h2>${companyName}</h2>
              <div style="color: #475569; font-size: 9px;">INTERNATIONAL AIR FREIGHT FORWARDING & LOGISTICS (IATA CARGO AGENT)</div>
              <div style="margin-top: 4px; font-size: 10px;">Air Carrier / Airline: <strong>${job.shipping_line_name}</strong></div>
            </div>
            <div class="awb-title-box">
              <div class="awb-title">AIR WAYBILL</div>
              <div class="awb-doc-num">AWB NO: ${awbNumber}</div>
              <div style="font-size: 9px; color: #64748b; margin-top: 3px;">Job Ref: ${job.job_number}</div>
            </div>
          </div>

          <div class="grid-2">
            <div class="cell">
              <div class="cell-label">1. SHIPPER'S NAME AND ADDRESS</div>
              <div class="cell-content">${job.shipper_details || 'AS PER COMMERCIAL INVOICE'}</div>
            </div>
            <div class="cell">
              <div class="cell-label">AIRLINE BOOKING / FLIGHT DETAILS</div>
              <div class="cell-content">
                <strong>Flight: ${job.flight_number || 'TBA'}</strong> | Date: <strong>${job.flight_date || job.etd || 'TBA'}</strong><br/>
                ${job.hawb_number ? `<span style="font-size: 9px; color: #475569;">HAWB: ${job.hawb_number}</span>` : ''}
              </div>
            </div>
          </div>

          <div class="grid-2">
            <div class="cell">
              <div class="cell-label">2. CONSIGNEE'S NAME AND ADDRESS</div>
              <div class="cell-content"><strong>${job.customer_name}</strong><br/>${job.consignee_details || 'DIRECT AIR DELIVERY'}</div>
            </div>
            <div class="cell">
              <div class="cell-label">3. ISSUING CARRIER'S AGENT / NOTIFY PARTY</div>
              <div class="cell-content">${job.notify_party || companyName}</div>
            </div>
          </div>

          <div class="grid-4">
            <div class="cell">
              <div class="cell-label">AIRPORT OF DEPARTURE (POL)</div>
              <div class="cell-content"><strong>${job.pol_name}</strong><br/><span style="font-family: monospace; font-size: 10px;">IATA: ${job.pol_code}</span></div>
            </div>
            <div class="cell">
              <div class="cell-label">AIRPORT OF DESTINATION (POD)</div>
              <div class="cell-content"><strong>${job.pod_name}</strong><br/><span style="font-family: monospace; font-size: 10px;">IATA: ${job.pod_code}</span></div>
            </div>
            <div class="cell">
              <div class="cell-label">CARGO NATURE / TYPE</div>
              <div class="cell-content"><strong>${job.air_cargo_type || 'General Cargo'}</strong></div>
            </div>
            <div class="cell">
              <div class="cell-label">CHGS CODES / PAYMENT</div>
              <div class="cell-content"><strong>${job.payment_term?.toUpperCase() || 'PREPAID'}</strong></div>
            </div>
          </div>

          <table class="cargo-table">
            <thead>
              <tr>
                <th style="width: 50px;">No. of Pieces</th>
                <th style="width: 100px;">Gross Weight</th>
                <th style="width: 80px;">Rate Class</th>
                <th style="width: 110px;">Chargeable Weight</th>
                <th style="width: 90px;">Volume (CBM)</th>
                <th>Nature and Quantity of Goods (incl. Dimensions)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="font-weight: 700; text-align: center;">${packages} PCS</td>
                <td style="font-weight: 700;">${grossWeight.toLocaleString()} KG</td>
                <td style="text-align: center;">Q (Quantity)</td>
                <td style="font-weight: 800; color: #170e5e;">${chargeableWeight.toLocaleString()} KG</td>
                <td>${totalCbm.toFixed(2)} CBM</td>
                <td>
                  <strong>${job.notes || 'Air Freight Cargo / General Merchandise'}</strong><br/>
                  <span style="font-size: 9px; color: #64748b;">Handling: Keep Dry | Standard Air Cargo Security Screened</span>
                </td>
              </tr>
            </tbody>
          </table>

          <div class="awb-footer">
            <div class="legal-notice">
              It is agreed that the goods described herein are accepted in apparent good order and condition for carriage SUBJECT TO THE CONDITIONS OF CONTRACT ON THE REVERSE HEREOF. ALL GOODS MAY BE CARRIED BY ANY OTHER MEANS INCLUDING ROAD OR ANY OTHER AIR CARRIER. The Warsaw Convention or the Montreal Convention may be applicable.
            </div>
            <div class="signature-box">
              <div style="font-weight: 700;">${companyName}</div>
              <div style="font-size: 8px; color: #64748b;">Signature of Issuing Carrier or its Agent</div>
              <div class="sign-line">Authorized Signatory</div>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
  }, 400);
}

/**
 * Generates and prints a Cargo Insurance Certificate
 * for marine, air, and multimodal cargo policies.
 */
export function printCargoInsuranceCertificate(job: MaritimeJob, insurance: any, companyName = 'منظومة Z-Systems للشحن والتأمين الملاحي') {
  const printWindow = window.open('', '_blank', 'width=900,height=950');
  if (!printWindow) return;

  const coverageLabels: Record<string, string> = {
    all_risks: 'تأمين شامل ضد كافة الأخطار (All Risks)',
    clauses_a: 'شروط مجمع مكتتبي التأمين - أ (Institute Cargo Clauses A)',
    clauses_b: 'شروط مجمع مكتتبي التأمين - ب (Institute Cargo Clauses B)',
    clauses_c: 'شروط مجمع مكتتبي التأمين - ج (Institute Cargo Clauses C)',
  };

  const html = `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
      <head>
        <meta charset="utf-8" />
        <title>شهادة تأمين بضائع - ${insurance.policy_number || insurance.policyNumber}</title>
        <style>
          @page { size: A4 portrait; margin: 15mm; }
          body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; font-size: 12px; color: #0f172a; margin: 0; padding: 20px; line-height: 1.5; }
          .cert-border { border: 3px double #170e5e; padding: 24px; border-radius: 8px; background: #ffffff; }
          .cert-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 16px; margin-bottom: 20px; }
          .cert-title { font-size: 20px; font-weight: 800; color: #170e5e; margin: 0 0 6px; }
          .policy-badge { background: #f1f5f9; border: 1px solid #cbd5e1; padding: 8px 14px; border-radius: 6px; text-align: left; font-family: monospace; font-weight: 800; font-size: 13px; }
          
          .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 16px; }
          .field-box { background: #f8fafc; border: 1px solid #e2e8f0; padding: 10px 12px; border-radius: 6px; }
          .field-label { font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 3px; }
          .field-val { font-size: 13px; font-weight: 700; color: #0f172a; }

          .highlight-card { background: #eff6ff; border: 1.5px solid #3b82f6; border-radius: 8px; padding: 14px; margin-bottom: 18px; display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
          .notice-box { background: #fffbeb; border: 1px solid #fef3c7; border-radius: 6px; padding: 12px; font-size: 11px; color: #92400e; margin-bottom: 24px; line-height: 1.4; }
          
          .sign-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 30px; text-align: center; }
          .sign-box { border-top: 1px dashed #64748b; padding-top: 8px; font-size: 11px; font-weight: 700; }
        </style>
      </head>
      <body>
        <div class="cert-border">
          <div class="cert-header">
            <div>
              <div class="cert-title">شهادة تأمين ونقل البضائع الدولية</div>
              <div style="color: #64748b; font-size: 11px;">CARGO TRANSPORT INSURANCE CERTIFICATE</div>
              <div style="font-weight: 700; color: #170e5e; margin-top: 4px;">${companyName}</div>
            </div>
            <div class="policy-badge">
              <div style="font-size: 9px; color: #64748b; font-family: sans-serif;">رقم الوثيقة / POLICY NO.</div>
              <div>${insurance.policy_number || insurance.policyNumber}</div>
            </div>
          </div>

          <div class="highlight-card">
            <div>
              <div class="field-label">القيمة الإجمالية المؤمن عليها (INSURED VALUE)</div>
              <div class="field-val" style="font-size: 16px; color: #1d4ed8;">
                ${insurance.currency || 'USD'} ${Number(insurance.insured_value || insurance.insuredValue || 0).toLocaleString()}
              </div>
            </div>
            <div>
              <div class="field-label">قسط التأمين المسدد (PREMIUM PAID)</div>
              <div class="field-val" style="font-size: 16px; color: #047857;">
                ${insurance.currency || 'USD'} ${Number(insurance.premium_amount || insurance.premiumAmount || 0).toLocaleString()}
              </div>
            </div>
          </div>

          <div class="grid-2">
            <div class="field-box">
              <div class="field-label">المؤمَّن له (THE INSURED)</div>
              <div class="field-val">${job.customer_name}</div>
            </div>
            <div class="field-box">
              <div class="field-label">شركة التأمين الضامنة (UNDERWRITER)</div>
              <div class="field-val">${insurance.insurance_company || insurance.insuranceCompany}</div>
            </div>
            <div class="field-box">
              <div class="field-label">نوع ونطاق التغطية التأمينية (COVERAGE TYPE)</div>
              <div class="field-val">${coverageLabels[insurance.coverage_type || insurance.coverageType] || insurance.coverage_type || 'All Risks'}</div>
            </div>
            <div class="field-box">
              <div class="field-label">تاريخ السريان / الإصدار (ISSUE DATE)</div>
              <div class="field-val">${insurance.issue_date || insurance.issueDate || '—'}</div>
            </div>
            <div class="field-box">
              <div class="field-label">ميناء/مطار الشحن (ORIGIN)</div>
              <div class="field-val">${job.pol_name} (${job.pol_code})</div>
            </div>
            <div class="field-box">
              <div class="field-label">ميناء/مطار الوصول (DESTINATION)</div>
              <div class="field-val">${job.pod_name} (${job.pod_code})</div>
            </div>
            <div class="field-box">
              <div class="field-label">رقم أمر التشغيل / الشحنة (JOB REF)</div>
              <div class="field-val" style="font-family: monospace;">${job.job_number}</div>
            </div>
            <div class="field-box">
              <div class="field-label">الناقل / وسيلة النقل (CARRIER / VESSEL / FLIGHT)</div>
              <div class="field-val">${job.flight_number ? `رحلة: ${job.flight_number}` : job.vessel_name ? `سفينة: ${job.vessel_name}` : job.shipping_line_name}</div>
            </div>
          </div>

          <div class="notice-box">
            <strong>إشعار وشروط المطالبة بالتعويض:</strong><br />
            تغطي هذه الوثيقة البضائع الموضحة أعلاه أثناء النقل الدولي من مستودع الشاحن حتى مستودع المستلم النهائي. في حال حدوث أي عجز أو تلف أو هلاك كلي/جزئي للبضائع، يجب إخطار شركة التأمين فوراً وطلب معاينة مشتركة قبل استلام البضاعة أو خلال مهلة لا تتجاوز 3 أيام عمل من تاريخ الوصول.
          </div>

          <div class="sign-grid">
            <div class="sign-box">
              ختم واعتماد وسيط الشحن والتأمين<br />
              <strong>${companyName}</strong>
            </div>
            <div class="sign-box">
              اعتماد شركة التأمين<br />
              <strong>${insurance.insurance_company || insurance.insuranceCompany}</strong>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
  }, 400);
}

/**
 * Generates and prints a Transit & Bonded Warehouse Intake / Storage Receipt
 * (إذن استلام وإيداع مستودع بضائع ترانزيت / إيداع جمركي)
 */
export function printWarehouseReceipt(job: MaritimeJob, receipt: any, companyName = 'منظومة Z-Systems للمستودعات اللوجستية') {
  const printWindow = window.open('', '_blank', 'width=900,height=950');
  if (!printWindow) return;

  const html = `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
      <head>
        <meta charset="utf-8" />
        <title>إذن استلام وإيداع مستودع - ${receipt.receipt_number || receipt.receiptNumber}</title>
        <style>
          @page { size: A4 portrait; margin: 15mm; }
          body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; font-size: 12px; color: #0f172a; margin: 0; padding: 20px; line-height: 1.5; }
          .receipt-border { border: 2px solid #0f172a; padding: 24px; border-radius: 8px; background: #ffffff; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0f172a; padding-bottom: 14px; margin-bottom: 20px; }
          .title { font-size: 18px; font-weight: 800; color: #170e5e; margin: 0 0 4px; }
          .receipt-badge { background: #f8fafc; border: 1.5px solid #0f172a; padding: 8px 14px; border-radius: 6px; text-align: center; font-family: monospace; font-weight: 800; font-size: 14px; }

          .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-bottom: 16px; }
          .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; }
          .box { background: #f8fafc; border: 1px solid #cbd5e1; padding: 10px 12px; border-radius: 6px; }
          .box-label { font-size: 10px; font-weight: 700; color: #64748b; margin-bottom: 2px; }
          .box-val { font-size: 13px; font-weight: 700; color: #0f172a; }

          .storage-card { background: #f0fdf4; border: 1.5px solid #22c55e; border-radius: 8px; padding: 14px; margin-bottom: 18px; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th { background: #f1f5f9; border: 1px solid #cbd5e1; padding: 8px 10px; font-size: 11px; font-weight: 800; text-align: right; }
          td { border: 1px solid #cbd5e1; padding: 8px 10px; font-size: 12px; }

          .sign-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 24px; margin-top: 36px; text-align: center; }
          .sign-box { border-top: 1px dashed #64748b; padding-top: 8px; font-size: 11px; font-weight: 700; }
        </style>
      </head>
      <body>
        <div class="receipt-border">
          <div class="header">
            <div>
              <div class="title">إذن استلام وإيداع مستودع لوجستي / جمركي</div>
              <div style="color: #64748b; font-size: 10.5px;">WAREHOUSE INTAKE & STORAGE RECEIPT (MWR)</div>
              <div style="font-weight: 700; color: #170e5e; margin-top: 4px;">${companyName}</div>
            </div>
            <div class="receipt-badge">
              <div style="font-size: 9px; color: #64748b; font-family: sans-serif;">رقم الإذن / RECEIPT NO.</div>
              <div>${receipt.receipt_number || receipt.receiptNumber}</div>
            </div>
          </div>

          <div class="storage-card">
            <div>
              <div class="box-label">عدد الطرود / الطبالي</div>
              <div class="box-val" style="color: #15803d; font-size: 16px;">${receipt.package_count || receipt.packageCount || 1} طرد / وحدة</div>
            </div>
            <div>
              <div class="box-label">الوزن الإجمالي الفعلي</div>
              <div class="box-val" style="color: #15803d; font-size: 16px;">${Number(receipt.gross_weight_kg || receipt.grossWeightKg || 0).toLocaleString()} كجم</div>
            </div>
            <div>
              <div class="box-label">الحجم الإجمالي (CBM)</div>
              <div class="box-val" style="color: #15803d; font-size: 16px;">${Number(receipt.cbm || 0).toFixed(2)} م³</div>
            </div>
          </div>

          <div class="grid-3">
            <div class="box">
              <div class="box-label">العميل / صاحب البضاعة</div>
              <div class="box-val">${job.customer_name}</div>
            </div>
            <div class="box">
              <div class="box-label">رقم الشحنة / أمر التشغيل</div>
              <div class="box-val" style="font-family: monospace;">${job.job_number}</div>
            </div>
            <div class="box">
              <div class="box-label">تاريخ ووقت الاستلام الفعلي</div>
              <div class="box-val">${receipt.received_date || receipt.receivedDate ? new Date(receipt.received_date || receipt.receivedDate).toLocaleString('ar-EG') : '—'}</div>
            </div>
          </div>

          <div class="grid-2">
            <div class="box">
              <div class="box-label">موقع التخزين والرف (BAY / RACK / BIN)</div>
              <div class="box-val" style="color: #170e5e;">${receipt.bay_rack_bin || receipt.bayRackBin || 'ساحة الاستلام والتفتيش العام'}</div>
            </div>
            <div class="box">
              <div class="box-label">حالة البضاعة بالمستودع</div>
              <div class="box-val">${receipt.warehouse_status === 'released' ? 'تم الإفراج والتسليم للعميل' : 'مودعة ومخزنة بالمستودع'}</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>ملاحظات الفحص الظاهري والمطابقة</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="min-height: 48px; color: #334155;">
                  ${receipt.notes || 'تم استلام الطرود بحالة ظاهرية سليمة ومطابقة للمستندات المرفقة دون أي عجز أو تلف ملحوظ.'}
                </td>
              </tr>
            </tbody>
          </table>

          <div class="sign-grid">
            <div class="sign-box">
              أمين المستودع المستلم<br />
              <strong>Storekeeper</strong>
            </div>
            <div class="sign-box">
              مندوب النقل / السائق المسلم<br />
              <strong>Carrier / Driver</strong>
            </div>
            <div class="sign-box">
              إدارة العمليات اللوجستية<br />
              <strong>Operations Control</strong>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
  }, 400);
}


