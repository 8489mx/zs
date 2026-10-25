# قدرات المساعد الذكي وقنوات المحادثة

[فهرس النظام](SYSTEM_CAPABILITIES.md) · [الخريطة المعمارية](SYSTEM_BLUEPRINT.md) · [قواعد التوثيق](docs/capabilities/README.md)

## النطاق وملكية التوثيق

هذا هو ملف تفاصيل **المساعد الذكي وقنوات المحادثة** المعتمد للتحديثات القادمة. مسارات الملكية: `backend/src/modules/ai-copilot/`

**حالة الدليل:** أُعيد تنظيم الوثائق في 25 أكتوبر 2026؛ لم تُعد اختبارات التشغيل في عملية النقل. نسب الجاهزية والتواريخ داخل السجلات المنقولة ادعاءات تاريخية بنطاقها، وليست اعتماداً جديداً. تحقق من الكود والاختبار والـcommit قبل اعتماد أي حالة.

**مجالات مرتبطة:** [الإعدادات والأنشطة والباقات](SETTINGS_CAPABILITIES.md) · [التقارير والتحليلات](REPORTS_CAPABILITIES.md)

## التحديثات الحالية

عند تعديل قدرة، حدّث وصفها في مكانها أو أضف سجلاً بمعرّف ثابت: السلوك والحدود، مصادر الكود، الاختبارات ونتائجها الفعلية، تاريخ التحقق والـcommit. اربط المجالات المتأثرة دون نسخ تفاصيلها.

## فهرس الأقسام المنقولة

- [14. المساعد التنفيذي ومستودع المعرفة والتحليلات التنبؤية (AI Copilot & Knowledge RAG)](#cap-040)
- [24. بوت واتساب التفاعلي بالذكاء الاصطناعي المجاني (Conversational WhatsApp AI Bot & Google Gemini Flash)](#cap-050)
- [57. بنية محرك الذكاء الاصطناعي الشامل ومتعدد المزودين (Universal AI Engine & Multi-Provider LLM Gateway)](#cap-082)

## السجل المنقول من الفهرس المركزي

الأرقام القديمة محفوظة كمرجع تاريخي وقد تتكرر؛ المعرّفات `cap-*` فريدة وثابتة. التكرار السابق لا يعني وجود ميزتين.

<a id="cap-040"></a>
<!-- migrated:cap-040:start -->
## 14. المساعد التنفيذي ومستودع المعرفة والتحليلات التنبؤية (AI Copilot & Knowledge RAG)
* **حالة الوحدة العامة:** 🟢 مكتمل 100%
* **مسارات الكود:** `backend/src/modules/ai-copilot`, `frontend/src/features/ai-copilot`
* **الوصف:** استقراء وتحليل بيانات المبيعات، اقتراح خطط إعادة الطلب التلقائية للأصناف الأكثر رواجاً، وتوقع فترات الركود والذروة.
* **الجداول في قاعدة البيانات:** `ai_knowledge_sources`, `ai_knowledge_chunks`, `ai_chat_sessions`, `ai_chat_messages`

| الميزة التفصيلية | الحالة | نسبة الإنجاز | ملفات التنفيذ الأساسية | الشرح وملاحظات العمل |
| :--- | :---: | :---: | :--- | :--- |
| **مستودع المعرفة والوثائق الذكي (Chatbase-Style RAG)** | 🟢 | 100% | `ai-knowledge.service.ts`, `ai-embedding.engine.ts`, `2040000000163_ai_knowledge_base_and_chat_sessions.ts` | تمكين المنشأة من رفع لوائح العمل، الكتالوجات، الشروط التعاقدية، وتضمينها دلالياً في `ai_knowledge_chunks` عبر محرك هجين يدمج البحث الدلالي المتجهي (Cosine Similarity) والبحث النصي لتقديم إجابات موثوقة بلا هلوسة. |
| **فهرسة كتالوج الأصناف تلقائياً (Auto-Indexed Product Catalog)** | 🟢 | 100% | `ai-knowledge.service.ts`, `AiBusinessCopilotModal.tsx` | زر بنقرة واحدة لتحويل كافة أصناف المتجر ومواصفاتها وأسعارها وهوامشها إلى كروت دلالية مفهرسة، تتيح للمساعد البحث الدلالي بالأوصاف والاستخدامات والبدائل دون اشتراط مطابقة الاسم الحرفي. |
| **المستشار التنفيذي الذكي والتفكير بره الصندوق (Autonomous Reasoning & ReAct Agent)** | 🟢 | 100% | `ai-agent.service.ts`, `AiBusinessCopilotModal.tsx` | محرك استدلال تنفيذي يمتلك أدوات حية لفحص المخزون، ديون العملاء، رصيد الخزينة، وتحليل البضاعة الراكدة لاقتراح عروض ترويجية مجمعة (Bundles) تسيل رأس المال المجمد وتكشف أسباب تراجع المبيعات. |
| **الذاكرة التراكمية وتعدد الجولات (Multi-turn Sessions & Thought Chains)** | 🟢 | 100% | `ai-agent.service.ts`, `ai_chat_sessions`, `ai_chat_messages` | حفظ تاريخ الجلسات وسياق الحوار مع التحقق التلقائي من وجود الجلسة في `ai_chat_sessions` وإنشائها ديناميكياً لمنع أخطاء المفاتيح الأجنبية، مع كبسولة مرئية لخطوات التفكير وترميز JSONB قياسي. |

---


<!-- migrated:cap-040:end -->

<a id="cap-050"></a>
<!-- migrated:cap-050:start -->
## 24. بوت واتساب التفاعلي بالذكاء الاصطناعي المجاني (Conversational WhatsApp AI Bot & Google Gemini Flash)
* **حالة الوحدة العامة:** 🟢 مكتمل 100%
* **مسارات الكود:** `backend/src/modules/ai-copilot`, `backend/src/modules/settings/services/whatsapp-gateway.service.ts`, `backend/src/modules/settings/controllers/whatsapp-gateway.controller.ts`, `frontend/src/features/settings/components/workspace-sections/SettingsWhatsAppGatewaySection.tsx`, `frontend/src/features/ai-copilot/components/AiBusinessCopilotModal.tsx`
* **المحرك المشغل:** Google Gemini Flash (Gemini 3.8 Flash و 3.7 و 3.6 مع مستكشف النماذج الذكي) مع محرك محلي بديل (Local Smart NLP Fallback).

| الميزة التفصيلية | الحالة | نسبة الإنجاز | ملفات التنفيذ الأساسية | الشرح وملاحظات العمل |
| :--- | :---: | :---: | :--- | :--- |
| **محرك الذكاء الاصطناعي ومستكشف النماذج (Gemini 3.8 Flash & Model Explorer)** | 🟢 | 100% | `ai-copilot.service.ts`, `ai-copilot.controller.ts`, `SettingsWhatsAppGatewaySection.tsx` | ربط موحد فائق السرعة يدعم Gemini 3.8 Flash كخيار افتراضي متقدم، مع قائمة منسدلة ذكية (`CustomSelect`) وكبسولات سريعة، وميزة "استعراض نماذج مفتاحك من جوجل" لجلب كافة الموديلات النشطة لمفتاح المستخدم مباشرة واختيار أي نموذج منها، مع حماية المفتاح من الحذف عند تعديل الموديل فقط. |
| **تغذية مستشار الإدارة والمالية (زاد AI)** | 🟢 | 100% | `AiBusinessCopilotModal.tsx`, `ai-copilot.service.ts` | ترقية "زاد AI" ليعمل بـ Gemini Flash مع إظهار شارة الاتصال في ترويسة النافذة، والرجوع السلس للمحرك التحليلي المحلي في حال عدم وجود إنترنت أو مفتاح. |
| **بوت مبيعات وخدمة عملاء الواتساب الذكي** | 🟢 | 100% | `whatsapp-gateway.service.ts`, `whatsapp-gateway.controller.ts` | استقبال رسائل الزبائن على واتساب عبر نقطة Webhook موحدة، قراءة قائمة منتجات المتجر الحية وأسعارها وتوفر المخزون، وتوليد ردود بيعية وتجارية جذابة باللهجة العربية/المصرية مع روابط الشراء المباشرة. |
| **محاكي محادثة واتساب التفاعلي (Live WhatsApp Simulator)** | 🟢 | 100% | `SettingsWhatsAppGatewaySection.tsx` | شاشة دردشة تفاعلية تحاكي واجهة واتساب الخضراء، تمكن التاجر من تجربة وسؤال البوت كأنه عميل وفحص ردوده المعتمدة على منتجاته وأسعاره الفعلية قبل ربط أي هاتف. |

---


<!-- migrated:cap-050:end -->

<a id="cap-082"></a>
<!-- migrated:cap-082:start -->
## 57. بنية محرك الذكاء الاصطناعي الشامل ومتعدد المزودين (Universal AI Engine & Multi-Provider LLM Gateway)
* **حالة الوحدة:** 🟢 مكتمل 100% ومطابق لدستور النظام البصري (0 Emojis & Clean Enterprise SaaS).
* **مسارات الكود الأساسية:**
  * **الباك إند (Backend):**
    * `backend/src/modules/ai-copilot/ai-copilot.service.ts` (دعم مزودي الذكاء الاصطناعي `gemini` و `openai` و `custom`، وتوجيه الاستفسارات ديناميكياً لكلا المحركين، مع دعم Base URL مخصص لأي خادم متوافق مع OpenAI API مثل DeepSeek و Groq و Ollama).
    * `backend/src/modules/ai-copilot/ai-copilot.controller.ts` (نقاط النهاية لتخزين وفحص اتصال المفاتيح لكافة المزودين ذرياً).
  * **الفرونت إند (Frontend):**
    * `frontend/src/features/settings/components/workspace-sections/SettingsWhatsAppGatewaySection.tsx` (كارت إدارة محرك الذكاء الاصطناعي الشامل مع منتقي المزود، وحقول المفتاح والنموذج والرابط المخصص، واكتشاف نوع المفتاح تلقائياً).
    * `frontend/src/features/ai-copilot/components/AiBusinessCopilotModal.tsx` (تجريد الشارة الترويجية وجعلها عامة ومحايدة لدعم كافة النماذج).
* **الميزات والقدرات المفعلة:**
  1. **التحرر الكامل من انغلاق المزود الواحد (Vendor-Agnostic LLM Architecture):** إزالة أي حصر أو تقييد لنموذج أو شركة واحدة؛ النظام الآن يدعم رسمياً 3 خيارات مرنة:
     - **Google Gemini:** يدعم أحدث نماذج فلاش فائقة السرعة مع استكشاف ديناميكي للنماذج النشطة بالمفتاح تلقائياً.
     - **OpenAI / ChatGPT:** يدعم GPT-4o و GPT-4o-mini ونماذج الاستدلال المتطورة.
     - **مزود مخصص (OpenAI-Compatible Providers):** ربط أي مزود ذكاء اصطناعي خارجي يدعم بروتوكول Chat Completions مثل **DeepSeek** (`deepseek-chat`)، أو **Groq**، أو النماذج المحلية المستضافة عبر **Ollama** أو **vLLM** فقط بتحديد الرابط الأساسي (Base URL) واسم النموذج.
  2. **الاستكشاف الذكي التلقائي لنوع المفتاح (Smart Key Auto-Detection):** عند لصق المستخدم لمفتاح API يبدأ بـ `sk-` يتحول منتقي المزود تلقائياً إلى OpenAI، وعند لصق مفتاح يبدأ بـ `AIza` أو `AQ.` يتحول تلقائياً إلى Google Gemini.
  3. **فحص اتصال موحد واختبار حي (Unified Connection Testing):** نقطة نهاية موحدة `@Post('test-key')` تقوم بإرسال استعلام تحقق خفيف وسريع للمزود المختار وتأكيد نجاح الاتصال وعرض رسالة استجابة فورية للمستخدم مع زمن الاستجابة.
  4. **محرك ثنائي الاستخدام (Dual Consumers Integration):** المحرك يغذي وظيفتين حيويتين داخل المنظومة:
     - **مستشار الإدارة والقرارات (Z-Systems Business Copilot):** إجابة استفسارات المدير وتحليل المبيعات وتوقعات النواقص بهيكل JSON صارم وآمن.
     - **بوت واتساب التفاعلي لخدمة ومبيعات العملاء (Conversational WhatsApp Sales Bot):** الرد الفوري على رسائل واستفسارات الزبائن حول أسعار المنتجات والمقاسات والألوان وتوليد روابط الشراء المباشرة.
  5. **طبقات التراجع الآمن وتصفير البيانات الوهمية (Graceful Multi-Layer Fallback):** في حال عدم إدخال مفتاح مخصص من قبل المستأجر، يبحث النظام عن مفاتيح الخادم البيئية (`OPENAI_API_KEY` ثم `GEMINI_API_KEY`)، وفي حال عدم توفر أي مفتاح أو تعطل الإنترنت الخارجي، يتراجع النظام تلقائياً وبسلاسة إلى محرك التحليل والرد المحلي المدمج (`local_analytics` و `local_smart`) دون توقف المنظومة أو إطلاق أخطاء قاتلة.
  6. **التطهير الشامل للواجهات ومنع الإيموجيز (0 Emojis & UI Constitution):** إزالة عبارة "Gemini 1.5 Flash" و "Google Gemini" الحصرية من كافة الواجهات والبادجات ومحاكي الشات، واستبدالها بتسميات مؤسسية نظيفة (`Universal AI Engine`، `AI Cloud`، `Smart Local`)، مع تطبيق ألوان الهوية المؤسسية (`#170e5e` للأزرار الرئيسية).

---


<!-- migrated:cap-082:end -->
