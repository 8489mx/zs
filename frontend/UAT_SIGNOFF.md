# Frontend UAT sign-off

Run these checks before customer handoff:

1. Login page loads and submits correctly.
2. Main dashboard renders without console errors.
3. Sales, purchases, inventory, returns, and reports pages open normally.
4. Permission-protected routes reject unauthorized access.
5. Empty states, loading states, and toast/error states are readable.
6. `npm run qa:uat` passes.
7. `npm run build` passes.

Do not sign off the frontend for customer delivery until all seven items are green.
