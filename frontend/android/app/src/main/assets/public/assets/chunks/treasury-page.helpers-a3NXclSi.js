import{u as p}from"./vendor-query-CB33QBPw.js";import{r as m,w as c,Z as u}from"../index-C0PvB-77.js";import{u as v,t as d}from"./use-treasury-DSEkyEv-.js";import{r as $}from"./reference-data.api-C8LuLjfn.js";import{r as l}from"./vendor-react-C-CGkqRI.js";import{e as s,p as y,d as g}from"./browser-CGkMHTHH.js";function N(t){return JSON.stringify({page:t.page||1,pageSize:t.pageSize||20,search:t.search||""})}function O(t,a){const e=v(t),r=p({queryKey:m.expensesPage(N(a)),queryFn:()=>d.expenses(a),placeholderData:o=>o}),i=p({queryKey:m.branches,queryFn:$.branches}),n=p({queryKey:m.locations,queryFn:$.locations});return{transactionsQuery:e,expensesQuery:r,branchesQuery:i,locationsQuery:n,transactionRows:e.data?.rows||[],transactionSummary:e.data?.summary||{cashIn:0,cashOut:0,net:0},transactionPagination:e.data?.pagination,expenses:r.data?.rows||[],expenseSummary:r.data?.summary||{totalItems:0,totalAmount:0},expensePagination:r.data?.pagination,branches:i.data||[],locations:n.data||[]}}function A(t){const a=t.map(e=>`
    <tr>
      <td>${s(e.txnType||e.type||"—")}</td>
      <td>${c(Number(e.amount||0))}</td>
      <td>${s(e.note||"—")}</td>
      <td>${s(e.referenceType||"—")}</td>
      <td>${`${s(e.branchName||"—")} / ${s(e.locationName||"—")}`}</td>
      <td>${s(u(e.createdAt||e.date))}</td>
    </tr>
  `).join("");y("سجل حركات الخزينة",`
    <h1>سجل حركات الخزينة</h1>
    <div class="meta">عدد الحركات المطابقة: ${t.length}</div>
    <table>
      <thead><tr><th>النوع</th><th>المبلغ</th><th>البيان</th><th>المرجع</th><th>الفرع/المخزن</th><th>التاريخ</th></tr></thead>
      <tbody>${a||'<tr><td colspan="6">لا توجد حركات</td></tr>'}</tbody>
    </table>
  `)}function I(t){const a=t.map(e=>`
    <tr>
      <td>${s(e.title||"—")}</td>
      <td>${c(Number(e.amount||0))}</td>
      <td>${s(e.note||"—")}</td>
      <td>${`${s(e.branchName||"—")} / ${s(e.locationName||"—")}`}</td>
      <td>${s(e.createdBy||"—")}</td>
      <td>${s(u(e.date))}</td>
    </tr>
  `).join("");y("سجل المصروفات",`
    <h1>سجل المصروفات</h1>
    <div class="meta">عدد المصروفات المطابقة: ${t.length}</div>
    <table>
      <thead><tr><th>المصروف</th><th>المبلغ</th><th>الملاحظات</th><th>الفرع/المخزن</th><th>المنفذ</th><th>التاريخ</th></tr></thead>
      <tbody>${a||'<tr><td colspan="6">لا توجد مصروفات</td></tr>'}</tbody>
    </table>
  `)}function S(t,a,e){const r=t.slice(0,18).map(n=>`
    <tr>
      <td>${s(n.txnType||n.note||"—")}</td>
      <td>${s(n.referenceType||"—")}</td>
      <td>${c(Number(n.amount||0))}</td>
      <td>${s(u(n.createdAt||n.date))}</td>
    </tr>
  `).join(""),i=a.slice(0,12).map(n=>`
    <tr>
      <td>${s(n.title||"—")}</td>
      <td>${c(Number(n.amount||0))}</td>
      <td>${s(n.locationName||"المخزن الأساسي")}</td>
      <td>${s(u(n.date))}</td>
    </tr>
  `).join("");y("ملخص الخزينة",`
    <h1>ملخص الخزينة</h1>
    <div class="meta">تاريخ الطباعة: ${s(u(new Date().toISOString()))}</div>
    <div class="totals">
      <div><strong>داخل الخزينة:</strong> ${c(e.cashIn)}</div>
      <div><strong>خارج الخزينة:</strong> ${c(e.cashOut)}</div>
      <div><strong>صافي الخزينة:</strong> ${c(e.net)}</div>
      <div><strong>إجمالي المصروفات:</strong> ${c(e.expenseTotal)}</div>
      <div><strong>عدد المصروفات:</strong> ${e.expenseCount}</div>
    </div>
    <h2>الحركات المطابقة</h2>
    <table>
      <thead><tr><th>النوع</th><th>المرجع</th><th>المبلغ</th><th>التاريخ</th></tr></thead>
      <tbody>${r||'<tr><td colspan="4">لا توجد حركات</td></tr>'}</tbody>
    </table>
    <h2>المصروفات المطابقة</h2>
    <table>
      <thead><tr><th>المصروف</th><th>المبلغ</th><th>الفرع</th><th>التاريخ</th></tr></thead>
      <tbody>${i||'<tr><td colspan="4">لا توجد مصروفات</td></tr>'}</tbody>
    </table>
  `)}function B(){const t=l.useCallback(async(n,o)=>{const h=await d.listAllTransactions({search:n,filter:o});A(h.rows||[])},[]),a=l.useCallback(async n=>{const o=await d.listAllExpenses({search:n});I(o.rows||[])},[]),e=l.useCallback(async(n,o,h,f,b)=>{const[x,T]=await Promise.all([d.listAllTransactions({search:n,filter:o}),d.listAllExpenses({search:h})]);S(x.rows||[],T.rows||[],{...f,expenseCount:b.totalItems,expenseTotal:b.totalAmount})},[]),r=l.useCallback(async(n,o)=>(await d.listAllTransactions({search:n,filter:o})).rows||[],[]),i=l.useCallback(async n=>(await d.listAllExpenses({search:n})).rows||[],[]);return{printMatchingTransactions:t,printMatchingExpenses:a,printMatchingTreasurySummary:e,exportTransactions:r,exportExpenses:i}}function E(t=new Date){const a=t.getTimezoneOffset()*6e4;return new Date(t.getTime()-a).toISOString().slice(0,16)}const K=()=>({title:"",amount:"0",note:"",date:E(),branchId:"",locationId:""});function Q(t,a){const e=[];if(t.title.trim()||e.push("اكتب اسم المصروف."),Number(t.amount||0)>0||e.push("المبلغ يجب أن يكون أكبر من صفر."),(!t.date||Number.isNaN(new Date(t.date).getTime()))&&e.push("أدخل تاريخًا صالحًا للمصروف."),t.locationId){const r=a.find(i=>i.id===t.locationId);r?t.branchId&&r.branchId&&String(r.branchId)!==String(t.branchId)&&e.push("المخزن المختار لا يتبع الفرع المحدد."):e.push("المخزن المختار غير صالح.")}return e}function R(t){return`${t.branchName||"—"} / ${t.locationName||"—"}`}function C(t){return t?{cashier_shift:"وردية كاشير",supplier_payment_schedule:"دفع مورد (مجدول)",supplier_payment:"دفع مورد",customer_payment:"تحصيل عميل",expense:"مصروف",sale:"مبيعات",sale_return:"مرتجع مبيعات",return:"مرتجع",return_document:"مستند مرتجع",purchase:"مشتريات",purchase_return:"مرتجع مشتريات",service:"خدمات",hr_advance:"سلفة موظف",hr_payroll:"مرتبات موظفين"}[t]||t:"—"}function j(t){g("treasury-transactions-results.csv",["txnType","amount","referenceType","note","branch","location","createdBy","createdAt"],t.map(a=>[C(a.txnType||a.type)||"",a.amount,a.referenceType||"",a.note||"",a.branchName||"",a.locationName||"",a.createdByName||"",a.createdAt||a.date||""]))}function M(t){g("expenses-register-results.csv",["title","amount","note","branch","location","createdBy","date"],t.map(a=>[a.title,a.amount,a.note||"",a.branchName||"",a.locationName||"",a.createdBy||"",a.date||""]))}export{R as a,O as b,M as c,j as e,C as f,K as i,B as u,Q as v};
