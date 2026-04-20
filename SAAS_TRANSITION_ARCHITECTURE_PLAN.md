# SaaS-First Architecture Reset Plan (LOCAL_PILOT / SELF_CONTAINED / CLOUD_SAAS)

> **Status:** Planning only (no implementation changes in runtime behavior).
> **Date:** 2026-04-19

## 1) Executive direction

المبدأ المعماري الحاكم من الآن:

- نفس الـ codebase يخدم 3 أوضاع تشغيل:
  - `LOCAL_PILOT`
  - `SELF_CONTAINED`
  - `CLOUD_SAAS`
- **بدون fork** وبدون ربط business logic ببيئة تشغيل محددة.
- أي اختلاف بين الأوضاع يكون عبر `config/env` + deployment adapters فقط.

---

## 2) Target operating model (single codebase / three modes)

## Mode contract

- `APP_MODE=LOCAL_PILOT`
  - تشغيل محلي عند عميل تجريبي.
  - قد يستخدم Docker Compose محلي.
  - نفس الـ API ونفس schema.

- `APP_MODE=SELF_CONTAINED`
  - نفس التطبيق لكن مضاف له packaging (installer / launcher / scripts).
  - لا يسمح بإضافة logic خاص بالـ installer داخل core business modules.

- `APP_MODE=CLOUD_SAAS`
  - نشر backend/frontend على cloud.
  - database hosted.
  - قابلية multi-tenant بالتدرج.

## Non-negotiables

- ممنوع `if/else` منتشرة في business services حسب mode.
- فروق mode تمر عبر:
  - bootstrap/config
  - infrastructure adapters
  - deployment manifests

---

## 3) Database strategy (future-safe)

## Architecture decision

اعتماد **Data Access Abstraction** واضحة (Repository/Ports + Adapters):

- Domain/Application layer لا يعرف أين قاعدة البيانات.
- Infrastructure layer فقط تتعامل مع PostgreSQL driver/ORM.

## Supported deployment patterns

- **Local DB**
  - مناسب `LOCAL_PILOT` أو `SELF_CONTAINED`.
  - قد يكون Postgres container أو managed local service.

- **Hosted DB**
  - مناسب `CLOUD_SAAS`.
  - نفس schema/migrations/queries.

## Guardrails required now

- منع أي افتراض بأن DB على `localhost` داخل الكود.
- كل endpoints/clients تعتمد `DATABASE_URL` أو config typed موحّد.
- migrations موحدة لكل modes.
- SSL/TLS policies configurable حسب environment بدون تغيير كود domain.

---

## 4) Backend architecture

## Deployment-agnostic backend

- نفس backend binary/container يعمل في:
  - local pilot
  - cloud service
- business logic تبقى ثابتة.

## Layering policy

- `modules/*` = domain/application rules فقط.
- `config/*` = mode/environment mapping.
- `database/*`, `integrations/*` = adapters قابلة للاستبدال.

## Immediate checks

- audit لأي dependency داخل services على filesystem/desktop process/installer scripts.
- نقل أي منطق مرتبط بالتشغيل المحلي إلى infra layer أو ops scripts.

---

## 5) Frontend policy (web-first)

- React app تبقى Web-first (SPA/SSR حسب الاختيار المستقبلي).
- ممنوع coupling مباشر مع Electron APIs داخل core UI/business flows.
- إن احتجنا desktop shell لاحقًا يكون عبر adapter boundary (bridge) اختياري.
- Build artifacts يجب أن تبقى قابلة للنشر على domain عادي في `CLOUD_SAAS`.

---

## 6) Packaging/installer role

الـ installer/launcher هي **Delivery Layer فقط**:

- مسؤولة عن:
  - install/start/stop/update UX
  - service registration
  - OS integration
- غير مسموح لها بتغيير:
  - API contracts
  - database schema contracts
  - business rules

Rule: أي behavior مختلف وظيفيًا بين installer وcloud = smell يجب إزالته.

---

## 7) Auth + multi-tenancy readiness (start now)

## Now (without full tenant rollout)

- تعريف boundary واضح للهوية:
  - user identity
  - organization/account identity (حتى لو single tenant فعليًا الآن)
- تجهيز claims model قابل لإضافة `tenant_id` لاحقًا.
- منع hard-coded assumptions مثل “عميل واحد عالمي”.

## Next phases

- Phase M1: tenant-aware data model fields في الجداول الأساسية (nullable/backward compatible where possible).
- Phase M2: tenant scoping في repositories/services.
- Phase M3: tenant-aware authz, billing, provisioning.

---

## 8) Developer workflow constraints (must preserve)

للحفاظ على workflow الحالي (zip frontend/backend ثم التعديل عبر LLMs):

- إبقاء بنية repo بسيطة وواضحة.
- تجنب monorepo tooling معقد أو generators إلزامية.
- توثيق entry points واضحة:
  - backend run/test
  - frontend run/build
  - mode env examples
- أي automation جديدة تكون optional ولا تكسر التشغيل اليدوي.

---

## 9) What to continue vs stop/adjust from current track

## Continue

- توحيد env contract عبر `APP_MODE`.
- hardening للـ config validation و DB TLS.
- وجود compose profiles متعددة (pilot/self-contained/cloud-like) طالما بنفس API.
- اختبارات critical behavior التي لا تعتمد على بيئة بعينها.

## Stop or adjust immediately

- إيقاف توسيع docs/scripts التي تفترض أن offline/local هو الشكل النهائي.
- إيقاف إدخال أي business behavior يختلف حسب installer/offline.
- تقليل الانتشار الكبير لملفات runbooks المتفرعة؛ استبدالها بـ canonical plan واحد + appendices.
- منع أي قرار معماري يغلق خيار hosted DB أو multi-tenant.

---

## 10) Migration roadmap (current state → SaaS)

- **R0 (Now / 1-2 sprints):**
  - تثبيت mode contract النهائي (`LOCAL_PILOT`, `SELF_CONTAINED`, `CLOUD_SAAS`).
  - فصل boundaries (domain vs infra vs packaging).
  - تقليص التعقيد التشغيلي في الوثائق.

- **R1 (Short term / 2-4 sprints):**
  - توحيد data access ports.
  - اختبار parity بين local DB وhosted DB.
  - readiness checks لتشغيل backend كخدمة cloud بدون تغييرات منطق.

- **R2 (Mid term):**
  - auth model جاهز للتوسعة tenant-wise.
  - observability/security baseline مخصص SaaS.
  - deployment templates cloud رسمية.

- **R3 (Go-to-SaaS):**
  - multi-tenant rollout تدريجي.
  - commercial SaaS ops (tenant provisioning, isolation controls, SLOs, DR).

---

## 11) Simplified architecture diagram (text)

```text
                   +-----------------------------+
                   |      Frontend (React)       |
                   |   Web-first, deploy-anywhere|
                   +--------------+--------------+
                                  |
                                  v
                   +-----------------------------+
                   |       Backend API Core      |
                   |  Domain/Business Logic Only |
                   +------+----------------------+ 
                          | Ports (interfaces)
          +---------------+-------------------+
          |                                   |
          v                                   v
+-----------------------+         +---------------------------+
| Data Adapter (Local)  |         | Data Adapter (Hosted DB)  |
| Postgres local/pilot  |         | Postgres managed/cloud    |
+-----------------------+         +---------------------------+

Modes via config/env only:
- LOCAL_PILOT
- SELF_CONTAINED (adds packaging layer only)
- CLOUD_SAAS

Packaging layer (installer/launcher/scripts) sits outside core API/domain.
```

---

## 12) Executive summary

- **هل المسار الحالي آمن نحو SaaS؟**
  - آمن جزئيًا: فيه خطوات مفيدة (env contract, TLS hardening, critical tests) لكنه يميل أكثر من اللازم نحو offline-operationalization.

- **ما التعديلات الحرجة المطلوبة الآن؟**
  1. اعتماد mode model ثلاثي رسمي (`LOCAL_PILOT` / `SELF_CONTAINED` / `CLOUD_SAAS`) بدل framing offline/online فقط.
  2. فرض فصل صارم: business logic مستقل تمامًا عن installer/local runtime.
  3. تثبيت data abstraction تمنع أي lock-in على local DB.
  4. جعل frontend web-first بلا desktop coupling.
  5. بدء tenant-readiness تصميميًا من الآن حتى بدون تفعيل كامل.

- **النتيجة المتوقعة:**
  - نستفيد من إنجازات الـ Pilot الحالية، لكن بدون تضحية بمسار التحول إلى SaaS العالمي.
