"""
FraudGuard AI - Domain Knowledge Base for RAG Assistant
Strictly contains synthetic domain rules, SIU guidelines, and detection methodologies.
DOES NOT contain private real patient records.
"""

KNOWLEDGE_DOCUMENTS = [
    {
        "id": "kb_rule_01_duplicate_billing",
        "title": "Rule 1: Duplicate Billing (DUPLICATE_BILLING)",
        "category": "fraud_rules",
        "rule_code": "DUPLICATE_BILLING",
        "content": (
            "Rule Name: Duplicate Billing (DUPLICATE_BILLING)\n"
            "Severity: CRITICAL | Weight Contribution: +35 points\n"
            "Definition: Occurs when identical or overlapping healthcare services (same synthetic patient ID, "
            "same provider ID, identical procedure code, and identical or near-simultaneous service date) "
            "are billed multiple times to claim duplicate reimbursements.\n"
            "Clinical & Billing Rationale: Legitimate medical treatments do not warrant two identical surgical or "
            "specialist consultations within 24 hours unless a formal complication is recorded. Repeated line items "
            "often indicate automated billing script anomalies or intentional double-submissions.\n"
            "Investigative Checklist: Compare claim submission timestamps, audit the facility admission ledger, "
            "and verify whether one of the submissions was an accidental re-transmission or separate encounter."
        )
    },
    {
        "id": "kb_rule_02_upcoding",
        "title": "Rule 2: Upcoding (UPCODING)",
        "category": "fraud_rules",
        "rule_code": "UPCODING",
        "content": (
            "Rule Name: Upcoding (UPCODING)\n"
            "Severity: HIGH | Weight Contribution: +30 points\n"
            "Definition: Submitting a higher-tier, higher-intensity procedure code than what the patient's actual "
            "clinical diagnosis, severity, or documented medical notes warranted.\n"
            "Clinical & Billing Rationale: For example, billing a simple viral fever checkup as an Intensive Complex "
            "Consultation (Level 5) or billing a standard dressing change as an Advanced Surgical Debridement. "
            "Upcoding artificially inflates expected compensation above the standardized tariff rate.\n"
            "Investigative Checklist: Review primary clinical chart notes, physician notes, and compare billed procedure "
            "difficulty against the patient's primary diagnosis ICD code."
        )
    },
    {
        "id": "kb_rule_03_unbundling",
        "title": "Rule 3: Unbundling / Fragmentation (UNBUNDLING)",
        "category": "fraud_rules",
        "rule_code": "UNBUNDLING",
        "content": (
            "Rule Name: Unbundling (UNBUNDLING)\n"
            "Severity: HIGH | Weight Contribution: +25 points\n"
            "Definition: Separating individual component services of a comprehensive surgical or diagnostic package "
            "and billing each component under separate line items to maximize cumulative reimbursements.\n"
            "Clinical & Billing Rationale: Standard insurance tariffs bundle related ancillary tasks (e.g., incision, "
            "suture, local anesthesia, post-op monitoring) into a single unified package rate. Billing each step "
            "piecemeal violates payer billing guidelines and inflates provider payouts.\n"
            "Investigative Checklist: Inspect bundled package tariff schedules, group service line codes, and determine "
            "if components should be re-aggregated under the primary package code."
        )
    },
    {
        "id": "kb_rule_04_phantom_billing",
        "title": "Rule 4: Phantom Billing (PHANTOM_BILLING)",
        "category": "fraud_rules",
        "rule_code": "PHANTOM_BILLING",
        "content": (
            "Rule Name: Phantom Billing (PHANTOM_BILLING)\n"
            "Severity: CRITICAL | Weight Contribution: +40 points\n"
            "Definition: Submitting insurance claims for treatments, laboratory tests, hospital room days, or medications "
            "where no physical or synthetic patient encounter record exists in the clinical ledger.\n"
            "Clinical & Billing Rationale: The patient never visited the facility or received the listed service. "
            "Phantom billing is a high-risk indicator often associated with hijacked member identity credentials.\n"
            "Investigative Checklist: Request electronic medical record (EMR) login logs, nurse sign-off sheets, "
            "and synthetic digital signature verifications."
        )
    },
    {
        "id": "kb_rule_05_false_claim",
        "title": "Rule 5: False Claim (FALSE_CLAIM)",
        "category": "fraud_rules",
        "rule_code": "FALSE_CLAIM",
        "content": (
            "Rule Name: False Claim (FALSE_CLAIM)\n"
            "Severity: CRITICAL | Weight Contribution: +40 points\n"
            "Definition: Submissions containing demonstrable factual discrepancies against encounter records, such as "
            "mismatched attending physicians, cancelled outpatient appointments billed as rendered, or altered service dates.\n"
            "Clinical & Billing Rationale: Involves material misrepresentation of facts to circumvent policy terms or "
            "claim eligibility limits.\n"
            "Investigative Checklist: Match provider registry credentials against attending physician signatures and "
            "cross-verify appointment scheduling timestamps."
        )
    },
    {
        "id": "kb_rule_06_inflated_billing",
        "title": "Rule 6: Inflated Billing (INFLATED_BILLING)",
        "category": "fraud_rules",
        "rule_code": "INFLATED_BILLING",
        "content": (
            "Rule Name: Inflated Billing (INFLATED_BILLING)\n"
            "Severity: HIGH | Weight Contribution: +25 points\n"
            "Definition: Claiming reimbursement amounts that significantly exceed standard benchmark tariff ratios "
            "(ratio of claimed amount to expected amount > 1.5×) without recorded clinical complications or ICU stays.\n"
            "Clinical & Billing Rationale: Excessive line-item pricing without documented medical necessity or "
            "unusual surgical complexities.\n"
            "Investigative Checklist: Check baseline city/specialization tariff schedules and verify line-item invoices "
            "for unreasonable price markups."
        )
    },
    {
        "id": "kb_rule_07_incorrect_billing",
        "title": "Rule 7: Incorrect Billing (INCORRECT_BILLING)",
        "category": "fraud_rules",
        "rule_code": "INCORRECT_BILLING",
        "content": (
            "Rule Name: Incorrect Billing (INCORRECT_BILLING)\n"
            "Severity: MEDIUM | Weight Contribution: +20 points\n"
            "Definition: Coding inconsistencies with patient demographics or anatomical realities (e.g., gender-restricted "
            "maternity procedures billed for male patients, or age-incompatible pediatric treatments billed for geriatric patients).\n"
            "Clinical & Billing Rationale: While frequently clerical error, repeated occurrences indicate systematic "
            "billing negligence or copy-paste template abuse.\n"
            "Investigative Checklist: Verify patient demographics against procedure clinical protocols and check for "
            "clerical coding corrections."
        )
    },
    {
        "id": "kb_rule_08_unsupported_services",
        "title": "Rule 8: Unsupported Services (UNSUPPORTED_SERVICES)",
        "category": "fraud_rules",
        "rule_code": "UNSUPPORTED_SERVICES",
        "content": (
            "Rule Name: Unsupported Services (UNSUPPORTED_SERVICES)\n"
            "Severity: MEDIUM | Weight Contribution: +20 points\n"
            "Definition: Claims submitted without mandatory documentary proof, such as missing prior authorization, "
            "absent diagnostic imaging reports, or omitted discharge summaries for inpatient admissions.\n"
            "Clinical & Billing Rationale: Mandatory pre-authorization and clinical documentation are policy prerequisites "
            "for major procedures. Missing evidence flags high risk of non-covered or non-rendered services.\n"
            "Investigative Checklist: Trigger 'REQUEST_INFO' in Review Queue requesting operative reports and itemized pharmacy bills."
        )
    },
    {
        "id": "kb_rule_09_impossible_timing",
        "title": "Rule 9: Impossible Timing (IMPOSSIBLE_TIMING)",
        "category": "fraud_rules",
        "rule_code": "IMPOSSIBLE_TIMING",
        "content": (
            "Rule Name: Impossible Timing (IMPOSSIBLE_TIMING)\n"
            "Severity: CRITICAL | Weight Contribution: +35 points\n"
            "Definition: Geographical or temporal physical impossibilities, such as a patient billed for in-person consultations "
            "in two distant cities within an unrealistic travel window, or a surgeon billed for 36 hours of continuous surgeries in a 24-hour day.\n"
            "Clinical & Billing Rationale: Indicates fabricated billing entries where provider or patient telemetries contradict "
            "physical reality.\n"
            "Investigative Checklist: Audit facility location coordinates and check provider time-tracking logs."
        )
    },
    {
        "id": "kb_rule_10_mutually_exclusive",
        "title": "Rule 10: Mutually Exclusive Services (MUTUALLY_EXCLUSIVE)",
        "category": "fraud_rules",
        "rule_code": "MUTUALLY_EXCLUSIVE",
        "content": (
            "Rule Name: Mutually Exclusive Services (MUTUALLY_EXCLUSIVE)\n"
            "Severity: HIGH | Weight Contribution: +30 points\n"
            "Definition: Procedures that are medically or anatomically contradictory when billed together for the same patient encounter "
            "(e.g., both laparoscopic appendectomy and open appendectomy billed on the same date).\n"
            "Clinical & Billing Rationale: Two surgical approaches to the exact same anatomical target cannot both be fully executed "
            "and billed as primary operations simultaneously.\n"
            "Investigative Checklist: Review operative notes to check if a planned procedure converted into an emergency alternative, "
            "and adjust billing to reimburse only the finalized procedure."
        )
    },
    {
        "id": "kb_methodology_hybrid_scoring",
        "title": "Scoring Methodology: Hybrid Risk Scoring & Risk Tiers",
        "category": "methodology",
        "rule_code": "HYBRID_SCORING",
        "content": (
            "FraudGuard AI Hybrid Risk Scoring Architecture:\n"
            "Formula: Hybrid Score = (0.70 × Rule-Based Score) + (0.30 × Machine Learning Anomaly Score)\n"
            "1. Rule-Based Score: Cumulative weighted score generated by the 10 deterministic clinical/billing fraud rules.\n"
            "2. ML Anomaly Score: Unsupervised score generated by an Isolation Forest model trained on 12 tabular features.\n"
            "Calibrated Risk Tiers:\n"
            "• LOW (0.0 to 29.9): Standard baseline claim. Automatically approved or low-priority triage.\n"
            "• MEDIUM (30.0 to 59.9): Moderate deviation. Queued for human analyst inspection.\n"
            "• HIGH (60.0 to 79.9): Significant anomalies detected. High-priority review required.\n"
            "• CRITICAL (80.0 to 100.0): Multiple severe fraud indicators triggered. Immediate hold and SIU case opened."
        )
    },
    {
        "id": "kb_workflow_investigation_siu",
        "title": "Investigation & SIU Review Protocol",
        "category": "workflow",
        "rule_code": "SIU_WORKFLOW",
        "content": (
            "Special Investigation Unit (SIU) Operational Protocol:\n"
            "1. Review Queue Triage: Analysts filter pending claims by Risk Level, Claim Amount, or Detected Fraud Rules.\n"
            "2. Quick Actions: Analysts can APPROVE, REJECT, REQUEST_INFO, or ESCALATE to Special Investigation.\n"
            "3. Investigation Dossier: High/Critical claims trigger formal investigation cases with dedicated case numbers (e.g., INV-2026-0001).\n"
            "4. Investigation Notes: Investigators document clinical findings under categorized note types: OBSERVATION, EVIDENCE, DECISION, INTERVIEW.\n"
            "5. Exhibits: Support attachment and tracking of synthetic evidence documents (invoices, EMR logs, charts).\n"
            "6. Case Disposition: Final recommendations recorded as CLOSED (Approved / Cleared) or REJECTED (Confirmed Risk)."
        )
    },
    {
        "id": "kb_disclaimer_terminology",
        "title": "Regulatory Compliance & Terminology Guidelines",
        "category": "compliance",
        "rule_code": "COMPLIANCE",
        "content": (
            "FraudGuard AI Compliance & Synthetic Data Standards:\n"
            "• 100% Synthetic Demo Data: All patient records, hospital IDs, and diagnoses are algorithmically generated.\n"
            "• Assistive Decision Support: The system is an academic and prototype decision-support tool. It does NOT "
            "definitively prove fraud in a legal sense.\n"
            "• Required Terminology: Always use neutral, investigative terms: 'Suspicious Claim', 'Fraud Risk', "
            "'Requires Review', 'Anomaly Detected'. Do NOT declare a claim as legally proven fraud."
        )
    }
]

def get_all_knowledge_documents():
    return KNOWLEDGE_DOCUMENTS
