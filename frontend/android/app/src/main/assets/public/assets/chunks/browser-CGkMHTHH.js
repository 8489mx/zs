import{_ as z}from"./vendor-jspdf-10sFSXKl.js";import{bc as T,r as R,u as W,D as u}from"../index-C0PvB-77.js";function c(t){return String(t??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}function $(t,e){const i=URL.createObjectURL(t),r=document.createElement("a");r.href=i,r.download=e,r.click(),window.setTimeout(()=>URL.revokeObjectURL(i),0)}function I(t,e){const i=new Blob([JSON.stringify(t,null,2)],{type:"application/json;charset=utf-8"});$(i,e)}async function M(t,e,i){const r=await z(()=>import("./vendor-xlsx-CNerDvZX.js"),[]),o=[e,...i],n=r.utils.aoa_to_sheet(o),a=r.utils.book_new();r.utils.book_append_sheet(a,n,"Data"),n["!views"]=[{rightToLeft:!0,RTL:!0}],a.Workbook={Views:[{RTL:!0}],Sheets:[{name:"Data",RTL:!0}]};const s=r.write(a,{bookType:"xlsx",type:"array"}),p=new Blob([s],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"});$(p,t)}async function O(t){if(t.name.endsWith(".xlsx")||t.name.endsWith(".xls")){const i=await z(()=>import("./vendor-xlsx-CNerDvZX.js"),[]),r=await t.arrayBuffer(),o=i.read(r,{type:"array"}),n=o.SheetNames[0];if(!n)return[];const a=o.Sheets[n];return i.utils.sheet_to_json(a,{defval:"",raw:!1,dateNF:"yyyy-mm-dd hh:mm:ss"}).map(p=>{const d={};for(const[m,g]of Object.entries(p))d[m]=String(g??"").trim();return d})}return A(await t.text())}function A(t){const e=t.replace(/^\ufeff/,"").split(/\r?\n/).filter(o=>o.trim());if(e.length<2)return[];const i=o=>{const n=[];let a="",s=!1;for(let p=0;p<o.length;p+=1){const d=o[p],m=o[p+1];if(d==='"'&&s&&m==='"'){a+='"',p+=1;continue}if(d==='"'){s=!s;continue}if(d===","&&!s){n.push(a.trim()),a="";continue}a+=d}return n.push(a.trim()),n},r=i(e[0]).map(o=>o.trim());return e.slice(1).map(o=>{const n=i(o);return r.reduce((a,s,p)=>(s&&(a[s]=n[p]??""),a),{})}).filter(o=>Object.values(o).some(n=>String(n||"").trim()))}function k(t){const e=String(t||"").trim().toLowerCase();return e.startsWith("<!doctype")||e.startsWith("<html")||e.startsWith("<body")||e.startsWith("<style")||e.startsWith("<section")||e.startsWith("<div")||e.startsWith("<table")||e.startsWith("<h1")||e.startsWith("<h2")||e.startsWith("<h3")}function F(t){if(!t||typeof t!="object")return{};const e=t;return e.settings&&typeof e.settings=="object"?e.settings:e}function H(){const t=F(T.getQueryData(R.settings)),e=W.getState().storeName,i=String(t.storeName||e||u).trim()||u;return{storeName:i,brandName:i,phone:String(t.phone||"").trim(),address:String(t.address||"").trim(),invoiceFooter:String(t.invoiceFooter||"").trim(),logoData:String(t.logoData||"").trim()}}function P(t,e){const i=String(e||"").trim();let r=t.trim();if(i){const o=i.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"),n=new RegExp(`^\\s*<h[12][^>]*>[\\s\\S]*?${o}[\\s\\S]*?<\\/h[12]>`,"i");r=r.replace(n,"").trim()}return r}function x(t){return String(t||"").replace(/\bundefined\b/gi,"").replace(/\bnull\b/gi,"").replace(/[\u00A0]/g," ").replace(/\s+[·•-]\s*$/g,"").replace(/\s{2,}/g," ").trim()}function C(t){const e=t.brandName||t.storeName||u,i=Array.from(e)[0]||"Z",r=[t.phone,t.address].filter(Boolean);return`
    <section class="brand-panel" aria-label="بيانات النشاط">
      ${t.logoData?`<img class="brand-logo-image" src="${t.logoData}" alt="${c(e)}" />`:`<div class="brand-logo-fallback">${c(i)}</div>`}
      <div class="brand-copy">
        <div class="brand-name">${c(e)}</div>
        ${r.length?`<div class="brand-meta">${r.map(o=>`<span>${c(o)}</span>`).join('<span class="brand-meta-sep">•</span>')}</div>`:""}
      </div>
    </section>
  `}function X(t,e,i={}){let r=String(t||"مستند للطباعة").trim()||"مستند للطباعة",o=String(e||"").trim();k(t)&&!k(e)&&(r=String(e||"مستند للطباعة").trim()||"مستند للطباعة",o=String(t||"").trim());const{subtitle:n="",headerDetailsHtml:a="",footerHtml:s="",extraStyles:p="",pageSize:d="auto",orientation:m="portrait",layout:g="standard",printDelayMs:h=260,autoClose:_=!1,documentDirection:L="rtl",deviceName:y}=i,b=H(),v=x(n),D=d==="receipt"?o:P(o,r),w=x(d==="receipt"?s||b.invoiceFooter:s),j=new Date().toLocaleString("ar-EG"),N=d==="A4"?m==="landscape"?"@page { size: A4 landscape; margin: 8mm; }":"@page { size: A4 portrait; margin: 8mm; }":d==="receipt"?"@page { size: 80mm auto; margin: 0; }":"@page { size: auto; margin: 8mm; }",S=`<!doctype html>
  <html lang="ar" dir="${L}">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>${c(r)}</title>
      <style>
        :root {
          --print-text: #0f172a;
          --print-muted: #475569;
          --print-border: #94a3b8;
          --print-surface: #f1f5f9;
          --print-strong: #020617;
          --print-accent: #0284c7;
        }
        * { box-sizing: border-box; }
        html, body { margin: 0; padding: 0; background: #fff; color: var(--print-text); -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; font-size: 11.5px; line-height: 1.4; }
        .print-shell { padding: 10px; max-width: 100%; }
        .print-header { display: grid; grid-template-columns: minmax(0, 1.25fr) minmax(0, 1fr); gap: 10px; align-items: stretch; margin-bottom: 10px; }
        .print-header.centered-layout { display: block; text-align: center; margin-bottom: 10px; }
        .print-header.centered-layout .doc-panel { min-width: auto; padding: 10px 16px; gap: 4px; }
        .print-header.centered-layout .doc-header-details { margin-top: 2px; padding: 4px 10px; }
        .print-header.centered-layout .doc-meta-chip { margin-top: 2px; }
        .brand-name-centered { font-size: 18px; font-weight: 800; color: var(--print-strong); margin-bottom: 2px; }
        .brand-panel, .doc-panel, .meta-box, .summary-box, .totals, .print-footer {
          border: 1px solid var(--print-border);
          border-radius: 8px;
          background: rgba(248, 250, 252, 0.85);
        }
        .brand-panel {
          display: flex;
          align-items: center;
          justify-content: flex-start;
          gap: 12px;
          padding: 8px 12px;
        }
        .brand-copy { min-width: 0; }
        .brand-name {
          font-size: 15px;
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
          width: 44px;
          height: 44px;
          border-radius: 8px;
          flex-shrink: 0;
          object-fit: cover;
          border: 1px solid rgba(148, 163, 184, 0.5);
          background: #f1f5f9;
        }
        .brand-logo-fallback {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: #0284c7;
          font-size: 18px;
          font-weight: 800;
        }
        .doc-panel {
          padding: 8px 12px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 2px;
        }
        .doc-title { margin: 0; font-size: 16px; line-height: 1.2; font-weight: 800; color: var(--print-strong); }
        .doc-subtitle { color: var(--print-muted); font-size: 11px; }
        .doc-header-details { margin-top: 6px; font-size: 11.5px; color: var(--print-strong); background: #ffffff; padding: 4px 8px; border-radius: 6px; border: 1px solid var(--print-border); display: inline-block; }
        .doc-meta-chip { margin-top: 4px; color: var(--print-muted); font-size: 10.5px; }
        .print-content { display: flex; flex-direction: column; gap: 8px; }
        .meta { margin: 0; color: var(--print-muted); font-size: 11px; }
        .section { margin: 0; break-inside: avoid; }
        h1, h2, h3 { margin: 0 0 6px; color: var(--print-strong); }
        h2 { font-size: 13.5px; }
        h3 { font-size: 12.5px; }
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
          margin-top: 2px;
        }
        th, td {
          border: 1px solid var(--print-border);
          padding: 5px 7px;
          text-align: right;
          vertical-align: middle;
          word-break: normal;
          line-height: 1.35;
        }
        th {
          background: var(--print-surface);
          color: #0f172a;
          font-weight: 700;
        }
        tbody tr:nth-child(even) { background: rgba(248, 250, 252, 0.65); }
        .totals {
          margin-top: 2px;
          padding: 7px 9px;
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
          margin-top: 6px;
          padding: 6px 8px;
          color: #111;
          font-size: 11px;
        }
        body.receipt-mode { font-size: 11px; }
        body.receipt-mode .print-shell {
          padding: 1px 2mm 2px;
          width: 100%;
          max-width: 100%;
          margin: 0;
        }
        body.receipt-mode .print-header {
          grid-template-columns: 1fr;
          gap: 6px;
          margin-bottom: 6px;
        }
        body.receipt-mode .brand-panel { padding: 6px 8px; border-radius: 8px; }
        body.receipt-mode .brand-name { font-size: 15px; }
        body.receipt-mode .brand-logo-image, body.receipt-mode .brand-logo-fallback { width: 38px; height: 38px; border-radius: 8px; }
        body.receipt-mode .doc-panel { min-width: 0; padding: 6px 8px; }
        body.receipt-mode .doc-title { font-size: 14px; }
        body.receipt-mode table { font-size: 11px; }
        body.receipt-mode th, body.receipt-mode td { padding: 4px 5px; }
        body.receipt-mode .meta-grid, body.receipt-mode .summary-grid { grid-template-columns: 1fr; }
        body.receipt-mode .totals { padding: 6px 8px; }
        body.receipt-mode .print-footer { margin-top: 4px; }
        body.report-mode .print-shell { max-width: 100%; }
        body.report-mode .print-content > *:first-child { margin-top: 0 !important; }
        body.report-mode .print-content > * { min-height: auto !important; }
        body.report-mode .print-content .totals,
        body.report-mode .print-content .summary-box,
        body.report-mode .print-content .meta-box { break-inside: avoid; }
        @media print {
          html, body { height: auto; }
          html, body { margin: 0 !important; padding: 0 !important; }
          .print-shell { padding: 0; }
          body.receipt-mode .print-shell { padding: 0 1mm !important; width: 100% !important; max-width: 100% !important; margin: 0 !important; box-sizing: border-box !important; }
          a { color: inherit; text-decoration: none; }
          .section, .meta-box, .summary-box, .totals, .print-header { break-inside: avoid; }
          table { break-inside: auto; }
          thead { display: table-header-group; }
          tfoot { display: table-footer-group; }
          tr, td, th { break-inside: avoid-page; }
        }
        ${N}
        ${p}
      </style>
    </head>
    <body class="${d==="receipt"?"receipt-mode":"report-mode"}">
      <div class="print-shell">
        ${d==="receipt"?"":`
          <div class="print-header ${g==="centered"?"centered-layout":""}">
            ${g==="centered"?"":C(b)}
            <div class="doc-panel">
              ${g==="centered"?`<div class="brand-name-centered">${c(b.brandName||b.storeName||u)}</div>`:""}
              <h1 class="doc-title">${c(r)}</h1>
              ${v?`<div class="doc-subtitle">${c(v)}</div>`:""}
              ${a?`<div class="doc-header-details">${a}</div>`:""}
              <div class="doc-meta-chip">تاريخ الطباعة: ${c(j)}</div>
            </div>
          </div>`}
        <div class="print-content">${D}</div>
        ${w?`<div class="print-footer">${w}</div>`:""}
      </div>
    </body>
  </html>`;if(y&&typeof window<"u"&&window.electronPrinter){window.electronPrinter.printHtmlSilent({html:S,deviceName:y,pageSize:d}).catch(E=>console.error("Silent print failed:",E));return}const l=window.open("","_blank","width=1120,height=820");if(!l)throw new Error("المتصفح منع نافذة الطباعة");l.document.open(),l.document.write(S),l.document.close();const f=()=>{window.setTimeout(()=>{l.focus(),l.print(),_&&window.setTimeout(()=>l.close(),220)},Math.max(220,Number(h||0)))};l.document.readyState==="complete"?f():(l.addEventListener("load",f,{once:!0}),window.setTimeout(f,Math.max(400,Number(h||0)+120)))}export{O as a,I as b,M as d,c as e,X as p,H as r,$ as t};
