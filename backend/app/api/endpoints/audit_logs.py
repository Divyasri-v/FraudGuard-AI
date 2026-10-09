from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, or_

from app.api.deps import get_db, get_current_user, require_roles
from app.models.models import AuditLog, User
from app.schemas.schemas import PaginatedResponse

router = APIRouter()

@router.get("", response_model=PaginatedResponse)
def list_audit_logs(
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    action: Optional[str] = None,
    entity_type: Optional[str] = None,
    user_id: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(AuditLog)

    if action:
        query = query.filter(AuditLog.action == action.upper())
    if entity_type:
        query = query.filter(AuditLog.entity_type == entity_type.upper())
    if user_id:
        query = query.filter(AuditLog.user_id.ilike(f"%{user_id}%"))
    if search:
        s = f"%{search.strip()}%"
        query = query.filter(or_(
            AuditLog.entity_id.ilike(s),
            AuditLog.details.ilike(s),
            AuditLog.user_id.ilike(s)
        ))

    total = query.count()
    logs = query.order_by(desc(AuditLog.timestamp))\
                .offset((page - 1) * page_size)\
                .limit(page_size)\
                .all()

    total_pages = (total + page_size - 1) // page_size

    items = [
        {
            "id": l.id,
            "user_id": l.user_id,
            "action": l.action,
            "entity_type": l.entity_type,
            "entity_id": l.entity_id,
            "timestamp": l.timestamp,
            "details": l.details
        }
        for l in logs
    ]

    return PaginatedResponse(
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
        items=items
    )
