import{e as c}from"./browser-CGkMHTHH.js";import{b as F}from"./barcode-BGeelrMF.js";function H(e){const t=String(e||"").trim().toLowerCase();return t==="cash"?"نقدي":t==="card"?"بطاقة / فيزا":t==="wallet"?"محفظة إلكترونية":t==="instapay"?"InstaPay":t==="credit"?"آجل":t==="mixed"?"مختلط":e||"نقدي"}function Y(e,t,r,i,n,u){const s=Number(r||0),g=Number(i||0),p=n==="delivery",o=String(t||"").trim().toLowerCase();if(e==="credit")return s>.009&&s+.009<g?o==="wallet"?"سداد جزئي (محفظة + آجل)":o==="instapay"?"سداد جزئي (InstaPay + آجل)":o==="card"?"سداد جزئي (فيزا + آجل)":o==="mixed"?"سداد جزئي (مختلط + آجل)":"سداد جزئي (نقدي + آجل)":"آجل بالكامل";const d=H(t||e);if(p){if(u==="cod"||d==="نقدي"&&s<.009)return"تحصيل مع المندوب (نقدي)";if(s+.009>=g)return`خالص مسبقاً (${d})`}return d}function l(e,t,r=!0){const i=e?.[t];return typeof i=="boolean"?i:r}function B(e){return e?.printNumberFormat==="english"?"en-US":"ar-EG"}function j(e,t){return e==="receipt"&&l(t,"printCompactReceipt",!0)}function M(e,t){return e==="receipt"&&t?.posReceiptTheme||"classic"}function L(e,t){const r=B(t);if(!e)return new Date().toLocaleString(r);const i=e instanceof Date?e:new Date(e);return Number.isNaN(i.getTime())?String(e):i.toLocaleString(r)}function Z(e){const t=String(e?.invoiceFooter||"").trim();return t||"يرجى الاحتفاظ بالفاتورة. الاستبدال والاسترجاع حسب سياسة المتجر."}function O(e){const t=String(e?.storeName||"متجر").trim()||"متجر";return{brandName:t,storeName:t}}function q(e,t=!1){const r=Array.from(String(e).trim()).length;return t?r>30?"13px":r>22?"15.5px":r>15?"18.5px":r>10?"21.5px":"24px":r>30?"16px":r>22?"20px":r>15?"24px":r>10?"28px":"32px"}function I(e){return B(e)}function P(e,t,r=0){return new Intl.NumberFormat(I(t),{minimumFractionDigits:r,maximumFractionDigits:r}).format(Number(e||0))}function a(e,t){return P(Number(e||0),t,2)}function D(e,t){return new Intl.NumberFormat(I(t),{minimumFractionDigits:0,maximumFractionDigits:3}).format(Number(e||0))}function z(e,t){const r=String(e??"—");return t?.printNumberFormat!=="english"?r:r.replace(/[٠-٩]/g,i=>String("٠١٢٣٤٥٦٧٨٩".indexOf(i))).replace(/[۰-۹]/g,i=>String("۰۱۲۳۴۵۶۷۸۹".indexOf(i)))}function U(e,t=!1){const{brandName:r}=O(e),i=l(e,"printShowLogo",!0),n=l(e,"printShowPhone",!0),u=l(e,"printShowAddress",!0),s=l(e,"printShowTaxNumber",!1),g=n?z(String(e?.phone||"").trim(),e):"",p=u?String(e?.address||"").trim():"",o=s?z(String(e?.taxNumber||"").trim(),e):"",d=i?String(e?.logoData||"").trim():"",b=[g?`<div class="store-detail-line store-phone-line">${c(g)}</div>`:"",p?`<div class="store-detail-line store-address-line">${c(p)}</div>`:"",o?`<div class="store-detail-line store-tax-line">الرقم الضريبي: ${c(o)}</div>`:""].filter(Boolean).join("");return`
    <section class="invoice-card invoice-store-card${t?" compact":""}">
      <div class="invoice-brand-row"${d?"":' style="justify-content:center;"'}>
        ${d?`<div class="invoice-logo-wrapper"><img class="invoice-logo" src="${c(d)}" alt="شعار المتجر" /></div>`:""}
        <div class="invoice-brand-copy">
          <h2 title="${c(r)}" style="font-size:${q(r,t)}">${c(r)}</h2>
          ${b?`<div class="store-inline-details">${b}</div>`:""}
        </div>
      </div>
    </section>
  `}function E(e,t=!1,r){const i=e.filter(n=>String(n.value??"").trim());return i.length?`
    <section class="invoice-card invoice-meta-panel${t?" compact":""}">
      ${i.map(n=>`
        <div class="meta-line${n.isBadge?" meta-document-badge":""}">
          <span class="meta-label">${c(n.label)}${n.noColon?"":":"}</span>
          <span class="meta-value">${n.isHtml?n.value:c(z(n.value??"—",r))}</span>
        </div>
      `).join("")}
    </section>
  `:""}function V(e,t=!1,r){const i=(e||[]).map((n,u)=>{const s=n.modifiers?.length?`<div class="item-modifiers" style="font-size: 0.85em; color: #000; margin-top: 2px;">
          ${n.modifiers.map(h=>{const v=Number(h.price||0),y=Number(h.qty||1),S=v*y;return`<div style="padding: 2px 0; color: #000; font-size: 0.9em; margin-right: 8px;">
              <strong style="color: #000;">[إضافة]</strong> ${c(h.name)}
              ${y>1?` <span style="color:#000; font-size: 0.9em;">(×${y})</span>`:""}
              ${S>0?` <span style="font-weight:600; color:#000;">(+${a(S,r)})</span>`:""}
            </div>`}).join("")}
         </div>`:"",g=n.serials?.length?`<div class="item-serials" style="font-size: 0.8em; color: #000; margin-top: 2px; font-family: monospace;">
          <strong>IMEI:</strong> ${n.serials.map(c).join(", ")}
         </div>`:"",p=l(r,"printShowItemOffers",!0),o=Number(n.originalPrice||Number(n.price||0)+Number(n.offerDiscount||0)),d=Number(n.offerDiscount||Number(n.originalPrice||0)-Number(n.price||0)),b=o>Number(n.price||0)&&d>0,w=!!(n.offerName&&n.offerName.startsWith("عرض مجمع")),f=w&&n.offerName?.includes("(")?n.offerName.replace(/^عرض مجمع\s*/,"").trim():"",N=b&&p&&!w?`<div class="item-offer-line" style="font-size: 0.82em; line-height: 1.2; color: #000; margin-top: 1px;"><strong style="font-weight: 700;">عرض: ${a(Number(n.price||0),r)}</strong> <span style="font-weight: 500; color: #333; font-size: 0.95em;">بدلاً من ${a(o,r)}</span></div>`:"",C=b&&p&&f?`<div class="item-offer-line" style="font-size: 0.74em; color: #444; margin-top: 1px; font-weight: 500; line-height: 1.15; letter-spacing: -0.25px;">${c(f)}</div>`:"",$=b&&p?`<div style="line-height: 1.15;">
          <del style="display: block; text-decoration: line-through; text-decoration-thickness: 1px; color: #444; font-size: 0.82em; font-weight: 400; opacity: 0.85;">${a(o,r)}</del>
          <div style="font-weight: 600; color: #000;">${a(Number(n.price||0),r)}</div>
         </div>`:a(Number(n.price||0),r);return`
    <tr>
      ${t?"":`<td class="index-cell">${P(u+1,r)}</td>`}
      <td class="name-cell">${c(n.name||"—")}${N}${C}${s}${g}</td>
      ${t?"":`<td class="unit-cell">${c(n.unitName||"قطعة")}</td>`}
      <td class="qty-cell">${D(Number(n.qty||0),r)}</td>
      <td class="price-cell">${$}</td>
      <td class="total-cell">${a(Number(n.total||0),r)}</td>
    </tr>
    `}).join("");return`
    <section class="invoice-card invoice-items-card${t?" compact":""}">
      <table class="invoice-items-table${t?" compact":""}">
        <thead>
          <tr>
            ${t?"":"<th>#</th>"}
            <th>الصنف</th>
            ${t?"":"<th>الوحدة</th>"}
            <th>العدد</th>
            <th>السعر</th>
            <th>الإجمالي</th>
          </tr>
        </thead>
        <tbody>${i||`<tr><td colspan="${t?4:6}">لا توجد أصناف</td></tr>`}</tbody>
      </table>
    </section>
  `}function Q(e,t,r=!1){return!e||e.length<=1||!l(t,"printShowPaymentBreakdown",!0)?"":`
    <section class="invoice-card invoice-payment-card${r?" compact":""}">
      <div class="section-title">تفصيل المدفوعات</div>
      <div class="payment-grid">
        ${e.map(i=>`
          <div class="payment-chip">
            <span>${c(i.paymentChannel==="cash"?"نقدي":i.paymentChannel==="card"?"بطاقة / فيزا":i.paymentChannel==="wallet"?"محفظة إلكترونية":i.paymentChannel==="instapay"?"InstaPay":i.paymentChannel==="credit"?"آجل":"مختلط")}</span>
            <strong>${a(Number(i.amount||0),t)}</strong>
          </div>
        `).join("")}
      </div>
    </section>
  `}function _(e,t=!1,r){if(!l(r,"printShowInvoiceBarcode",!0))return"";const i=String(e||"").trim();if(!i||i==="—"||i==="مسودة")return"";const n=i.match(/(\d{6})[^\d]*(\d{3,})/),u=n?`${n[1]}${n[2]}`:i,s=F(u);return s?`
    <section class="invoice-card invoice-barcode-card${t?" compact":""}">
      <div class="invoice-barcode-svg-wrap">
        ${s}
      </div>
    </section>
  `:""}function G(e,t=!1){if(!l(e,"printShowFooter",!0))return"";const r=String(e?.invoiceFooter||"").trim()||"يرجى الاحتفاظ بالفاتورة، الاستبدال والاسترجاع حسب سياسة المتجر.";return`
    <footer class="print-footer${t?" compact":""}">
      ${c(r)}
    </footer>
  `}function W(e){const t=(e.items||[]).reduce((m,x)=>m+Number(x.qty||0),0),r=Number(e.paidAmount||0),i=Number(e.tenderedAmount||0),n=Number(e.changeAmount||0),u=Math.max(0,Number(e.total||0)-r),s=l(e.settings,"printShowTax",!0),g=l(e.settings,"printShowPaymentMethod",!0),p=l(e.settings,"printShowItemSummary",!0),o=l(e.settings,"printShowItemCount",p),d=l(e.settings,"printShowPiecesCount",p),b=l(e.settings,"printShowPaymentBreakdown",!0),w=l(e.settings,"printShowDiscountBreakdown",!0),f=l(e.settings,"printShowSavingsBanner",!0),N=Math.abs(Number(e.discount||0))>1e-4,C=Math.abs(Number(e.deliveryFee||0))>1e-4,$=(e.items||[]).reduce((m,x)=>{const T=Number(x.offerDiscount||(x.originalPrice?Math.max(0,x.originalPrice-Number(x.price||0)):0));return m+T*Number(x.qty||0)},0),h=$>1e-4,v=$+Number(e.discount||0);let y=h?"خصم إضافي":"الخصم";if(N&&Number(e.subtotal||0)>0){const m=e.discount/e.subtotal*100,x=Math.round(m),T=x/100*e.subtotal;x>0&&Math.abs(T-e.discount)<=.02&&(y=`${y} (${z(x,e.settings)}%)`)}const S=Number(e.subtotal||0)+$,R=e.isReturn?[...s&&Number(e.taxAmount||0)>0?[{label:"الإجمالي قبل الضريبة",value:a(Number(e.subtotal||0),e.settings)},{label:"الضريبة",value:a(Number(e.taxAmount||0),e.settings)}]:[],...g&&e.paymentText?[{label:`طريقة الرد: ${e.paymentText}`,value:`<span style="font-size:0.88em; font-weight:700; margin-inline-end:3px;">المسترد:</span><strong style="font-weight:800; font-size:1.05em;">${a(Number(e.total||r||0),e.settings)}</strong>`,strong:!0,isHtml:!0,noColon:!0}]:[{label:"إجمالي المبلغ المسترد للعميل",value:a(Number(e.total||r||0),e.settings),strong:!0}],...o&&d?[{label:"الأصناف والقطع",value:`${P(Number(e.items?.length||0),e.settings)} صنف  -  ${D(t,e.settings)} قطعة`}]:o?[{label:"عدد الأصناف",value:P(Number(e.items?.length||0),e.settings)}]:d?[{label:"إجمالي القطع",value:D(t,e.settings)}]:[]]:[...h?w?[{label:"الإجمالي قبل الخصومات",value:a(S,e.settings)},{label:"إجمالي خصومات العروض",value:`<span style="display:inline-flex; align-items:center; direction:ltr;"><span>${a($,e.settings)}</span><span style="margin-left:2px;">-</span></span>`,isHtml:!0}]:s?[{label:"الإجمالي قبل الضريبة",value:a(Number(e.subtotal||0),e.settings)}]:[]:s?[{label:"الإجمالي قبل الضريبة",value:a(Number(e.subtotal||0),e.settings)}]:[],...N&&w?[{label:y,value:`<span style="display:inline-flex; align-items:center; direction:ltr;"><span>${a(Number(e.discount||0),e.settings)}</span><span style="margin-left:2px;">-</span></span>`,isHtml:!0}]:[],...C?[{label:"التوصيل",value:a(Number(e.deliveryFee||0),e.settings)},...e.isMerchantCopy&&e.orderType==="delivery"&&(e.payments?.some(m=>m.paymentChannel!=="cash")||e.paymentText&&!e.paymentText.includes("نقدي"))?[{label:"تسوية المندوب",value:`<span style="font-size:0.86em; font-weight:700; color:#000;">تم صرف ${a(Number(e.deliveryFee||0),e.settings)} ج.م نقداً من الدرج</span>`,isHtml:!0}]:[]]:[],...s&&(!h||!w)?[{label:"الضريبة",value:a(Number(e.taxAmount||0),e.settings)}]:[],...g&&e.paymentText?[{label:`طريقة الدفع: ${e.paymentText}`,value:`<span style="font-size:0.88em; font-weight:700; margin-inline-end:3px;">الإجمالي:</span><strong style="font-weight:800; font-size:1.05em;">${a(Number(e.total||0),e.settings)}</strong>`,strong:!0,isHtml:!0,noColon:!0}]:[{label:"الإجمالي النهائي",value:a(Number(e.total||0),e.settings),strong:!0}],...u>.009&&r>.009?[{label:`المتبقي تحصيله: ${a(u,e.settings)}`,value:`<span style="font-size:0.88em; font-weight:700;">المدفوع: ${a(r,e.settings)}</span>`,strong:!0,isHtml:!0,noColon:!0}]:u>.009&&e.paymentType==="credit"&&r<=.009?[{label:`المتبقي على العميل: ${a(u,e.settings)}`,value:'<span style="font-size:0.88em; font-weight:700;">(آجل)</span>',strong:!0,isHtml:!0,noColon:!0}]:b&&e.orderType!=="delivery"&&i>0&&n>.009?[{label:"المستلم نقديًا",value:a(i,e.settings)},{label:"الباقي",value:a(n,e.settings)}]:[],...o&&d?[{label:"الأصناف والقطع",value:`${P(Number(e.items?.length||0),e.settings)} صنف  -  ${D(t,e.settings)} قطعة`}]:o?[{label:"عدد الأصناف",value:P(Number(e.items?.length||0),e.settings)}]:d?[{label:"إجمالي القطع",value:D(t,e.settings)}]:[]],k=!e.isReturn&&v>1e-4&&f?`
      <div class="receipt-savings-banner" style="margin-top: 6px; padding: 4px 6px; border: 1px dashed #000; border-radius: 4px; text-align: center; font-weight: 700; font-size: ${e.compact?"9.5px":"11px"}; color: #000; display: flex; align-items: center; justify-content: center; gap: 6px;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0; display: inline-block;">
          <circle cx="12" cy="12" r="9.5"/>
          <line x1="16" y1="8" x2="8" y2="16"/>
          <circle cx="9" cy="8.5" r="1.3" fill="#000"/>
          <circle cx="15" cy="15.5" r="1.3" fill="#000"/>
        </svg>
        <span>إجمالي ما وفّرته في هذه الفاتورة: ${a(v,e.settings)} ج.م</span>
      </div>
    `:"";return`
    <section class="invoice-card invoice-totals-card${e.compact?" compact":""}">
      ${R.map(m=>`
        <div class="meta-line${m.strong?" strong total-line":""}">
          <span class="meta-label">${c(m.label)}${m.noColon?"":":"}</span>
          <span class="meta-value">${m.isHtml?m.value:c(m.value)}</span>
        </div>
      `).join("")}
      ${k}
    </section>
  `}function ee(e=!1){return`
    .print-shell { padding: ${e?"1mm 1.2mm 2.5mm":"2mm 1.8mm 3mm"}; font-family: 'Cairo', 'Segoe UI', Tahoma, -apple-system, sans-serif; }
    .print-header { display: none !important; }
    .print-title { font-size: ${e?"14px":"19px"}; }
    .print-subtitle { margin-top: 1px; font-size: ${e?"9px":"11px"}; min-height: 0; }
    .print-meta-chip { padding: ${e?"4px 8px":"6px 10px"}; font-size: ${e?"9.5px":"11px"}; }
    .print-content { gap: ${e?"0px":"2px"}; }
    .invoice-card {
      background: #fff;
      padding: ${e?"2px 2px":"3px 3px"};
      break-inside: avoid;
      overflow: hidden;
    }
    .invoice-card.compact { padding: 2px 2px; }
    .invoice-brand-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: ${e?"8px":"12px"};
      min-height: ${e?"44px":"56px"};
      width: 100%;
    }
    .invoice-logo-wrapper {
      position: relative;
      width: ${e?"68px":"96px"};
      height: ${e?"44px":"56px"};
      min-height: ${e?"44px":"56px"};
      max-width: ${e?"68px":"96px"};
      max-height: ${e?"44px":"56px"};
      flex-shrink: 0;
    }
    .invoice-logo,
    .invoice-logo-fallback {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      max-width: 100%;
      max-height: 100%;
      border-radius: 0;
      object-fit: contain;
      object-position: center;
      background: transparent;
      display: grid;
      place-items: center;
      font-weight: 800;
      color: #000;
      overflow: hidden;
    }
    img.invoice-logo {
      max-width: ${e?"68px":"96px"} !important;
      max-height: ${e?"44px":"56px"} !important;
    }
    .invoice-brand-copy {
      min-width: 0;
      flex: 1 1 auto;
      display: flex;
      flex-direction: column;
      justify-content: center;
      text-align: center;
      width: 100%;
    }
    .invoice-brand-copy h2 {
      margin: 0;
      line-height: 1.12;
      color: #000;
      font-weight: 900;
      letter-spacing: -0.3px;
      overflow-wrap: normal;
      word-break: keep-all;
      text-align: center;
      width: 100%;
      font-family: 'Cairo', 'Segoe UI', Tahoma, sans-serif;
    }
    .store-inline-details {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1.5px;
      font-size: ${e?"8.5px":"9.5px"};
      color: #000;
      margin-top: 2px;
      font-weight: 600;
      line-height: 1.25;
      text-align: center;
      width: 100%;
    }
    .store-detail-line {
      display: block;
      width: 100%;
      text-align: center;
    }
    .store-phone-line {
      white-space: nowrap;
      font-weight: 700;
    }
    .store-address-line {
      word-break: normal;
      overflow-wrap: break-word;
    }
    .invoice-meta-grid {
      display: flex;
      flex-direction: column;
      gap: ${e?"1px":"2px"};
      width: 100%;
    }
    .meta-line {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      width: 100%;
      padding: ${e?"1px 0":"2px 0"};
      font-size: ${e?"9.5px":"11px"};
      border-bottom: 1px dotted #e2e8f0;
      gap: 6px;
    }
    .meta-line:last-child {
      border-bottom: none;
    }
    .meta-line.strong {
      font-weight: 800;
      font-size: ${e?"10.5px":"12px"};
      border-bottom: 1px solid #cbd5e1;
      padding: ${e?"2px 0":"4px 0"};
    }
    .meta-label {
      color: #000;
      font-weight: 600;
      flex-shrink: 0;
    }
    .meta-value {
      color: #000;
      text-align: left;
      unicode-bidi: plaintext;
      word-break: break-word;
    }
    .invoice-items-table {
      width: 100%;
      border-collapse: collapse;
      margin: ${e?"2px 0":"4px 0"};
    }
    .invoice-items-table th,
    .invoice-items-table td {
      padding: ${e?"2px 1px":"4px 2px"};
      font-size: ${e?"9px":"10.5px"};
      text-align: right;
      color: #000;
      vertical-align: top;
      border-bottom: 1px dotted #000;
    }
    .invoice-items-table th {
      background: #000;
      color: #fff;
      font-weight: 800;
      border: 1px solid #000;
      text-align: center;
      padding: ${e?"2px 1px":"4px 2px"};
    }
    .invoice-items-table .index-cell { width: 5%; text-align: center; color: #000; }
    .invoice-items-table .name-cell { width: 45%; text-align: right; font-weight: 700; color: #000; }
    .invoice-items-table .unit-cell { width: 12%; text-align: center; color: #000; }
    .invoice-items-table .qty-cell { width: 10%; text-align: center; font-weight: 700; color: #000; }
    .invoice-items-table .price-cell { width: 13%; text-align: center; color: #000; }
    .invoice-items-table .total-cell { width: 15%; text-align: left; font-weight: 800; color: #000; }
    .invoice-totals-card {
      border-top: 1px dashed #000;
      margin-top: ${e?"2px":"4px"};
      padding-top: ${e?"2px":"4px"};
    }
    .invoice-payment-card {
      border-top: 1px dashed #cbd5e1;
      margin-top: ${e?"2px":"4px"};
      padding-top: ${e?"2px":"4px"};
    }
    .section-title {
      font-size: ${e?"9px":"10.5px"};
      font-weight: 800;
      color: #000;
      margin-bottom: 2px;
    }
    .payment-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
    }
    .payment-chip {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #fff;
      border: 1px solid #000;
      padding: 1px 4px;
      border-radius: 2px;
      font-size: ${e?"8.5px":"10px"};
      width: 100%;
      font-weight: 700;
      color: #000;
    }
    .invoice-barcode-card {
      text-align: center;
      margin-top: ${e?"4px":"6px"};
      padding-top: ${e?"2px":"4px"};
      border-top: 1px dashed #000;
    }
    .invoice-barcode-svg-wrap {
      display: flex;
      justify-content: center;
      align-items: center;
      width: 100%;
      margin: 0 auto;
    }
    .invoice-barcode-svg-wrap svg {
      width: 100% !important;
      max-width: 220px !important;
      height: ${e?"26px":"34px"} !important;
      display: block;
    }
    .print-footer {
      text-align: center;
      margin-top: ${e?"4px":"6px"};
      padding-top: ${e?"2px":"4px"};
      font-size: ${e?"8.5px":"9.5px"};
      color: #000;
      border-top: 1px dashed #cbd5e1;
    }

    /* Boxed Theme */
    .receipt-theme-boxed .invoice-card { border: 1px solid #000; margin-bottom: 3px; border-radius: 3px; padding: 4px 6px; }
    .receipt-theme-boxed .invoice-items-table th { background: #000; color: #fff; }
    .receipt-theme-boxed .meta-line { border-bottom: 1px dashed #000; }
    .receipt-theme-boxed .meta-line:last-child { border-bottom: none; }
    .receipt-theme-boxed .total-line { border-top: 1px solid #000; border-bottom: 1px solid #000; margin-top: 2px; }

    /* Ultra Compact Theme */
    .receipt-theme-ultra-compact .invoice-card { padding: 1px 0; border: none; border-radius: 0; }
    .receipt-theme-ultra-compact .invoice-brand-row { min-height: 0; gap: 4px; }
    .receipt-theme-ultra-compact .invoice-logo-wrapper { width: 44px; height: 28px; min-height: 28px; }
    .receipt-theme-ultra-compact .invoice-brand-copy h2 { font-size: 14px; }
    .receipt-theme-ultra-compact .store-meta-line { display: none; }
    .receipt-theme-ultra-compact .store-inline-details { display: flex; flex-direction: column; align-items: center; gap: 1px; font-size: 8.5px; color: #000; margin-top: 1px; font-weight: 600; text-align: center; }
    .receipt-theme-ultra-compact .store-detail-line { display: block; width: 100%; text-align: center; }
    .receipt-theme-ultra-compact .meta-line { display: inline-flex; align-items: baseline; gap: 3px; white-space: nowrap; border: none; padding: 0; font-size: 10px; break-inside: avoid; }
    .receipt-theme-ultra-compact .meta-line::after { content: " | "; margin: 0 3px; font-weight: normal; font-size: 9px; }
    .receipt-theme-ultra-compact .meta-line:last-child::after { content: ""; margin: 0; }

    body.receipt-mode .print-shell { width: 100%; max-width: 100%; padding-top: 0; margin: 0; box-sizing: border-box; }
    body.receipt-mode .print-header { display: none !important; }
    body.receipt-mode .print-title-wrap { min-width: 0; }
  `}function te(e){const t=j(e.pageSize,e.settings),r=l(e.settings,"printShowCustomer",!0),i=l(e.settings,"printShowDeliveryCustomerDetails",!0),n=l(e.settings,"printShowCashier",!0),u=l(e.settings,"printShowBranch",!0),s=l(e.settings,"printShowLocation",!0),g=l(e.settings,"printShowDocumentType",!0),p=l(e.settings,"printShowDocumentNumber",!0),o=l(e.settings,"printShowOrderType",!0),d=l(e.settings,"printShowDate",!0),b=l(e.settings,"printDeliveryRepOnReceipt",!0)||l(e.settings,"printShowDeliveryRep",!0),w=e.isPurchase?"المورد":(e.isReturn,"العميل"),f=String(e.isPurchase?e.supplierName||e.customerName||"":e.customerName||"").trim(),N=!e.isPurchase&&(!f||f==="عميل نقدي"||f==="نقدي"||f==="—"),C=r&&!N,$=f||(e.isPurchase?"—":"عميل نقدي"),h=e.isPurchase?e.cashierName&&e.cashierName!=="—"?e.cashierName:"":n&&e.cashierName&&e.cashierName!=="—"?e.cashierName:"",v=d?e.dateText||L(new Date):"",y=[...g?[{label:"نوع المستند",value:e.documentLabel||(e.isPurchase?"فاتورة شراء":e.isReturn?"إيصال مرتجع مبيعات":"فاتورة")}]:[],...p?[{label:"رقم المستند",value:e.documentNumber?String(e.documentNumber):"—",isBadge:!0}]:[],...e.referenceInvoice?[{label:"مرجع الفاتورة الأصلية",value:e.referenceInvoice}]:[],...v&&h?[{label:`التاريخ: ${z(v,e.settings)}`,value:`<span dir="rtl" style="font-weight:600; color:#000; direction:rtl; unicode-bidi:isolate; text-align:left; display:inline-flex; align-items:baseline; gap:3px;"><span>${e.isPurchase?"المسؤول":"الكاشير"}:</span><bdi>${c(z(h,e.settings))}</bdi></span>`,isHtml:!0,noColon:!0}]:[...v?[{label:"التاريخ",value:v}]:[],...h?[{label:e.isPurchase?"المسؤول":"الكاشير",value:h}]:[]],...C?[{label:w,value:$}]:[],...i&&(e.orderType==="delivery"||e.customerPhone)?[...e.customerPhone?[{label:"هاتف العميل",value:e.customerPhone}]:[],...e.customerAddress?[{label:"عنوان العميل",value:e.customerAddress}]:[]]:[],...u?[{label:"الفرع",value:e.branchName||"المتجر الرئيسي"}]:[],...s?[{label:"المخزن",value:e.locationName||"المخزن الأساسي"}]:[],...e.settings?.restaurantModuleEnabled&&e.orderType==="dine_in"&&e.tableNumber?[{label:"الطاولة",value:String(e.tableNumber)}]:[],...!e.isReturn&&!e.isPurchase&&o?[{label:"نوع الطلب",value:e.orderType==="dine_in"?"صالة":e.orderType==="delivery"?"دليفري":e.orderType==="takeout"||e.orderType==="takeaway"?"تيك أواي":e.orderType||"تيك أواي"}]:[],...e.note?.includes("متجر إلكتروني")||e.note?.includes("أونلاين")?[{label:"المصدر",value:"🌐 طلب متجر أونلاين",isBadge:!0}]:[],...b&&e.deliveryRepName?[{label:"مندوب التوصيل",value:e.deliveryRepName}]:[],...e.note?[{label:"ملاحظة",value:e.note}]:[]],S=M(e.pageSize,e.settings),R=e.copyType||"customer";function k(T){const A=T==="merchant";return`
      <div class="receipt-theme-${S} receipt-copy-${T}">
        ${A?'<div class="receipt-copy-banner" style="text-align:center; font-weight:800; font-size:11px; padding:3px 6px; border:1px dashed #000; margin-bottom:5px; background:#fff; color:#000;">*** نسخة المحل والدرج ***</div>':""}
        ${U(e.settings,t)}
        ${E(y,t,e.settings)}
        ${V(e.items,t,e.settings)}
        ${W({subtotal:e.subtotal,discount:e.discount,deliveryFee:e.deliveryFee,taxAmount:e.taxAmount,total:e.total,paidAmount:e.paidAmount,tenderedAmount:e.tenderedAmount,changeAmount:e.changeAmount,items:e.items,settings:e.settings,compact:t,isReturn:e.isReturn,paymentText:e.paymentText||"نقدي",orderType:e.orderType,payments:e.payments,isMerchantCopy:A})}
        ${Q(e.payments,e.settings,t)}
        ${_(e.documentNumber,t,e.settings)}
        ${G(e.settings,t)}
      </div>
    `}return{html:R==="dual"?`${k("customer")}<div class="receipt-cut-separator" style="page-break-after: always; break-after: page; padding-bottom: 6mm; margin-bottom: 6mm; border-bottom: 2px dashed #000; text-align: center; font-size: 9px; color: #444;">------------------------------------</div>${k("merchant")}`:k(R==="merchant"?"merchant":"customer"),compact:t}}export{Y as a,te as b,l as c,B as d,Z as e,L as f,ee as g,H as p};
