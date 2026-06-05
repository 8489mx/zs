# Karim Coaching OS — Nutrition Builder Master Decisions

## Status
Approved before reviewing/importing any nutrition spreadsheets.

## Core reset decision
- Keep Karim Coaching OS and the useful application pages.
- All current database data is experimental and may be fully deleted.
- Perform a full database reset after the new clean Prisma schema is ready.
- Completely remove every legacy nutrition builder path, including fallback generators and multiple builder versions.
- Build exactly one authoritative deterministic Nutrition Builder with one generation entry point.
- Do not save or send a generated plan unless it passes the complete Quality Gate.

## Spreadsheet review rule
Every existing sheet, column, and row may be kept, modified, merged, replaced, or deleted. No legacy schema is protected if it harms plan quality.

## Main nutrition data structure
Use one master food library, not separate duplicated food libraries per country.

Expected logical datasets:
1. Food Library
2. Food Cuisine Profiles
3. Food Market Profiles
4. Meal Templates
5. Template Items
6. Swap Groups / swap rules
7. Nutrition Safety Rules

## Structured fields vs tags
Core decisions must be stored as structured fields, not free-form tags:
- foodRole
- mealRole
- mealSuitability
- nutritionBasis: raw | cooked | drained | ready_to_eat
- planUseTier
- autoPlanPriority
- swapUseTier
- budgetFit
- availabilityLevel
- cuisine / region relationships
- minServingG / maxServingG / servingStepG
- allergenTags
- medicalCautionTags

Tags are only for secondary flexible characteristics from an approved closed list, such as:
- easy_prep
- office_friendly
- family_friendly
- freezer_friendly
- quick_meal
- high_protein

## Client location and cuisine logic
The client intake contains three distinct values:
- nationality
- residenceCountry
- preferredCuisine

Decision priority:
1. preferredCuisine determines the style of food the client wants.
2. residenceCountry determines actual availability and budget position.
3. nationality is only a fallback if the client did not select a preferred cuisine.

Example:
- nationality: Egyptian
- residenceCountry: Saudi Arabia
- preferredCuisine: Egyptian

Result: generate Egyptian-style meals using ingredients available and reasonably priced in Saudi Arabia.

## Natural food priority
The base plan must prioritize familiar, normal, commonly available foods appropriate to the meal and market.
Examples:
- breakfast: eggs, cheese, yogurt, beans, bread
- lunch/dinner: chicken, lean meat, common fish, rice, potatoes, pasta, vegetables
- snacks: fruit, yogurt, milk, nuts in controlled portions

Rare, premium, unusual, or not-daily foods should normally appear as alternatives, premium swaps, or coach-only options rather than default plan items.

## Meal generation rules
- Generate plans from complete logical Meal Templates, not random independent foods selected only to hit macros.
- Every template item must have a clear mealRole such as main_protein, main_carb, side_vegetable, main_fat, breakfast_anchor, snack_anchor, or dairy_anchor.
- Respect meal suitability, cuisine, residence market, budget, allergies, health cautions, preferences, and meal count.
- Enforce natural serving limits and meal-level limits.
- Prevent unreasonable combinations, excessive ingredient counts, duplicate primary carbs, and repetitive weekly plans.
- Store and display the selection reason for each generated item during coach review and testing.
- If the engine cannot produce a valid natural plan, stop and explain why. Never use a fallback that outputs a weak plan.

## Nutrition target engine
- Replace the legacy simple macro engine.
- Use onboarding data such as age, sex, weight, height, waist, daily activity, work nature, training frequency/duration, sleep, health flags, and injuries.
- Output starting calories/macros, reasoning, confidence, and adjustment guidance.
- Treat targets as a reviewed starting point, not unquestionable truth.

## Swap Engine
Dashboard and client portal must use the same authoritative Swap Engine.

Support two swap types:
1. Swap one item inside a meal.
2. Swap the entire meal with an approved alternative template.

Swap requirements:
- Same mealRole and appropriate meal type.
- Suitable for the client's cuisine, residence market, budget, allergies, and health rules.
- Quantity is recalculated automatically; grams are never matched blindly.
- Similarity considers calories, protein, carbs, fats, and food role—not calories alone.
- Coach can see all valid options, including premium and coach-review options.
- Client only sees approved safe options and cannot freely edit quantities.
- Prepare approved alternatives when the plan is approved so portal results stay fast and stable.
- Keep the original approved plan, current client choice, and complete swap history separately.
- Use repeated client swap choices as preference signals for future plans without allowing preferences to break plan quality.

## Plan snapshot and versioning
After sending, a plan must remain a fixed snapshot even if the food library or builder changes later.
Store:
- food values at approval time
- quantities and units
- approved alternatives
- builder version
- library version

## Quality Gate before sending
A plan cannot be sent unless all checks pass:
- Calories and macros are within approved tolerances.
- Every meal is logical and appropriate.
- All quantities are natural.
- Every food matches its meal and role.
- Alternatives are valid, safe, and approved.
- No allergy or medical conflict exists.
- Weekly variety is acceptable.
- Raw/cooked/drained/ready-to-eat basis is clear.

## Database and implementation cleanup
- Remove all legacy nutrition generator services, actions, routes, fallback paths, and unused imports.
- Remove direct/raw SQL table creation scripts for nutrition; all tables must be represented in Prisma schema and migrations.
- Rewrite the seed so it creates only the admin and required approved reference data; no old experimental clients or builder data.
- Create a clean initial migration after the final schema is approved.
- Work directly on the main branch; do not create new branches.
