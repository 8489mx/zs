const fs = require('fs');

let apiFile = fs.readFileSync('c:/zn/frontend/src/features/hr/api/hr.api.ts', 'utf8');
apiFile = apiFile.replace(
  'endOfService: (id: string, payload: unknown) => http(`/api/hr/employees/${id}/end-of-service`, { method: \'POST\', body: JSON.stringify(payload) }),',
  'endOfService: (id: string, payload: unknown) => http(`/api/hr/employees/${id}/end-of-service`, { method: \'POST\', body: JSON.stringify(payload) }),\n  getEndOfServicePreview: (id: string, endDate: string) => http<{ preview: any }>(`/api/hr/employees/${id}/end-of-service/preview?endDate=${endDate}`),'
);
fs.writeFileSync('c:/zn/frontend/src/features/hr/api/hr.api.ts', apiFile);

let modalFile = fs.readFileSync('c:/zn/frontend/src/features/hr/pages/employee-profile/EndOfServiceModal.tsx', 'utf8');
const imports = `import { FormEvent, useState, useEffect } from 'react';\nimport { hrApi } from '@/features/hr/api/hr.api';\nimport { useQuery } from '@tanstack/react-query';`;
modalFile = modalFile.replace(`import { FormEvent, useState } from 'react';`, imports);

const queryCode = `  const previewQuery = useQuery({
    queryKey: ['eos-preview', employeeId, endOfServiceDate],
    queryFn: () => hrApi.getEndOfServicePreview(employeeId, endOfServiceDate),
    enabled: isOpen && !!endOfServiceDate,
  });

  const preview = previewQuery.data?.preview;`;
modalFile = modalFile.replace(`const isPending = mutations.endOfService.isPending;`, queryCode + `\n\n  const isPending = mutations.endOfService.isPending;`);

const previewTableCode = `
        {previewQuery.isLoading ? <div style={{ margin: '20px 0', textAlign: 'center' }}>جاري الحساب...</div> : null}
        {preview && !previewQuery.isLoading ? (
          <div style={{ margin: '20px 0', border: '1px solid var(--border-color)', borderRadius: 8, padding: 16, backgroundColor: 'var(--surface-color)' }}>
            <h4 style={{ margin: '0 0 16px 0' }}>تفاصيل التسوية المالية</h4>
            <table className="table" style={{ width: '100%', marginBottom: 0 }}>
              <tbody>
                <tr><td>تاريخ التعيين</td><td>{preview.hireDate?.slice(0,10)}</td></tr>
                <tr><td>تاريخ إنهاء الخدمة</td><td>{preview.endDate}</td></tr>
                <tr><td>سنوات الخدمة</td><td>{preview.yearsWorked} سنة</td></tr>
                <tr><td>الراتب الأساسي</td><td>{preview.baseSalary} ج.م</td></tr>
                <tr><td>أجر اليوم الواحد</td><td>{preview.dailyRate} ج.م</td></tr>
                <tr><td>مكافأة نهاية الخدمة (قانون العمل)</td><td>{preview.severancePay} ج.م</td></tr>
                <tr><td>رصيد الإجازات المتبقي</td><td>{preview.remainingLeaves} يوم</td></tr>
                <tr><td>بدل نقدي للإجازات</td><td>{preview.leaveEncashment} ج.م</td></tr>
                <tr><td>سلف غير مسددة (تخصم)</td><td style={{ color: 'var(--danger-color)' }}>{preview.unpaidLoans} ج.م</td></tr>
                <tr style={{ fontWeight: 'bold', fontSize: '1.1em', backgroundColor: 'var(--border-color)' }}>
                  <td>إجمالي التسوية المستحقة للموظف</td>
                  <td>{preview.finalSettlementAmount} ج.م</td>
                </tr>
              </tbody>
            </table>
          </div>
        ) : null}
`;
modalFile = modalFile.replace(`{error ? <div className="error-box" style={{ marginTop: 12 }}>{error}</div> : null}`, previewTableCode + `\n        {error ? <div className="error-box" style={{ marginTop: 12 }}>{error}</div> : null}`);
fs.writeFileSync('c:/zn/frontend/src/features/hr/pages/employee-profile/EndOfServiceModal.tsx', modalFile);

