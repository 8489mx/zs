import { useNavigate } from "react-router-dom";
import { useSettingsQuery } from "@/shared/hooks/use-catalog-queries";

interface DisplayCard {
  key: string;
  title: string;
  description: string;
  path: string;
  iconPath: string;
  color: string;
  available: boolean;
}

export function DisplaysPortalPage() {
  const navigate = useNavigate();
  const settingsQuery = useSettingsQuery();
  const settings = settingsQuery.data;

  const cards: DisplayCard[] = [
    {
      key: "kds",
      title: "شاشة المطبخ",
      description: "عرض الطلبات الواردة لفريق المطبخ بشكل فوري ومنظم مع تتبع حالة كل طلب",
      path: "/kds",
      iconPath: "M18 2v8a3 3 0 0 1-3 3h-1v9h-2v-9H7a3 3 0 0 1-3-3V2h2v6a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V2h2z",
      color: "#e05a1c",
      available: settings?.restaurantModuleEnabled === true,
    },
    {
      key: "signage",
      title: "شاشة العروض والأسعار",
      description: "عرض الأسعار والعروض الترويجية على شاشات المعرض لجذب العملاء وتحفيز المبيعات",
      path: "/signage",
      iconPath: "M2 3h20v14H2V3zm6 18h8m-4-4v4",
      color: "#170e5e",
      available: true,
    },
    {
      key: "customer-display",
      title: "شاشة العميل",
      description: "شاشة مواجهة العميل أثناء عملية البيع تعرض الأصناف والمبالغ بشكل مباشر",
      path: "/pos/customer-display",
      iconPath: "M20 7H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2zM12 17v4M8 21h8",
      color: "#0d7a5f",
      available: true,
    },
  ];

  const availableCards = cards.filter((c) => c.available);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f8fafc",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 24px",
        direction: "rtl",
        boxSizing: "border-box",
        width: "100%",
      }}
    >
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 40, width: "100%", maxWidth: 960, margin: "0 auto 40px" }}>
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 16,
            background: "#170e5e",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 16px",
          }}
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="3" width="20" height="14" rx="2" />
            <path d="M8 21h8M12 17v4" />
          </svg>
        </div>
        <h1
          style={{
            fontSize: "1.15rem",
            fontWeight: 800,
            color: "#0f172a",
            margin: "0 0 8px",
          }}
        >
          شاشات العرض
        </h1>
        <p style={{ fontSize: "0.8125rem", color: "#64748b", margin: 0 }}>
          اختر الشاشة التي تريد تشغيلها
        </p>
      </div>

      {/* Cards Container */}
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          flexWrap: "wrap",
          justifyContent: "center",
          alignItems: "stretch",
          gap: 24,
          width: "100%",
          maxWidth: 1040,
          margin: "0 auto",
          boxSizing: "border-box",
        }}
      >
        {availableCards.map((card) => (
          <div
            key={card.key}
            role="button"
            tabIndex={0}
            onClick={() => navigate(card.path)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                navigate(card.path);
              }
            }}
            style={{
              flex: "0 1 300px",
              width: 300,
              maxWidth: "100%",
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: 16,
              padding: "36px 28px",
              cursor: "pointer",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 16,
              whiteSpace: "normal",
              transition: "box-shadow 0.15s, transform 0.15s, border-color 0.15s",
              boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
              boxSizing: "border-box",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow =
                "0 8px 24px rgba(0,0,0,0.12)";
              e.currentTarget.style.transform =
                "translateY(-2px)";
              e.currentTarget.style.borderColor =
                card.color;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow =
                "0 1px 4px rgba(0,0,0,0.06)";
              e.currentTarget.style.transform =
                "translateY(0)";
              e.currentTarget.style.borderColor =
                "#e2e8f0";
            }}
          >
            {/* Icon */}
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: 18,
                background: `${card.color}14`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <svg
                width="36"
                height="36"
                viewBox="0 0 24 24"
                fill="none"
                stroke={card.color}
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d={card.iconPath} />
              </svg>
            </div>

            {/* Title & Description */}
            <div style={{ width: "100%", textAlign: "center" }}>
              <div
                style={{
                  fontSize: "0.98rem",
                  fontWeight: 700,
                  color: "#1e293b",
                  marginBottom: 8,
                }}
              >
                {card.title}
              </div>
              <div
                style={{
                  fontSize: "0.8125rem",
                  color: "#64748b",
                  lineHeight: 1.6,
                  whiteSpace: "normal",
                  wordBreak: "break-word",
                }}
              >
                {card.description}
              </div>
            </div>

            {/* Arrow */}
            <div
              style={{
                marginTop: 8,
                display: "flex",
                alignItems: "center",
                gap: 6,
                color: card.color,
                fontSize: "0.8125rem",
                fontWeight: 600,
              }}
            >
              <span>فتح الشاشة</span>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M19 12H5M5 12l7-7M5 12l7 7" />
              </svg>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
