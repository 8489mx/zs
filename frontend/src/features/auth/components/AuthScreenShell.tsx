import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

interface AuthScreenShellProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  /** يظهر أسفل البطاقة، عادةً رابط العودة لتسجيل الدخول. */
  footer?: ReactNode;
}

/**
 * نفس هيكل شاشة الدخول وأنماطها (`.login-*` في `styles/partials/layout.css`) لكل شاشات
 * الحساب العامة، حتى لا تبدو صفحة استعادة كلمة المرور وكأنها من نظام آخر.
 */
export function AuthScreenShell({ title, subtitle, children, footer }: AuthScreenShellProps) {
  return (
    <div className="login-screen-split" dir="rtl">
      <div className="login-pattern-overlay"></div>

      <div className="login-split-container">
        <div className="login-branding-side">
          <div className="login-brand-logo-wrap">
            <img src="./brand/z-erp-approved-icon.png" alt="Z Systems" className="login-brand-logo-img" />
            <span className="login-brand-name">Z Systems <span className="text-pro">Pro</span></span>
          </div>

          <h1 className="login-brand-title">
            <span className="title-part1">استعادة الوصول إلى حسابك في</span>
            <span className="title-part2">Z ERP</span>
          </h1>

          <p className="login-brand-subtitle">
            رابط الاستعادة يصل على البريد الإلكتروني المسجَّل لمالك المنشأة، ويعمل مرة واحدة فقط خلال مدة قصيرة.
          </p>

          <div className="login-brand-footer">
            <span className="line"></span>
            نظام مالي وإداري معتمد وسحابي بالكامل
            <span className="line"></span>
          </div>
        </div>

        <div className="login-form-side">
          <div className="login-card-pro">
            <div className="login-card-header">
              <h2>{title}</h2>
              <p>{subtitle}</p>
            </div>

            {children}

            <div className="auth-screen-footer">
              {footer ?? <Link to="/login" className="forgot-password-link">العودة إلى تسجيل الدخول</Link>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
