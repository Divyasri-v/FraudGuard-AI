import os
import sys
import argparse
import random
from datetime import datetime, timedelta, timezone

# Ensure UTF-8 output on Windows
try:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
except Exception:
    pass

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import numpy as np
import pandas as pd
from app.core.config import settings
from app.core.security import get_password_hash
from app.database.session import engine, SessionLocal, Base
from app.models.models import (
    User, Patient, Provider, Claim, ClaimService, ServiceEvent,
    SupportingDocument, FraudRule, FraudDetection, RiskScore,
    Investigation, InvestigationNote, Evidence, Notification, AuditLog,
    ModelPrediction, ProviderRiskProfile
)
from app.fraud_engine.engine import fraud_rule_engine, DEFAULT_RULES_SEED
from app.fraud_engine.scoring import risk_scoring_engine
from app.ml.anomaly_detector import anomaly_detector

# Synthetic Fictional Reference Lists
CITIES = ["Metro Apex", "Greenfield Central", "Harbor City", "Riverdale North", "Beacon Hills", "Solaria Heights", "Crestview Valley", "Lakeport District"]
GENDERS = ["Male", "Female"]
PLANS = ["Silver Care Plan", "Gold Comprehensive", "Platinum Elite", "Corporate Health Shield", "Senior Prime HMO"]
SPECIALTIES = ["General Medicine", "Cardiology", "Orthopedics", "General Surgery", "Neurology", "Pediatrics", "Gastroenterology", "Radiology", "Oncology"]
PROVIDER_TYPES = ["Tertiary Hospital", "Multispecialty Clinic", "Diagnostic Center", "Surgical Hospital", "Community Health Center"]

CLEAN_BENCHMARKS = [
    {"code": "PROC_CONSULT_LVL2", "name": "Standard Consultation", "type": "Consultation", "expected": 1500, "diag": "J18.9"},
    {"code": "PROC_DIAG_XRAY", "name": "Chest Radiograph Multi-view", "type": "Diagnostic Imaging", "expected": 2200, "diag": "J18.9"},
    {"code": "PROC_DIAG_MRI_CONTRAST", "name": "Dual-Phase Contrast MRI", "type": "Diagnostic Imaging", "expected": 12500, "diag": "M54.5"},
    {"code": "PROC_LAP_CHOLE", "name": "Laparoscopic Cholecystectomy Package", "type": "Surgery", "expected": 45000, "diag": "K80.2"},
    {"code": "PROC_KNEE_REPLACE", "name": "Total Knee Arthroplasty Package", "type": "Surgery", "expected": 85000, "diag": "M17.1"},
    {"code": "PROC_NORMAL_DELIVERY", "name": "Normal Vaginal Delivery Care", "type": "Inpatient", "expected": 25000, "diag": "O80"},
    {"code": "PROC_CARDIAC_CATH", "name": "Diagnostic Cardiac Catheterization", "type": "Inpatient", "expected": 65000, "diag": "I25.1"},
    {"code": "PROC_DIALYSIS", "name": "Hemodialysis Session", "type": "Outpatient", "expected": 4800, "diag": "N18.6"},
    {"code": "PROC_ENDOSCOPY", "name": "Diagnostic Upper GI Endoscopy", "type": "Outpatient", "expected": 8500, "diag": "K29.7"},
    {"code": "PROC_PHYS_THERAPY", "name": "Comprehensive Physical Therapy", "type": "Outpatient", "expected": 1800, "diag": "M54.5"},
]

PROCEDURES_BENCHMARKS = CLEAN_BENCHMARKS + [
    {"code": "PROC_CONSULT_LVL5", "name": "Complex Multi-organ Consultation", "type": "Consultation", "expected": 4500, "diag": "I10"},
    {"code": "PROC_LAP_ACCESS", "name": "Laparoscopic Port Placement", "type": "Surgery", "expected": 12000, "diag": "K80.2"},
    {"code": "PROC_GALL_EXC", "name": "Gallbladder Resection", "type": "Surgery", "expected": 28000, "diag": "K80.2"},
    {"code": "PROC_OPEN_APPENDECTOMY", "name": "Open Surgical Appendectomy", "type": "Surgery", "expected": 38000, "diag": "K35.8"},
    {"code": "PROC_LAP_APPENDECTOMY", "name": "Laparoscopic Appendectomy", "type": "Surgery", "expected": 42000, "diag": "K35.8"},
    {"code": "PROC_CESAREAN", "name": "Cesarean Section Surgical Delivery", "type": "Surgery", "expected": 52000, "diag": "O82"},
    {"code": "PROC_RIGHT_KNEE_TOTAL", "name": "Right Knee Total Joint Arthroplasty", "type": "Surgery", "expected": 90000, "diag": "M17.1"},
    {"code": "PROC_RIGHT_KNEE_UNI", "name": "Right Knee Unicompartmental Arthroplasty", "type": "Surgery", "expected": 55000, "diag": "M17.1"},
]

DEMO_USERS = [
    {"email": "analyst@fraudguard.demo", "name": "Marcus Vance (Fraud Analyst)", "role": "Fraud Analyst", "pwd": "Analyst@123"},
    {"email": "investigator@fraudguard.demo", "name": "Elena Rostova (Investigator)", "role": "Investigator", "pwd": "Investigator@123"}
]

def seed_users(db):
    print("-> Seeding synthetic demo user accounts...")
    allowed_emails = [u["email"] for u in DEMO_USERS]
    db.query(User).filter(~User.email.in_(allowed_emails)).delete(synchronize_session=False)
    for u in DEMO_USERS:
        existing = db.query(User).filter(User.email == u["email"]).first()
        if not existing:
            user = User(
                email=u["email"],
                full_name=u["name"],
                role=u["role"],
                hashed_password=get_password_hash(u["pwd"]),
                is_active=True
            )
            db.add(user)
        else:
            existing.role = u["role"]
            existing.full_name = u["name"]
    db.commit()

def generate_synthetic_dataset(num_claims: int = 10000, seed: int = 42):
    if num_claims > 10000:
        raise ValueError(f"Safety constraint violation: Maximum allowed claims is 10,000. Requested: {num_claims}")

    print("\n=======================================================")
    print("FraudGuard AI - Synthetic Data Generator")
    print("Strict Mode: 100% Synthetic / Fictional Healthcare Data")
    print(f"Target Claims: {num_claims:,} (Max: 10,000) | Random Seed: {seed}")
    print("=======================================================\n")

    random.seed(seed)
    np.random.seed(seed)

    # Recreate tables cleanly
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # Clear existing dynamic demo data for clean state
        print("-> Cleaning previous synthetic records...")
        db.query(AuditLog).delete()
        db.query(Notification).delete()
        db.query(Evidence).delete()
        db.query(InvestigationNote).delete()
        db.query(Investigation).delete()
        db.query(RiskScore).delete()
        db.query(FraudDetection).delete()
        db.query(ModelPrediction).delete()
        db.query(SupportingDocument).delete()
        db.query(ClaimService).delete()
        db.query(ServiceEvent).delete()
        db.query(Claim).delete()
        db.query(ProviderRiskProfile).delete()
        db.query(Provider).delete()
        db.query(Patient).delete()
        db.commit()

        # Seed Users and Fraud Rules
        seed_users(db)
        fraud_rule_engine.ensure_default_rules(db)

        # 1. Generate Synthetic Patients (scaled to ~1,500 - 3,000)
        num_patients = min(2500, max(300, int(num_claims * 0.3)))
        print(f"-> Generating {num_patients:,} synthetic patient records...")
        patients = []
        for i in range(1, num_patients + 1):
            pid = f"PAT{i:05d}"
            name = f"Synthetic Patient {i:04d}"
            age = random.randint(18, 88)
            gender = "Male" if i % 2 == 0 else "Female"
            city = random.choice(CITIES)
            plan = random.choice(PLANS)
            reg_date = (datetime(2025, 1, 1) + timedelta(days=random.randint(0, 500))).strftime("%Y-%m-%d")
            p = Patient(
                patient_id=pid,
                synthetic_name=name,
                age=age,
                gender=gender,
                city=city,
                insurance_plan=plan,
                registration_date=reg_date
            )
            patients.append(p)
        db.bulk_save_objects(patients)
        db.commit()

        # 2. Generate Synthetic Healthcare Providers (~180)
        num_providers = min(180, max(40, int(num_claims * 0.02)))
        print(f"-> Generating {num_providers:,} synthetic healthcare providers...")
        providers = []
        provider_ids = []
        for i in range(1, num_providers + 1):
            pr_id = f"HSP{i:04d}"
            provider_ids.append(pr_id)
            p_type = random.choice(PROVIDER_TYPES)
            city = CITIES[(i - 1) % len(CITIES)]
            spec = random.choice(SPECIALTIES)
            if i <= int(num_providers * 0.10):
                susp_rate = round(random.uniform(0.30, 0.45), 3)
                net_status = "OUT_OF_NETWORK"
                risk_sc = round(susp_rate * 100 + random.uniform(20, 35), 1)
            elif i <= int(num_providers * 0.25):
                susp_rate = round(random.uniform(0.10, 0.18), 3)
                net_status = "IN_NETWORK" if random.random() > 0.4 else "OUT_OF_NETWORK"
                risk_sc = round(susp_rate * 100 + random.uniform(10, 20), 1)
            else:
                susp_rate = round(random.uniform(0.01, 0.04), 3)
                net_status = "IN_NETWORK"
                risk_sc = round(susp_rate * 100 + random.uniform(2, 6), 1)

            prov = Provider(
                provider_id=pr_id,
                provider_name=f"Synthetic {spec} {p_type} #{i:03d}",
                provider_type=p_type,
                city=city,
                specialization=spec,
                network_status=net_status,
                historical_claim_count=random.randint(50, 400),
                historical_suspicious_rate=susp_rate,
                provider_risk_score=min(risk_sc, 95.0)
            )
            providers.append(prov)
        db.bulk_save_objects(providers)
        db.commit()

        clean_prov_ids = [p.provider_id for p in providers[int(num_providers * 0.25):]]
        mod_prov_ids = [p.provider_id for p in providers[int(num_providers * 0.10):int(num_providers * 0.25)]]
        high_risk_prov_ids = [p.provider_id for p in providers[:int(num_providers * 0.10)]]

        # 3. Generate Claims partitioned into 4 calibrated risk cohorts:
        # LOW: ~50%, MEDIUM: ~25%, HIGH: ~18%, CRITICAL: ~7%
        target_low = int(num_claims * 0.50)
        target_med = int(num_claims * 0.25)
        target_high = int(num_claims * 0.18)
        target_crit = num_claims - (target_low + target_med + target_high)

        print(f"-> Generating {num_claims:,} synthetic claims structured into 4 authentic risk cohorts...")
        print(f"   Target distribution: LOW={target_low:,}, MEDIUM={target_med:,}, HIGH={target_high:,}, CRITICAL={target_crit:,}")

        start_date = datetime(2026, 1, 1)
        claims_meta = []
        patient_used_dates = {p.patient_id: set() for p in patients}

        # ----------------------------------------------------
        # Cohort 1: LOW RISK (~5,000 Clean Legitimate Claims)
        # ----------------------------------------------------
        for i in range(1, target_low + 1):
            cid = f"CLM{i:05d}"
            patient = patients[(i - 1) % len(patients)]
            provider_id = clean_prov_ids[(i - 1) % len(clean_prov_ids)]

            serv_delta = random.randint(0, 270)
            while serv_delta in patient_used_dates[patient.patient_id]:
                serv_delta = (serv_delta + 7) % 270
            patient_used_dates[patient.patient_id].add(serv_delta)

            serv_date_obj = start_date + timedelta(days=serv_delta)
            serv_date_str = serv_date_obj.strftime("%Y-%m-%d")
            sub_date_str = (serv_date_obj + timedelta(days=random.randint(1, 10))).strftime("%Y-%m-%d")

            proc = CLEAN_BENCHMARKS[i % len(CLEAN_BENCHMARKS)]
            if proc["code"] == "PROC_NORMAL_DELIVERY" and patient.gender == "Male":
                proc = CLEAN_BENCHMARKS[0]

            expected_amt = float(proc["expected"])
            claimed_amt = round(expected_amt * random.uniform(0.96, 1.05), 2)

            claims_meta.append({
                "claim_id": cid,
                "cohort": "LOW",
                "patient_id": patient.patient_id,
                "provider_id": provider_id,
                "service_date": serv_date_str,
                "submission_date": sub_date_str,
                "diagnosis_code": proc["diag"],
                "procedure_code": proc["code"],
                "service_type": proc["type"],
                "claimed_amount": claimed_amt,
                "expected_amount": expected_amt,
                "quantity": 1,
                "supporting_document_status": "COMPLETE",
                "authorization_status": "PRE_APPROVED",
                "is_phantom": False,
                "is_cancelled": False,
                "is_duplicate_flag": False
            })

        # ----------------------------------------------------
        # Cohort 2: MEDIUM RISK (~2,500 Moderate / Single-Anomaly Claims)
        # ----------------------------------------------------
        sub_med_inf = int(target_med * 0.28)
        sub_med_up = int(target_med * 0.18)
        sub_med_dup = int(target_med * 0.18)
        sub_med_unb = int(target_med * 0.14)
        sub_med_uns = int(target_med * 0.12)
        sub_med_inc = target_med - (sub_med_inf + sub_med_up + sub_med_dup + sub_med_unb + sub_med_uns)

        med_subtypes = (
            ["INFLATED"] * sub_med_inf +
            ["UPCODING"] * sub_med_up +
            ["DUPLICATE"] * sub_med_dup +
            ["UNBUNDLING"] * sub_med_unb +
            ["UNSUPPORTED"] * sub_med_uns +
            ["INCORRECT"] * sub_med_inc
        )
        random.shuffle(med_subtypes)

        med_start_id = target_low + 1
        for idx, st in enumerate(med_subtypes):
            i = med_start_id + idx
            cid = f"CLM{i:05d}"
            patient = random.choice(patients)
            provider_id = random.choice(mod_prov_ids if random.random() > 0.4 else clean_prov_ids)
            serv_delta = random.randint(0, 270)
            serv_date_obj = start_date + timedelta(days=serv_delta)
            serv_date_str = serv_date_obj.strftime("%Y-%m-%d")
            sub_date_str = (serv_date_obj + timedelta(days=random.randint(1, 10))).strftime("%Y-%m-%d")

            proc = random.choice(CLEAN_BENCHMARKS)
            expected_amt = float(proc["expected"])
            claimed_amt = expected_amt
            doc_status = "COMPLETE"
            auth_status = "PRE_APPROVED"
            diag_code = proc["diag"]
            proc_code = proc["code"]
            serv_type = proc["type"]
            is_dup = False

            if st == "INFLATED":
                claimed_amt = round(expected_amt * random.uniform(1.60, 1.85), 2)
            elif st == "UPCODING":
                proc_code = "PROC_CONSULT_LVL5"
                diag_code = "J18.9"
                expected_amt = 2200.0
                claimed_amt = 2800.0
                serv_type = "Consultation"
            elif st == "DUPLICATE":
                is_dup = True
                claimed_amt = expected_amt
            elif st == "UNBUNDLING":
                proc_code = "PROC_LAP_ACCESS"
                expected_amt = 12000.0
                claimed_amt = 12000.0
                serv_type = "Surgery"
                diag_code = "K80.2"
            elif st == "UNSUPPORTED":
                doc_status = "MISSING"
                auth_status = "MISSING"
                claimed_amt = round(expected_amt * 1.05, 2)
            elif st == "INCORRECT":
                if patient.gender == "Male":
                    proc_code = "PROC_CESAREAN"
                    expected_amt = 52000.0
                    claimed_amt = 52000.0
                    serv_type = "Surgery"
                    diag_code = "O82"
                else:
                    diag_code = "J18.9"
                    proc_code = "PROC_KNEE_REPLACE"
                    expected_amt = 85000.0
                    claimed_amt = 85000.0
                    serv_type = "Surgery"

            claims_meta.append({
                "claim_id": cid,
                "cohort": "MEDIUM",
                "subtype": st,
                "patient_id": patient.patient_id,
                "provider_id": provider_id,
                "service_date": serv_date_str,
                "submission_date": sub_date_str,
                "diagnosis_code": diag_code,
                "procedure_code": proc_code,
                "service_type": serv_type,
                "claimed_amount": claimed_amt,
                "expected_amount": expected_amt,
                "quantity": 1,
                "supporting_document_status": doc_status,
                "authorization_status": auth_status,
                "is_phantom": False,
                "is_cancelled": False,
                "is_duplicate_flag": is_dup
            })

        # Pair medium duplicates
        med_dups = [m for m in claims_meta if m.get("cohort") == "MEDIUM" and m.get("subtype") == "DUPLICATE"]
        for d_meta in med_dups:
            ref = random.choice(claims_meta[:target_low])
            d_meta["patient_id"] = ref["patient_id"]
            d_meta["provider_id"] = ref["provider_id"]
            d_meta["service_date"] = ref["service_date"]
            d_meta["procedure_code"] = ref["procedure_code"]
            d_meta["expected_amount"] = ref["expected_amount"]
            d_meta["claimed_amount"] = ref["claimed_amount"]

        # Pair medium unbundling
        med_unbundles = [m for m in claims_meta if m.get("cohort") == "MEDIUM" and m.get("subtype") == "UNBUNDLING"]
        for idx, u_meta in enumerate(med_unbundles):
            if idx % 2 == 1:
                prev = med_unbundles[idx - 1]
                u_meta["patient_id"] = prev["patient_id"]
                u_meta["service_date"] = prev["service_date"]
                u_meta["procedure_code"] = "PROC_GALL_EXC"
                u_meta["expected_amount"] = 28000.0
                u_meta["claimed_amount"] = 28000.0

        # ----------------------------------------------------
        # Cohort 3: HIGH RISK (~1,800 Stacked Dual-Anomaly Claims)
        # ----------------------------------------------------
        sub_high_inf_uns = int(target_high * 0.25)
        sub_high_dup_inf = int(target_high * 0.22)
        sub_high_up_uns = int(target_high * 0.20)
        sub_high_mut = int(target_high * 0.17)
        sub_high_tim = target_high - (sub_high_inf_uns + sub_high_dup_inf + sub_high_up_uns + sub_high_mut)

        high_subtypes = (
            ["INF_UNSUP"] * sub_high_inf_uns +
            ["DUP_INF"] * sub_high_dup_inf +
            ["UPCODE_UNSUP"] * sub_high_up_uns +
            ["MUTUAL_INF"] * sub_high_mut +
            ["TIMING_INF"] * sub_high_tim
        )
        random.shuffle(high_subtypes)

        high_start_id = target_low + target_med + 1
        for idx, st in enumerate(high_subtypes):
            i = high_start_id + idx
            cid = f"CLM{i:05d}"
            patient = random.choice(patients)
            provider_id = random.choice(mod_prov_ids)
            serv_delta = random.randint(0, 270)
            serv_date_obj = start_date + timedelta(days=serv_delta)
            serv_date_str = serv_date_obj.strftime("%Y-%m-%d")
            sub_date_str = (serv_date_obj + timedelta(days=random.randint(1, 10))).strftime("%Y-%m-%d")

            proc = random.choice(CLEAN_BENCHMARKS)
            expected_amt = float(proc["expected"])
            doc_status = "COMPLETE"
            auth_status = "PRE_APPROVED"
            diag_code = proc["diag"]
            proc_code = proc["code"]
            serv_type = proc["type"]
            is_dup = False

            if st == "INF_UNSUP":
                claimed_amt = round(expected_amt * random.uniform(1.65, 1.95), 2)
                doc_status = "MISSING"
                auth_status = "MISSING"
            elif st == "DUP_INF":
                is_dup = True
                claimed_amt = round(expected_amt * random.uniform(1.65, 1.95), 2)
            elif st == "UPCODE_UNSUP":
                proc_code = "PROC_CONSULT_LVL5"
                diag_code = "J18.9"
                expected_amt = 2200.0
                claimed_amt = 2800.0
                serv_type = "Consultation"
                doc_status = "MISSING"
                auth_status = "MISSING"
            elif st == "MUTUAL_INF":
                proc_code = "PROC_OPEN_APPENDECTOMY"
                diag_code = "K35.8"
                expected_amt = 38000.0
                claimed_amt = round(expected_amt * random.uniform(1.60, 1.90), 2)
                serv_type = "Surgery"
            elif st == "TIMING_INF":
                claimed_amt = round(expected_amt * random.uniform(1.60, 1.90), 2)

            claims_meta.append({
                "claim_id": cid,
                "cohort": "HIGH",
                "subtype": st,
                "patient_id": patient.patient_id,
                "provider_id": provider_id,
                "service_date": serv_date_str,
                "submission_date": sub_date_str,
                "diagnosis_code": diag_code,
                "procedure_code": proc_code,
                "service_type": serv_type,
                "claimed_amount": claimed_amt,
                "expected_amount": expected_amt,
                "quantity": 1,
                "supporting_document_status": doc_status,
                "authorization_status": auth_status,
                "is_phantom": False,
                "is_cancelled": False,
                "is_duplicate_flag": is_dup
            })

        # Pair high duplicates
        high_dups = [m for m in claims_meta if m.get("cohort") == "HIGH" and m.get("subtype") == "DUP_INF"]
        for d_meta in high_dups:
            ref = random.choice(claims_meta[:target_low])
            d_meta["patient_id"] = ref["patient_id"]
            d_meta["provider_id"] = ref["provider_id"]
            d_meta["service_date"] = ref["service_date"]
            d_meta["procedure_code"] = ref["procedure_code"]
            d_meta["expected_amount"] = ref["expected_amount"]

        # Pair high mutually exclusive
        high_mutuals = [m for m in claims_meta if m.get("cohort") == "HIGH" and m.get("subtype") == "MUTUAL_INF"]
        for idx, m_meta in enumerate(high_mutuals):
            if idx % 2 == 1:
                prev = high_mutuals[idx - 1]
                m_meta["patient_id"] = prev["patient_id"]
                m_meta["service_date"] = prev["service_date"]
                m_meta["procedure_code"] = "PROC_LAP_APPENDECTOMY"
                m_meta["expected_amount"] = 42000.0

        # Pair high timing
        high_timings = [m for m in claims_meta if m.get("cohort") == "HIGH" and m.get("subtype") == "TIMING_INF"]
        for idx, t_meta in enumerate(high_timings):
            if idx % 2 == 1:
                prev = high_timings[idx - 1]
                t_meta["patient_id"] = prev["patient_id"]
                t_meta["service_date"] = prev["service_date"]
                prev_prov = next(p for p in providers if p.provider_id == prev["provider_id"])
                diff_prov = next(p for p in providers if p.city != prev_prov.city)
                t_meta["provider_id"] = diff_prov.provider_id

        # ----------------------------------------------------
        # Cohort 4: CRITICAL RISK (~700 Severe Multi-Anomaly Fraud Rings)
        # ----------------------------------------------------
        sub_crit_pha = int(target_crit * 0.43)
        sub_crit_fal = int(target_crit * 0.29)
        sub_crit_syn = target_crit - (sub_crit_pha + sub_crit_fal)

        crit_subtypes = (
            ["PHANTOM_RING"] * sub_crit_pha +
            ["FALSE_CANCELLED"] * sub_crit_fal +
            ["DUP_UPCODE_RING"] * sub_crit_syn
        )
        random.shuffle(crit_subtypes)

        crit_start_id = target_low + target_med + target_high + 1
        for idx, st in enumerate(crit_subtypes):
            i = crit_start_id + idx
            cid = f"CLM{i:05d}"
            patient = random.choice(patients)
            provider_id = random.choice(high_risk_prov_ids)
            serv_delta = random.randint(0, 270)
            serv_date_obj = start_date + timedelta(days=serv_delta)
            serv_date_str = serv_date_obj.strftime("%Y-%m-%d")
            sub_date_str = (serv_date_obj + timedelta(days=random.randint(1, 10))).strftime("%Y-%m-%d")

            proc = random.choice(CLEAN_BENCHMARKS)
            expected_amt = float(proc["expected"])
            diag_code = proc["diag"]
            proc_code = proc["code"]
            serv_type = proc["type"]
            doc_status = "MISSING"
            auth_status = "MISSING"
            is_phantom = False
            is_cancelled = False
            is_dup = False

            if st == "PHANTOM_RING":
                is_phantom = True
                claimed_amt = round(expected_amt * random.uniform(2.8, 3.8), 2)
            elif st == "FALSE_CANCELLED":
                is_cancelled = True
                claimed_amt = round(expected_amt * random.uniform(2.6, 3.5), 2)
            elif st == "DUP_UPCODE_RING":
                is_dup = True
                proc_code = "PROC_CONSULT_LVL5"
                diag_code = "J18.9"
                expected_amt = 1500.0
                claimed_amt = round(expected_amt * random.uniform(2.8, 3.8), 2)
                serv_type = "Consultation"

            claims_meta.append({
                "claim_id": cid,
                "cohort": "CRITICAL",
                "subtype": st,
                "patient_id": patient.patient_id,
                "provider_id": provider_id,
                "service_date": serv_date_str,
                "submission_date": sub_date_str,
                "diagnosis_code": diag_code,
                "procedure_code": proc_code,
                "service_type": serv_type,
                "claimed_amount": claimed_amt,
                "expected_amount": expected_amt,
                "quantity": 1,
                "supporting_document_status": doc_status,
                "authorization_status": auth_status,
                "is_phantom": is_phantom,
                "is_cancelled": is_cancelled,
                "is_duplicate_flag": is_dup
            })

        # Pair critical duplicate syndicates
        crit_dups = [m for m in claims_meta if m.get("cohort") == "CRITICAL" and m.get("subtype") == "DUP_UPCODE_RING"]
        for d_meta in crit_dups:
            ref = random.choice(claims_meta[:target_low])
            d_meta["patient_id"] = ref["patient_id"]
            d_meta["provider_id"] = ref["provider_id"]
            d_meta["service_date"] = ref["service_date"]

        # Build database entities
        claims_list = []
        service_events = []
        supporting_docs = []
        claim_services = []

        evt_counter = 1
        for meta in claims_meta:
            if not meta["is_phantom"]:
                status = "CANCELLED" if meta.get("is_cancelled") else "COMPLETED"
                evt = ServiceEvent(
                    event_id=f"EVT{evt_counter:06d}",
                    patient_id=meta["patient_id"],
                    provider_id=meta["provider_id"],
                    event_date=meta["service_date"],
                    event_time=f"{random.randint(8, 17):02d}:{random.choice(['00', '15', '30', '45'])}",
                    service_code=meta["procedure_code"],
                    service_name=f"Synthetic Clinical Service {meta['procedure_code']}",
                    location="Main Campus Clinic",
                    status=status
                )
                service_events.append(evt)
                evt_counter += 1

            doc = SupportingDocument(
                claim_id=meta["claim_id"],
                document_type="SYNTHETIC_INVOICE",
                file_name=f"synthetic_invoice_{meta['claim_id']}.pdf",
                file_url=f"/demo_docs/{meta['claim_id']}_invoice.pdf",
                is_verified=(meta["supporting_document_status"] != "MISSING"),
                notes="Generated for synthetic educational demonstration."
            )
            supporting_docs.append(doc)

            item = ClaimService(
                claim_id=meta["claim_id"],
                service_code=meta["procedure_code"],
                service_name=f"Synthetic {meta['service_type']} Service",
                quantity=meta["quantity"],
                unit_price=meta["claimed_amount"],
                total_amount=meta["claimed_amount"],
                category=meta["service_type"]
            )
            claim_services.append(item)

            c = Claim(
                claim_id=meta["claim_id"],
                patient_id=meta["patient_id"],
                provider_id=meta["provider_id"],
                service_date=meta["service_date"],
                submission_date=meta["submission_date"],
                diagnosis_code=meta["diagnosis_code"],
                procedure_code=meta["procedure_code"],
                service_type=meta["service_type"],
                claimed_amount=meta["claimed_amount"],
                expected_amount=meta["expected_amount"],
                quantity=meta["quantity"],
                claim_status="SUBMITTED",
                supporting_document_status=meta["supporting_document_status"],
                authorization_status=meta["authorization_status"],
                risk_score=0.0,
                risk_level="LOW",
                ml_anomaly_score=0.0,
                hybrid_score=0.0
            )
            claims_list.append(c)

        print(f"-> Bulk inserting {len(claims_list):,} base claims and encounter ledgers...")
        db.bulk_save_objects(service_events)
        db.bulk_save_objects(claims_list)
        db.bulk_save_objects(supporting_docs)
        db.bulk_save_objects(claim_services)
        db.commit()

        # 4. Train Isolation Forest ML model on synthetic features
        print("-> Training Isolation Forest anomaly detection model on synthetic dataset...")
        prov_map = {p.provider_id: p for p in providers}
        ml_records = []
        for idx, c in enumerate(claims_list):
            meta = claims_meta[idx]
            dup_val = 1 if meta.get("is_duplicate_flag") else 0
            feats = anomaly_detector.extract_features_single(
                claim=c,
                provider=prov_map.get(c.provider_id),
                duplicate_count=dup_val
            )
            ml_records.append(feats)

        df_feats = pd.DataFrame(ml_records, columns=anomaly_detector.feature_names)
        anomaly_detector.train_on_dataframe(df_feats)

        # 5. Execute 10-rule Fraud Engine & ML Anomaly Scoring across dataset
        print("-> Executing 10-Rule Fraud Engine & ML Anomaly Scoring across dataset...")
        all_detections = []
        all_predictions = []
        investigations = []
        investigation_notes = []
        notifications = []

        inv_count = 1
        crit_claims_count = 0
        high_claims_count = 0
        med_claims_count = 0
        low_claims_count = 0

        cached_rules = {r.rule_code: r for r in db.query(FraudRule).all()}

        for idx, c in enumerate(claims_list):
            rule_results = fraud_rule_engine.run_all_rules(c, db, rule_configs=cached_rules)
            rule_score = risk_scoring_engine.calculate_rule_score(rule_results)

            feats = ml_records[idx]
            ml_score, is_anomaly = anomaly_detector.predict_anomaly_score(feats)
            hybrid_score = risk_scoring_engine.calculate_hybrid_score(rule_score, ml_score)
            risk_lvl = risk_scoring_engine.get_risk_level(hybrid_score)

            c.risk_score = round(rule_score, 1)
            c.ml_anomaly_score = round(ml_score, 1)
            c.hybrid_score = round(hybrid_score, 1)
            c.risk_level = risk_lvl

            prov = prov_map.get(c.provider_id)
            c.why_flagged = risk_scoring_engine.generate_explanations(
                rule_results, ml_score, prov.historical_suspicious_rate if prov else 0.0
            )

            if risk_lvl == "LOW":
                c.claim_status = "APPROVED" if random.random() > 0.3 else "SUBMITTED"
                low_claims_count += 1
            elif risk_lvl == "MEDIUM":
                c.claim_status = "UNDER_REVIEW"
                med_claims_count += 1
            elif risk_lvl == "HIGH":
                c.claim_status = "UNDER_REVIEW"
                high_claims_count += 1
            elif risk_lvl == "CRITICAL":
                c.claim_status = "UNDER_REVIEW"
                crit_claims_count += 1

            for r in rule_results:
                if r.triggered:
                    det = FraudDetection(
                        claim_id=c.claim_id,
                        rule_code=r.rule_code,
                        rule_name=r.rule_name,
                        triggered=True,
                        risk_contribution=r.risk_contribution,
                        severity=r.severity,
                        reason=r.reason,
                        evidence=str(r.evidence) if r.evidence else None
                    )
                    all_detections.append(det)

            mp = ModelPrediction(
                claim_id=c.claim_id,
                model_name="IsolationForest",
                anomaly_score=ml_score,
                is_anomaly=is_anomaly
            )
            all_predictions.append(mp)

            if (risk_lvl in ["HIGH", "CRITICAL"] or hybrid_score >= 55.0) and inv_count <= 220:
                inv_status = random.choice(["NEW", "UNDER_REVIEW", "ESCALATED", "MORE_INFORMATION_REQUIRED"])
                assigned = "Marcus Vance (analyst@fraudguard.demo)"
                inv_agent = "Elena Rostova (investigator@fraudguard.demo)"

                inv = Investigation(
                    claim_id=c.claim_id,
                    case_number=f"INV-2026-{inv_count:04d}",
                    status=inv_status,
                    priority="CRITICAL" if hybrid_score >= 81.0 else "HIGH",
                    assigned_to=assigned,
                    investigator=inv_agent,
                    summary=f"Automated risk triage flagged claim {c.claim_id} with hybrid score {hybrid_score:.1f}/100.",
                    findings=f"Identified multiple anomalies: {c.why_flagged[:200]}...",
                    recommendation="Review supporting discharge documents and request provider verification."
                )
                investigations.append(inv)

                note = InvestigationNote(
                    investigation_id=inv_count,
                    author_email="analyst@fraudguard.demo",
                    author_role="Fraud Analyst",
                    note_type="OBSERVATION",
                    content=f"Case opened based on elevated hybrid risk score ({hybrid_score:.1f}). Flagged rules recorded."
                )
                investigation_notes.append(note)

                if hybrid_score >= 81.0 and len(notifications) < 50:
                    notif = Notification(
                        user_role="Fraud Analyst",
                        title=f"[CRITICAL ALERT] Claim Flagged: {c.claim_id}",
                        message=f"Claim {c.claim_id} flagged with risk score {hybrid_score:.1f}. Detected rules: {', '.join([r.rule_code for r in rule_results if r.triggered])}",
                        notification_type="CRITICAL_ALERT",
                        severity="CRITICAL",
                        link_url=f"/claims/{c.claim_id}"
                    )
                    notifications.append(notif)

                inv_count += 1

        # PERSIST evaluated claim risk scores, risk levels, statuses, and explanations to SQLite
        print("-> Persisting evaluated claim risk scores and levels to database...")
        update_records = []
        for c in claims_list:
            update_records.append({
                "claim_id": c.claim_id,
                "risk_score": c.risk_score,
                "risk_level": c.risk_level,
                "ml_anomaly_score": c.ml_anomaly_score,
                "hybrid_score": c.hybrid_score,
                "claim_status": c.claim_status,
                "why_flagged": c.why_flagged
            })
        db.bulk_update_mappings(Claim, update_records)
        db.commit()

        print("-> Saving detections, predictions, investigations, and notifications...")
        db.bulk_save_objects(all_detections)
        db.bulk_save_objects(all_predictions)
        db.bulk_save_objects(investigations)
        db.commit()

        db.bulk_save_objects(investigation_notes)
        db.bulk_save_objects(notifications)

        demo_audits = [
            AuditLog(
                user_id="system@fraudguard.demo",
                action="SYNTHETIC_DATASET_INITIALIZED",
                entity_type="SYSTEM",
                entity_id=f"CLAIMS_COUNT_{num_claims}",
                details=f"Generated {num_claims} reproducible synthetic claims with random seed {seed}."
            ),
            AuditLog(
                user_id="admin@fraudguard.demo",
                action="RULES_INITIALIZED",
                entity_type="RULE",
                entity_id="ALL_10_RULES",
                details="Loaded 10 standard synthetic healthcare FWA fraud rules."
            ),
            AuditLog(
                user_id="analyst@fraudguard.demo",
                action="ML_MODEL_TRAINED",
                entity_type="MODEL",
                entity_id="ISOLATION_FOREST_V1",
                details="Trained Isolation Forest model on 12 synthetic claim multidimensional features."
            )
        ]
        db.bulk_save_objects(demo_audits)

        # Compute provider risk profiles
        print("-> Aggregating provider risk profiles...")
        for p in providers:
            prov_claims = [c for c in claims_list if c.provider_id == p.provider_id]
            tot = len(prov_claims)
            susp = len([c for c in prov_claims if c.hybrid_score >= 31.0])
            avg_risk = sum(c.hybrid_score for c in prov_claims) / max(tot, 1)

            profile = ProviderRiskProfile(
                provider_id=p.provider_id,
                risk_score=round(avg_risk, 1),
                suspicious_claims_count=susp,
                total_claims_count=tot,
                fraud_breakdown=f"Total: {tot}, Suspicious: {susp}"
            )
            db.add(profile)

        db.commit()
        print("\n=======================================================")
        print("[SUCCESS] SYNTHETIC GENERATION COMPLETE!")
        print("Summary:")
        print(f"   * Total Claims Generated:    {len(claims_list):,}")
        print(f"   * Risk Level Breakdown:")
        print(f"       - LOW:                   {low_claims_count:,}")
        print(f"       - MEDIUM:                {med_claims_count:,}")
        print(f"       - HIGH:                  {high_claims_count:,}")
        print(f"       - CRITICAL:              {crit_claims_count:,}")
        print(f"   * Suspicious Claims Flagged: {med_claims_count + high_claims_count + crit_claims_count:,}")
        print(f"   * Critical Claims:           {crit_claims_count:,}")
        print(f"   * Active Investigations:     {len(investigations):,}")
        print(f"   * Patients:                  {len(patients):,}")
        print(f"   * Providers:                 {len(providers):,}")
        print("   * ML Isolation Forest:       Trained & Persisted")
        print(f"[DISCLAIMER] {settings.DATA_DISCLAIMER}")
        print("=======================================================\n")

    finally:
        db.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="FraudGuard AI - Synthetic Healthcare Claim Generator")
    parser.add_argument("--claims", type=int, default=1000, help="Number of claims to generate (max 10000)")
    parser.add_argument("--seed", type=int, default=42, help="Random seed for reproducibility")
    args = parser.parse_args()

    if args.claims > 10000:
        print(f"\n[ERROR] Maximum allowed claim count is 10,000. You specified {args.claims}.")
        print("To protect memory and system safety, claims above 10,000 are strictly prohibited.\n")
        sys.exit(1)

    generate_synthetic_dataset(num_claims=args.claims, seed=args.seed)
