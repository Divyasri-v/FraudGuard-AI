# 🏥 FraudGuard AI

### Explainable Healthcare Insurance Claim Fraud Detection & Review Platform

> **DATA NOTICE & ETHICAL DISCLAIMER:**  
> This application uses synthetic data exclusively and is intended for educational, demonstration, and research purposes. It does not process real patient information, medical records, or Protected Health Information (PHI), and does not establish legal fraud determinations. Terminology such as "Suspicious Claim", "Fraud Risk", and "Requires Review" indicates statistical anomaly patterns, not legal proof of fraud.

---

## 📖 Table of Contents
1. [Project Overview](#-project-overview)
2. [Key Capabilities & Features](#-key-capabilities--features)
3. [Technology Stack](#-technology-stack)
4. [System Architecture](#-system-architecture)
5. [Directory Structure](#-directory-structure)
6. [Demo Accounts & Credentials](#-demo-accounts--credentials)
7. [Getting Started (Windows PowerShell)](#-getting-started-windows-powershell)
8. [Synthetic Data Generator](#-synthetic-data-generator)
9. [The 10 Fraud Detection Rules](#-the-10-fraud-detection-rules)
10. [Machine Learning Anomaly Detection](#-machine-learning-anomaly-detection)
11. [Hybrid Risk Scoring & Explainability](#-hybrid-risk-scoring--explainability)
12. [API Documentation](#-api-documentation)
13. [Testing Suite](#-testing-suite)
14. [Docker Deployment](#-docker-deployment)
15. [Limitations & Ethics](#-limitations--ethical-considerations)

---

## 🌟 Project Overview

**FraudGuard AI** is a full-stack, enterprise-grade healthcare insurance claim fraud, waste, and abuse (FWA) detection and investigation web application. The platform simulates the end-to-end operational workflow of a healthcare payer Special Investigation Unit (SIU).

It combines:
- **10 Modular Deterministic Rule Detectors**
- **Unsupervised Machine Learning Anomaly Detection (Isolation Forest)**
- **Hybrid Risk Scoring (0–100 Scale)**
- **Explainable AI (Transparent "Why Flagged?" Rationale)**
- **End-to-End Investigation Lifecycle (Dossiers, Exhibits, Notes, Decisions)**
- **Role-Based Access Control (Admin, Analyst, Investigator, Claims Officer, Auditor)**
- **Grounded AI Investigation Assistant (RAG Knowledge Base)**

---

## 🚀 Key Capabilities & Features

* **Real Calculated Analytics**: Dashboard KPIs (Reviewed, Suspicious, Critical, Amount at Risk, Avg Risk) calculated dynamically from SQL queries.
* **10 Independent Fraud Rules**: Duplicate Billing, Upcoding, Unbundling, Phantom Billing, False Claims, Inflated Billing, Incorrect Billing, Unsupported Services, Impossible Timing, and Mutually Exclusive Services.
* **Machine Learning Layer**: Trained exclusively on synthetic data using 12 multidimensional claim features.
* **Instant Claim Audit Console**: Real-time evaluation pipeline upon claim submission with interactive checklist feedback.
* **Interactive SIU Investigation Workflow**: Complete audit log, interview/observation notes, synthetic document exhibits, and case lifecycle transitions.
* **Provider & Patient 360 Profiles**: Historical violation distribution, timeline of billed procedures, and provider risk scores.
* **Automated Alerting**: Immediate notifications for critical risk claims ($\text{Score} \ge 81$) and case escalations.
* **Compliance Reporting**: Summary, provider risk, financial exposure, and CSV export.

---

## 🛠 Technology Stack

### Frontend
* **React 19** with **Vite**
* **Tailwind CSS v4**
* **Recharts** (Interactive Area, Bar, Pie, Scatter visualizations)
* **Lucide React** (Operations icon set)
* **Axios** (JWT interceptors & API client)
* **React Router v7**

### Backend
* **Python 3.14 / 3.11**
* **FastAPI**
* **SQLAlchemy 2.0 ORM**
* **Pydantic v2**
* **Uvicorn**
* **PyJWT & bcrypt**

### Machine Learning
* **scikit-learn** (Isolation Forest)
* **pandas & NumPy**

### Database
* **SQLite** (Initial prototype, PostgreSQL-ready architecture with clean schema abstraction)

---

## 🏛 System Architecture

```text
React Frontend (Vite, Tailwind, Recharts)
       │
       │ REST API (JSON / Bearer Token)
       ▼
FastAPI Backend
       │
       ├── Authentication & RBAC (Admin, Analyst, Investigator, Claims, Auditor)
       ├── Claim Management & Intake Engine
       ├── 10-Rule Modular Fraud Engine
       ├── Isolation Forest ML Anomaly Detector
       ├── Hybrid Risk Scoring Engine
       ├── Explainable AI Module
       ├── SIU Investigation & Evidence Workflow
       ├── Notification & Alert Dispatcher
       └── Tamper-Evident Audit Service
              │
              ▼
        SQLite Database (PostgreSQL Migration-Ready)
```

---

## 📂 Directory Structure

```text
claimshield/
│
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── endpoints/       # Auth, claims, fraud, queue, investigations, etc.
│   │   │   ├── deps.py          # JWT security dependencies & audit helpers
│   │   │   └── v1/api.py        # Master router
│   │   ├── core/
│   │   │   ├── config.py        # Pydantic Settings
│   │   │   └── security.py      # bcrypt & PyJWT utilities
│   │   ├── database/
│   │   │   └── session.py       # Engine, SessionLocal, Base
│   │   ├── fraud_engine/
│   │   │   ├── rules/           # 10 modular Python rule detectors
│   │   │   ├── engine.py        # Central FraudRuleEngine
│   │   │   └── scoring.py       # RiskScoringEngine & Explainable AI
│   │   ├── ml/
│   │   │   └── anomaly_detector.py # Isolation Forest detector
│   │   ├── models/              # SQLAlchemy database models
│   │   ├── schemas/             # Pydantic schemas
│   │   └── main.py              # FastAPI app & lifespan handler
│   │
│   ├── scripts/
│   │   └── generate_synthetic_data.py # Reproducible data generator
│   │
│   ├── tests/                   # Pytest & Unittest test suite
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/          # RiskBadge, StatusBadge, DisclaimerBanner
│   │   │   └── layout/          # Sidebar, Navbar, MainLayout
│   │   ├── context/
│   │   │   └── AuthContext.jsx  # Authentication state & role switcher
│   │   ├── pages/               # Dashboard, Claims, ReviewQueue, Investigations, etc.
│   │   ├── services/
│   │   │   └── api.js           # Axios REST services
│   │   ├── App.jsx              # React Router definitions
│   │   └── index.css            # Tailwind baseline styles
│   │
│   ├── package.json
│   ├── vite.config.js
│   └── Dockerfile
│
├── docs/                        # Architecture, Rules, and API references
├── docker-compose.yml
└── README.md
```

---

## 🔑 Demo Accounts & Credentials

For academic and prototype demonstration, five pre-seeded role accounts are ready to use:

| Role | Demo Email | Password | Allowed Capabilities |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@fraudguard.demo` | `Admin@123` | Dashboard, Rules Config, User Management, Reports, Data Generator |
| **Fraud Analyst** | `analyst@fraudguard.demo` | `Analyst@123` | Review Queue, Claim Analysis, Triage Actions, Notes |
| **Investigator** | `investigator@fraudguard.demo` | `Investigator@123` | Case Dossiers, Evidence Logging, Interviews, Case Closure |
| **Claims Officer** | `claims@fraudguard.demo` | `Claims@123` | Claim Submission, Basic Risk View |
| **Auditor** | `auditor@fraudguard.demo` | `Auditor@123` | Audit Logs, Compliance Reports, Read-Only Dossiers |

*Note: The frontend top navigation includes a **Quick Role Switcher** dropdown for seamless live demonstrations.*

---

## ⚡ Getting Started (Windows PowerShell)

### Prerequisites
* **Python 3.11+** installed
* **Node.js 18+** & **npm** installed

### 1. Backend Setup

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt

# Generate reproducible synthetic dataset (e.g., 1,000 or up to 10,000 claims)
python scripts/generate_synthetic_data.py --claims 1000

# Start backend server
uvicorn app.main:app --reload --port 8000
```
Backend API will be accessible at: `http://localhost:8000`  
Interactive Swagger API documentation: `http://localhost:8000/docs`

### 2. Frontend Setup

In a new PowerShell terminal:

```powershell
cd frontend
npm install
npm run dev
```
Frontend Web Portal will launch at: `http://localhost:5173`

---

## 🧪 Synthetic Data Generator

The generator script strictly obeys safety bounds:
- **Maximum Limit**: 10,000 claims (requests $> 10,000$ are rejected with an error).
- **Fixed Seed**: Reproducible output using `--seed 42`.
- **Fictional Elements**: Synthetic names, fictional cities, simulated hospital entities.

```powershell
# Generate 1,000 claims
python scripts/generate_synthetic_data.py --claims 1000

# Generate maximum benchmark capacity (10,000 claims)
python scripts/generate_synthetic_data.py --claims 10000

# Rejection test: Exceeding 10,000 claims will exit with code 1
python scripts/generate_synthetic_data.py --claims 15000
```

---

## 🔍 The 10 Fraud Detection Rules

Implemented as independent Python modules in `backend/app/fraud_engine/rules/`:

1. **Duplicate Billing (`DUPLICATE_BILLING`)**: Detects identical or near-identical submissions for the same patient, provider, procedure, and service date (+30 pts).
2. **Upcoding (`UPCODING`)**: Identifies procedures billed at a higher intensity tier than justified by clinical diagnosis (+20 pts).
3. **Unbundling (`UNBUNDLING`)**: Detects fragmented billing of component procedures that belong to a single comprehensive surgical/diagnostic package (+20 pts).
4. **Phantom Billing (`PHANTOM_BILLING`)**: Flags claims where no clinical intake or encounter record exists in the clinical ledger (+25 pts).
5. **False Claim (`FALSE_CLAIM`)**: Identifies discrepancies with appointment registers, cancelled visits billed as complete, or provider mismatches (+25 pts).
6. **Inflated Billing (`INFLATED_BILLING`)**: Flags claims where the billed tariff exceeds standard benchmarks by $\ge 1.5\times$ (+20 pts).
7. **Incorrect Billing (`INCORRECT_BILLING`)**: Flags demographic contradictions (e.g., obstetric codes on male patients) or clinically incompatible diagnosis-procedure pairings (+15 pts).
8. **Unsupported Services (`UNSUPPORTED_SERVICES`)**: Flags missing mandatory discharge records, absent pre-authorizations, or missing invoices (+15 pts).
9. **Impossible Timing (`IMPOSSIBLE_TIMING`)**: Flags impossible concurrent schedules or travel between distant cities on the same date (+20 pts).
10. **Mutually Exclusive Services (`MUTUALLY_EXCLUSIVE`)**: Detects procedure combinations that are surgically or anatomically contradictory (e.g., open surgery and laparoscopic surgery on the same organ) (+20 pts).

---

## 🤖 Machine Learning Anomaly Detection

* **Algorithm**: Unsupervised **Isolation Forest** (`contamination=0.15`, `random_state=42`).
* **Feature Vector (12 Dimensions)**:
  1. `claim_amount`
  2. `expected_amount`
  3. `amount_ratio`
  4. `claim_frequency`
  5. `provider_claim_frequency`
  6. `patient_claim_frequency`
  7. `duplicate_count`
  8. `documentation_score`
  9. `authorization_score`
  10. `service_frequency`
  11. `time_gap`
  12. `provider_suspicious_rate`
* **Score Mapping**: Normalized to a $0\text{--}100$ scale, stored as `ml_anomaly_score`.

---

## ⚖️ Hybrid Risk Scoring & Explainability

* **Formula**:
  $$\text{Final Risk Score} = (\text{Rule Score} \times 0.70) + (\text{ML Anomaly Score} \times 0.30)$$
  Capped at 100 points maximum.
* **Risk Tiers**:
  * `LOW`: 0–30
  * `MEDIUM`: 31–60
  * `HIGH`: 61–80
  * `CRITICAL`: 81–100
* **Explainable AI ("Why Flagged?")**:  
  Every suspicious claim generates plain-language bullet points indicating specific rule infractions, financial inflation ratios, missing evidentiary items, and elevated provider risk rates.

---

## 🧪 Testing Suite

Run backend automated tests using pytest:

```powershell
cd backend
python -m pytest tests/test_rules_and_api.py -v
```

Or execute the built-in standalone test runner:

```powershell
python tests/run_tests.py
```

All 6 test suites cover password hashing, JWT generation, rule detectors, and scoring mathematics.

---

## 🐳 Docker Deployment

To launch FraudGuard AI using Docker:

```powershell
docker-compose up --build
```
- Frontend: `http://localhost:5173`
- Backend: `http://localhost:8000`

---

## 🛡️ Limitations & Ethical Considerations

1. **Synthetic Data Only**: All patient records, diagnoses, and financial charges are fictional simulations generated with fixed seeds.
2. **Prototype System**: This application is built for research, academic evaluation, and demonstration of explainable decision-support systems.
3. **Human-in-the-Loop Required**: High risk scores flag claims for human analyst review and investigation, never for automated final denials or legal fraud allegations.
