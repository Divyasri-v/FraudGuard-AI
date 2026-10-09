import json
from typing import Generator, Optional, List, Any
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.database.session import SessionLocal, get_db
from app.core.security import decode_access_token
from app.models.models import User, AuditLog

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception
    email: str = payload.get("sub")
    if email is None:
        raise credentials_exception
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise credentials_exception
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Inactive user account")
    return user

def normalize_role(role: str) -> str:
    if not role:
        return ""
    return role.strip().upper().replace(" ", "_")

def require_roles(allowed_roles: List[str]):
    norm_allowed = [normalize_role(r) for r in allowed_roles]
    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        user_role_norm = normalize_role(current_user.role)
        if user_role_norm not in norm_allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access forbidden: role '{current_user.role}' is not authorized. Requires one of {allowed_roles}"
            )
        return current_user
    return role_checker

def log_audit(db: Session, user_email: str, action: str, entity_type: str, entity_id: Optional[str] = None, details: Optional[Any] = None):
    try:
        details_str = json.dumps(details) if isinstance(details, (dict, list)) else (str(details) if details else None)
        entry = AuditLog(
            user_id=user_email,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            details=details_str
        )
        db.add(entry)
        db.commit()
    except Exception:
        db.rollback()
