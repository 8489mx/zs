# Z-Systems Construction & Contracting Module: Deep Architectural & Operational Audit Pack

> **Purpose:** Comprehensive, token-optimized domain blueprint for AI Architects (Claude / GPT-4 / Domain Experts) to conduct a rigorous operational gap analysis, identify missing construction workflows, enforce FIDIC/PMI compliance, and eliminate financial leakages.

---

## 1. System Persona & Mission Brief

You are a **Principal Construction ERP Architect, Chartered Quantity Surveyor (MRICS), and Senior FIDIC Contracts Consultant**.
Your mission is to rigorously review the following end-to-end contracting workflow implemented in the **Z-Systems ERP** platform.

Your analysis must focus on:
1. **Contractual & Financial Risks:** Where can money leak between the client, the main contractor, and subcontractors?
2. **Missing Operational Steps:** What standard construction engineering procedures are missing between our steps?
3. **Single-Trade Subcontractor Traps:** Edge cases when dealing with single-trade contractors (e.g., electrical rough-in vs. finishing, plumbing pressure testing, MEP vs. civil).
4. **FIDIC / PMI-CP Invariants:** Compliance with red/yellow book practices (Interim Payment Certificates, Variation Orders, Taking-Over, Defects Liability).

---

## 2. Core Database Schema & Entities

The contracting module operates on PostgreSQL via the following core normalized tables:

1. `contracting_projects`:
   - `id`, `code` (`PRJ-YYMMDD-XXXX`), `name`, `client_name`, `contract_value`, `status` (`tender`, `under_review`, `awarded`, `in_progress`, `on_hold`, `completed`, `cancelled`, `lost`), `project_scope` (`full_turnkey`, `concrete_structure`, `full_finishing`, `full_mep`, `electrical_only`, `plumbing_only`, `hvac_only`, `architectural_finishes`, `custom_modular`), `retention_percentage` (default 5-10%), `advance_payment_percentage` (default 10-20%), `delay_penalty_daily_rate`, `start_date`, `end_date`.
2. `contracting_boq_items`:
   - Hierarchical Schedule of Values (SOV / BOQ). Parent-child WBS tree (`parent_id`, `item_code`, `description`, `unit`, `quantity`, `unit_rate`, `total_price`, `cost_estimate`, `profit_margin_pct`, `executed_qty`, `billed_qty`).
3. `contracting_subcontractors`:
   - Dedicated subcontractor directory (strictly isolated from material suppliers).
   - `id`, `code` (`SUB-YYMMDD-XXXX`), `name`, `trade_specialty` (`civil_concrete`, `masonry_plaster`, `electrical_light_current`, `plumbing_drainage`, `hvac`, `firefighting`, `finishes_painting`, `flooring_ceramic`, `facades_cladding`, `waterproofing`, `elevators`), `tax_number`, `commercial_register`, `bank_name`, `iban`, `status` (`active`, `suspended`, `blacklisted`).
4. `contracting_subcontracts`:
   - Subcontract agreement linking subcontractor to specific BOQ items or lump-sum packages.
   - `contract_sum`, `advance_pct`, `advance_recovery_pct`, `retention_pct`, `penalty_per_day`, `start_date`, `completion_date`.
5. `contracting_subcontractor_payments`:
   - Subcontractor disbursements ledger (`SPAY-YYMMDD-XXXX`).
   - `subcontractor_id`, `subcontract_id`, `project_id`, `payment_method` (`cash`, `bank_transfer`, `cheque`), `reference_number`, `amount_paid`, `treasury_id`, `due_date`, `status` (`cleared`, `pending`, `cancelled`).
6. `contracting_daily_logs`:
   - Site daily reports (`DLOG-YYMMDD-XXXX`).
   - `project_id`, `log_date`, `weather_conditions`, `temperature`, `work_performed_summary`, `delays_encountered`, `safety_incidents`.
7. `contracting_site_manpower` & `contracting_site_equipment`:
   - Headcounts per trade (e.g. 4 electricians, 2 helpers, 6 steel fixers), working hours, idle hours, breakdown hours.
8. `contracting_wirs` (Work Inspection Requests):
   - Site inspection requests submitted to consultant (`WIR-YYMMDD-XXXX`).
   - `boq_item_id`, `location_zone`, `inspection_date`, `consultant_status` (`approved`, `approved_with_notes`, `revise_and_resubmit`, `rejected`).
9. `contracting_backcharges`:
   - Charges deducted from subcontractors for damaged work, site cleanup, or materials supplied on their behalf (`BCHG-YYMMDD-XXXX`).
10. `contracting_price_escalations`:
    - Price adjustment formula for market fluctuations (e.g., steel, rebar, cement price index changes).
11. `contracting_handovers`:
    - Snag lists / punch lists and handover certificates (`TOC` - Taking-Over Certificate, `FAC` - Final Acceptance Certificate).

---

## 3. End-to-End Operational Lifecycle (12 Sequential Steps)

Here is the exact step-by-step lifecycle from tender to final warranty release:

### Step 1: Tender Estimation & BOQ Breakdown
- **Current Flow:** User imports or builds a hierarchical BOQ (Schedule of Values). Enters estimated material, labor, equipment, and subcontractor costs. Calculates markup/margin % to determine tender selling prices.
- **Inputs:** Client BOQ specs, quantities, units.
- **Outputs:** Tender submission document, Cost Baseline.
- **Audit Probes for Claude:**
  - What happens if the client BOQ has ambiguous items or provisional sums (Daywork / Provisional Quantities)?
  - How should Unbalanced Bidding (Front-Loading rates to maximize early cashflow) be analyzed or guarded?

### Step 2: Project Award & Contract Baseline Freezing
- **Current Flow:** Tender is awarded (`status = 'awarded'`). System locks the agreed BOQ as the `Contract Baseline`. Generates project record, code (`PRJ-YYMMDD-XXXX`), and stores contract sum, advance payment %, retention %, and completion milestones.
- **Inputs:** Award letter / Letter of Intent (LOI), signed contract.
- **Outputs:** Active Project, Frozen Baseline BOQ, Milestones.
- **Audit Probes for Claude:**
  - What is missing between LOI and Contract Signing (e.g., Advance Payment Bank Guarantee APG, Performance Bond submission)?
  - How to handle conditions precedent before Site Possession Date?

### Step 3: Trade Packaging & Scope Segregation
- **Current Flow:** Project scope selector allows 8 presets: Full Turnkey, Concrete Structure, Full Finishing, Full MEP, Electrical Only, Plumbing Only, HVAC Only, Architectural Finishes, or Custom 16-Trade Modular matrix. System tags which BOQ items belong to which trade.
- **Inputs:** Scope template selection or automated sync from BOQ items.
- **Outputs:** WBS packages segregated by engineering trade.
- **Audit Probes for Claude:**
  - If a subcontractor takes ONLY Electrical (e.g., first fix / conduit embedding in slabs), what interface risks exist between them and the Concrete Subcontractor?
  - Who owns the risk of slab sleeve blockages or missed conduits before concrete pouring?

### Step 4: Subcontractor Qualification, Bidding & Contract Award
- **Current Flow:** Dedicated directory of subcontractors (`contracting_subcontractors`). Main contractor issues Subcontract Agreement (`contracting_subcontracts`) linked to specific BOQ items. Sets contract sum, advance payment % (e.g., 10%), retention hold % (e.g., 5%), and delay penalties.
- **Inputs:** Subcontractor selection, trade specialty, negotiated unit rates or lump sum.
- **Outputs:** Signed Subcontract Agreement, Subcontractor Ledger initialized.
- **Audit Probes for Claude:**
  - What clauses/controls are mandatory for "Supply & Apply" (مواد ومصنعية) vs. "Labor Only" (مصنعية فقط)?
  - In Labor-Only contracts, how does the system prevent the subcontractor from over-consuming or wasting client-supplied raw materials (Reconciliation & Wastage Allowance)?

### Step 5: Engineering Submittals & Shop Drawings Approval
- **Current Flow:** System tracks technical submittals (`contracting_submittals`) for Materials and Shop Drawings with approval statuses: Approved, Approved with Notes, Resubmit, Rejected.
- **Inputs:** Manufacturer technical datasheets, CAD/BIM shop drawings, sample boards.
- **Outputs:** Consultant Approval stamp, permission to procure/execute.
- **Audit Probes for Claude:**
  - What happens if execution starts before shop drawing approval? Should the system block WIR or IPC generation if submittals are not in "Approved" status?

### Step 6: Multi-Trade Master Scheduling & CPM Logic
- **Current Flow:** Automated CPM schedule generator (`ScheduleGeneratorModal.tsx`). Generates floor-by-floor, phase-by-phase task sequences. For electrical-only contractors: starts at Foundation Earthing Grid -> Slab PVC Conduits before casting -> Wall Chasing & Back Boxes -> Low-current conduits -> Wire Pulling -> DB Dressing -> Device Fixing & Lighting -> Megger & Insulation Testing -> Commissioning.
- **Inputs:** Number of floors, project start date, trade scopes.
- **Outputs:** Gantt schedule, task dependencies, critical path, planned progress curve (S-Curve).
- **Audit Probes for Claude:**
  - What standard leads/lags are required between concrete curing (e.g., 28-day de-shuttering) and subsequent MEP/finishing activities?
  - How should subcontractor-caused schedule delays be converted into contractual delay notices (Clause 8.4 Extension of Time vs. Clause 8.7 Liquidated Damages)?

### Step 7: Daily Site Logs, Manpower & Equipment Tracking
- **Current Flow:** Daily site logs (`contracting_daily_logs`). Records weather conditions, temperature, work summary, delays, trade manpower counts, equipment active/idle hours.
- **Inputs:** Daily foreman / site engineer reports.
- **Outputs:** Daily log records, equipment utilization logs, site history.
- **Audit Probes for Claude:**
  - How can daily manpower attendance and productivity be compared against the planned progress to trigger early warning indicators (Earned Value Management: CPI & SPI)?
  - How are weather delay events officially captured to substantiate future EOT (Extension of Time) claims?

### Step 8: Work Inspection Requests (WIR) & Quality Sign-Off
- **Current Flow:** Site engineer requests consultant inspection (`contracting_wirs`) for completed milestones (e.g., rebar reinforcement, plumbing pressure test at 10 bar, electrical insulation test).
- **Inputs:** Location zone, BOQ item, test reports, photos.
- **Outputs:** Signed WIR with consultant verdict (Approved / Rejected).
- **Audit Probes for Claude:**
  - Should the system strictly enforce: "No approved WIR = Zero progress % allowed in the upcoming IPC"?
  - How should re-inspection costs after consultant rejection be charged to the faulty subcontractor?

### Step 9: Subcontractor Interim Payment Certificate (Subcontractor IPC)
- **Current Flow:** Subcontractor submits monthly progress invoice. System calculates:
  - Gross Work Done = Sum of (Verified Completed Quantity * Agreed Subcontract Rate).
  - Less: Previous Cumulative Payments.
  - Less: Advance Payment Recovery Amortization (`% of gross work`).
  - Less: Retention Held (`typically 5% or 10%`).
  - Less: Site Back-Charges (damage repairs, site cleaning, equipment shared).
  - Less: Delay Liquidated Damages (if milestone exceeded).
  - Equals: Net Payable Amount.
- **Inputs:** Joint measurement sheets, verified progress %, approved WIRs.
- **Outputs:** Approved Subcontractor IPC, Payment Certificate voucher.
- **Audit Probes for Claude:**
  - What is the exact mathematical formula to ensure advance payments are 100% recovered before 80% project completion?
  - How should back-charges (`contracting_backcharges`) be legally documented (e.g., Notice to Correct followed by 48-hour Back-Charge voucher)?

### Step 10: Client Interim Payment Certificate (Client Billing / Main IPC)
- **Current Flow:** Main contractor submits monthly invoice to Owner/Consultant. Incorporates overall progress, stores cumulative billed amounts, deducts client retention and client advance recovery.
- **Inputs:** Master joint site survey, approved client progress %.
- **Outputs:** Main Contractor Tax Invoice, Client IPC.
- **Audit Probes for Claude:**
  - How should "Pay-When-Paid" or "Pay-If-Paid" contractual clauses be modeled to protect the main contractor from cashflow insolvency if the client delays payment?
  - How are materials on site (Materials On Site - MOS / Stored Materials) billed before installation (e.g., 70-80% value of uninstalled switchgear/chillers)?

### Step 11: Change Management, Variation Orders (VO) & Price Escalation
- **Current Flow:** Variation Orders track scope additions/deletions. Updates BOQ quantities or introduces new star rates. Price escalation formula tracks commodity indices (`contracting_price_escalations`).
- **Inputs:** Client variation instruction, subcontractor cost claims.
- **Outputs:** Approved VO, Revised Contract Sum, Adjusted Baseline.
- **Audit Probes for Claude:**
  - How to decouple a Client VO from a Subcontractor VO (e.g., Client pays $150/unit, Subcontractor is contracted at $100/unit, preserving main contractor margin)?
  - How should time-extension (EOT) claims associated with VOs automatically adjust the Gantt chart and milestone deadlines?

### Step 12: Handover, Punch List, Taking-Over Certificate (TOC) & Defects Liability Period (DLP)
- **Current Flow:** Joint site walkthrough generates Punch List (`contracting_handovers`). Items resolved. System issues Taking-Over Certificate (TOC). Triggers release of 50% of retention money. Starts 365-day DLP countdown. Upon expiry and final inspection, Final Acceptance Certificate (FAC) is issued and remaining 50% retention is released.
- **Inputs:** Snag resolution sign-offs, as-built drawings, warranties/O&M manuals.
- **Outputs:** TOC, FAC, Retention Release Vouchers.
- **Audit Probes for Claude:**
  - What automated mechanisms should track warranty call-outs during the 1-year DLP?
  - If a subcontractor refuses to fix a defect during DLP, how does the system authorize hiring a third party using the held retention fund?

---

## 4. Key Questions & Deliverables Expected from Claude

When you review this document, please structure your feedback into the following 5 deliverables:

1. **Gap Analysis Matrix:** A table listing every missing operational sub-step or document between Steps 1 through 12.
2. **Subcontractor Failure Modes:** The top 5 operational traps when subcontracting single-trade packages (electrical, plumbing, HVAC, masonry) and how the software must prevent them.
3. **IPC Formula Proof:** The exact, bulletproof mathematical formula for subcontractor deductions (Advance Amortization, Retention, Withholding Tax, Back-Charges, Liquidated Damages).
4. **Materials-on-Site (MOS) Accounting:** Best-practice workflow for tracking, insuring, and billing uninstalled high-value equipment stored on site.
5. **Database Enhancements:** Specific columns or relational tables needed to support these recommendations.
