from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_user, log_audit, require_roles
from app.core.security import verify_password, create_access_token
from app.models.models import User
from app.schemas.schemas import LoginRequest, TokenResponse, UserResponse

router = APIRouter()

@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect synthetic demo email or password."
        )

    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is disabled.")

    access_token = create_access_token(
        subject=user.email,
        role=user.role,
        extra_data={"name": user.full_name, "user_id": user.id}
    )

    log_audit(db, user.email, "LOGIN", "USER", str(user.id), {"role": user.role})

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role
        }
    }

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.get("/users", dependencies=[Depends(require_roles(["FRAUD_ANALYST", "INVESTIGATOR"]))])
def list_users(db: Session = Depends(get_db)):
    users = db.query(User).all()
    return [
        {
            "id": u.id,
            "email": u.email,
            "full_name": u.full_name,
            "role": u.role,
            "is_active": u.is_active
        }
        for u in users
    ]
