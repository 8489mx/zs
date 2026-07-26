import { useParams, useNavigate } from 'react-router-dom';
import { useHrProfile } from '@/features/hr/hooks/useHr';
import { Button } from '@/shared/ui/button';
import { employeeName, fallbackText, money } from '@/features/hr/utils/employee-profile.helpers';

export function EmployeeContractPrintPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const profile = useHrProfile(id);

  if (profile.isLoading) return <div className="p-4" dir="rtl">جاري التحميل...</div>;
  if (profile.isError || !profile.data?.employee) return <div className="p-4" dir="rtl">تعذر العثور على الموظف.</div>;

  const employee = profile.data.employee;
  const latestContract = profile.data.contracts?.[0]; // Assuming sorted descending

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="page-shell page-stack" dir="rtl">
      <div className="no-print" style={{ marginBottom: 16 }}>
        <Button variant="secondary" onClick={() => navigate(`/hr/employees/${id}`)}>رجوع للملف</Button>
        <Button onClick={handlePrint} style={{ marginRight: 8 }}>طباعة العقد</Button>
      </div>

      <div className="print-container" style={{ padding: '2rem', backgroundColor: '#fff', color: '#000', maxWidth: '800px', margin: '0 auto', border: '1px solid #ccc', fontFamily: 'serif' }}>
        <h1 style={{ textAlign: 'center', marginBottom: '2rem', textDecoration: 'underline' }}>عقد عمل</h1>
        
        <p style={{ lineHeight: 1.8, fontSize: '1.2rem', marginBottom: '1.5rem' }}>
          إنه في يوم <strong>{new Date().toLocaleDateString('ar-EG')}</strong>، تم تحرير هذا العقد بين كل من:
        </p>

        <ol style={{ lineHeight: 1.8, fontSize: '1.2rem', marginBottom: '2rem' }}>
          <li>
            <strong>الطرف الأول:</strong> شركة .................. ومقرها ..................
          </li>
          <li>
            <strong>الطرف الثاني:</strong> السيد/ة <strong>{employeeName(employee)}</strong>، 
            رقم قومي: <strong>{fallbackText(employee.nationalId)}</strong>،
            الوظيفة: <strong>{fallbackText(employee.jobTitleName)}</strong>.
          </li>
        </ol>

        <h3 style={{ marginTop: '1.5rem', marginBottom: '1rem' }}>البند الأول: موضوع العقد</h3>
        <p style={{ lineHeight: 1.8, fontSize: '1.2rem', marginBottom: '1.5rem' }}>
          يوافق الطرف الثاني على العمل لدى الطرف الأول بوظيفة <strong>{fallbackText(employee.jobTitleName)}</strong> 
          اعتباراً من تاريخ <strong>{fallbackText(employee.hireDate)}</strong>، ويقوم بأداء الواجبات المنوطة به بأمانة وإخلاص.
        </p>

        <h3 style={{ marginTop: '1.5rem', marginBottom: '1rem' }}>البند الثاني: الراتب والبدلات</h3>
        <p style={{ lineHeight: 1.8, fontSize: '1.2rem', marginBottom: '1.5rem' }}>
          يدفع الطرف الأول للطرف الثاني راتباً {employee.compensationType === 'hourly' ? 'بالساعة' : 'شهرياً'} مقداره: 
          <strong> {employee.compensationType === 'hourly' ? money(employee.hourlyRate || 0) : money(latestContract?.baseSalary || 0)} </strong>،
          وذلك نظير أداء مهام وظيفته.
        </p>

        <h3 style={{ marginTop: '1.5rem', marginBottom: '1rem' }}>البند الثالث: ساعات العمل</h3>
        <p style={{ lineHeight: 1.8, fontSize: '1.2rem', marginBottom: '1.5rem' }}>
          يلتزم الطرف الثاني بالعمل وفقاً للمواعيد المحددة من قبل إدارة الشركة،
          {employee.compensationType === 'hourly' 
            ? ` بمعدل ${employee.expectedDailyHours || 0} ساعة يومياً.`
            : ' وتخضع ساعات العمل وفقاً للائحة الحضور والانصراف بالشركة.'}
        </p>

        <h3 style={{ marginTop: '1.5rem', marginBottom: '1rem' }}>البند الرابع: التزامات أخرى</h3>
        <p style={{ lineHeight: 1.8, fontSize: '1.2rem', marginBottom: '2rem' }}>
          يخضع الطرف الثاني للوائح المنظمة للعمل في الشركة وقانون العمل المصري، ويلتزم بالحفاظ على سرية العمل وعدم إفشاء أية معلومات تخص نشاط الطرف الأول.
        </p>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4rem', fontSize: '1.2rem' }}>
          <div style={{ textAlign: 'center' }}>
            <p><strong>الطرف الأول</strong></p>
            <p style={{ marginTop: '3rem' }}>........................</p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <p><strong>الطرف الثاني</strong></p>
            <p style={{ marginTop: '3rem' }}>........................</p>
          </div>
        </div>
      </div>
    </div>
  );
}
