from fastapi import APIRouter
from app.api.endpoints import (
    auth, claims, fraud, review_queue, investigations,
    providers, patients, dashboard, reports, audit_logs,
    notifications, demo, assistant
)

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(claims.router, prefix="/claims", tags=["Claims"])
api_router.include_router(fraud.router, prefix="/fraud", tags=["Fraud Detection & Rules"])
api_router.include_router(review_queue.router, prefix="/review-queue", tags=["Review Queue"])
api_router.include_router(investigations.router, prefix="/investigations", tags=["Investigations"])
api_router.include_router(providers.router, prefix="/providers", tags=["Providers"])
api_router.include_router(patients.router, prefix="/patients", tags=["Patients"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["Dashboard"])
api_router.include_router(reports.router, prefix="/reports", tags=["Reports"])
api_router.include_router(audit_logs.router, prefix="/audit-logs", tags=["Audit Logs"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["Notifications"])
api_router.include_router(demo.router, prefix="/demo", tags=["Demo Mode"])
api_router.include_router(assistant.router, prefix="/assistant", tags=["AI Investigation Assistant"])
