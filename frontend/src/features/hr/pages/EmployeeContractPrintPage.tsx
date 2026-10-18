import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';
import { useHrProfile } from '@/features/hr/hooks/useHr';
import { Button } from '@/shared/ui/button';
import { employeeName, fallbackText, money } from '@/features/hr/utils/employee-profile.helpers';

export function EmployeeContractPrintPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const profile = useHrProfile(id);

  if (profile.isLoading) return <div className="p-4" dir="rtl">{t('hr.employee_contract_print_page.s0', "جاري التحميل...")}</div>;
  if (profile.isError || !profile.data?.employee) return <div className="p-4" dir="rtl">{t('hr.employee_contract_print_page.s1', "تعذر العثور على الموظف.")}</div>;

  const employee = profile.data.employee;
  const latestContract = profile.data.contracts?.[0]; // Assuming sorted descending

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="page-shell page-stack" dir="rtl">
      <div className="no-print" style={{ marginBottom: 16 }}>
        <Button variant="secondary" onClick={() => navigate(`/hr/employees/${id}`)}>{t('hr.employee_contract_print_page.s2', "رجوع للملف")}</Button>
        <Button onClick={handlePrint} style={{ marginRight: 8 }}>{t('hr.employee_contract_print_page.s3', "طباعة العقد")}</Button>
      </div>

      <div className="print-container" style={{ padding: '2rem', backgroundColor: '#fff', color: '#000', maxWidth: '800px', margin: '0 auto', border: '1px solid #ccc', fontFamily: 'serif' }}>
        <h1 style={{ textAlign: 'center', marginBottom: '2rem', textDecoration: 'underline' }}>{t('hr.employee_contract_print_page.s4', "عقد عمل")}</h1>
        
        <p style={{ lineHeight: 1.8, fontSize: '1.2rem', marginBottom: '1.5rem' }}>
          {t('hr.employee_contract_print_page.s5', "إنه في يوم")} <strong>{new Date().toLocaleDateString('ar-EG')}</strong>{t('hr.employee_contract_print_page.s6', "، تم تحرير هذا العقد بين كل من:")}
        </p>

        <ol style={{ lineHeight: 1.8, fontSize: '1.2rem', marginBottom: '2rem' }}>
          <li>
            <strong>{t('hr.employee_contract_print_page.s7', "الطرف الأول:")}</strong> {t('hr.employee_contract_print_page.s8', "شركة .................. ومقرها ..................")}
          </li>
          <li>
            <strong>{t('hr.employee_contract_print_page.s9', "الطرف الثاني:")}</strong> {t('hr.employee_contract_print_page.s10', "السيد/ة")} <strong>{employeeName(employee)}</strong>{t('hr.employee_contract_print_page.s11', "، \n            رقم قومي:")} <strong>{fallbackText(employee.nationalId)}</strong>{t('hr.employee_contract_print_page.s12', "،\n            الوظيفة:")} <strong>{fallbackText(employee.jobTitleName)}</strong>.
          </li>
        </ol>

        <h3 style={{ marginTop: '1.5rem', marginBottom: '1rem' }}>{t('hr.employee_contract_print_page.s13', "البند الأول: موضوع العقد")}</h3>
        <p style={{ lineHeight: 1.8, fontSize: '1.2rem', marginBottom: '1.5rem' }}>
          {t('hr.employee_contract_print_page.s14', "يوافق الطرف الثاني على العمل لدى الطرف الأول بوظيفة")} <strong>{fallbackText(employee.jobTitleName)}</strong> 
          {t('hr.employee_contract_print_page.s15', "اعتباراً من تاريخ")} <strong>{fallbackText(employee.hireDate)}</strong>{t('hr.employee_contract_print_page.s16', "، ويقوم بأداء الواجبات المنوطة به بأمانة وإخلاص.")}
        </p>

        <h3 style={{ marginTop: '1.5rem', marginBottom: '1rem' }}>{t('hr.employee_contract_print_page.s17', "البند الثاني: الراتب والبدلات")}</h3>
        <p style={{ lineHeight: 1.8, fontSize: '1.2rem', marginBottom: '1.5rem' }}>
          {t('hr.employee_contract_print_page.s18', "يدفع الطرف الأول للطرف الثاني راتباً")} {employee.compensationType === 'hourly' ? t('hr.employee_contract_print_page.s19', "بالساعة") : t('hr.employee_contract_print_page.s20', "شهرياً")} {t('hr.employee_contract_print_page.s21', "مقداره:")} 
          <strong> {employee.compensationType === 'hourly' ? money(employee.hourlyRate || 0) : money(latestContract?.baseSalary || 0)} </strong>{t('hr.employee_contract_print_page.s22', "،\n          وذلك نظير أداء مهام وظيفته.")}
        </p>

        <h3 style={{ marginTop: '1.5rem', marginBottom: '1rem' }}>{t('hr.employee_contract_print_page.s23', "البند الثالث: ساعات العمل")}</h3>
        <p style={{ lineHeight: 1.8, fontSize: '1.2rem', marginBottom: '1.5rem' }}>
          {t('hr.employee_contract_print_page.s24', "يلتزم الطرف الثاني بالعمل وفقاً للمواعيد المحددة من قبل إدارة الشركة،")}
          {employee.compensationType === 'hourly' 
            ? ` بمعدل ${employee.expectedDailyHours || 0} ساعة يومياً.`
            : t('hr.employee_contract_print_page.s25', " وتخضع ساعات العمل وفقاً للائحة الحضور والانصراف بالشركة.")}
        </p>

        <h3 style={{ marginTop: '1.5rem', marginBottom: '1rem' }}>{t('hr.employee_contract_print_page.s26', "البند الرابع: التزامات أخرى")}</h3>
        <p style={{ lineHeight: 1.8, fontSize: '1.2rem', marginBottom: '2rem' }}>
          {t('hr.employee_contract_print_page.s27', "يخضع الطرف الثاني للوائح المنظمة للعمل في الشركة وقانون العمل المصري، ويلتزم بالحفاظ على سرية العمل وعدم إفشاء أية معلومات تخص نشاط الطرف الأول.")}
        </p>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4rem', fontSize: '1.2rem' }}>
          <div style={{ textAlign: 'center' }}>
            <p><strong>{t('hr.employee_contract_print_page.s28', "الطرف الأول")}</strong></p>
            <p style={{ marginTop: '3rem' }}>........................</p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <p><strong>{t('hr.employee_contract_print_page.s29', "الطرف الثاني")}</strong></p>
            <p style={{ marginTop: '3rem' }}>........................</p>
          </div>
        </div>
      </div>
    </div>
  );
}
