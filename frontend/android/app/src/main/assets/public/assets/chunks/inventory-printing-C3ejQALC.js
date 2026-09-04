import{p as x,r as B,e as o}from"./browser-CGkMHTHH.js";import{g as N,f as $,c as f,d as P,e as z}from"./template-D5zCZvtf.js";import{bc as T,r as D}from"../index-C0PvB-77.js";import"./vendor-jspdf-10sFSXKl.js";import"./barcode-BGeelrMF.js";import"./vendor-html2canvas-DXEQVQnt.js";import"./vendor-react-C-CGkqRI.js";import"./vendor-query-CB33QBPw.js";import"./vendor-state-UgMc1SQf.js";import"./vendor-router-BEdff8k3.js";import"./vendor-forms-BO8SGD9o.js";import"./vendor-recharts-Dv2LOvcU.js";function R(e,a=!1){const t=Array.from(String(e||"").trim()).length;return a?t>34?"10.5px":t>28?"11.5px":t>22?"12.5px":t>18?"14px":"16px":t>34?"14px":t>28?"15px":t>22?"17px":t>18?"19px":"21px"}function j(e){return P(e)}function m(e,a,t=0){return new Intl.NumberFormat(j(a),{minimumFractionDigits:t,maximumFractionDigits:t}).format(Number(e||0))}function H(e,a){const t=String(e??"—");return a?.printNumberFormat!=="english"?t:t.replace(/[٠-٩]/g,c=>String("٠١٢٣٤٥٦٧٨٩".indexOf(c))).replace(/[۰-۹]/g,c=>String("۰۱۲۳۴۵۶۷۸۹".indexOf(c)))}function S(e,a=!1){const t=B(),c=f(e,"printShowLogo",!0),i=f(e,"printShowPhone",!0),d=f(e,"printShowAddress",!0),g=f(e,"printShowTaxNumber",!1),u=i?H(t.phone,e):"",l=d?t.address:"",p=g?H(String(e?.taxNumber||"").trim(),e):"",v=c?t.logoData:"",h=t.brandName,b=[u?`<span>الهاتف: ${o(u)}</span>`:"",l?`<span>العنوان: ${o(l)}</span>`:"",p?`<span>الرقم الضريبي: ${o(p)}</span>`:""].filter(Boolean).join("");return`
    <section class="invoice-card invoice-store-card${a?" compact":""}">
      <div class="invoice-brand-row">
        ${v?`<div class="invoice-logo-wrapper"><img class="invoice-logo" src="${o(v)}" alt="شعار المتجر" /></div>`:`<div class="invoice-logo-wrapper"><div class="invoice-logo-fallback">${o(h.slice(0,1).toUpperCase())}</div></div>`}
        <div class="invoice-brand-copy">
          <h2 title="${o(h)}" style="font-size:${R(h,a)}">${o(h)}</h2>
          ${b?`<div class="store-inline-details">${b}</div>`:""}
        </div>
      </div>
    </section>
  `}function w(e,a=!1,t){const c=e.filter(i=>String(i.value??"").trim());return c.length?`
    <section class="invoice-card invoice-meta-panel${a?" compact":""}">
      ${c.map(i=>`
        <div class="meta-line">
          <span class="meta-label">${o(i.label)}:</span>
          <span class="meta-value">${o(H(i.value??"—",t))}</span>
        </div>
      `).join("")}
    </section>
  `:""}function I(e,a=!1,t){const c=(e||[]).map((i,d)=>`
    <tr>
      ${a?"":`<td class="index-cell">${m(d+1,t)}</td>`}
      <td class="name-cell">${o(i.productName||"—")}</td>
      <td class="qty-cell">${m(Number(i.qty||0),t)}</td>
    </tr>
  `).join("");return`
    <section class="invoice-card invoice-items-card${a?" compact":""}">
      <table class="invoice-items-table${a?" compact":""}">
        <thead>
          <tr>
            ${a?"":"<th>#</th>"}
            <th>الصنف</th>
            <th>الكمية</th>
          </tr>
        </thead>
        <tbody>${c||`<tr><td colspan="${a?2:3}">لا توجد أصناف</td></tr>`}</tbody>
      </table>
    </section>
  `}function A(e){const a=e.items.reduce((t,c)=>t+Number(c.qty||0),0);return`
    <section class="invoice-card invoice-totals-card${e.compact?" compact":""}">
      <div class="totals-grid">
        <div class="totals-row subtotal">
          <span>عدد الأصناف</span>
          <strong>${m(e.items.length,e.settings)}</strong>
        </div>
        <div class="totals-row grand-total">
          <span>إجمالي الكمية</span>
          <strong>${m(a,e.settings)}</strong>
        </div>
      </div>
    </section>
  `}function F(e,a){const t=a.pageSize==="receipt",c=S(a.settings,t),i=w([{label:t?"إيصال":"وثيقة",value:t?"تحويل مخزني":"إيصال تحويل مخزون بين الفروع"},{label:"رقم المستند",value:e.docNo||e.id},{label:"التاريخ",value:$(e.date)},{label:"من",value:e.fromLocationName},{label:"إلى",value:e.toLocationName},{label:"بواسطة",value:e.createdBy||"—"},{label:"المستلم / السائق",value:e.recipientName||"—"},{label:"ملاحظات",value:e.note||""}],t,a.settings),d=I(e.items||[],t,a.settings),g=A({items:e.items||[],settings:a.settings,compact:t});return{html:`
    <div class="invoice-document-root${t?" compact-receipt-mode":""}" dir="rtl">
      ${c}
      ${i}
      ${d}
      ${g}
    </div>
  `,compact:t}}function Z(e,a={}){q([e],a)}function q(e,a={}){if(!e.length)return;if(!a.settings)try{const r=T.getQueryData(D.settings);r&&typeof r=="object"&&(a.settings=r.settings||r)}catch{}const t=a.pageSize==="receipt";if(e.length===1){const r={...e[0],toLocationName:e[0].toLocationName||e[0].toBranchName||"—"},n=F(r,a);x(`${t?"إيصال تحويل":"تحويل مخزني"} ${e[0].docNo||e[0].id}`,n.html,{subtitle:t?"":"وثيقة تحويل مخزون",footerHtml:'<div style="text-align: center; margin-top: 2rem; font-weight: bold; padding: 1rem 0; border-top: 1px dashed #ccc;">توقيع المستلم: ..........................</div>',pageSize:t?"receipt":"A4",extraStyles:N(t)});return}const c=S(a.settings,t),i=e.map(r=>r.docNo||r.id).join("، "),d=Array.from(new Set(e.map(r=>r.fromLocationName||"—"))).join("، "),g=e[0].toLocationName||e[0].toBranchName||"—",u=w([{label:t?"إيصال":"وثيقة",value:t?"تحويل مخزني مجمع":"إيصال تحويل مجمع بين الفروع"},{label:"أرقام المستندات",value:i},{label:"التاريخ",value:$(e[0].date)},{label:"من مخازن",value:d},{label:"إلى",value:g},{label:"بواسطة",value:e[0].createdBy||"—"},{label:"المستلم / السائق",value:e[0].recipientName||"—"}],t,a.settings),l=e.flatMap(r=>(r.items||[]).map(n=>({...n,productName:`${n.productName||"—"} (من: ${r.fromLocationName||"—"})`}))),p=I(l,t,a.settings),v=A({items:l,settings:a.settings,compact:t}),h=`
    <div class="invoice-document-root${t?" compact-receipt-mode":""}" dir="rtl">
      ${c}
      ${u}
      ${p}
      ${v}
    </div>
  `,b=`أذونات صرف مجمعة (${e.length})`;x(b,h,{subtitle:t?"":"وثائق تحويل مخزون مجمعة",footerHtml:'<div style="text-align: center; margin-top: 2rem; font-weight: bold; padding: 1rem 0; border-top: 1px dashed #ccc;">توقيع المستلم: ..........................</div>',pageSize:t?"receipt":"A4",extraStyles:N(t)})}function _(e,a){const t=a.pageSize==="receipt",c=t?S(a.settings,t):"",i=a.sortBy||"least_stock",d=a.categoryNames||{},g=[...e||[]].sort((n,s)=>{if(i==="least_stock")return Number(n.stock||0)-Number(s.stock||0);if(i==="category"){const y=n.category||n.categoryName||d[n.categoryId]||"—",k=s.category||s.categoryName||d[s.categoryId]||"—",L=String(y).localeCompare(String(k),"ar");return L!==0?L:String(n.name||"").localeCompare(String(s.name||""),"ar")}if(i==="highest_value"){const y=Number(n.stock||0)*Number(n.costPrice||0);return Number(s.stock||0)*Number(s.costPrice||0)-y}return Number(n.stock||0)-Number(s.stock||0)}),u=g.reduce((n,s)=>n+(s.stock||0)*(s.costPrice||0),0),p=t?w([{label:"وثيقة",value:"تقرير جرد وقيمة المخزون"},{label:"الترتيب",value:i==="category"?"مرتب حسب الأقسام (للجرد)":i==="highest_value"?"مرتب حسب القيمة الإجمالية (الأعلى قيمة)":"مرتب من الأقل مخزوناً للأعلى"},{label:"التاريخ",value:$(new Date().toISOString())}],t,a.settings):"",v=g.map((n,s)=>{const y=Number(n.stock||0)<=Number(n.minStock||0);return`
    <tr>
      <td class="index-cell" style="text-align: center; color: #64748b; font-weight: 700;">${m(s+1,a.settings)}</td>
      <td class="name-cell" style="text-align: right; font-weight: 700; color: #0f172a;">${o(n.name||"—")}</td>
      <td class="qty-cell" style="text-align: center; font-weight: 800; color: ${y?"#dc2626":"#0f172a"}; background: ${y?"#fef2f2":"transparent"};">${m(Number(n.stock||0),a.settings)}</td>
      <td class="price-cell" style="text-align: center; font-family: Arial, sans-serif;">${m(Number(n.costPrice||0),a.settings)}</td>
      <td style="text-align: center; font-family: Arial, sans-serif; font-weight: 700;">${m(Number((n.stock||0)*(n.costPrice||0)),a.settings)}</td>
    </tr>
  `}).join(""),h=`
    <section class="invoice-card invoice-items-card${t?" compact":""}">
      <table class="invoice-items-table${t?" compact":""}" style="width: 100%; border-collapse: collapse; font-size: 11px;">
        <thead>
          <tr style="background: #f1f5f9; color: #0f172a;">
            <th style="width: 32px; text-align: center;">#</th>
            <th style="text-align: right;">الصنف</th>
            <th style="width: 70px; text-align: center;">الكمية</th>
            <th style="width: 85px; text-align: center;">التكلفة</th>
            <th style="width: 95px; text-align: center;">الإجمالي</th>
          </tr>
        </thead>
        <tbody>${v||'<tr><td colspan="5" style="text-align: center;">لا توجد أصناف</td></tr>'}</tbody>
      </table>
    </section>
  `,b=`
    <section class="invoice-card invoice-totals-card${t?" compact":""}" style="margin-top: 8px;">
      <div class="totals-grid" style="display: flex; justify-content: space-between; padding: 8px 12px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; font-weight: 700;">
        <div class="totals-row subtotal">
          <span>عدد الأصناف: </span>
          <strong>${m(e.length,a.settings)}</strong>
        </div>
        <div class="totals-row grand-total">
          <span>إجمالي قيمة المخزون: </span>
          <strong>${m(u,a.settings,2)} ج.م</strong>
        </div>
      </div>
    </section>
  `;return{html:`
    <div class="invoice-document-root${t?" compact-receipt-mode":""}" dir="rtl">
      ${c}
      ${p}
      ${h}
      ${b}
    </div>
  `,compact:t}}function tt(e,a={}){const t=_(e,a),c=a.sortBy||"least_stock",i=c==="category"?"مرتب حسب الأقسام (للجرد)":c==="highest_value"?"مرتب بالأعلى قيمة مالية":"مرتب من الأقل مخزوناً للأعلى";x("تقرير جرد وقيمة المخزون",t.html,{subtitle:`إجمالي الأصناف: ${e.length} صنف · ${i}`,footerHtml:f(a.settings,"printShowFooter",!0)?o(z(a.settings)):"",pageSize:a.pageSize==="receipt"?"receipt":"A4",orientation:"portrait",extraStyles:N(t.compact)})}function M(e,a){const t=a.pageSize==="receipt",c=t?S(a.settings,t):"",i=t?w([{label:"وثيقة",value:"تقرير حركات وعمليات المخزن"},{label:"التاريخ",value:$(new Date().toISOString())}],t,a.settings):"",d=(e||[]).map((l,p)=>`
    <tr>
      <td class="index-cell" style="text-align: center;">${m(p+1,a.settings)}</td>
      <td style="text-align: center;">${$(l.date||"")}</td>
      <td class="name-cell">${o(l.productName||"—")}</td>
      <td style="text-align: center;">${o(l.locationName||"—")}</td>
      <td style="text-align: center;">${o(l.type||"—")}</td>
      <td class="qty-cell" style="text-align: center;">${m(Number(l.qty||0),a.settings)}</td>
      <td style="text-align: center;">${o(l.reason||l.referenceId||"—")}</td>
    </tr>
  `).join(""),g=`
    <section class="invoice-card invoice-items-card${t?" compact":""}">
      <table class="invoice-items-table${t?" compact":""}" style="width: 100%; border-collapse: collapse; font-size: 10.5px;">
        <thead>
          <tr style="background: #f1f5f9; color: #0f172a;">
            <th style="width: 28px; text-align: center;">#</th>
            <th style="width: 110px; text-align: center;">التاريخ</th>
            <th style="text-align: right;">الصنف</th>
            <th style="width: 85px; text-align: center;">المخزن</th>
            <th style="width: 70px; text-align: center;">النوع</th>
            <th style="width: 60px; text-align: center;">الكمية</th>
            <th style="width: 110px; text-align: center;">السبب / المستلم</th>
          </tr>
        </thead>
        <tbody>${d||'<tr><td colspan="7" style="text-align: center;">لا توجد حركات</td></tr>'}</tbody>
      </table>
    </section>
  `;return{html:`
    <div class="invoice-document-root${t?" compact-receipt-mode":""}" dir="rtl">
      ${c}
      ${i}
      ${g}
    </div>
  `,compact:t}}function et(e,a={}){const t=M(e,a);x("تقرير حركات وعمليات المخزن",t.html,{subtitle:"حركات المخزون",footerHtml:f(a.settings,"printShowFooter",!0)?o(z(a.settings)):"",pageSize:a.pageSize==="receipt"?"receipt":"A4",extraStyles:N(t.compact)})}export{M as buildInventoryMovementsReport,_ as buildInventoryStatusReport,F as buildTransferDocument,et as printInventoryMovementsReport,tt as printInventoryStatusReport,q as printMultipleTransfers,Z as printTransferDocument};
