import g from"./vendor-html2canvas-DXEQVQnt.js";import{E as h}from"./vendor-jspdf-ChYBy5qQ.js";import{b,c as y,f as x,g as w,d as N}from"./pos-printing-CQJ9_SqY.js";import"./empty-state-CRQYLF0l.js";import"../index-CjLqHSxS.js";import"./vendor-react-DQTAhX50.js";import"./vendor-query-BYNogPQ1.js";import"./vendor-router-BW0wkTNY.js";import"./vendor-state-CGSqKCxs.js";const P=210,v=297,s=8,p=794;function A(t,o){return b({pageSize:"a4",settings:o,documentLabel:"فاتورة بيع",documentNumber:t.docNo||t.id,dateText:x(t.date),customerName:t.customerName||"عميل نقدي",paymentText:y(t.paymentChannel||t.paymentType),cashierName:t.createdBy||"—",branchName:t.branchName||"المتجر الرئيسي",locationName:t.locationName||"المخزن الأساسي",note:t.note||"",items:(t.items||[]).map(n=>({name:n.name,unitName:n.unitName,qty:Number(n.qty||0),price:Number(n.price||0),total:Number(n.total||0)})),subtotal:Number(t.subTotal||0),discount:Number(t.discount||0),taxAmount:Number(t.taxAmount||0),total:Number(t.total||0),paidAmount:Number(t.paidAmount||0),payments:t.payments})}function M(t,o){return`
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
      body { margin: 0; background: #ffffff; color: var(--print-text); font-family: Tahoma, Arial, sans-serif; }
      .pdf-export-root {
        width: ${p}px;
        min-height: 1123px;
        padding: 24px;
        background: #ffffff;
        direction: rtl;
      }
      .print-shell { padding: 0; }
      .print-footer {
        margin-top: 8px;
        font-size: 11px;
        padding-top: 8px;
        text-align: center;
        color: var(--print-muted);
      }
      ${w(!1)}
    </style>
    <div class="pdf-export-root">
      <div class="print-shell">
        ${t}
        <div class="print-footer">${N(o)}</div>
      </div>
    </div>
  `}async function D(t){const o=Array.from(t.querySelectorAll("img"));await Promise.all(o.map(n=>n.complete?Promise.resolve():new Promise(e=>{n.addEventListener("load",()=>e(),{once:!0}),n.addEventListener("error",()=>e(),{once:!0})})))}function F(t){return`sale-${String(t.docNo||t.id||"sale").replace(/[^\w\u0600-\u06FF-]+/g,"-")||"invoice"}.pdf`}function T(t,o){const n=P-s*2,e=v-s*2,d=o.width/n,m=Math.max(1,Math.floor(e*d));let r=0,l=0;for(;r<o.height;){const a=Math.min(m,o.height-r),i=document.createElement("canvas");i.width=o.width,i.height=a;const c=i.getContext("2d");if(!c)throw new Error("تعذر تجهيز صفحات PDF");c.fillStyle="#ffffff",c.fillRect(0,0,i.width,i.height),c.drawImage(o,0,r,o.width,a,0,0,i.width,a);const u=i.toDataURL("image/png"),f=a/d;l>0&&t.addPage("a4","portrait"),t.addImage(u,"PNG",s,s,n,f,void 0,"FAST"),r+=a,l+=1}}async function k(t,o={}){const n=A(t,o.settings||null),e=globalThis.document.createElement("div");e.setAttribute("aria-hidden","true"),e.style.position="fixed",e.style.left="-20000px",e.style.top="0",e.style.width=`${p}px`,e.style.opacity="1",e.style.pointerEvents="none",e.innerHTML=M(n.html,o.settings||null),globalThis.document.body.appendChild(e);try{await D(e),await new Promise(r=>{requestAnimationFrame(()=>requestAnimationFrame(()=>r()))});const d=await g(e,{backgroundColor:"#ffffff",scale:2,useCORS:!0,logging:!1,width:p,windowWidth:p}),m=new h({orientation:"portrait",unit:"mm",format:"a4",compress:!0});T(m,d),m.save(F(t))}finally{e.remove()}}export{k as exportPostedSalePdf};
