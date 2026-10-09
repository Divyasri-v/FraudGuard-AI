# FraudGuard AI Architecture Documentation

## 1. System Overview

**FraudGuard AI** is an explainable healthcare insurance claim fraud, waste, and abuse (FWA) detection and review platform designed exclusively around **100% synthetic demonstration data**.

```text
React Frontend (Vite, Tailwind, Recharts)
       │
       │ REST API (JSON / Bearer Token)
       ▼
FastAPI Backend (Python 3.14 / 3.11)
       │
       ├── Authentication & RBAC (JWT, bcrypt)
       ├── Claim Management & Ingestion
       ├── 10-Rule Modular Fraud Engine
       ├── Machine Learning Anomaly Detection (Isolation Forest)
       ├── Hybrid Risk Scoring Engine (70% Rules + 30% ML)
       ├── Explainable AI Module ("Why Flagged?" Rationale)
       ├── Investigation & Evidence Workflow (SIU)
       ├── Notification Service (Risk ≥ 81 Alerts)
       └── Audit Service (Tamper-evident system log)
              │
              ▼
        SQLite / PostgreSQL Compatible Database (SQLAlchemy ORM)
```

## 2. Multi-Tier Risk Scoring Methodology

FraudGuard AI employs a hybrid risk assessment architecture that merges rule-based determinism with machine learning unsupervised anomaly detection:

1. **Rule Score (0–100)**:
   - Sum of contributions from all triggered rules among the 10 modular detectors.
   - Capped at 100 points maximum.

2. **Machine Learning Anomaly Score (0–100)**:
   - Evaluated by an unsupervised **Isolation Forest** fitted on 12 multidimensional claim features.
   - Outputs continuous score indicating feature deviation from standard baseline behavior.

3. **Hybrid Risk Score (0–100)**:
   $$\text{Hybrid Score} = (\text{Rule Score} \times 0.70) + (\text{ML Score} \times 0.30)$$
   Weights are configurable by administrators in `backend/.env`.

4. **Risk Classification**:
   - **LOW**: 0–30
   - **MEDIUM**: 31–60
   - **HIGH**: 61–80
   - **CRITICAL**: 81–100

## 3. Strict Safety & Synthetic Constraints

- Maximum claims supported in generator: **10,000**.
- Fictional patient demographics and provider facilities.
- Fixed seed (42) for reproducible academic simulations.
- Clearly flags "SYNTHETIC DEMO DATA – NOT REAL PATIENT DATA".
