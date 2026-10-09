# FraudGuard AI REST API Specification

Interactive Swagger UI documentation is available at `http://localhost:8000/docs`.

## Authentication
* `POST /api/auth/login` - Authenticate demo credentials, returns JWT bearer token.
* `GET /api/auth/me` - Profile of currently logged-in user.
* `GET /api/auth/users` - List users (Admin role required).

## Dashboard Analytics
* `GET /api/dashboard/summary` - Dynamic calculated KPI cards (total, reviewed, suspicious, critical, risk exposure).
* `GET /api/dashboard/trends` - Claims volume and suspicious counts over time.
* `GET /api/dashboard/risk-distribution` - Risk classification breakdown (LOW, MEDIUM, HIGH, CRITICAL).
* `GET /api/dashboard/fraud-types` - Counts of triggered detections across 10 rules.
* `GET /api/dashboard/top-providers` - Highest risk healthcare facilities.
* `GET /api/dashboard/financial-exposure` - Total exposure aggregated per fraud rule.

## Claims Management
* `GET /api/claims` - Paginated claims with server-side filters (`page`, `page_size`, `risk_level`, `status`, `search`).
* `POST /api/claims` - Ingest synthetic claim and run instant 10-rule audit and ML scoring.
* `GET /api/claims/{claim_id}` - Full claim dossier with patient, provider, 10 fraud detections, and explainability.
* `PUT /api/claims/{claim_id}` - Update claim status or assigned analyst.

## Fraud Engine & Rules
* `POST /api/fraud/analyze/{claim_id}` - Re-run 10-rule engine and ML scoring for claim.
* `GET /api/fraud/{claim_id}` - Detailed detection telemetry.
* `GET /api/fraud/rules` - List all 10 fraud rules with weights and thresholds.
* `PUT /api/fraud/rules/{rule_code}` - Calibrate rule parameters (Admin only).

## Review Queue & Investigations
* `GET /api/review-queue` - Filtered queue of suspicious claims.
* `PUT /api/review-queue/{claim_id}` - Analyst triage actions (Approve, Reject, Request Info, Escalate, Assign).
* `GET /api/investigations` - SIU investigation cases list.
* `POST /api/investigations` - Open new case dossier.
* `GET /api/investigations/{id}` - Full dossier, notes, synthetic evidence exhibits, and timeline.
* `PUT /api/investigations/{id}` - Update status and investigator findings.
* `POST /api/investigations/{id}/notes` - Record observation, interview, audit, or decision notes.
* `POST /api/investigations/{id}/evidence` - Register synthetic evidence exhibit.

## Providers & Patients
* `GET /api/providers` - Healthcare provider directory with risk scores.
* `GET /api/providers/{provider_id}` - Provider profile and historical violation trends.
* `GET /api/patients` - Synthetic patient registry.
* `GET /api/patients/{patient_id}` - Patient timeline and historical claims.

## Reports & Compliance
* `GET /api/reports/fraud-summary` - Aggregate summary report.
* `GET /api/reports/provider-risk` - Provider risk exposure report.
* `GET /api/reports/financial-exposure` - Financial exposure by fraud type.
* `GET /api/reports/rule-performance` - Rule engine calibration and trigger frequency.
* `GET /api/reports/export/csv?report_type={claims|providers|investigations|rules}` - Export CSV data with synthetic disclaimer.

## AI Assistant & Knowledge Base
* `POST /api/assistant/query` - Grounded RAG query on claims, evidence checklist, or fraud rules.
