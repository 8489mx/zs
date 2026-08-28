# Project Rules & Guidelines for Z-Systems (d:\zn)

## 1. Strict Build & Push Rule
- **NEVER** run `npm run build` or any production bundle build command automatically unless the user explicitly commands it (e.g. "رن بيلد", "اعمل بيلد وبوش", "build").
- **NEVER** run `git push` automatically unless the user explicitly requests it (e.g. "اعمل بوش", "بوش للـ main", "push").

## 2. Arabic & RTL UI
- RTL layout by default for Arabic UI elements (`dir="rtl"`).
- Chat responses wrapped in `<div dir="rtl">...</div>`.

## 3. Consultation Mode
- If user prompt contains `?` or `؟`, act purely as advisor without running modifying code or execution commands until instructed with "نفذ".
