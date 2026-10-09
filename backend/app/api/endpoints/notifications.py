from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.api.deps import get_db, get_current_user
from app.models.models import Notification, User
from app.schemas.schemas import NotificationResponse

router = APIRouter()

@router.get("", response_model=List[NotificationResponse])
def get_notifications(
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    notifs = db.query(Notification)\
               .order_by(desc(Notification.created_at))\
               .limit(limit)\
               .all()
    return notifs

@router.put("/{id}/read")
def mark_notification_read(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    notif = db.query(Notification).filter(Notification.id == id).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    notif.is_read = True
    db.commit()
    return {"message": "Notification marked as read"}

@router.put("/read-all")
def mark_all_notifications_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db.query(Notification).update({Notification.is_read: True})
    db.commit()
    return {"message": "All notifications marked as read"}
