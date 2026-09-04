function s(e){return String(e??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}function p(e={}){const{widthMm:i=58,marginMm:a=0,fontSizePx:n=10.5}=e;return`
    @page {
      size: ${i}mm auto;
      margin: ${a}mm;
    }
    *, *::before, *::after {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    html, body {
      margin: 0;
      padding: 0;
      background: #fff;
      color: #000;
      font-family: 'Arial', 'Helvetica', 'Tahoma', sans-serif;
      font-size: ${n}px;
      line-height: 1.25;
      direction: rtl;
      text-align: right;
      width: 100%;
      -webkit-font-smoothing: antialiased;
    }
    .thermal-receipt-container {
      width: 100%;
      max-width: ${i}mm;
      margin: 0 auto;
      padding: 3mm 4mm;
      page-break-inside: avoid;
      break-inside: avoid;
      background: #fff;
      color: #000;
      box-sizing: border-box;
    }
    @media print {
      body {
        margin: 0 !important;
        padding: 0 !important;
      }
      .no-print {
        display: none !important;
      }
    }
  `}function g(e,i={}){const{title:a="إيصال حراري",widthMm:n=58,marginMm:o=0,fontSizePx:r=10.5,printDelayMs:m=150,autoClose:l=!1}=i,t=window.open("","_blank",`width=${Math.max(380,n*4)},height=700`);if(!t)throw new Error("المتصفح منع فتح نافذة الطباعة. يرجى السماح بالنوافذ المنبثقة.");const d=p({widthMm:n,marginMm:o,fontSizePx:r}),c=`<!doctype html>
<html lang="ar" dir="rtl">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${s(a)}</title>
    <style>${d}</style>
  </head>
  <body>
    <div class="thermal-receipt-container">
      ${e}
    </div>
  </body>
</html>`;t.document.open(),t.document.write(c),t.document.close(),t.focus(),window.setTimeout(()=>{t.print(),l&&window.setTimeout(()=>t.close(),200)},m)}export{s as e,p as g,g as p};
