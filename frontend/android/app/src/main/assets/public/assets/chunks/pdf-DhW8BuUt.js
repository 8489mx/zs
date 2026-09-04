import g from"./vendor-html2canvas-DXEQVQnt.js";import{E as h}from"./vendor-jspdf-10sFSXKl.js";import{b,a as y,f as x,g as w,e as N}from"./template-D5zCZvtf.js";import"./browser-CGkMHTHH.js";import"../index-C0PvB-77.js";import"./vendor-react-C-CGkqRI.js";import"./vendor-query-CB33QBPw.js";import"./vendor-state-UgMc1SQf.js";import"./vendor-router-BEdff8k3.js";import"./vendor-forms-BO8SGD9o.js";import"./vendor-recharts-Dv2LOvcU.js";import"./barcode-BGeelrMF.js";const P=210,v=297,s=8,p=794;function A(t,o){return b({pageSize:"a4",settings:o,documentLabel:"فاتورة بيع",documentNumber:t.docNo||t.id,dateText:x(t.date),customerName:t.customerName||"عميل نقدي",paymentText:y(t.paymentType,t.paymentChannel,t.paidAmount,t.total),cashierName:t.createdBy||"—",branchName:t.branchName||"المتجر الرئيسي",locationName:t.locationName||"المخزن الأساسي",note:t.note||"",items:(t.items||[]).map(i=>({name:i.name,unitName:i.unitName,qty:Number(i.qty||0),price:Number(i.price||0),total:Number(i.total||0),modifiers:i.modifiers})),subtotal:Number(t.subTotal||0),discount:Number(t.discount||0),taxAmount:Number(t.taxAmount||0),total:Number(t.total||0),paidAmount:Number(t.paidAmount||0),payments:t.payments})}function M(t,o){return`
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
  `}async function D(t){const o=Array.from(t.querySelectorAll("img"));await Promise.all(o.map(i=>i.complete?Promise.resolve():new Promise(e=>{i.addEventListener("load",()=>e(),{once:!0}),i.addEventListener("error",()=>e(),{once:!0})})))}function T(t){return`sale-${String(t.docNo||t.id||"sale").replace(/[^\w\u0600-\u06FF-]+/g,"-")||"invoice"}.pdf`}function F(t,o){const i=P-s*2,e=v-s*2,m=o.width/i,d=Math.max(1,Math.floor(e*m));let r=0,f=0;for(;r<o.height;){const a=Math.min(d,o.height-r),n=document.createElement("canvas");n.width=o.width,n.height=a;const c=n.getContext("2d");if(!c)throw new Error("تعذر تجهيز صفحات PDF");c.fillStyle="#ffffff",c.fillRect(0,0,n.width,n.height),c.drawImage(o,0,r,o.width,a,0,0,n.width,a);const u=n.toDataURL("image/png"),l=a/m;f>0&&t.addPage("a4","portrait"),t.addImage(u,"PNG",s,s,i,l,void 0,"FAST"),r+=a,f+=1}}async function W(t,o={}){const i=A(t,o.settings||null),e=globalThis.document.createElement("div");e.setAttribute("aria-hidden","true"),e.style.position="fixed",e.style.left="-20000px",e.style.top="0",e.style.width=`${p}px`,e.style.opacity="1",e.style.pointerEvents="none",e.innerHTML=M(i.html,o.settings||null),globalThis.document.body.appendChild(e);try{await D(e),await new Promise(r=>{requestAnimationFrame(()=>requestAnimationFrame(()=>r()))});const m=await g(e,{backgroundColor:"#ffffff",scale:2,useCORS:!0,logging:!1,width:p,windowWidth:p}),d=new h({orientation:"portrait",unit:"mm",format:"a4",compress:!0});F(d,m),d.save(T(t))}finally{e.remove()}}export{W as exportPostedSalePdf};
