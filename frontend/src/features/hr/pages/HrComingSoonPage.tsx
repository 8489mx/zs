import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/shared/components/page-header';
import { Card } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';

export function HrComingSoonPage() {
  const navigate = useNavigate();

  return (
    <div className="page-stack page-shell" dir="rtl">
      <PageHeader
        title="«·„Ê«—œ «·»‘—Ì…"
        description="≈œ«—… «·„ÊŸ›Ì‰ Ê«·Õ÷Ê— Ê«·≈Ã«“«  Ê«·”·› Ê«·„— »«  Ê«·⁄ıÂœ „‰ „ﬂ«‰ Ê«Õœ."
      />

      <div className="grid-2" style={{ gap: 12 }}>
        <Card title="«·„ÊŸ›Ì‰">
          <div className="actions compact-actions">
            <Button variant="secondary" onClick={() => navigate('/hr/employees')}>«·„ÊŸ›Ì‰</Button>
            <Button variant="secondary" onClick={() => navigate('/hr/employees/new')}>≈÷«›… „ÊŸ›</Button>
            <Button variant="secondary" onClick={() => navigate('/hr/documents')}>«·„” ‰œ« </Button>
          </div>
        </Card>

        <Card title="«· ‘€Ì· «·ÌÊ„Ì">
          <div className="actions compact-actions">
            <Button variant="secondary" onClick={() => navigate('/hr/attendance')}>«·Õ÷Ê— Ê«·«‰’—«›</Button>
            <Button variant="secondary" onClick={() => navigate('/hr/leaves')}>«·≈Ã«“« </Button>
            <Button variant="secondary" onClick={() => navigate('/hr/assets')}>«·⁄ıÂœ</Button>
          </div>
        </Card>

        <Card title="«·„«·Ì Ê«·≈œ«—Ì">
          <div className="actions compact-actions">
            <Button variant="secondary" onClick={() => navigate('/hr/loans')}>«·”·› Ê«·Œ’Ê„« </Button>
            <Button variant="secondary" onClick={() => navigate('/hr/payroll')}>«·„— »« </Button>
            <Button variant="secondary" onClick={() => navigate('/hr/reports')}> ﬁ«—Ì— «·„Ê«—œ «·»‘—Ì…</Button>
            <Button variant="secondary" onClick={() => navigate('/hr/settings')}>«·≈⁄œ«œ« </Button>
          </div>
        </Card>
      </div>

      <div className="grid-2" style={{ gap: 12 }}>
        <Card title="«·„ÊŸ›Ì‰ Ê«·„·›« " description="≈÷«›… «·„ÊŸ›Ì‰ Ê„ «»⁄… «·„·›«  Ê«·⁄ﬁÊœ Ê«·„” ‰œ« .">
          <div className="actions compact-actions">
            <Button variant="secondary" onClick={() => navigate('/hr/employees')}>«·„ÊŸ›Ì‰</Button>
            <Button variant="secondary" onClick={() => navigate('/hr/documents')}>«·„” ‰œ« </Button>
            <Button variant="secondary" onClick={() => navigate('/hr/settings')}>«·≈⁄œ«œ« </Button>
          </div>
        </Card>

        <Card title="«· ‘€Ì· «·ÌÊ„Ì" description=" ”ÃÌ· «·Õ÷Ê— Ê«·«‰’—«› Ê„—«Ã⁄… «·≈Ã«“«  Ê«·⁄ıÂœ.">
          <div className="actions compact-actions">
            <Button variant="secondary" onClick={() => navigate('/hr/attendance')}>«·Õ÷Ê— Ê«·«‰’—«›</Button>
            <Button variant="secondary" onClick={() => navigate('/hr/leaves')}>«·≈Ã«“« </Button>
            <Button variant="secondary" onClick={() => navigate('/hr/assets')}>«·⁄ıÂœ</Button>
          </div>
        </Card>

        <Card title="«·„— »«  Ê«·”·›" description=" ÃÂÌ“ ﬂ‘Ê› «·„— »«  Ê„—«Ã⁄… «·”·› Ê«·Œ’Ê„«  Ê„ﬁ —Õ«  «·Õ÷Ê— Ê«·≈Ã«“« .">
          <div className="actions compact-actions">
            <Button variant="secondary" onClick={() => navigate('/hr/payroll')}>«·„— »« </Button>
            <Button variant="secondary" onClick={() => navigate('/hr/loans')}>«·”·› Ê«·Œ’Ê„« </Button>
            <Button variant="secondary" onClick={() => navigate('/hr/reports')}>«· ﬁ«—Ì—</Button>
          </div>
        </Card>

        <Card title="«· ﬁ«—Ì— Ê«·≈⁄œ«œ« " description="„ «»⁄… „·Œ’«  «·„Ê«—œ «·»‘—Ì… Ê÷»ÿ «·√ﬁ”«„ Ê«·„”„Ì«  «·ÊŸÌ›Ì….">
          <div className="actions compact-actions">
            <Button variant="secondary" onClick={() => navigate('/hr/reports')}> ﬁ«—Ì— «·„Ê«—œ «·»‘—Ì…</Button>
            <Button variant="secondary" onClick={() => navigate('/hr/settings')}>«·≈⁄œ«œ« </Button>
            <Button variant="secondary" onClick={() => navigate('/hr/employees/new')}>≈÷«›… „ÊŸ›</Button>
          </div>
        </Card>
      </div>

      <Card>
        <p className="muted" style={{ margin: 0 }}>
           „  ÃÂÌ“ «·„Ê«—œ «·»‘—Ì… ﬂ‰”Œ…  ‘€Ì·Ì… √Ê·Ï° „⁄ ≈„ﬂ«‰Ì… ≈÷«›…  Õ”Ì‰«  ·«Õﬁ… „À· «” Ì—«œ «·Õ÷Ê— „‰ Excel √Ê —’Ìœ «·≈Ã«“« .
        </p>
      </Card>
    </div>
  );
}
