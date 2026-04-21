import{l as D,q as E,u as L,D as y}from"../index-39ebdrc9.js";import{j as m}from"./vendor-react-DQTAhX50.js";function l(e){return String(e??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}function w(e,t){const r=URL.createObjectURL(e),i=document.createElement("a");i.href=r,i.download=t,i.click(),window.setTimeout(()=>URL.revokeObjectURL(r),0)}function H(e,t){const r=new Blob([JSON.stringify(e,null,2)],{type:"application/json;charset=utf-8"});w(r,t)}function U(e,t,r){const i=s=>{const n=String(s??"");return/[",\n\r]/.test(n)?`"${n.replace(/"/g,'""')}"`:n},d=`\uFEFF${[t.map(i).join(","),...r.map(s=>s.map(i).join(","))].join(`\r
`)}`,a=new Blob([d],{type:"text/csv;charset=utf-8"});w(a,e)}function q(e){const t=e.replace(/^\ufeff/,"").split(/\r?\n/).filter(o=>o.trim());if(t.length<2)return[];const r=o=>{const d=[];let a="",s=!1;for(let n=0;n<o.length;n+=1){const c=o[n],g=o[n+1];if(c==='"'&&s&&g==='"'){a+='"',n+=1;continue}if(c==='"'){s=!s;continue}if(c===","&&!s){d.push(a.trim()),a="";continue}a+=c}return d.push(a.trim()),d},i=r(t[0]).map(o=>o.trim());return t.slice(1).map(o=>{const d=r(o);return i.reduce((a,s,n)=>(s&&(a[s]=d[n]??""),a),{})}).filter(o=>Object.values(o).some(d=>String(d||"").trim()))}function v(e){const t=String(e||"").trim().toLowerCase();return t.startsWith("<!doctype")||t.startsWith("<html")||t.startsWith("<body")||t.startsWith("<style")||t.startsWith("<section")||t.startsWith("<div")||t.startsWith("<table")||t.startsWith("<h1")||t.startsWith("<h2")||t.startsWith("<h3")}function F(e){if(!e||typeof e!="object")return{};const t=e;return t.settings&&typeof t.settings=="object"?t.settings:t}function W(){const e=F(D.getQueryData(E.settings)),t=L.getState().storeName,r=String(e.storeName||t||y).trim()||y;return{storeName:r,brandName:String(e.brandName||r).trim()||r,phone:String(e.phone||"").trim(),address:String(e.address||"").trim(),invoiceFooter:String(e.invoiceFooter||"").trim(),logoData:String(e.logoData||"").trim()}}function A(e,t){const r=String(t||"").trim();if(!r)return e;const i=r.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"),o=new RegExp(`^\\s*<h[12][^>]*>\\s*${i}\\s*<\\/h[12]>`,"i");return e.replace(o,"").trim()}function b(e){return String(e||"").replace(/\bundefined\b/gi,"").replace(/\bnull\b/gi,"").replace(/[\u00A0]/g," ").replace(/\s+[·•-]\s*$/g,"").replace(/\s{2,}/g," ").trim()}function R(e){const t=e.brandName,r=Array.from(t)[0]||"Z",i=[e.phone,e.address].filter(Boolean);return`
    <section class="brand-panel" aria-label="بيانات المتجر">
      <div class="brand-copy">
        <div class="brand-name">${l(t)}</div>
        ${i.length?`<div class="brand-meta">${i.map(o=>`<span>${l(o)}</span>`).join('<span class="brand-meta-sep">•</span>')}</div>`:""}
      </div>
      ${e.logoData?`<img class="brand-logo-image" src="${e.logoData}" alt="${l(t)}" />`:`<div class="brand-logo-fallback">${l(r)}</div>`}
    </section>
  `}function M(e,t,r={}){let i=String(e||"مستند للطباعة").trim()||"مستند للطباعة",o=String(t||"").trim();v(e)&&!v(t)&&(i=String(t||"مستند للطباعة").trim()||"مستند للطباعة",o=String(e||"").trim());const{subtitle:d="",footerHtml:a="",extraStyles:s="",pageSize:n="auto",orientation:c="portrait",printDelayMs:g=260,autoClose:S=!1,documentDirection:$="rtl"}=r,f=W(),x=b(d),z=n==="receipt"?o:A(o,i),h=b(n==="receipt"?a||f.invoiceFooter:a),j=new Date().toLocaleString("ar-EG"),p=window.open("","_blank","width=1120,height=820");if(!p)throw new Error("المتصفح منع نافذة الطباعة");const k=n==="A4"?c==="landscape"?"@page { size: A4 landscape; margin: 9mm; }":"@page { size: A4 portrait; margin: 9mm; }":n==="receipt"?"@page { size: 80mm auto; margin: 3.5mm; }":"@page { size: auto; margin: 9mm; }",N=`<!doctype html>
  <html lang="ar" dir="${$}">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>${l(i)}</title>
      <style>
        :root {
          --print-text: #0f172a;
          --print-muted: #475569;
          --print-border: #cbd5e1;
          --print-surface: #f8fafc;
          --print-strong: #111827;
          --print-accent: #1d4ed8;
        }
        * { box-sizing: border-box; }
        html, body { margin: 0; padding: 0; background: #fff; color: var(--print-text); }
        body { font-family: Tahoma, Arial, sans-serif; font-size: 12px; line-height: 1.45; }
        .print-shell { padding: 12px; max-width: 100%; }
        .print-header { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 10px; align-items: stretch; margin-bottom: 12px; }
        .brand-panel, .doc-panel, .meta-box, .summary-box, .totals, .print-footer {
          border: 1px solid var(--print-border);
          border-radius: 14px;
          background: rgba(248, 250, 252, 0.58);
        }
        .brand-panel {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 10px 12px;
        }
        .brand-copy { min-width: 0; }
        .brand-name {
          font-size: 19px;
          font-weight: 800;
          color: var(--print-strong);
          line-height: 1.2;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .brand-meta {
          margin-top: 4px;
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 4px 8px;
          color: var(--print-muted);
          font-size: 11px;
        }
        .brand-meta-sep { opacity: 0.55; }
        .brand-logo-image, .brand-logo-fallback {
          width: 42px;
          height: 42px;
          border-radius: 12px;
          flex-shrink: 0;
          object-fit: cover;
          border: 1px solid rgba(148, 163, 184, 0.35);
          background: linear-gradient(135deg, #e0ecff, #c7d2fe);
        }
        .brand-logo-fallback {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: #1d4ed8;
          font-size: 18px;
          font-weight: 800;
        }
        .doc-panel {
          min-width: 180px;
          padding: 10px 12px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 2px;
        }
        .doc-title { margin: 0; font-size: 17px; line-height: 1.2; font-weight: 800; color: var(--print-strong); }
        .doc-subtitle { color: var(--print-muted); font-size: 11px; }
        .doc-meta-chip { margin-top: 4px; color: var(--print-muted); font-size: 11px; }
        .print-content { display: flex; flex-direction: column; gap: 10px; }
        .meta { margin: 0; color: var(--print-muted); font-size: 11px; }
        .section { margin: 0; break-inside: avoid; }
        h1, h2, h3 { margin: 0 0 8px; color: var(--print-strong); }
        h2 { font-size: 14px; }
        h3 { font-size: 13px; }
        p { margin: 0 0 6px; }
        .meta-grid, .summary-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(145px, 1fr));
          gap: 8px;
        }
        .meta-box, .summary-box { padding: 8px 10px; }
        .meta-box strong, .summary-box strong {
          display: block;
          margin-bottom: 4px;
          color: var(--print-muted);
          font-size: 11px;
          font-weight: 700;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          table-layout: auto;
          font-size: 11px;
          margin-top: 4px;
        }
        th, td {
          border: 1px solid var(--print-border);
          padding: 4px 6px;
          text-align: right;
          vertical-align: top;
          word-break: break-word;
          overflow-wrap: anywhere;
          line-height: 1.3;
        }
        th {
          background: var(--print-surface);
          color: var(--print-muted);
          font-weight: 700;
        }
        tbody tr:nth-child(even) { background: rgba(248, 250, 252, 0.45); }
        .totals {
          margin-top: 4px;
          padding: 8px 10px;
        }
        .totals div {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 4px;
        }
        .totals strong { color: var(--print-strong); }
        .muted { color: var(--print-muted); }
        .text-left { text-align: left; }
        .print-footer {
          margin-top: 12px;
          padding: 8px 10px;
          color: var(--print-muted);
          font-size: 11px;
        }
        body.receipt-mode { font-size: 11px; }
        body.receipt-mode .print-shell { padding: 6px; max-width: 76mm; }
        body.receipt-mode .print-header {
          grid-template-columns: 1fr;
          gap: 8px;
          margin-bottom: 8px;
        }
        body.receipt-mode .brand-panel { padding: 8px 10px; border-radius: 12px; }
        body.receipt-mode .brand-name { font-size: 15px; }
        body.receipt-mode .brand-logo-image, body.receipt-mode .brand-logo-fallback { width: 34px; height: 34px; border-radius: 10px; }
        body.receipt-mode .doc-panel { min-width: 0; padding: 8px 10px; }
        body.receipt-mode .doc-title { font-size: 14px; }
        body.receipt-mode table { font-size: 11px; }
        body.receipt-mode th, body.receipt-mode td { padding: 5px 6px; }
        body.receipt-mode .meta-grid, body.receipt-mode .summary-grid { grid-template-columns: 1fr; }
        body.receipt-mode .totals { padding: 8px 10px; }
        body.receipt-mode .print-footer { margin-top: 8px; }
        body.report-mode .print-shell { max-width: 100%; }
        body.report-mode .print-content > *:first-child { margin-top: 0 !important; }
        body.report-mode .print-content > * { min-height: auto !important; }
        body.report-mode .print-content .totals,
        body.report-mode .print-content .summary-box,
        body.report-mode .print-content .meta-box { break-inside: avoid; }
        @media print {
          html, body { height: auto; }
          .print-shell { padding: 0; }
          a { color: inherit; text-decoration: none; }
          .section, .meta-box, .summary-box, .totals, .print-header { break-inside: avoid; }
          table { break-inside: auto; }
          thead { display: table-header-group; }
          tfoot { display: table-footer-group; }
          tr, td, th { break-inside: avoid-page; }
        }
        ${k}
        ${s}
      </style>
    </head>
    <body class="${n==="receipt"?"receipt-mode":"report-mode"}">
      <div class="print-shell">
        ${n==="receipt"?"":`
        <div class="print-header">
          ${R(f)}
          <div class="doc-panel">
            <h1 class="doc-title">${l(i)}</h1>
            ${x?`<div class="doc-subtitle">${l(x)}</div>`:""}
            <div class="doc-meta-chip">تاريخ الطباعة: ${l(j)}</div>
          </div>
        </div>`}
        <div class="print-content">${z}</div>
        ${h?`<div class="print-footer">${h}</div>`:""}
      </div>
    </body>
  </html>`;p.document.open(),p.document.write(N),p.document.close();const u=()=>{window.setTimeout(()=>{p.focus(),p.print(),S&&window.setTimeout(()=>p.close(),220)},Math.max(220,Number(g||0)))};p.document.readyState==="complete"?u():(p.addEventListener("load",u,{once:!0}),window.setTimeout(u,Math.max(400,Number(g||0)+120)))}function P({title:e,hint:t,action:r,className:i=""}){return m.jsxs("div",{className:`status-surface status-surface-empty ${i}`.trim(),children:[m.jsx("div",{className:"status-surface-icon","aria-hidden":"true",children:"○"}),m.jsxs("div",{className:"status-surface-copy",children:[m.jsx("strong",{children:e}),t?m.jsx("span",{children:t}):null,r?m.jsx("div",{className:"status-surface-actions",children:r}):null]})]})}export{P as E,q as a,H as b,U as d,l as e,M as p,w as t};
