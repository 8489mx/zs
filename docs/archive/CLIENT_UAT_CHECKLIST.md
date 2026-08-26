# Client UAT Checklist

Run these checks with a real user before accepting payment for a live pilot.

## Must verify
- Login works with the intended user role
- Core navigation works without dead ends
- Sale creation finishes and prints/reviews correctly
- Purchase creation updates downstream screens correctly
- Returns do not confuse the operator
- Inventory adjustments show clear success/error feedback
- Treasury/account balance screens load without broken states
- Empty states, loading states, and validation states are understandable

## Release note
If any critical path requires explanation from the developer during UAT, the UX still needs polish.
