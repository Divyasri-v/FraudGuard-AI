from datetime import datetime, timezone
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, Text, ForeignKey, Index
)
from sqlalchemy.orm import relationship
from app.database.session import Base

def utc_now():
    return datetime.now(timezone.utc)

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False, default="Fraud Analyst")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=utc_now)

class Patient(Base):
    __tablename__ = "patients"

    patient_id = Column(String(32), primary_key=True, index=True)
    synthetic_name = Column(String(255), nullable=False)
    age = Column(Integer, nullable=False)
    gender = Column(String(20), nullable=False)
    city = Column(String(100), nullable=False)
    insurance_plan = Column(String(100), nullable=False)
    registration_date = Column(String(30), nullable=False)
    created_at = Column(DateTime, default=utc_now)

    claims = relationship("Claim", back_populates="patient")

class Provider(Base):
    __tablename__ = "providers"

    provider_id = Column(String(32), primary_key=True, index=True)
    provider_name = Column(String(255), nullable=False)
    provider_type = Column(String(100), nullable=False)
    city = Column(String(100), nullable=False)
    specialization = Column(String(100), nullable=False)
    network_status = Column(String(50), default="IN_NETWORK")
    historical_claim_count = Column(Integer, default=0)
    historical_suspicious_rate = Column(Float, default=0.0)
    provider_risk_score = Column(Float, default=15.0)
    created_at = Column(DateTime, default=utc_now)

    claims = relationship("Claim", back_populates="provider")
    risk_profile = relationship("ProviderRiskProfile", back_populates="provider", uselist=False)

class Claim(Base):
    __tablename__ = "claims"

    claim_id = Column(String(32), primary_key=True, index=True)
    patient_id = Column(String(32), ForeignKey("patients.patient_id"), index=True, nullable=False)
    provider_id = Column(String(32), ForeignKey("providers.provider_id"), index=True, nullable=False)
    service_date = Column(String(30), index=True, nullable=False)
    submission_date = Column(String(30), nullable=False)
    diagnosis_code = Column(String(50), nullable=False)
    procedure_code = Column(String(50), nullable=False)
    service_type = Column(String(100), nullable=False)
    claimed_amount = Column(Float, nullable=False)
    expected_amount = Column(Float, nullable=False)
    quantity = Column(Integer, default=1)
    claim_status = Column(String(50), default="SUBMITTED", index=True)
    supporting_document_status = Column(String(50), default="COMPLETE")
    authorization_status = Column(String(50), default="PRE_APPROVED")
    risk_score = Column(Float, default=0.0, index=True)
    risk_level = Column(String(20), default="LOW", index=True)
    ml_anomaly_score = Column(Float, default=0.0)
    hybrid_score = Column(Float, default=0.0)
    assigned_analyst = Column(String(255), nullable=True)
    why_flagged = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    patient = relationship("Patient", back_populates="claims")
    provider = relationship("Provider", back_populates="claims")
    services = relationship("ClaimService", back_populates="claim", cascade="all, delete-orphan")
    documents = relationship("SupportingDocument", back_populates="claim", cascade="all, delete-orphan")
    detections = relationship("FraudDetection", back_populates="claim", cascade="all, delete-orphan")
    investigations = relationship("Investigation", back_populates="claim", cascade="all, delete-orphan")

class ClaimService(Base):
    __tablename__ = "claim_services"

    id = Column(Integer, primary_key=True, index=True)
    claim_id = Column(String(32), ForeignKey("claims.claim_id"), index=True, nullable=False)
    service_code = Column(String(50), nullable=False)
    service_name = Column(String(255), nullable=False)
    quantity = Column(Integer, default=1)
    unit_price = Column(Float, default=0.0)
    total_amount = Column(Float, default=0.0)
    category = Column(String(100), nullable=True)

    claim = relationship("Claim", back_populates="services")

class ServiceEvent(Base):
    __tablename__ = "service_events"

    event_id = Column(String(32), primary_key=True, index=True)
    patient_id = Column(String(32), ForeignKey("patients.patient_id"), index=True, nullable=False)
    provider_id = Column(String(32), ForeignKey("providers.provider_id"), index=True, nullable=False)
    event_date = Column(String(30), index=True, nullable=False)
    event_time = Column(String(20), nullable=False)
    service_code = Column(String(50), nullable=False)
    service_name = Column(String(255), nullable=False)
    location = Column(String(100), nullable=False)
    status = Column(String(50), default="COMPLETED")

class SupportingDocument(Base):
    __tablename__ = "supporting_documents"

    id = Column(Integer, primary_key=True, index=True)
    claim_id = Column(String(32), ForeignKey("claims.claim_id"), index=True, nullable=False)
    document_type = Column(String(100), nullable=False)
    file_name = Column(String(255), nullable=False)
    file_url = Column(String(500), nullable=False)
    is_verified = Column(Boolean, default=True)
    notes = Column(Text, nullable=True)
    uploaded_at = Column(DateTime, default=utc_now)

    claim = relationship("Claim", back_populates="documents")

class FraudRule(Base):
    __tablename__ = "fraud_rules"

    id = Column(Integer, primary_key=True, index=True)
    rule_code = Column(String(50), unique=True, index=True, nullable=False)
    rule_name = Column(String(100), nullable=False)
    description = Column(Text, nullable=False)
    severity = Column(String(20), default="MEDIUM")
    default_weight = Column(Float, default=20.0)
    threshold = Column(Float, default=1.5)
    is_enabled = Column(Boolean, default=True)
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

class FraudDetection(Base):
    __tablename__ = "fraud_detections"

    id = Column(Integer, primary_key=True, index=True)
    claim_id = Column(String(32), ForeignKey("claims.claim_id"), index=True, nullable=False)
    rule_code = Column(String(50), index=True, nullable=False)
    rule_name = Column(String(100), nullable=False)
    triggered = Column(Boolean, default=False)
    risk_contribution = Column(Float, default=0.0)
    severity = Column(String(20), default="MEDIUM")
    reason = Column(Text, nullable=True)
    evidence = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utc_now)

    claim = relationship("Claim", back_populates="detections")

class RiskScore(Base):
    __tablename__ = "risk_scores"

    id = Column(Integer, primary_key=True, index=True)
    claim_id = Column(String(32), ForeignKey("claims.claim_id"), index=True, nullable=False)
    rule_score = Column(Float, default=0.0)
    ml_score = Column(Float, default=0.0)
    hybrid_score = Column(Float, default=0.0)
    risk_level = Column(String(20), default="LOW")
    details = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utc_now)

class Investigation(Base):
    __tablename__ = "investigations"

    id = Column(Integer, primary_key=True, index=True)
    claim_id = Column(String(32), ForeignKey("claims.claim_id"), index=True, nullable=False)
    case_number = Column(String(50), unique=True, index=True, nullable=False)
    status = Column(String(50), default="NEW", index=True)
    priority = Column(String(20), default="MEDIUM")
    assigned_to = Column(String(255), nullable=True)
    investigator = Column(String(255), nullable=True)
    summary = Column(Text, nullable=True)
    findings = Column(Text, nullable=True)
    recommendation = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)
    closed_at = Column(DateTime, nullable=True)

    claim = relationship("Claim", back_populates="investigations")
    notes = relationship("InvestigationNote", back_populates="investigation", cascade="all, delete-orphan")
    evidences = relationship("Evidence", back_populates="investigation", cascade="all, delete-orphan")

class InvestigationNote(Base):
    __tablename__ = "investigation_notes"

    id = Column(Integer, primary_key=True, index=True)
    investigation_id = Column(Integer, ForeignKey("investigations.id"), index=True, nullable=False)
    author_email = Column(String(255), nullable=False)
    author_role = Column(String(50), nullable=False)
    note_type = Column(String(50), default="OBSERVATION")
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=utc_now)

    investigation = relationship("Investigation", back_populates="notes")

class Evidence(Base):
    __tablename__ = "evidence"

    id = Column(Integer, primary_key=True, index=True)
    investigation_id = Column(Integer, ForeignKey("investigations.id"), index=True, nullable=False)
    evidence_type = Column(String(100), nullable=False)
    description = Column(Text, nullable=False)
    file_path = Column(String(500), nullable=True)
    source = Column(String(100), nullable=True)
    metadata_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utc_now)

    investigation = relationship("Investigation", back_populates="evidences")

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_role = Column(String(50), default="ALL")
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    notification_type = Column(String(50), default="CRITICAL_ALERT")
    severity = Column(String(20), default="INFO")
    link_url = Column(String(255), nullable=True)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=utc_now)

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(255), nullable=False)
    action = Column(String(100), nullable=False)
    entity_type = Column(String(50), nullable=False)
    entity_id = Column(String(100), nullable=True)
    timestamp = Column(DateTime, default=utc_now, index=True)
    details = Column(Text, nullable=True)

class ModelPrediction(Base):
    __tablename__ = "model_predictions"

    id = Column(Integer, primary_key=True, index=True)
    claim_id = Column(String(32), ForeignKey("claims.claim_id"), index=True, nullable=False)
    model_name = Column(String(100), default="IsolationForest")
    anomaly_score = Column(Float, default=0.0)
    is_anomaly = Column(Boolean, default=False)
    feature_importances = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utc_now)

class ProviderRiskProfile(Base):
    __tablename__ = "provider_risk_profiles"

    id = Column(Integer, primary_key=True, index=True)
    provider_id = Column(String(32), ForeignKey("providers.provider_id"), unique=True, index=True, nullable=False)
    risk_score = Column(Float, default=15.0)
    suspicious_claims_count = Column(Integer, default=0)
    total_claims_count = Column(Integer, default=0)
    fraud_breakdown = Column(Text, nullable=True)
    last_updated = Column(DateTime, default=utc_now)

    provider = relationship("Provider", back_populates="risk_profile")

# Composite and lookup indexes
Index("idx_claims_provider_date", Claim.provider_id, Claim.service_date)
Index("idx_claims_patient_date", Claim.patient_id, Claim.service_date)
Index("idx_claims_risk_status", Claim.risk_score, Claim.claim_status)
Index("idx_events_patient_date", ServiceEvent.patient_id, ServiceEvent.event_date)
