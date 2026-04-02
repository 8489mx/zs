# UAT Playbook

## Core scenarios
1. Login as admin, cashier, and manager-equivalent user.
2. Create cash sale, credit sale, edit sale, cancel sale, and sale return.
3. Create cash purchase, credit purchase, edit purchase, cancel purchase, and purchase return.
4. Record customer payment and supplier payment.
5. Verify customer/supplier ledger after each movement.
6. Review summary, inventory, customer balances, launch readiness, and exports.
7. Verify backup, then restore into a staging copy only.
8. Cleanup expired sessions and reconcile balances.

## Sign-off criteria
- No blocker in Launch Readiness
- No blocked item in UAT Readiness
- No negative stock without business justification
- No customer/supplier ledger mismatch
- Backup verification passes
