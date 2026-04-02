# Post-launch checklist

- Verify admin login on the live deployment.
- Verify cashier login on the live deployment.
- Post one sale and print the receipt.
- Post one purchase and verify stock movement.
- Post one stock adjustment.
- Post one stock transfer.
- Export and verify a fresh backup.
- Review logs for runtime errors during the first hour.
- Monitor support/bug intake and capture issues in `BUG_REPORT_TEMPLATE.csv`.
- Run `node scripts/post-launch-verification.js` and archive the generated report.
