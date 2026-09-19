# Z-Systems Maritime Freight Forwarding & Logistics Module: Deep Architectural & Operational Audit Pack

> **Purpose:** Comprehensive, token-optimized domain blueprint for AI Architects (Claude / GPT-4 / Domain Experts) to conduct a rigorous operational gap analysis, identify missing supply chain workflows, enforce FIATA / DCSA / Incoterms compliance, and prevent container demurrage and exchange rate leakages.

---

## 1. System Persona & Mission Brief

You are a **Principal Maritime Freight Forwarding ERP Architect, FIATA Logistics Consultant, and Global Supply Chain Operations Expert**.
Your mission is to rigorously audit the end-to-end maritime freight, container tracking, and shipping logistics workflow implemented in the **Z-Systems ERP** platform.

Your analysis must focus on:
1. **Shipping Line & Demurrage Traps:** Clock calculation for Demurrage, Detention, and Port Storage charges, container deposits, and empty return proofs (EIR).
2. **Missing Regulatory & Documentation Steps:** FIATA documentation, MBL vs. HBL issuance, Verified Gross Mass (VGM - SOLAS), Advance Cargo Information (ACID / Nafeza / Fasah), and Delivery Order (DO) releases.
3. **Multi-Currency & Forex Volatility:** Currency exposure between quotation (USD/EUR) and carrier settlement vs. customer collection in local currency (EGP/SAR/AED).
4. **End-to-End Operational Integrity:** Gap analysis between carrier procurement, booking, port handling, customs clearance, and final job profitability closing.

---

## 2. Core Database Schema & Entities

The logistics and maritime freight module operates on PostgreSQL via the following core tables:

1. `shipping_ports`:
   - Global port master directory using UN/LOCODE.
   - `id`, `code` (`EGALY`, `EGPSD`, `EGSOK`, `SAJED`, `SADMM`, `AEJEA`, `CNSHA`, `CNNGB`, `NLRTM`, `DEHAM`), `name_ar`, `name_en`, `country_code`, `is_active`.
2. `shipping_lines`:
   - Global ocean carriers registry.
   - `id`, `code` (`MSCU`, `MAEU`, `CMDU`, `COSU`, `HLCU`, `ONEY`, `EGLV`, `YMLU`, `ZIMU`), `name_ar`, `name_en`, `contact_person`, `email`, `rfq_email`, `tracking_url_template`.
3. `maritime_rfqs`:
   - Freight inquiries and procurement requests (`RFQ-YYMMDD-XXXX`).
   - `direction` (`import`, `export`), `pol_code` (Port of Loading), `pod_code` (Port of Discharge), `incoterm` (`FOB`, `CIF`, `EXW`, `CFR`, `DDP`, `FCA`, `DAP`), `cargo_mode` (`FCL`, `LCL`, `breakbulk`), `container_type` (`20GP`, `40GP`, `40HC`, `reefer`, `open_top`), `container_count`, `commodity_description`, `cargo_ready_date`, `target_free_days` (default 14), `payment_term` (`prepaid`, `collect`), `status` (`draft`, `sent_to_lines`, `bids_received`, `awarded`, `cancelled`).
4. `maritime_rfq_bids`:
   - Carrier quotation bids received from shipping lines.
   - `rfq_id`, `shipping_line_id`, `ocean_freight`, `currency` (USD/EUR), `thc_origin`, `thc_destination`, `baf_charges` (Bunker), `other_charges`, `total_freight_cost`, `transit_time_days`, `free_days`, `validity_date`, `is_awarded`.
5. `maritime_quotations`:
   - Formal sales quotation issued to the cargo owner / importer (`QUO-YYMMDD-XXXX`).
   - `rfq_id`, `bid_id`, `customer_id`, `base_cost`, `currency`, `margin_type` (`fixed`, `percentage`), `margin_value`, `final_total`, `exchange_rate`, `final_total_local`, `valid_until`, `status` (`draft`, `sent`, `accepted`, `rejected`, `converted_to_job`).
6. `maritime_jobs`:
   - Master Shipment File (`JOB-YYMMDD-XXXX`).
   - `quotation_id`, `customer_id`, `direction`, `shipping_line_id`, `booking_number`, `vessel_name`, `voyage_number`, `pol_code`, `pod_code`, `etd`, `eta`, `port_cut_off`, `bl_type` (`original`, `telex_release`, `sea_waybill`), `mbl_number`, `hbl_number`, `shipper_details`, `consignee_details`, `notify_party`, `milestone_status` (`BOOK`, `GATE_IN`, `LOAD`, `DEP`, `ARR`, `DISC`, `GATE_OUT`, `RET`), `delivery_order_released` (boolean), `delivery_order_released_at`, `cost_center_id`, `client_invoiced_total`, `carrier_cost_total`, `other_costs_total`, `net_profit`, `status` (`active`, `completed`, `cancelled`).
7. `maritime_containers`:
   - Individual container tracking & demurrage monitor.
   - `job_id`, `container_number` (ISO 4-letter prefix + 7 digits), `container_type`, `seal_number`, `gross_weight_kg` (VGM), `cbm`, `gated_in_at`, `vessel_loaded_at`, `discharged_at`, `gated_out_at`, `empty_returned_at`, `free_days` (e.g. 14 or 21 days), `return_deadline` (calculated date), `is_overdue` (boolean), `overdue_days`, `demurrage_rate_per_day`, `demurrage_amount`, `deposit_amount`, `deposit_currency`, `deposit_status` (`held_by_line`, `refunded_to_client`, `forfeited`), `empty_return_proof_url` (EIR receipt).
8. `maritime_job_milestones`:
   - Chronological event timeline following DCSA (Digital Container Shipping Association) standards.
   - `job_id`, `milestone_key`, `milestone_title`, `occurred_at`, `location`, `notes`.

---

## 3. End-to-End Operational Lifecycle (12 Sequential Steps)

Here is the exact step-by-step lifecycle from client inquiry to empty container return and financial closing:

### Step 1: Client Inquiry & RFQ Formulation
- **Current Flow:** Shipper/Importer requests freight quote. User creates `maritime_rfqs` with direction (import/export), Incoterm (e.g. FOB Shanghai to Alexandria), cargo details, container specs (e.g. 2x40HC), target free days (14 days), and cargo ready date.
- **Inputs:** Client inquiry details, Incoterms 2020 rules.
- **Outputs:** Standardized RFQ document (`RFQ-YYMMDD-XXXX`).
- **Audit Probes for Claude:**
  - How should cargo hazardous classification (IMO / IMDG Class, UN Number, Flashpoint) or Reefer temperature control settings be modeled?
  - For LCL (Less than Container Load), what volumetric weight formula (CBM vs. 1000 kg rule) should govern freight calculations?

### Step 2: Ocean Carrier Sourcing & Tender Bidding
- **Current Flow:** System dispatches RFQs to selected shipping lines (MSC, Maersk, CMA CGM, etc.). Bids are recorded (`maritime_rfq_bids`) with ocean freight, THC at origin and destination, BAF bunker adjustment, security fees, transit time, and granted free time.
- **Inputs:** Carrier quotations, validity cut-off dates.
- **Outputs:** Side-by-side bid comparison matrix, Awarded Bid selection.
- **Audit Probes for Claude:**
  - What happens when a shipping line has a General Rate Increase (GRI) or Peak Season Surcharge (PSS) between the bid date and vessel departure?
  - How are routing options (Direct Vessel vs. Transshipment via feeder) evaluated for risk of delay?

### Step 3: Margin Optimization & Client Freight Quotation
- **Current Flow:** User generates formal quotation (`maritime_quotations`) for client based on the awarded carrier bid. Configurable markup (fixed amount or % margin). Converts foreign currency (USD/EUR) to local currency (EGP/SAR/AED) based on the day's exchange rate.
- **Inputs:** Awarded carrier bid, pricing policy, margin targets.
- **Outputs:** Client Quotation (`QUO-YYMMDD-XXXX`) with validity date.
- **Audit Probes for Claude:**
  - How to protect the freight forwarder against catastrophic foreign exchange (Forex) depreciation between quotation acceptance and final carrier invoicing?
  - Should the quotation explicitly break down Ocean Freight (exempt from local sales tax) vs. Local Handling Services (subject to VAT)?

### Step 4: Booking Confirmation & Master Shipment File (Job File)
- **Current Flow:** Client accepts quote (`status = 'accepted'`). User clicks "Convert to Job". System creates `maritime_jobs` record (`JOB-YYMMDD-XXXX`), automatically creates a dedicated financial Cost Center, locks carrier details, booking number, vessel name, voyage number, ETD, ETA, and port cut-off.
- **Inputs:** Carrier Booking Confirmation notice, Client purchase order.
- **Outputs:** Active Job File, Project Cost Center in General Ledger.
- **Audit Probes for Claude:**
  - What happens if the shipping line "rolls over" the container to the next voyage due to overbooking? How is the Job File updated without losing historical tracking?

### Step 5: Shipping Instructions (SI) & Bill of Lading (MBL vs. HBL) Issuance
- **Current Flow:** System captures MBL (Master Bill of Lading) and HBL (House Bill of Lading) numbers, Shipper, Consignee, and Notify Party details. BL type can be set to: Original (3/3), Sea Waybill, or Telex / Express Release.
- **Inputs:** Shipping Instructions from exporter, cargo packing list.
- **Outputs:** Draft BL, Final MBL/HBL record.
- **Audit Probes for Claude:**
  - What are the legal liabilities of releasing an HBL when the forwarder acts as an NVOCC (Non-Vessel Operating Common Carrier)?
  - In "To Order" Bills of Lading (negotiable BLs backed by Letter of Credit LC), what checks must prevent cargo release without bank endorsement?

### Step 6: Verified Gross Mass (VGM - SOLAS) & Origin Port Operations
- **Current Flow:** Containers recorded (`maritime_containers`) with Container Number, Type (e.g. 40HC), Seal Number, Gross Weight (kg), and CBM. Tracks Gate-in at origin port and Port Cut-off deadline.
- **Inputs:** Certified weighbridge ticket (VGM Method 1 or Method 2), container seal number.
- **Outputs:** VGM Declaration submission, Gate-in milestone.
- **Audit Probes for Claude:**
  - How should container number ISO 6346 validation (4 letters, 6 digits, 1 check digit) be enforced strictly to prevent typo errors on customs manifests?

### Step 7: DCSA Milestone Tracking & Vessel In-Transit Monitoring
- **Current Flow:** DCSA-compliant milestone engine (`maritime_job_milestones`) records: BOOK (Booked), GATE_IN (Gated in origin), LOAD (Loaded on vessel), DEP (Vessel departed), ARR (Vessel arrived at POD), DISC (Discharged), GATE_OUT (Customs gate-out), RET (Empty returned).
- **Inputs:** Carrier tracking webhook or manual agent updates.
- **Outputs:** Visual shipment progress bar, customer live tracking view.
- **Audit Probes for Claude:**
  - How should transshipment milestones (T/S port discharge, T/S vessel loading) be captured when cargo moves through hubs like Jebel Ali, Singapore, or Port Said?

### Step 8: Regulatory Advance Information & Customs Filing (ACID / Nafeza / Fasah)
- **Current Flow:** Tracks clearance documents, commercial invoices, certificates of origin, and import declaration numbers.
- **Inputs:** Importer tax ID, exporter registration, customs platform reference (e.g. ACID in Egypt, Bayan/Fasah in KSA).
- **Outputs:** Customs declaration dossier, clearance readiness status.
- **Audit Probes for Claude:**
  - In countries mandating Advance Cargo Information (ACI), what prevents shipping lines from issuing BLs without a verified ACI number? Should the system hard-block Job progression if ACID/UCR is missing?

### Step 9: Arrival Notice (AN), Freight Invoicing & Delivery Order (DO) Release
- **Current Flow:** Shipping line sends Arrival Notice 3-5 days before ETA. Forwarder invoices the client for ocean freight and local charges. Forwarder pays shipping line. Shipping line releases Delivery Order (`delivery_order_released = true`).
- **Inputs:** Carrier Arrival Notice, carrier freight invoice, client payment clearance.
- **Outputs:** Client Tax Invoice, Released Delivery Order (DO) permit.
- **Audit Probes for Claude:**
  - What is the strict credit control invariant: Can a Delivery Order EVER be released before the client settles all ocean freight and container security deposits?
  - What is the protocol if the cargo is pledged to a bank under a Letter of Credit (LC)?

### Step 10: Port Customs Clearance, Terminal Inspection & Gate-Out
- **Current Flow:** Customs broker clears cargo. Terminal inspection (X-Ray / physical examination) completed. Port storage and handling fees paid. Container gates out from the port terminal (`gated_out_at`).
- **Inputs:** Customs clearance certificate, terminal release order, inland transport dispatch.
- **Outputs:** Port Gate-Out timestamp, start of inland delivery transit.
- **Audit Probes for Claude:**
  - What is the difference between Port Storage (ارضيات الميناء paid to the port authority) and Carrier Demurrage (غرامات توكيل paid to the shipping line)? Does the system segregate these two distinct liabilities?

### Step 11: Container Demurrage / Detention Clock & Guarantee Deposit Monitoring
- **Current Flow:** The critical timer! System sets `return_deadline = discharged_at + free_days`. If current date > `return_deadline`, system automatically flags `is_overdue = true`, calculates `overdue_days`, and multiplies by `demurrage_rate_per_day` to accrue `demurrage_amount`. Also tracks container insurance deposit held by shipping line (`deposit_amount`).
- **Inputs:** Discharge date, granted free days (e.g. 14 days), daily demurrage tariff tier.
- **Outputs:** Live demurrage countdown badge, accrued demurrage liability alert, deposit status monitor.
- **Audit Probes for Claude:**
  - Shipping lines use "Tiered Demurrage Tariffs" (e.g. Days 1-14: Free; Days 15-20: $40/day; Days 21-30: $80/day; Days 31+: $120/day). How should this non-linear progressive rate engine be structured?
  - What happens if the shipping line combines Demurrage and Detention into a single "Combined Demurrage & Detention" clock?

### Step 12: Empty Container Return, EIR Proof & Financial File Closure
- **Current Flow:** Inland truck returns empty container to carrier's designated empty depot. Forwarder obtains Equipment Interchange Receipt (EIR) / Empty Return Proof (`empty_returned_at`, `empty_return_proof_url`). System stops the demurrage clock. Recovers container deposit from shipping line. Compares total client revenues vs carrier costs to compute final `net_profit` and close the Job File.
- **Inputs:** Stamped EIR receipt, carrier deposit refund notice.
- **Outputs:** Container returned status, deposit refund voucher, closed job P&L statement.
- **Audit Probes for Claude:**
  - If the empty container is returned with physical damage (e.g., damaged floorboard or gouged side wall), how does the system process the carrier's repair debit note (EIR Damage Claim)?
  - What is the financial checklist required to close a Job File permanently in the General Ledger?

---

## 4. Key Questions & Deliverables Expected from Claude

When you review this document, please structure your feedback into the following 5 deliverables:

1. **Supply Chain Gap Analysis:** A chronological checklist of missing operational steps or compliance documents across the 12 steps.
2. **Demurrage & Detention Multi-Tier Engine:** The mathematical schema and data model needed to support tiered progressive demurrage tariffs (e.g., 1-14 free, 15-21 tier 1, 22+ tier 2) and port storage segregation.
3. **Forex Risk Shield:** Best-practice architectural mechanism to hedge against currency depreciation between booking quote and vessel arrival date.
4. **NVOCC / Forwarder Liability Safeguards:** Crucial validation gates to prevent cargo delivery order (DO) release without proper BL endorsements, bank releases, or cleared funds.
5. **Database Enhancements:** Suggested PostgreSQL schema additions (e.g., customs declaration tracking, tiered demurrage tables, damage claim logs).
