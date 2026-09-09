import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/shared/components/page-header";

interface DisplayCard {
  key: string;
  title: string;
  description: string;
  badge: string;
  path: string;
  windowName: string;
  iconPath: string;
  color: string;
}

export function DisplaysPortalPage() {
  const navigate = useNavigate();

  // Order in RTL:
  // 1. Right: شاشة العروض والأسعار
  // 2. Center: شاشة العميل
  // 3. Far Left: شاشة المطبخ (KDS)
  const cards: DisplayCard[] = [
    {
      key: "signage",
      title: "شاشة العروض والأسعار",
      description: "عرض ترويجي حي على شاشات صالة العرض والمعرض، يعرض المنتجات والتخفيضات الكبرى دورياً مع رمز QR للطلب.",
      badge: "صالة العرض والمبيعات",
      path: "/signage",
      windowName: "DigitalSignageWindow",
      iconPath: "M2 3h20v14H2V3zm6 18h8m-4-4v4",
      color: "#170e5e",
    },
    {
      key: "customer-display",
      title: "شاشة العميل",
      description: "شاشة تفاعلية مواجهة للعميل عند نقطة البيع (POS)، تعرض الأصناف أثناء المسح والأسعار والإجمالي ورمز الدفع الإلكتروني.",
      badge: "نقطة البيع والكاشير",
      path: "/pos/customer-display",
      windowName: "CustomerDisplayWindow",
      iconPath: "M20 7H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2zM12 17v4M8 21h8",
      color: "#0d7a5f",
    },
    {
      key: "kds",
      title: "شاشة المطبخ (KDS)",
      description: "شاشة مخصصة لطاقم المطبخ ومحطات التحضير، تستقبل طلبات الكاشير والصالة والتوصيل لحظياً مع تنبيهات صوتية وتنظيم الطلبات.",
      badge: "محطة التحضير والطلبات",
      path: "/kds",
      windowName: "KitchenDisplayWindow",
      iconPath: "M18 2v8a3 3 0 0 1-3 3h-1v9h-2v-9H7a3 3 0 0 1-3-3V2h2v6a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V2h2z",
      color: "#c2410c",
    },
  ];

  const handleOpenNewWindow = (path: string, windowName: string) => {
    window.open(path, windowName, "menubar=no,toolbar=no,location=no,status=no,resizable=yes");
  };

  return (
    <div className="page-stack page-shell displays-portal-page" dir="rtl">
      <main
        className="document-prototype-column"
        style={{
          paddingBottom: "80px",
          maxWidth: "1280px",
          margin: "0 auto",
          width: "100%",
        }}
      >
        <PageHeader
          title="شاشات العرض والتفاعل"
          description="مركز تشغيل شاشات العرض المباشرة التفاعلية لنقاط البيع وصالة العرض ومحطات التحضير"
          badge={<span className="nav-pill">3 شاشات متصلة</span>}
        />

        {/* Cards Grid Centered */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "24px",
            marginTop: "24px",
            justifyContent: "center",
          }}
        >
          {cards.map((card) => (
            <div
              key={card.key}
              style={{
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: "16px",
                padding: "28px 24px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                gap: "20px",
                boxShadow: "0 2px 8px rgba(15, 23, 42, 0.04)",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = "0 10px 28px rgba(15, 23, 42, 0.09)";
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.borderColor = card.color;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = "0 2px 8px rgba(15, 23, 42, 0.04)";
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.borderColor = "#e2e8f0";
              }}
            >
              {/* Top Meta: Icon + Badge */}
              <div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: "18px",
                  }}
                >
                  <div
                    style={{
                      width: "56px",
                      height: "56px",
                      borderRadius: "14px",
                      background: `${card.color}14`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <svg
                      width="28"
                      height="28"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke={card.color}
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d={card.iconPath} />
                    </svg>
                  </div>

                  <span
                    style={{
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      backgroundColor: `${card.color}10`,
                      color: card.color,
                      border: `1px solid ${card.color}30`,
                      padding: "4px 10px",
                      borderRadius: "20px",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "5px",
                    }}
                  >
                    <span
                      style={{
                        width: "6px",
                        height: "6px",
                        borderRadius: "50%",
                        backgroundColor: card.color,
                        display: "inline-block",
                      }}
                    />
                    <span>{card.badge}</span>
                  </span>
                </div>

                {/* Title */}
                <h3
                  style={{
                    margin: "0 0 10px",
                    fontSize: "var(--font-section-title, 1.05rem)",
                    fontWeight: 800,
                    color: "#0f172a",
                    letterSpacing: "-0.2px",
                  }}
                >
                  {card.title}
                </h3>

                {/* Description */}
                <p
                  style={{
                    margin: 0,
                    fontSize: "var(--font-subtitle, 0.8125rem)",
                    color: "#64748b",
                    lineHeight: 1.65,
                  }}
                >
                  {card.description}
                </p>
              </div>

              {/* Action Buttons */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                  paddingTop: "14px",
                  borderTop: "1px solid #f1f5f9",
                }}
              >
                {/* Primary Button: Open Fullscreen / In-app */}
                <button
                  type="button"
                  onClick={() => navigate(card.path)}
                  style={{
                    width: "100%",
                    background: card.color,
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "10px",
                    padding: "11px 16px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    fontWeight: 700,
                    fontSize: "0.8125rem",
                    boxShadow: "0 2px 6px rgba(0, 0, 0, 0.08)",
                    transition: "all 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.filter = "brightness(1.1)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.filter = "none";
                  }}
                >
                  <span>تشغيل الشاشة (ملء الشاشة)</span>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M19 12H5M5 12l7-7M5 12l7 7" />
                  </svg>
                </button>

                {/* Secondary Button: Open in separate window (Dual monitor / HDMI) */}
                <button
                  type="button"
                  onClick={() => handleOpenNewWindow(card.path, card.windowName)}
                  style={{
                    width: "100%",
                    background: "#ffffff",
                    border: "1px solid #cbd5e1",
                    color: "#334155",
                    borderRadius: "10px",
                    padding: "9px 14px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    fontWeight: 600,
                    fontSize: "0.78rem",
                    transition: "all 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#f8fafc";
                    e.currentTarget.style.borderColor = "#94a3b8";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "#ffffff";
                    e.currentTarget.style.borderColor = "#cbd5e1";
                  }}
                  title="فتح الشاشة في نافذة منفصلة لعرضها على شاشة ثانية HDMI"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                  <span>فتح في نافذة مستقلة (شاشة ثانية)</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
