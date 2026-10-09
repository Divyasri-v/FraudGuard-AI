# 10 Fraud Detection Rules Reference

FraudGuard AI implements ten modular, independent rule detectors adhering to standard Healthcare Fraud, Waste, and Abuse (FWA) taxonomy:

---

### Rule 1: Duplicate Billing (`DUPLICATE_BILLING`)
* **Objective**: Detect identical or overlapping submissions.
* **Logic**: Evaluates whether another claim exists for the same synthetic patient, provider, procedure code, and service date.
* **Default Contribution**: +30 points | **Severity**: HIGH

---

### Rule 2: Upcoding (`UPCODING`)
* **Objective**: Detect unjustified high-tier billing codes.
* **Logic**: Cross-references procedure code hierarchy (e.g. `PROC_CONSULT_LVL5` vs routine consultation) against baseline clinical diagnosis and encounter records.
* **Default Contribution**: +20 points | **Severity**: HIGH

---

### Rule 3: Unbundling (`UNBUNDLING`)
* **Objective**: Detect component procedure fragmentation.
* **Logic**: Identifies whether component procedures of a comprehensive package (e.g., Laparoscopic Access + Gallbladder Excision) are billed as separate line items or concurrent claims.
* **Default Contribution**: +20 points | **Severity**: HIGH

---

### Rule 4: Phantom Billing (`PHANTOM_BILLING`)
* **Objective**: Flag claims with no corresponding patient clinical encounter.
* **Logic**: Verifies claim against synthetic intake / admission ledger (`service_events` table).
* **Default Contribution**: +25 points | **Severity**: CRITICAL

---

### Rule 5: False Claim (`FALSE_CLAIM`)
* **Objective**: Identify discrepancy against hospital encounter logs.
* **Logic**: Flags mismatches in attending provider ID, cancelled appointment logs, or altered dates.
* **Default Contribution**: +25 points | **Severity**: CRITICAL

---

### Rule 6: Inflated Billing (`INFLATED_BILLING`)
* **Objective**: Detect excessive tariff ratios over benchmark.
* **Logic**: Computes $\text{Ratio} = \frac{\text{Claimed Amount}}{\text{Expected Amount}}$. Flags when $\text{Ratio} \ge 1.5\times$ (configurable).
* **Default Contribution**: +20 points | **Severity**: HIGH

---

### Rule 7: Incorrect Billing (`INCORRECT_BILLING`)
* **Objective**: Demographic, anatomical, and diagnostic compatibility.
* **Logic**: Detects biological gender incompatibilities (e.g., obstetric procedure billed for male patient) or clinical diagnosis-procedure contradictions.
* **Default Contribution**: +15 points | **Severity**: HIGH

---

### Rule 8: Unsupported Services (`UNSUPPORTED_SERVICES`)
* **Objective**: Flag absent mandatory documentation or authorization.
* **Logic**: Validates documentation checklist (Invoice, Medical Discharge Record, Prior Pre-Authorization).
* **Default Contribution**: +15 points | **Severity**: MEDIUM

---

### Rule 9: Impossible Timing (`IMPOSSIBLE_TIMING`)
* **Objective**: Detect geographical or chronological travel impossibilities.
* **Logic**: Evaluates whether patient has billed services in distant fictional cities on the exact same date or overlapping surgery timestamps.
* **Default Contribution**: +20 points | **Severity**: HIGH

---

### Rule 10: Mutually Exclusive Services (`MUTUALLY_EXCLUSIVE`)
* **Objective**: Detect anatomically or surgically contradictory procedures.
* **Logic**: Evaluates procedure pair matrix (e.g. Open Appendectomy vs Laparoscopic Appendectomy on the same day).
* **Default Contribution**: +20 points | **Severity**: HIGH
