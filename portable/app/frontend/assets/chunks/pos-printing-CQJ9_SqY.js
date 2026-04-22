import{e as r,p as v}from"./empty-state-CRQYLF0l.js";import{f as l}from"../index-CjLqHSxS.js";import"./vendor-html2canvas-DXEQVQnt.js";import"./vendor-jspdf-ChYBy5qQ.js";function x(e){const t=String(e||"").trim().toLowerCase();return t==="cash"?"نقدي":t==="card"?"بطاقة / فيزا":t==="credit"?"آجل":t==="mixed"?"مختلط":e||"نقدي"}function i(e,t,a=!0){const n=e?.[t];return typeof n=="boolean"?n:a}function N(e,t){return e==="receipt"&&i(t,"printCompactReceipt",!0)}function g(e){if(!e)return new Date().toLocaleString("ar-EG");const t=new Date(e);return Number.isNaN(t.getTime())?e:t.toLocaleString("ar-EG")}function $(e){const t=String(e?.invoiceFooter||"").trim();return t||"يرجى الاحتفاظ بالفاتورة. الاستبدال والاسترجاع حسب سياسة المتجر."}function y(e){const t=String(e?.brandName||e?.storeName||"متجرك").trim()||"متجرك",a=String(e?.storeName||e?.brandName||"متجرك").trim()||"متجرك";return{brandName:t,storeName:a}}function w(e,t=!1){const a=Array.from(String(e).trim()).length;return t?a>34?"10.5px":a>28?"11.5px":a>22?"12.5px":a>18?"14px":"16px":a>34?"14px":a>28?"15px":a>22?"17px":a>18?"19px":"21px"}function S(e,t=!1){const{brandName:a}=y(e),n=i(e,"printShowLogo",!0),o=i(e,"printShowPhone",!0),d=i(e,"printShowAddress",!0),m=i(e,"printShowTaxNumber",!1),s=o?String(e?.phone||"").trim():"",c=d?String(e?.address||"").trim():"",u=m?String(e?.taxNumber||"").trim():"",p=n?String(e?.logoData||"").trim():"",b=[s?`<span>الهاتف: ${r(s)}</span>`:"",c?`<span>العنوان: ${r(c)}</span>`:"",u?`<span>ض.م: ${r(u)}</span>`:""].filter(Boolean).join(" ");return`
    <section class="invoice-card invoice-store-card${t?" compact":""}">
      <div class="invoice-brand-row">
        ${p?`<img class="invoice-logo" src="${r(p)}" alt="شعار المتجر" />`:`<div class="invoice-logo-fallback">${r(a.slice(0,1).toUpperCase())}</div>`}
        <div class="invoice-brand-copy">
          <h2 title="${r(a)}" style="font-size:${w(a,t)}">${r(a)}</h2>
          ${b?`<div class="store-inline-details">${b}</div>`:""}
        </div>
      </div>
    </section>
  `}function z(e,t=!1){const a=e.filter(n=>String(n.value??"").trim());return a.length?`
    <section class="invoice-card invoice-meta-panel${t?" compact":""}">
      ${a.map(n=>`
        <div class="meta-line">
          <span class="meta-label">${r(n.label)}:</span>
          <span class="meta-value">${r(String(n.value??"—"))}</span>
        </div>
      `).join("")}
    </section>
  `:""}function A(e,t=!1){const a=(e||[]).map((n,o)=>`
    <tr>
      ${t?"":`<td class="index-cell">${o+1}</td>`}
      <td class="name-cell">${r(n.name||"—")}</td>
      ${t?"":`<td>${r(n.unitName||"قطعة")}</td>`}
      <td>${Number(n.qty||0)}</td>
      <td>${l(Number(n.price||0))}</td>
      <td>${l(Number(n.total||0))}</td>
    </tr>
  `).join("");return`
    <section class="invoice-card invoice-items-card${t?" compact":""}">
      <table class="invoice-items-table${t?" compact":""}">
        <thead>
          <tr>
            ${t?"":"<th>#</th>"}
            <th>الصنف</th>
            ${t?"":"<th>الوحدة</th>"}
            <th>الكمية</th>
            <th>السعر</th>
            <th>الإجمالي</th>
          </tr>
        </thead>
        <tbody>${a||`<tr><td colspan="${t?4:6}">لا توجد أصناف</td></tr>`}</tbody>
      </table>
    </section>
  `}function T(e,t,a=!1){return!e?.length||!i(t,"printShowPaymentBreakdown",!0)?"":`
    <section class="invoice-card invoice-payment-card${a?" compact":""}">
      <div class="section-title">تفصيل المدفوعات</div>
      <div class="payment-grid">
        ${e.map(n=>`
          <div class="payment-chip">
            <span>${r(n.paymentChannel==="cash"?"نقدي":n.paymentChannel==="card"?"بطاقة / فيزا":n.paymentChannel==="credit"?"آجل":"مختلط")}</span>
            <strong>${l(Number(n.amount||0))}</strong>
          </div>
        `).join("")}
      </div>
    </section>
  `}function C(e){const t=(e.items||[]).reduce((c,u)=>c+Number(u.qty||0),0),a=Number(e.paidAmount||0),n=Math.max(0,Number(e.total||0)-a),o=i(e.settings,"printShowTax",!0),d=i(e.settings,"printShowItemSummary",!0),m=Math.abs(Number(e.discount||0))>1e-4,s=[{label:"الإجمالي قبل الضريبة",value:l(Number(e.subtotal||0))},...m?[{label:"الخصم",value:l(Number(e.discount||0))}]:[],...o?[{label:"الضريبة",value:l(Number(e.taxAmount||0))}]:[],{label:"الإجمالي النهائي",value:l(Number(e.total||0)),strong:!0},{label:"المدفوع",value:l(a)},...n>0?[{label:"المتبقي",value:l(n)}]:[],...d?[{label:"عدد البنود",value:String(Number(e.items?.length||0))},{label:"إجمالي القطع",value:String(t)}]:[]];return`
    <section class="invoice-card invoice-totals-card${e.compact?" compact":""}">
      ${s.map(c=>`
        <div class="meta-line${c.strong?" strong total-line":""}">
          <span class="meta-label">${r(c.label)}:</span>
          <span class="meta-value">${r(c.value)}</span>
        </div>
      `).join("")}
    </section>
  `}function P(e=!1){return`
    .print-shell { padding: ${e?"4px":"12px"}; }
    .print-header { display: none !important; }
    .print-title { font-size: ${e?"14px":"19px"}; }
    .print-subtitle { margin-top: 1px; font-size: ${e?"9px":"11px"}; min-height: 0; }
    .print-meta-chip { padding: ${e?"4px 8px":"6px 10px"}; font-size: ${e?"9.5px":"11px"}; }
    .print-content { gap: ${e?"5px":"8px"}; }
    .invoice-card {
      border: 1px solid var(--print-border);
      border-radius: ${e?"12px":"18px"};
      background: rgba(248,250,252,.58);
      padding: ${e?"6px 7px":"12px 14px"};
      break-inside: avoid;
    }
    .invoice-card.compact { padding: 6px 7px; }
    .invoice-brand-row { display: flex; align-items: center; justify-content: center; gap: ${e?"7px":"10px"}; }
    .invoice-logo,
    .invoice-logo-fallback {
      width: ${e?"28px":"44px"};
      height: ${e?"28px":"44px"};
      border-radius: ${e?"10px":"14px"};
      border: 1px solid var(--print-border);
      object-fit: cover;
      flex-shrink: 0;
      background: linear-gradient(135deg, #dbeafe, #bfdbfe);
      display: grid;
      place-items: center;
      font-weight: 700;
      color: var(--print-accent);
      overflow: hidden;
    }
    .invoice-brand-copy { min-width: 0; text-align: center; }
    .invoice-brand-copy h2 {
      margin: 0;
      font-size: ${e?"12px":"19px"};
      line-height: 1.2;
      color: var(--print-accent);
      font-weight: 800;
    }
    .store-inline-details {
      margin-top: ${e?"3px":"6px"};
      color: var(--print-muted);
      font-size: ${e?"9px":"10.5px"};
      line-height: 1.5;
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      justify-content: center;
      text-align: center;
    }
    .invoice-meta-panel { display: grid; gap: ${e?"1px":"2px"}; }
    .meta-line {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: 10px;
      padding: ${e?"2px 0":"3px 0"};
      border-bottom: 1px dashed rgba(148,163,184,.35);
      font-size: ${e?"10.5px":"12px"};
    }
    .meta-line:last-child { border-bottom: 0; }
    .meta-line.strong { font-weight: 700; font-size: ${e?"12.5px":"14px"}; }
    .total-line { color: #0f172a; }
    .meta-label { color: var(--print-muted); white-space: nowrap; }
    .meta-value { text-align: left; font-weight: 600; }
    .invoice-items-table { margin-top: 0; width: 100%; border-collapse: collapse; }
    .invoice-items-table th,
    .invoice-items-table td {
      padding: ${e?"4px 3px":"8px 6px"};
      font-size: ${e?"10px":"12px"};
      border: 1px solid var(--print-border);
      text-align: center;
      white-space: nowrap;
      line-height: 1.15;
    }
    .invoice-items-table .name-cell { text-align: right; white-space: normal; width: 100%; }
    .invoice-items-table.compact th,
    .invoice-items-table.compact td { font-size: 9px; }
    .invoice-items-table.compact th { font-size: 8.5px; }
    .invoice-items-table.compact th:first-child,
    .invoice-items-table.compact td:first-child { text-align: right; }
    .invoice-payment-card .section-title {
      font-size: ${e?"10.5px":"12px"};
      font-weight: 700;
      margin-bottom: 5px;
    }
    .payment-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(${e?"92px":"120px"}, 1fr));
      gap: 6px;
    }
    .payment-chip {
      border: 1px solid var(--print-border);
      border-radius: 10px;
      padding: ${e?"5px":"8px"};
      display: flex;
      justify-content: space-between;
      gap: 6px;
      font-size: ${e?"9.5px":"11px"};
      background: rgba(248,250,252,.55);
    }
    .print-footer {
      margin-top: 8px;
      font-size: ${e?"9.5px":"11px"};
      padding-top: 8px;
      text-align: center;
    }
    body.receipt-mode .print-shell { max-width: 80mm; padding-top: 0; }
    body.receipt-mode .print-header { display: none !important; }
    body.receipt-mode .print-title-wrap { min-width: 0; }
  `}function h(e){const t=N(e.pageSize,e.settings),a=i(e.settings,"printShowCustomer",!0),n=i(e.settings,"printShowCashier",!0),o=i(e.settings,"printShowBranch",!0),d=i(e.settings,"printShowLocation",!0),m=i(e.settings,"printShowPaymentMethod",!0),s=[{label:"نوع المستند",value:e.documentLabel||"فاتورة"},{label:"رقم المستند",value:e.documentNumber?String(e.documentNumber):"—"},{label:"التاريخ",value:e.dateText||"—"},...a?[{label:"العميل",value:e.customerName||"عميل نقدي"}]:[],...m?[{label:"طريقة الدفع",value:e.paymentText||"نقدي"}]:[],...n?[{label:"الكاشير",value:e.cashierName||"—"}]:[],...o?[{label:"الفرع",value:e.branchName||"المتجر الرئيسي"}]:[],...d?[{label:"الموقع",value:e.locationName||"المخزن الأساسي"}]:[],...e.note?[{label:"ملاحظة",value:e.note}]:[]];return{html:`
      ${S(e.settings,t)}
      ${z(s,t)}
      ${A(e.items,t)}
      ${C({subtotal:e.subtotal,discount:e.discount,taxAmount:e.taxAmount,total:e.total,paidAmount:e.paidAmount,items:e.items,settings:e.settings,compact:t})}
      ${T(e.payments,e.settings,t)}
    `,compact:t}}function f(e,t,a,n,o=""){v(e,t,{subtitle:o,footerHtml:i(n.settings,"printShowFooter",!0)?r($(n.settings)):"",pageSize:n.pageSize==="receipt"?"receipt":"A4",extraStyles:P(a)})}function B(e){const t=h({pageSize:e.pageSize,settings:e.settings,documentLabel:e.pageSize==="receipt"?"إيصال بيع":"فاتورة بيع",documentNumber:"مسودة",dateText:g(),customerName:e.customerName||"عميل نقدي",paymentText:x(e.paymentLabel),branchName:e.branchName||"المتجر الرئيسي",locationName:e.locationName||"المخزن الأساسي",note:e.note,items:(e.items||[]).map(a=>({name:a.name,unitName:a.unitName,qty:Number(a.qty||0),price:Number(a.price||0),total:Number(a.qty||0)*Number(a.price||0)})),subtotal:Number(e.subtotal||0),discount:Number(e.discount||0),taxAmount:Number(e.taxAmount||0),total:Number(e.total||0),paidAmount:Number(e.total||0)});f(e.title,t.html,t.compact,{pageSize:e.pageSize==="receipt"?"receipt":"a4",settings:e.settings||null},e.pageSize==="receipt"?"":"معاينة جاهزة للطباعة")}function L(e,t){return h({pageSize:t.pageSize,settings:t.settings,documentLabel:t.pageSize==="receipt"?"إيصال بيع":"فاتورة بيع",documentNumber:e.docNo||e.id,dateText:g(e.date),customerName:e.customerName||"عميل نقدي",paymentText:x(e.paymentChannel||e.paymentType),cashierName:e.createdBy||"—",branchName:e.branchName||"المتجر الرئيسي",locationName:e.locationName||"المخزن الأساسي",note:e.note||"",items:(e.items||[]).map(a=>({name:a.name,unitName:a.unitName,qty:Number(a.qty||0),price:Number(a.price||0),total:Number(a.total||0)})),subtotal:Number(e.subTotal||0),discount:Number(e.discount||0),taxAmount:Number(e.taxAmount||0),total:Number(e.total||0),paidAmount:Number(e.paidAmount||0),payments:e.payments})}function R(e,t={}){const a=L(e,t);f(`${t.pageSize==="receipt"?"إيصال بيع":"فاتورة"} ${e.docNo||e.id}`,a.html,a.compact,t)}export{B as a,h as b,x as c,$ as d,g as f,P as g,R as p};
