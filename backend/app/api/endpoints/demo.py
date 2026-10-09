from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../")))
from scripts.generate_synthetic_data import generate_synthetic_dataset
from app.api.deps import get_db, get_current_user, require_roles, log_audit
from app.models.models import User, Claim, Patient, Provider
from app.core.config import settings

router = APIRouter()

class DemoGenerateRequest(BaseModel):
    claims_count: int = Field(1000, ge=100, le=10000)
    seed: int = 42

@router.get("/status")
def get_demo_status(db: Session = Depends(get_db)):
    claims_count = db.query(Claim).count()
    patients_count = db.query(Patient).count()
    providers_count = db.query(Provider).count()

    return {
        "claims_count": claims_count,
        "patients_count": patients_count,
        "providers_count": providers_count,
        "max_claims_allowed": settings.MAX_CLAIMS,
        "disclaimer": settings.DATA_DISCLAIMER,
        "is_ready": claims_count > 0
    }

@router.post("/generate", dependencies=[Depends(require_roles(["FRAUD_ANALYST"]))])
def trigger_generate_demo_data(
    payload: DemoGenerateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if payload.claims_count > 10000:
        raise HTTPException(
            status_code=400,
            detail=f"Safety constraint violation: Maximum allowed claims is 10,000. Requested: {payload.claims_count}"
        )

    try:
        generate_synthetic_dataset(num_claims=payload.claims_count, seed=payload.seed)
        log_audit(db, current_user.email, "SYNTHETIC_DATA_REGENERATED", "SYSTEM", f"{payload.claims_count}_CLAIMS")
        return {
            "message": f"Successfully regenerated {payload.claims_count:,} synthetic claims.",
            "claims_count": payload.claims_count,
            "seed": payload.seed,
            "disclaimer": settings.DATA_DISCLAIMER
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Generation failed: {str(e)}")

@router.post("/reset", dependencies=[Depends(require_roles(["FRAUD_ANALYST"]))])
def reset_demo_data(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        generate_synthetic_dataset(num_claims=1000, seed=42)
        log_audit(db, current_user.email, "SYNTHETIC_DATA_RESET", "SYSTEM", "RESET_1000")
        return {"message": "Demo database reset to baseline 1,000 synthetic claims.", "claims_count": 1000}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Reset failed: {str(e)}")
