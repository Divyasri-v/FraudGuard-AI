from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field

# Auth schemas
class LoginRequest(BaseModel):
    email: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: Dict[str, Any]

class UserResponse(BaseModel):
    id: int
    email: str
    full_name: str
    role: str
    is_active: bool
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class UserCreate(BaseModel):
    email: str
    password: str
    full_name: str
    role: str = "Fraud Analyst"

# Patient schemas
class PatientResponse(BaseModel):
    patient_id: str
    synthetic_name: str
    age: int
    gender: str
    city: str
    insurance_plan: str
    registration_date: str

    class Config:
        from_attributes = True

# Provider schemas
class ProviderResponse(BaseModel):
    provider_id: str
    provider_name: str
    provider_type: str
    city: str
    specialization: str
    network_status: str
    historical_claim_count: int
    historical_suspicious_rate: float
    provider_risk_score: float

    class Config:
        from_attributes = True

# Claim Service schemas
class ClaimServiceItem(BaseModel):
    service_code: str
    service_name: str
    quantity: int = 1
    unit_price: float
    total_amount: float
    category: Optional[str] = None

# Claim schemas
class ClaimCreate(BaseModel):
    patient_id: str
    provider_id: str
    service_date: str
    submission_date: Optional[str] = None
    diagnosis_code: str
    procedure_code: str
    service_type: str
    claimed_amount: float
    expected_amount: float
    quantity: int = 1
    supporting_document_status: str = "COMPLETE"
    authorization_status: str = "PRE_APPROVED"
    services: Optional[List[ClaimServiceItem]] = None

class ClaimUpdate(BaseModel):
    claim_status: Optional[str] = None
    assigned_analyst: Optional[str] = None

class ClaimResponse(BaseModel):
    claim_id: str
    patient_id: str
    provider_id: str
    service_date: str
    submission_date: str
    diagnosis_code: str
    procedure_code: str
    service_type: str
    claimed_amount: float
    expected_amount: float
    quantity: int
    claim_status: str
    supporting_document_status: str
    authorization_status: str
    risk_score: float
    risk_level: str
    ml_anomaly_score: float
    hybrid_score: float
    assigned_analyst: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class FraudDetectionResponse(BaseModel):
    rule_code: str
    rule_name: str
    triggered: bool
    risk_contribution: float
    severity: str
    reason: Optional[str] = None
    evidence: Optional[str] = None

class SupportingDocumentResponse(BaseModel):
    id: int
    document_type: str
    file_name: str
    file_url: str
    is_verified: bool
    notes: Optional[str] = None
    uploaded_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class ClaimDetailResponse(ClaimResponse):
    patient: Optional[PatientResponse] = None
    provider: Optional[ProviderResponse] = None
    services: List[ClaimServiceItem] = []
    documents: List[SupportingDocumentResponse] = []
    detections: List[FraudDetectionResponse] = []
    why_flagged: Optional[str] = None

# Fraud Rule config
class FraudRuleResponse(BaseModel):
    id: int
    rule_code: str
    rule_name: str
    description: str
    severity: str
    default_weight: float
    threshold: float
    is_enabled: bool

    class Config:
        from_attributes = True

class FraudRuleUpdate(BaseModel):
    severity: Optional[str] = None
    default_weight: Optional[float] = None
    threshold: Optional[float] = None
    is_enabled: Optional[bool] = None

# Investigation schemas
class InvestigationNoteCreate(BaseModel):
    note_type: str = "OBSERVATION"
    content: str

class InvestigationNoteResponse(BaseModel):
    id: int
    author_email: str
    author_role: str
    note_type: str
    content: str
    created_at: datetime

    class Config:
        from_attributes = True

class EvidenceCreate(BaseModel):
    evidence_type: str
    description: str
    file_path: Optional[str] = None
    source: Optional[str] = None
    metadata_json: Optional[str] = None

class EvidenceResponse(BaseModel):
    id: int
    evidence_type: str
    description: str
    file_path: Optional[str] = None
    source: Optional[str] = None
    metadata_json: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class InvestigationCreate(BaseModel):
    claim_id: str
    priority: str = "MEDIUM"
    assigned_to: Optional[str] = None
    investigator: Optional[str] = None
    summary: Optional[str] = None

class InvestigationUpdate(BaseModel):
    status: Optional[str] = None
    priority: Optional[str] = None
    assigned_to: Optional[str] = None
    investigator: Optional[str] = None
    summary: Optional[str] = None
    findings: Optional[str] = None
    recommendation: Optional[str] = None

class InvestigationResponse(BaseModel):
    id: int
    claim_id: str
    case_number: str
    status: str
    priority: str
    assigned_to: Optional[str] = None
    investigator: Optional[str] = None
    summary: Optional[str] = None
    findings: Optional[str] = None
    recommendation: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    closed_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class InvestigationDetailResponse(InvestigationResponse):
    claim: Optional[ClaimDetailResponse] = None
    notes: List[InvestigationNoteResponse] = []
    evidences: List[EvidenceResponse] = []

# Notification schemas
class NotificationResponse(BaseModel):
    id: int
    user_role: str
    title: str
    message: str
    notification_type: str
    severity: str
    link_url: Optional[str] = None
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True

# Audit log schemas
class AuditLogResponse(BaseModel):
    id: int
    user_id: str
    action: str
    entity_type: str
    entity_id: Optional[str] = None
    timestamp: datetime
    details: Optional[str] = None

    class Config:
        from_attributes = True

# Dashboard schemas
class DashboardSummaryResponse(BaseModel):
    total_claims: int
    claims_reviewed: int
    suspicious_claims: int
    critical_claims: int
    under_investigation: int
    potential_risk_amount: float
    average_risk_score: float
    suspicious_claim_percentage: float
    currency_symbol: str = "₹"
    disclaimer: str

# Paginated response wrapper
class PaginatedResponse(BaseModel):
    total: int
    page: int
    page_size: int
    total_pages: int
    items: List[Any]
