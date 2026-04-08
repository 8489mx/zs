# Phase 16 - Release Gate Reliability

## الهدف
تصحيح أدوات الـ release audit حتى تعكس هيكلة المشروع الحالية فعليًا، بدل الاعتماد على مسارات قديمة تكسر الفحص بدون سبب حقيقي.

## ما تم
- إصلاح `scripts/release-audit.mjs`
- إصلاح `scripts/release-candidate-check.mjs`
- جعل فحوصات الـ release تعتمد على ملفات frontend الحالية الفعلية

## شغّل قبل التسليم
1. `npm run qa:guards`
2. `npm run qa:critical`
3. `npm run qa:rc`
4. `npm run qa:release`
