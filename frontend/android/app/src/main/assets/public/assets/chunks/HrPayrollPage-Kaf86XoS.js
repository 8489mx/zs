import{j as t,r}from"./vendor-react-C-CGkqRI.js";import{P as Fe}from"./page-header-CbZYLTKq.js";import{Q as xe}from"./query-feedback-DqhcgFWM.js";import{bI as Be,$ as G,bs as We,bR as Te,e as Ie,B as c,K as J,N as me}from"../index-C0PvB-77.js";import{D as he}from"./data-table-wfYUP6bG.js";import{u as Ee}from"./vendor-router-BEdff8k3.js";import"./loading-state-BQA_lLZ3.js";import"./vendor-query-CB33QBPw.js";import"./vendor-state-UgMc1SQf.js";import"./vendor-jspdf-10sFSXKl.js";import"./vendor-forms-BO8SGD9o.js";import"./vendor-recharts-Dv2LOvcU.js";import"./pagination-controls-CRjymbz4.js";const Le=[{value:"all",label:"الكل"},{value:"needs_review",label:"يحتاج مراجعة"},{value:"ready",label:"جاهز"},{value:"approved",label:"معتمد"},{value:"paid",label:"ط…دفوع"}];function l(n){const i=Number(n||0);return Number.isFinite(i)?`${i.toFixed(2)} ج.م`:"0.00 ج.م"}function s(n){return String(n||"").trim()||"—"}function u(n){return String(n||"").trim().toLowerCase()}function se(n){const i=u(n);return i==="draft"?"مسودة / بانتظار المراجعة":i==="reviewed"?"جاهز":i==="approved"?"معتمد":i==="paid"?"ط…دفوع":i==="cancelled"||i==="canceled"?"ملغي":s(n)}function ge(n){return Number(n.unpaidLeaveDays||0)>0||Number(n.loanDeductionAmount||0)>0||Number(n.deductionAmount||0)>0||Number(n.suggestedAttendanceDeductionAmount||0)>0||Number(n.suggestedLeaveDeductionAmount||0)>0||Number(n.attendanceAbsentDays||0)>0||Number(n.attendanceHalfDays||0)>0||Number(n.attendanceEarlyLeaveDays||0)>0||!Number.isFinite(Number(n.baseSalary||0))||Number(n.baseSalary||0)<=0||Number(n.unresolvedExceptionsCount||0)>0}function He(n,i,A,g){const f=i.get(String(n.employeeId)),x=u(f?.departmentName||""),P=u(n.departmentName||"");return g!=="all"&&x!==g&&P!==g?!1:A?[n.employeeName,n.employeeNo,n.employeeId,f?.firstName,f?.lastName,f?.displayName,f?.employeeNo].map(h=>u(h)).join(" ").includes(A):!0}function ye(n){const i=[];return Number(n.unpaidLeaveDays||0)>0&&i.push("إجازة غير مدفوعة"),Number(n.loanDeductionAmount||0)>0&&i.push("سلف/أقساط"),Number(n.deductionAmount||0)>0&&i.push("خصومات"),(Number(n.attendanceAbsentDays||0)>0||Number(n.attendanceHalfDays||0)>0||Number(n.attendanceEarlyLeaveDays||0)>0)&&i.push("استثناء حضور"),Number(n.unresolvedExceptionsCount||0)>0&&i.push("استثناءات معلقة"),Number(n.baseSalary||0)<=0&&i.push("راتب أساسي غير مكتمل"),i.length?i.join("، "):"جاهز"}function qe(n){const{monthFilter:i,search:A,departmentFilter:g,reviewStatusFilter:f,runStatusFilter:x,departmentOptions:P,runStatusOptions:E,summary:h,canViewSalaryAmounts:j,onMonthFilterChange:L,onSearchChange:U,onDepartmentFilterChange:M,onReviewStatusFilterChange:X,onRunStatusFilterChange:F}=n;return t.jsxs(t.Fragment,{children:[t.jsxs("div",{style:{background:"#f8fafc",border:"1px solid #e2e8f0",borderRadius:"10px",padding:"12px 14px",marginBottom:"16px"},children:[t.jsxs("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"8px"},children:[t.jsxs("span",{style:{fontSize:"0.825rem",fontWeight:800,color:"#0f172a"},children:["ملخص مسير المرتبات (",i,")"]}),t.jsx("span",{style:{fontSize:"0.725rem",color:"#64748b"},children:"مؤشرات الحسابات الإجمالية للشهر المحدد"})]}),t.jsx("div",{style:{display:"grid",gridTemplateColumns:"repeat(6, minmax(0, 1fr))",gap:"8px"},children:[{label:"إجمالي الموظفين",value:h.totalEmployees||0,isAlert:!1},{label:"الرواتب الأساسية",value:j?`${l(h.totalBaseSalary)}`:"—",isAlert:!1},{label:"إجمالي الخصومات",value:j?`${l(h.totalDeductions)}`:"—",isAlert:h.totalDeductions>0},{label:"السلف والأقساط",value:j?`${l(h.totalLoanDeduction)}`:"—",isAlert:!1},{label:"صافي المرتبات",value:j?`${l(h.totalNet)}`:"—",isAlert:!1,isPrimary:!0},{label:"يحتاج مراجعة",value:h.needsReview,isAlert:h.needsReview>0}].map((o,B)=>t.jsxs("div",{style:{background:"#ffffff",border:`1px solid ${o.isAlert?"#fca5a5":"#e2e8f0"}`,borderRadius:"6px",padding:"8px 10px",display:"flex",flexDirection:"column",gap:"2px",boxShadow:"0 1px 2px rgba(0,0,0,0.02)",minWidth:0},children:[t.jsx("span",{style:{fontSize:"0.725rem",fontWeight:600,color:"#64748b",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"},title:o.label,children:o.label}),t.jsx("strong",{style:{fontSize:"1.05rem",fontWeight:800,color:o.isAlert?"#dc2626":o.isPrimary?"#1d4ed8":"#0f172a",lineHeight:1.2},children:o.value})]},B))})]}),t.jsxs("div",{style:{display:"flex",justifyContent:"flex-start",alignItems:"center",flexWrap:"wrap",gap:"8px",marginBottom:"14px",background:"#f8fafc",padding:"10px 14px",borderRadius:"8px",border:"1px solid #e2e8f0"},children:[t.jsx("input",{value:A,onChange:o=>U(o.target.value),placeholder:"بحث باسم أو كود الموظف...",style:{width:"200px",minWidth:"160px",padding:"5px 10px",borderRadius:"6px",border:"1px solid #cbd5e1",fontSize:"0.825rem",background:"#fff",boxSizing:"border-box"}}),t.jsxs("div",{style:{display:"flex",alignItems:"center",gap:"4px"},children:[t.jsx("span",{style:{fontSize:"0.75rem",fontWeight:600,color:"#475569",whiteSpace:"nowrap"},children:"الشهر:"}),t.jsx("input",{type:"month",value:i,onChange:o=>L(o.target.value),style:{width:"130px",padding:"4px 8px",borderRadius:"6px",border:"1px solid #cbd5e1",fontSize:"0.8rem",background:"#fff",boxSizing:"border-box"}})]}),t.jsxs("select",{value:g,onChange:o=>M(o.target.value),style:{width:"auto",minWidth:"120px",maxWidth:"150px",padding:"5px 10px",borderRadius:"6px",border:"1px solid #cbd5e1",fontSize:"0.825rem",background:"#fff",boxSizing:"border-box"},children:[t.jsx("option",{value:"all",children:"كل الأقسام"}),P.map(o=>t.jsx("option",{value:o.value,children:o.label},o.value))]}),t.jsx("select",{value:f,onChange:o=>X(o.target.value),style:{width:"auto",minWidth:"120px",maxWidth:"150px",padding:"5px 10px",borderRadius:"6px",border:"1px solid #cbd5e1",fontSize:"0.825rem",background:"#fff",boxSizing:"border-box"},children:Le.map(o=>t.jsx("option",{value:o.value,children:o.label},o.value))}),t.jsxs("select",{value:x,onChange:o=>F(o.target.value),style:{width:"auto",minWidth:"120px",maxWidth:"150px",padding:"5px 10px",borderRadius:"6px",border:"1px solid #cbd5e1",fontSize:"0.825rem",background:"#fff",boxSizing:"border-box"},children:[t.jsx("option",{value:"all",children:"كل حالات المسير"}),E.map(o=>t.jsx("option",{value:o.value,children:o.label},o.value))]})]})]})}const fe={periodMonth:"",payFrequency:"monthly",startDate:"",endDate:"",notes:""};function at(){const n=Ee(),i=Be(),A=G(["hrPayrollView","hrPayrollManage","hrPayrollApprove"]),g=G(["hrPayrollManage","hrPayrollApprove"]),f=G("hrPayrollApprove"),x=G(["hrSalaryView","hrSalaryManage","hrPayrollManage","hrPayrollApprove"]),P=new Date,E=`${P.getFullYear()}-${String(P.getMonth()+1).padStart(2,"0")}`,[h,j]=r.useState(1),[L,U]=r.useState(20),[M,X]=r.useState(E),[F,o]=r.useState(""),[B,oe]=r.useState("all"),[N,Z]=r.useState("all"),[b,S]=r.useState(fe),[W,T]=r.useState(""),[R,ee]=r.useState(""),[p,te]=r.useState(null),[ae,H]=r.useState(null),[be,q]=r.useState(!1),[ve,I]=r.useState(!1),[le,je]=r.useState("cash"),w=We({page:h,pageSize:L,month:M}),O=Te(R||void 0),k=r.useMemo(()=>w.payrollRuns.data?.runs||[],[w.payrollRuns.data?.runs]),_=r.useMemo(()=>w.employees.data?.employees||[],[w.employees.data?.employees]),V=r.useMemo(()=>new Map(_.map(e=>[String(e.id),e])),[_]),Se=Number(w.payrollRuns.data?.summary?.totalItems||k.length||0),we=r.useMemo(()=>k.find(e=>String(e.id)===String(R)),[k,R]),m=O.data?.run||we,re=r.useMemo(()=>(m?.items||[]).filter(a=>a.status!=="excluded"),[m?.items]),ke=r.useMemo(()=>{const e=new Map;for(const a of _){const d=u(a.departmentName);d&&e.set(d,String(a.departmentName||"").trim())}return Array.from(e.entries()).map(([a,d])=>({value:a,label:d})).sort((a,d)=>a.label.localeCompare(d.label,"ar"))},[_]),y=r.useMemo(()=>{const e=u(F);return re.filter(a=>{if(!He(a,V,e,B))return!1;const d=u(a.status),$=ge(a);return N==="all"?!0:N==="needs_review"?$:N==="ready"?d==="reviewed"||d==="draft"&&!$:N==="approved"?d==="approved":N==="paid"?d==="paid":!0})},[re,F,V,B,N]),v=r.useMemo(()=>{const e=y,a=e.length,d=e.reduce((C,z)=>C+Number(z.baseSalary||0),0),$=e.reduce((C,z)=>C+Number(z.deductionAmount||0),0),De=e.reduce((C,z)=>C+Number(z.loanDeductionAmount||0),0),$e=e.reduce((C,z)=>C+Number(z.netPay||0),0),Me=e.filter(ge).length;return{totalEmployees:a,totalBaseSalary:d,totalDeductions:$,totalLoanDeduction:De,totalNet:$e,needsReview:Me}},[y]),K=r.useMemo(()=>y.filter(e=>Number(e.loanDeductionAmount||0)>0),[y]),Ne=r.useMemo(()=>{const e=new Map;for(const a of k){const d=u(a.status);d&&e.set(d,se(d))}return Array.from(e.entries()).map(([a,d])=>({value:a,label:d}))},[k]),[Q,Re]=r.useState("all"),de=r.useMemo(()=>Q==="all"?k:k.filter(e=>u(e.status)===Q),[k,Q]),ne=!!i.createPayrollRun,Y=u(m?.status),D=Y==="approved"||Y==="paid",pe=r.useMemo(()=>{const e=!!m,a=y.length>0;return[{key:"run",title:"اختيار كشف المرتبات",status:e?`تم اختيار كشف ${s(m?.periodMonth)}`:"اختر كشفًا من جدول كشوف المرتبات أولًا.",ok:e,action:"اختيار كشف",onClick:void 0},{key:"items",title:"وجود موظفين داخل الكشف",status:a?`${y.length} موظف ظاهر حسب الفلاتر الحالية.`:"لا توجد بنود موظفين ظاهرة. راجع الفلاتر أو أنشئ المسير.",ok:a,action:"مسح فلاتر المراجعة",onClick:()=>{o(""),oe("all"),Z("all")}},{key:"review",title:"مراجعة الحضور والإجازات",status:v.needsReview>0?`${v.needsReview} موظف يحتاج مراجعة قبل الاعتماد.`:"لا توجد تنبيهات مراجعة ظاهرة في الفلتر الحالي.",ok:v.needsReview===0,action:v.needsReview>0?"عرض المحتاج مراجعة":"فتح الحضور",onClick:v.needsReview>0?()=>Z("needs_review"):()=>n("/hr/attendance")},{key:"loans",title:"أقساط السلف لهذا الشهر",status:K.length>0?`${K.length} موظف لديهم خصم سلفة/قسط داخل الكشف.`:"لا توجد أقساط سلف ظاهرة داخل الكشف الحالي.",ok:!0,action:"فتح السلف",onClick:()=>n("/hr/loans")},{key:"status",title:"حالة الكشف",status:D?"تم الاعتماد/الصرف. لا يمكن تعديل المسير الآن.":"يرجى مراجعة المسير قبل اعتماد الرواتب.",ok:D||v.needsReview===0,action:Y==="approved"?"صرف المرتبات":"اعتماد نهائي",onClick:Y==="approved"?()=>I(!0):!D&&m?()=>ie(m.id,"approve"):void 0}]},[K.length,y.length,n,D,m,v.needsReview]);function ie(e,a){if(R!==e){ee(e),Ie("تم عرض تفاصيل هذا المسير. يرجى مراجعتها بالأسفل وتأكيد عدم وجود استثناءات معلقة ثم حاول مرة أخرى.");return}y.some($=>Number($.unresolvedExceptionsCount||0)>0)?H({runId:e,type:a}):ce(e,a)}function ce(e,a){a==="review"&&i.reviewPayrollRun?i.reviewPayrollRun.mutateAsync(e):a==="approve"&&i.approvePayrollRun&&i.approvePayrollRun.mutateAsync(e),H(null)}async function Ce(e){if(e.preventDefault(),T(""),!!R)try{await i.payPayrollRun.mutateAsync({id:R,payload:{paymentChannel:le}}),I(!1)}catch(a){T(me(a,"تعذر صرف المرتبات."))}}async function ue(e){e.preventDefault(),T("");const a=String(b.periodMonth||"").trim();if(!a){T("شهر مسير المرتبات مطلوب.");return}try{await i.createPayrollRun.mutateAsync({periodMonth:a,payFrequency:b.payFrequency,startDate:b.startDate||void 0,endDate:b.endDate||void 0,notes:String(b.notes||"").trim()||void 0}),S(fe),q(!1)}catch(d){T(me(d,"تعذر تجهيز مسير المرتبات."))}}const ze=e=>{const a=window.open("","_blank");a&&(a.document.write(`
      <html dir="rtl" lang="ar">
        <head>
          <title>مفردات مرتب (ملخص) - ${s(e.employeeName)}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700&display=swap');
            @page { size: A4 portrait; margin: 10mm; }
            body { 
              font-family: 'Tajawal', Tahoma, Arial, sans-serif; 
              padding: 0; margin: 0; color: #1e293b; line-height: 1.5; 
              -webkit-print-color-adjust: exact; print-color-adjust: exact;
            }
            .container { max-width: 100%; box-sizing: border-box; }
            .header { text-align: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 15px; margin-bottom: 20px; }
            .header h1 { margin: 0; color: #0f172a; font-size: 22px; font-weight: 700; }
            .header p { margin: 5px 0 0; color: #64748b; font-size: 14px; }
            .details { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px; }
            .details div { background: #fdfdfd; padding: 12px; border-radius: 6px; border: 1px solid #e2e8f0; }
            .details p { margin: 6px 0; font-size: 13px; }
            .details strong { display: inline-block; width: 110px; color: #475569; }
            .section-title { font-size: 15px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 10px; color: #0f172a; font-weight: 700; }
            .totals { background: #fdfdfd; padding: 15px; border-radius: 6px; border: 1px solid #e2e8f0; font-size: 14px; }
            .totals .row { display: flex; justify-content: space-between; margin-bottom: 8px; }
            .totals .row span { font-weight: 500; }
            .totals .total { font-weight: 700; font-size: 18px; color: #16a34a; margin-top: 10px; padding-top: 10px; border-top: 2px solid #e2e8f0; }
            .footer { margin-top: 40px; display: flex; justify-content: space-around; padding-top: 20px; }
            .signature-box { text-align: center; width: 40%; }
            .signature-box .title { font-weight: 700; color: #475569; margin-bottom: 30px; }
            .signature-box .line { border-bottom: 1px dashed #cbd5e1; width: 80%; margin: 0 auto; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>مفردات الراتب (ملخص)</h1>
              <p>خاص بشهر: ${s(m?.periodMonth)}</p>
            </div>
            <div class="details">
              <div>
                <div class="section-title">بيانات الموظف الأساسية</div>
                <p><strong>اسم الموظف:</strong> ${s(e.employeeName)}</p>
                <p><strong>كود الموظف:</strong> ${s(e.employeeNo)}</p>
                <p><strong>القسم:</strong> ${s(V.get(String(e.employeeId))?.departmentName)}</p>
              </div>
              <div>
                <div class="section-title">ملخص الحضور والانصراف</div>
                <p><strong>أيام الغياب:</strong> ${Number(e.attendanceAbsentDays||0)} يوم</p>
                <p><strong>أيام التأخير:</strong> ${Number(e.attendanceLateDays||0)} يوم</p>
                <p><strong>إجازات بدون راتب:</strong> ${Number(e.unpaidLeaveDays||0)} يوم</p>
              </div>
            </div>
            
            <div class="totals">
              <div class="section-title" style="border:none; margin:0 0 15px;">الحساب النهائي (الاستحقاقات والاستقطاعات)</div>
              <div class="row"><strong class="muted">الراتب الأساسي:</strong> <span>${l(e.baseSalary)}</span></div>
              <div class="row"><strong class="muted">إجمالي البدلات والمكافآت:</strong> <span>${l(e.allowanceAmount)}</span></div>
              <div class="row"><strong class="muted">الخصومات (تأخير وغياب):</strong> <span style="color:#dc2626">-${l(e.deductionAmount)}</span></div>
              <div class="row"><strong class="muted">أقساط السلف المستحقة:</strong> <span style="color:#dc2626">-${l(e.loanDeductionAmount)}</span></div>
              <div class="row total"><strong>صافي الراتب المستحق:</strong> <span>${l(e.netPay)}</span></div>
            </div>

            <div class="footer">
              <div class="signature-box">
                <div class="title">توقيع الموظف</div>
                <div class="line"></div>
              </div>
              <div class="signature-box">
                <div class="title">توقيع المدير</div>
                <div class="line"></div>
              </div>
            </div>
          </div>
          <script>
            setTimeout(() => { window.print(); window.close(); }, 500);
          <\/script>
        </body>
      </html>
    `),a.document.close(),a.focus())},Ae=e=>{const a=window.open("","_blank");a&&(a.document.write(`
      <html dir="rtl" lang="ar">
        <head>
          <title>مفردات مرتب (تفصيلي) - ${s(e.employeeName)}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700&display=swap');
            @page { size: A4 portrait; margin: 10mm; }
            body { 
              font-family: 'Tajawal', Tahoma, Arial, sans-serif; 
              padding: 0; margin: 0; color: #1e293b; line-height: 1.5; 
              -webkit-print-color-adjust: exact; print-color-adjust: exact;
            }
            .container { max-width: 100%; box-sizing: border-box; }
            .header { text-align: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 12px; margin-bottom: 15px; }
            .header h1 { margin: 0; color: #0f172a; font-size: 20px; font-weight: 700; }
            .header p { margin: 4px 0 0; color: #64748b; font-size: 13px; }
            .details { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 15px; }
            .details div { background: #fdfdfd; padding: 10px; border-radius: 6px; border: 1px solid #e2e8f0; }
            .details p { margin: 5px 0; font-size: 12px; }
            .details strong { display: inline-block; width: 100px; color: #475569; }
            .section-title { font-size: 14px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin-bottom: 8px; color: #0f172a; font-weight: 700; }
            .table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
            .table th, .table td { padding: 6px; text-align: center; border-bottom: 1px solid #e2e8f0; font-size: 12px; border: 1px solid #e2e8f0; }
            .table th { background: #f8fafc; font-weight: 700; color: #475569; }
            .notes { background: #fffbeb; padding: 10px; border-right: 3px solid #f59e0b; border-radius: 4px; margin-bottom: 15px; font-size: 12px; color: #92400e; }
            .totals { background: #fdfdfd; padding: 12px; border-radius: 6px; border: 1px solid #e2e8f0; font-size: 13px; }
            .totals .row { display: flex; justify-content: space-between; margin-bottom: 6px; }
            .totals .row span { font-weight: 500; }
            .totals .total { font-weight: 700; font-size: 16px; color: #16a34a; margin-top: 8px; padding-top: 8px; border-top: 2px solid #e2e8f0; }
            .footer { margin-top: 30px; display: flex; justify-content: space-around; padding-top: 15px; }
            .signature-box { text-align: center; width: 40%; }
            .signature-box .title { font-weight: 700; color: #475569; margin-bottom: 25px; font-size: 13px; }
            .signature-box .line { border-bottom: 1px dashed #cbd5e1; width: 80%; margin: 0 auto; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>مفردات الراتب (تفصيلي)</h1>
              <p>خاص بشهر: ${s(m?.periodMonth)}</p>
            </div>
            
            <div class="details">
              <div>
                <div class="section-title">بيانات الموظف الأساسية</div>
                <p><strong>اسم الموظف:</strong> ${s(e.employeeName)}</p>
                <p><strong>كود الموظف:</strong> ${s(e.employeeNo)}</p>
                <p><strong>القسم:</strong> ${s(V.get(String(e.employeeId))?.departmentName)}</p>
              </div>
              <div>
                <div class="section-title">بيانات التعاقد</div>
                <p><strong>نوع الأجر:</strong> ${u(e.compensationType)==="hourly"?"أجر بالساعة":"راتب شهري"}</p>
                <p><strong>الراتب الأساسي:</strong> ${l(e.baseSalary)}</p>
                ${u(e.compensationType)==="hourly"?"<p><strong>سعر الساعة:</strong> "+l(e.hourlyRate||0)+"</p>":""}
              </div>
            </div>

            <div class="section-title" style="border: none; margin-bottom: 6px;">تفاصيل الحضور والانصراف خلال الشهر</div>
            <table class="table">
              <thead>
                <tr>
                  <th>أيام الحضور</th>
                  <th>أيام الغياب</th>
                  <th>أيام التأخير</th>
                  <th>انصراف مبكر</th>
                  <th>إجازات بدون راتب</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>غير متاح</td>
                  <td>${Number(e.attendanceAbsentDays||0)} يوم</td>
                  <td>${Number(e.attendanceLateDays||0)} يوم</td>
                  <td>${Number(e.attendanceEarlyLeaveDays||0)} يوم</td>
                  <td>${Number(e.unpaidLeaveDays||0)} يوم</td>
                </tr>
              </tbody>
            </table>

            ${e.payrollReviewNotes?'<div class="notes"><strong>ملاحظات الحضور والإجازات:</strong><br/>'+s(e.payrollReviewNotes)+"</div>":""}

            <div class="totals">
              <div class="section-title" style="border:none; margin:0 0 10px;">الحساب النهائي (الاستحقاقات والاستقطاعات)</div>
              <div class="row"><strong class="muted">الراتب الأساسي:</strong> <span>${l(e.baseSalary)}</span></div>
              <div class="row"><strong class="muted">إجمالي البدلات والمكافآت (الإضافي):</strong> <span>${l(e.allowanceAmount)}</span></div>
              <div class="row"><strong class="muted">إجمالي الاستقطاعات (غياب/تأخير/جزاءات):</strong> <span style="color:#dc2626">-${l(e.deductionAmount)}</span></div>
              <div class="row"><strong class="muted">أقساط السلف المستحقة:</strong> <span style="color:#dc2626">-${l(e.loanDeductionAmount)}</span></div>
              <div class="row total"><strong>صافي الراتب المستحق:</strong> <span>${l(e.netPay)}</span></div>
            </div>

            <div class="footer">
              <div class="signature-box">
                <div class="title">توقيع الموظف</div>
                <div class="line"></div>
              </div>
              <div class="signature-box">
                <div class="title">توقيع المدير</div>
                <div class="line"></div>
              </div>
            </div>
          </div>
          <script>
            setTimeout(() => { window.print(); window.close(); }, 500);
          <\/script>
        </body>
      </html>
    `),a.document.close(),a.focus())},Pe=()=>{const e=window.open("","_blank");e&&(e.document.write(`
      <html dir="rtl" lang="ar">
        <head>
          <title>كشف تسليم الرواتب - ${s(m?.periodMonth)}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700&display=swap');
            @page { size: A4 portrait; margin: 15mm; }
            body { 
              font-family: 'Tajawal', Tahoma, Arial, sans-serif; 
              padding: 0; margin: 0; color: #1e293b; line-height: 1.6; 
              -webkit-print-color-adjust: exact; print-color-adjust: exact;
            }
            .header { 
              text-align: center; border-bottom: 2px solid #e2e8f0; 
              padding-bottom: 20px; margin-bottom: 25px; 
              display: flex; flex-direction: column; align-items: center; gap: 4px;
            }
            .header h1 { margin: 0; color: #0f172a; font-size: 26px; font-weight: 700; }
            .header p { margin: 0; color: #64748b; font-size: 16px; font-weight: 500; }
            .table { 
              width: 100%; border-collapse: collapse; margin-bottom: 25px; 
              font-size: 14px;
            }
            .table thead { display: table-header-group; }
            .table tr { page-break-inside: avoid; }
            .table th, .table td { 
              padding: 12px 14px; text-align: right; 
              border: 1px solid #cbd5e1; 
            }
            .table th { 
              background-color: #f8fafc; font-weight: 700; 
              color: #334155; border-bottom: 2px solid #94a3b8; 
            }
            .table tbody tr:nth-child(even) { background-color: #fbfcfd; }

            .footer { 
              margin-top: 60px; display: flex; justify-content: space-between; 
              padding-top: 25px; clear: both; page-break-inside: avoid;
            }
            .signature-box {
              text-align: center; width: 30%;
            }
            .signature-box .title { font-weight: 700; color: #475569; margin-bottom: 40px; }
            .signature-box .line { border-bottom: 1px solid #94a3b8; width: 80%; margin: 0 auto; }
            .amount { font-family: monospace; font-size: 15px; font-weight: 600; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>كشف تسليم الرواتب</h1>
            <p>خاص بشهر: ${s(m?.periodMonth)}</p>
          </div>
          <table class="table">
            <thead>
              <tr>
                <th style="width: 40px; text-align: center;">م</th>
                <th style="width: 100px;">كود الموظف</th>
                <th>اسم الموظف</th>
                <th style="width: 140px;">صافي الراتب المستحق</th>
                <th style="width: 220px;">التوقيع / ملاحظات</th>
              </tr>
            </thead>
            <tbody>
              ${y.map((a,d)=>`
                <tr>
                  <td style="text-align: center; color: #64748b;">${d+1}</td>
                  <td style="color: #64748b;">${s(a.employeeNo)}</td>
                  <td style="font-weight: 500;">${s(a.employeeName)}</td>
                  <td class="amount">${l(a.netPay)}</td>
                  <td></td>
                </tr>
              `).join("")}
              <tr style="background-color: #f1f5f9; font-weight: bold; font-size: 15px;">
                <td colspan="3" style="text-align: left; padding: 12px 14px; border: 1px solid #cbd5e1; color: #0f172a;">إجمالي الرواتب المستحقة:</td>
                <td class="amount" style="padding: 12px 14px; border: 1px solid #cbd5e1; color: #0f172a; font-size: 16px;">${l(v.totalNet)}</td>
                <td style="border: 1px solid #cbd5e1; background-color: #f8fafc;"></td>
              </tr>
            </tbody>
          </table>
          <div class="footer">
            <div class="signature-box">
              <div class="title">إعداد الموارد البشرية</div>
              <div class="line"></div>
            </div>
            <div class="signature-box">
              <div class="title">اعتماد الإدارة</div>
              <div class="line"></div>
            </div>
            <div class="signature-box">
              <div class="title">توقيع أمين الخزينة</div>
              <div class="line"></div>
            </div>
          </div>
          <script>
            setTimeout(() => { window.print(); window.close(); }, 500);
          <\/script>
        </body>
      </html>
    `),e.document.close(),e.focus())};return t.jsx("div",{className:"page-stack page-shell",dir:"rtl",children:t.jsxs("main",{className:"document-prototype-column",style:{paddingBottom:"20px"},children:[t.jsx(Fe,{title:"المرتبات",description:"مسار شهري واضح: جهّز المسير، راجع الحضور والإجازات والسلف، ثم اعتمد عند اكتمال المراجعة.",actions:t.jsxs("div",{className:"actions compact-actions",children:[ne&&g?t.jsx(c,{onClick:()=>{S(e=>({...e,periodMonth:e.periodMonth||M})),q(!0)},children:"إنشاء مسير الشهر"}):null,t.jsx(c,{variant:"secondary",onClick:()=>n("/hr/attendance"),children:"مراجعة الحضور"}),t.jsx(c,{variant:"secondary",onClick:()=>n("/hr/loans"),children:"مراجعة السلف"}),t.jsx(c,{variant:"secondary",onClick:()=>n("/hr/employees"),children:"رجوع للموظفين"})]})}),t.jsx("div",{style:{background:"#ffffff",border:"1px solid #e2e8f0",borderRadius:"12px",padding:"20px",boxShadow:"0 1px 3px rgba(0,0,0,0.04)"},children:A?t.jsxs(t.Fragment,{children:[t.jsx(qe,{monthFilter:M,search:F,departmentFilter:B,reviewStatusFilter:N,runStatusFilter:Q,departmentOptions:ke,runStatusOptions:Ne,summary:v,canViewSalaryAmounts:x,dueLoanInstallmentRows:K,draft:b,formError:W,canManagePayroll:g,hasCreatePayrollRun:ne,isCreatePending:i.createPayrollRun.isPending,onMonthFilterChange:e=>{X(e),j(1)},onSearchChange:o,onDepartmentFilterChange:oe,onReviewStatusFilterChange:Z,onRunStatusFilterChange:Re,onDraftChange:S,onCreateRun:e=>{ue(e)}}),be&&t.jsx(J,{open:!0,onClose:()=>q(!1),width:"500px",children:t.jsxs("div",{style:{padding:"24px"},children:[t.jsx("h2",{style:{marginTop:0,fontSize:"1.25rem"},children:"تجهيز مسير المرتبات"}),ne&&g?t.jsxs("form",{className:"form-grid",onSubmit:e=>{ue(e)},children:[t.jsxs("label",{className:"field field-wide",children:[t.jsx("span",{children:"شهر مسير المرتبات (كمرجع) *"}),t.jsx("input",{type:"month",value:b.periodMonth,onChange:e=>S(a=>({...a,periodMonth:e.target.value})),required:!0})]}),t.jsxs("label",{className:"field",children:[t.jsx("span",{children:"دورة القبض المستهدفة"}),t.jsxs("select",{value:b.payFrequency,onChange:e=>S(a=>({...a,payFrequency:e.target.value})),children:[t.jsx("option",{value:"monthly",children:"شهري"}),t.jsx("option",{value:"weekly",children:"أسبوعي"}),t.jsx("option",{value:"biweekly",children:"نصف شهري (كل أسبوعين)"}),t.jsx("option",{value:"daily",children:"يومي"})]})]}),t.jsxs("div",{className:"form-grid field-wide",style:{gap:"12px",display:"flex"},children:[t.jsxs("label",{className:"field",style:{flex:1},children:[t.jsx("span",{children:"تاريخ البداية (اختياري)"}),t.jsx("input",{type:"date",value:b.startDate,onChange:e=>S(a=>({...a,startDate:e.target.value}))})]}),t.jsxs("label",{className:"field",style:{flex:1},children:[t.jsx("span",{children:"تاريخ النهاية (اختياري)"}),t.jsx("input",{type:"date",value:b.endDate,onChange:e=>S(a=>({...a,endDate:e.target.value}))})]})]}),t.jsxs("label",{className:"field field-wide",children:[t.jsx("span",{children:"ملاحظات"}),t.jsx("input",{value:b.notes,onChange:e=>S(a=>({...a,notes:e.target.value}))})]}),W?t.jsx("div",{className:"field-wide error-box",children:W}):null,t.jsxs("div",{className:"actions compact-actions field-wide",style:{marginTop:"16px"},children:[t.jsx(c,{type:"submit",disabled:i.createPayrollRun.isPending,children:i.createPayrollRun.isPending?"جارٍ التجهيز...":"تجهيز المسير"}),t.jsx(c,{type:"button",variant:"secondary",onClick:()=>q(!1),children:"إلغاء"})]})]}):t.jsx("p",{className:"muted",children:"لا تملك صلاحية تنفيذ هذا الإجراء."})]})}),ve&&t.jsx(J,{open:!0,onClose:()=>I(!1),width:"500px",children:t.jsxs("div",{style:{padding:"24px"},children:[t.jsx("h2",{style:{marginTop:0,fontSize:"1.25rem"},children:"صرف المرتبات"}),f&&i.payPayrollRun?t.jsxs("form",{className:"form-grid",onSubmit:e=>{Ce(e)},children:[t.jsxs("p",{style:{marginBottom:"16px",fontSize:"0.9rem"},children:["أنت على وشك صرف المرتبات للمسير المعتمد الخاص بشهر ",s(m?.periodMonth),". سيتم إنشاء قيد يومية محاسبي بالصرف."]}),t.jsxs("label",{className:"field field-wide",children:[t.jsx("span",{children:"طريقة الصرف *"}),t.jsxs("select",{value:le,onChange:e=>je(e.target.value),required:!0,children:[t.jsx("option",{value:"cash",children:"نقداً (من الخزينة)"}),t.jsx("option",{value:"bank",children:"تحويل بنكي"})]})]}),W?t.jsx("div",{className:"field-wide error-box",children:W}):null,t.jsxs("div",{className:"actions compact-actions field-wide",style:{marginTop:"16px"},children:[t.jsx(c,{type:"submit",disabled:i.payPayrollRun.isPending,children:i.payPayrollRun.isPending?"جارٍ الصرف...":"تأكيد الصرف"}),t.jsx(c,{type:"button",variant:"secondary",onClick:()=>I(!1),children:"إلغاء"})]})]}):t.jsx("p",{className:"muted",children:"لا تملك صلاحية تنفيذ هذا الإجراء."})]})}),t.jsxs("div",{style:{background:"#f8fafc",border:"1px solid #e2e8f0",borderRadius:"8px",padding:"8px 12px",marginBottom:"14px",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:"8px"},children:[t.jsxs("div",{style:{display:"flex",alignItems:"center",gap:"8px",flexWrap:"wrap"},children:[t.jsx("strong",{style:{fontSize:"0.8rem",color:"#0f172a",display:"flex",alignItems:"center",gap:"4px"},children:t.jsx("span",{children:"فحص التدقيق المحاسبي:"})}),t.jsx("div",{style:{display:"flex",gap:"6px",flexWrap:"wrap"},children:pe.map(e=>t.jsxs("span",{style:{fontSize:"0.75rem",fontWeight:600,padding:"2px 8px",borderRadius:"4px",background:e.ok?"#f0fdf4":"#fefce8",color:e.ok?"#166534":"#854d0e",border:`1px solid ${e.ok?"#bbf7d0":"#fef08a"}`,display:"inline-flex",alignItems:"center",gap:"3px"},title:e.status,children:[e.ok?"✓":"•"," ",e.title]},e.key))})]}),t.jsx("div",{style:{display:"flex",gap:"6px"},children:pe.filter(e=>e.onClick&&(!e.ok||e.key==="status")).map(e=>t.jsx(c,{type:"button",variant:e.ok?"secondary":"primary",onClick:e.onClick,style:{fontSize:"0.75rem",padding:"2px 8px"},children:e.action},e.key))})]}),t.jsxs("div",{style:{marginBottom:"16px"},children:[t.jsx("div",{style:{fontWeight:800,fontSize:"0.9rem",color:"#0f172a",marginBottom:"8px"},children:"كشوف المرتبات المسجلة"}),t.jsx(xe,{isLoading:w.payrollRuns.isLoading,isError:w.payrollRuns.isError,error:w.payrollRuns.error,isEmpty:!de.length,loadingText:"جارٍ تحميل كشوف المرتبات...",errorTitle:"تعذر تحميل كشوف المرتبات",emptyTitle:"لا توجد بيانات مرتبات لهذه الفترة.",children:t.jsx(he,{rows:de,rowKey:e=>String(e.id),onRowClick:e=>ee(String(e.id)),density:"compact",pagination:{page:h,pageSize:L,totalItems:Se,onPageChange:j,onPageSizeChange:e=>{U(e),j(1)},itemLabel:"كشف"},columns:[{key:"periodMonth",header:"الشهر",cell:e=>s(e.periodMonth)},{key:"payFrequency",header:"الدورة",cell:e=>e.payFrequency==="weekly"?"أسبوعي":e.payFrequency==="biweekly"?"نصف شهري":e.payFrequency==="daily"?"يومي":"شهري"},{key:"startDate",header:"من",cell:e=>e.startDate?s(e.startDate):"أول الشهر"},{key:"endDate",header:"إلى",cell:e=>e.endDate?s(e.endDate):"آخر الشهر"},{key:"status",header:"الحالة",cell:e=>se(e.status)},{key:"itemCount",header:"عدد الموظفين",cell:e=>s(e.itemCount||(e.items?.length??0))},{key:"totalNetPay",header:"صافي المرتبات",cell:e=>x?l(e.totalNetPay):"—"},{key:"createdAt",header:"تاريخ الإنشاء",cell:e=>s(e.createdAt)},{key:"actions",header:"إجراء",cell:e=>t.jsxs("div",{className:"actions compact-actions",style:{flexWrap:"nowrap"},children:[g&&i.recalculatePayrollRun&&u(e.status)!=="approved"&&u(e.status)!=="paid"?t.jsx(c,{variant:"secondary",onClick:()=>{i.recalculatePayrollRun.mutateAsync(String(e.id))},style:{padding:"2px 8px",fontSize:"0.75rem"},children:"مراجعة"}):null,g&&i.reviewPayrollRun&&u(e.status)==="draft"?t.jsx(c,{variant:"secondary",onClick:()=>ie(String(e.id),"review"),style:{padding:"2px 8px",fontSize:"0.75rem"},children:"اعتماد"}):null,f&&i.approvePayrollRun&&u(e.status)==="reviewed"?t.jsx(c,{variant:"secondary",onClick:()=>ie(String(e.id),"approve"),style:{padding:"2px 8px",fontSize:"0.75rem"},children:"اعتماد نهائي"}):null,f&&i.payPayrollRun&&u(e.status)==="approved"?t.jsx(c,{variant:"primary",onClick:()=>{ee(String(e.id)),I(!0)},style:{padding:"2px 8px",fontSize:"0.75rem"},children:"صرف"}):null,g&&i.cancelPayrollRun&&u(e.status)!=="paid"&&u(e.status)!=="cancelled"?t.jsx(c,{variant:"secondary",onClick:()=>{i.cancelPayrollRun.mutateAsync(String(e.id))},style:{padding:"2px 8px",fontSize:"0.75rem"},children:"إلغاء"}):null]})}]})})]}),t.jsxs("div",{children:[t.jsxs("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"8px"},children:[t.jsxs("div",{style:{fontWeight:800,fontSize:"0.9rem",color:"#0f172a"},children:["تفاصيل ومراجعة موظفي المسير ",m?`(${s(m.periodMonth)})`:""]}),D&&t.jsx(c,{variant:"secondary",onClick:()=>Pe(),style:{padding:"2px 10px",fontSize:"0.8rem"},children:"طباعة كشف تسليم الرواتب"})]}),R?t.jsx(xe,{isLoading:O.isLoading,isError:O.isError,error:O.error,isEmpty:!1,loadingText:"جارٍ تحميل تفاصيل المسير...",errorTitle:"تعذر تحميل تفاصيل المسير",children:m?y.length?t.jsxs(t.Fragment,{children:[t.jsx(he,{rows:y,rowKey:e=>String(e.id),density:"compact",columns:[{key:"employeeNo",header:"كود الموظف",cell:e=>s(e.employeeNo)},{key:"employeeName",header:"اسم الموظف",cell:e=>s(e.employeeName)},{key:"baseSalary",header:"الراتب الأساسي",cell:e=>x?l(e.baseSalary):"—"},{key:"allowanceAmount",header:"البدلات والإضافي",cell:e=>x?l(e.allowanceAmount):"—"},{key:"deductionAmount",header:"الخصومات",cell:e=>x?l(e.deductionAmount):"—"},{key:"loanDeductionAmount",header:"السلف/الأقساط",cell:e=>x?l(e.loanDeductionAmount):"—"},{key:"netPay",header:"صافي الراتب",cell:e=>x?l(e.netPay):"—"},{key:"status",header:"الحالة",cell:e=>se(e.status)},{key:"details",header:"التفاصيل",cell:e=>t.jsx(c,{variant:"secondary",onClick:()=>te(e),style:{padding:"2px 8px",fontSize:"0.75rem"},children:"تفاصيل"})}]}),p&&t.jsx(J,{open:!0,onClose:()=>te(null),width:"500px",children:t.jsxs("div",{style:{padding:"24px"},children:[t.jsxs("div",{style:{display:"flex",flexDirection:"column",gap:"6px",marginBottom:"20px",borderBottom:"1px solid #e2e8f0",paddingBottom:"16px"},children:[t.jsx("h2",{style:{margin:0,fontSize:"20px"},children:"تفاصيل المرتب"}),t.jsxs("div",{style:{display:"flex",gap:"12px",alignItems:"center"},children:[t.jsx("p",{style:{margin:0,fontWeight:"bold",fontSize:"15px"},children:s(p.employeeName)}),t.jsxs("span",{className:"muted",style:{fontSize:"13px"},children:["كود: ",s(p.employeeNo)]})]})]}),t.jsxs("div",{style:{display:"flex",flexDirection:"column",gap:"16px"},children:[t.jsxs("div",{style:{border:"1px solid #e2e8f0",borderRadius:"8px",padding:"16px",background:"#f8fafc"},children:[t.jsx("h3",{style:{margin:"0 0 16px 0",fontSize:"15px"},children:"الحساب النهائي"}),t.jsxs("div",{style:{display:"flex",flexDirection:"column",gap:"12px"},children:[t.jsxs("div",{style:{display:"flex",justifyContent:"space-between",borderBottom:"1px dashed #e2e8f0",paddingBottom:"6px"},children:[t.jsx("span",{className:"muted",children:"الراتب الأساسي:"}),t.jsx("span",{style:{fontWeight:"500"},children:x?l(p.baseSalary):"—"})]}),t.jsxs("div",{style:{display:"flex",justifyContent:"space-between",borderBottom:"1px dashed #e2e8f0",paddingBottom:"6px"},children:[t.jsx("span",{className:"muted",children:"البدلات والإضافي:"}),t.jsx("span",{style:{fontWeight:"500"},children:x?l(p.allowanceAmount):"—"})]}),t.jsxs("div",{style:{display:"flex",justifyContent:"space-between",borderBottom:"1px dashed #e2e8f0",paddingBottom:"6px"},children:[t.jsx("span",{className:"muted",children:"الخصومات (تأخير وغياب):"}),t.jsx("span",{style:{fontWeight:"500",color:"#dc2626"},children:x?l(p.deductionAmount):"—"})]}),t.jsxs("div",{style:{display:"flex",justifyContent:"space-between",borderBottom:"1px dashed #e2e8f0",paddingBottom:"6px"},children:[t.jsx("span",{className:"muted",children:"السلف والأقساط:"}),t.jsx("span",{style:{fontWeight:"500",color:"#dc2626"},children:x?l(p.loanDeductionAmount):"—"})]})]}),t.jsxs("div",{style:{marginTop:"16px",paddingTop:"16px",borderTop:"2px solid #cbd5e1",display:"flex",justifyContent:"space-between",alignItems:"center"},children:[t.jsx("span",{style:{fontSize:"16px",fontWeight:"bold"},children:"صافي الراتب المستحق:"}),t.jsx("span",{style:{fontSize:"20px",fontWeight:"bold",color:"#16a34a"},children:x?l(p.netPay):"—"})]})]}),t.jsxs("div",{style:{display:"grid",gridTemplateColumns:"repeat(2, 1fr)",gap:"12px",padding:"16px",border:"1px solid #e2e8f0",borderRadius:"8px"},children:[t.jsxs("div",{children:[t.jsx("div",{className:"muted",style:{fontSize:"12px",marginBottom:"4px"},children:"نوع الأجر"}),t.jsx("div",{style:{fontWeight:"500",fontSize:"14px"},children:u(p.compensationType)==="hourly"?"أجر بالساعة/اليوم":"راتب شهري"})]}),u(p.compensationType)==="hourly"&&t.jsxs(t.Fragment,{children:[t.jsxs("div",{children:[t.jsx("div",{className:"muted",style:{fontSize:"12px",marginBottom:"4px"},children:"أجر الساعة/اليوم"}),t.jsx("div",{style:{fontWeight:"500",fontSize:"14px"},children:x?l(p.hourlyRate||0):"—"})]}),t.jsxs("div",{children:[t.jsx("div",{className:"muted",style:{fontSize:"12px",marginBottom:"4px"},children:"ساعات العمل اليومية"}),t.jsx("div",{style:{fontWeight:"500",fontSize:"14px"},children:p.expectedDailyHours||0})]})]}),t.jsxs("div",{children:[t.jsx("div",{className:"muted",style:{fontSize:"12px",marginBottom:"4px"},children:"تنبيهات عامة"}),t.jsx("div",{style:{fontWeight:"500",fontSize:"14px",color:ye(p)?"#ea580c":"inherit"},children:ye(p)||"لا يوجد"})]})]}),(p.payrollReviewNotes||p.notes)&&t.jsxs("div",{style:{background:"#fefce8",padding:"16px",borderRadius:"8px",borderRight:"4px solid #facc15"},children:[p.payrollReviewNotes&&t.jsxs("div",{style:{marginBottom:p.notes?"12px":"0"},children:[t.jsx("strong",{style:{display:"block",marginBottom:"4px",color:"#854d0e",fontSize:"13px"},children:"ملاحظات مراجعة الحضور:"}),t.jsx("span",{style:{color:"#713f12",fontSize:"14px"},children:s(p.payrollReviewNotes)})]}),p.notes&&t.jsxs("div",{children:[t.jsx("strong",{style:{display:"block",marginBottom:"4px",color:"#854d0e",fontSize:"13px"},children:"ملاحظات إضافية:"}),t.jsx("span",{style:{color:"#713f12",fontSize:"14px"},children:s(p.notes)})]})]})]}),t.jsxs("div",{style:{marginTop:"24px",display:"flex",justifyContent:"space-between",alignItems:"center"},children:[t.jsx("div",{children:t.jsx(c,{variant:"primary",onClick:()=>te(null),children:"إغلاق"})}),D&&t.jsxs("div",{style:{display:"flex",gap:"8px"},children:[t.jsx(c,{variant:"secondary",onClick:()=>ze(p),children:"ملخص (A4)"}),t.jsx(c,{variant:"secondary",onClick:()=>Ae(p),children:"تفصيلي (A4)"})]})]})]})})]}):t.jsx("p",{className:"muted",style:{padding:"16px",textAlign:"center"},children:"لا توجد نتائج مطابقة للبحث أو الفلاتر الحالية."}):t.jsx("p",{className:"muted",children:"تفاصيل المسير غير متاحة."})}):t.jsx("div",{style:{background:"#f8fafc",padding:"16px",borderRadius:"8px",textAlign:"center",color:"#64748b",fontSize:"0.85rem"},children:"اضغط على أي كشف من الجدول أعلاه لعرض وتفصيل رواتب الموظفين الخاصة به."})]}),ae&&t.jsx(J,{open:!0,onClose:()=>H(null),width:"600px",children:t.jsxs("div",{style:{padding:"24px"},children:[t.jsx("h2",{style:{marginTop:0,color:"#dc2626"},children:"تنبيه: استثناءات معلقة"}),t.jsx("p",{children:"يوجد استثناءات حضور وانصراف معلقة للموظفين التاليين بحاجة للمراجعة. هل أنت متأكد من رغبتك بالاستمرار دون معالجتها؟"}),t.jsx("div",{style:{maxHeight:"200px",overflowY:"auto",background:"#f8fafc",padding:"12px",borderRadius:"4px",border:"1px solid #e2e8f0",marginBottom:"20px"},children:t.jsx("ul",{style:{margin:0,paddingLeft:"20px"},children:y.filter(e=>Number(e.unresolvedExceptionsCount||0)>0).map(e=>t.jsxs("li",{style:{marginBottom:"4px"},children:[s(e.employeeName)," (",s(e.employeeNo),")"]},e.id))})}),t.jsxs("div",{className:"actions",children:[t.jsx(c,{variant:"secondary",onClick:()=>H(null),children:"إلغاء الأمر ومراجعة الاستثناءات"}),t.jsx(c,{variant:"danger",onClick:()=>ce(ae.runId,ae.type),children:"نعم، تابع الاعتماد"})]})]})})]}):t.jsx("div",{style:{background:"#f8fafc",padding:"20px",borderRadius:"10px",textAlign:"center",color:"#64748b"},children:t.jsx("p",{style:{margin:0},children:"ليس لديك صلاحية للوصول إلى بيانات المرتبات."})})})]})})}export{at as HrPayrollPage};
