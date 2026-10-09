from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError

from app.core.config import settings
from app.database.session import engine, Base, SessionLocal
from app.fraud_engine.engine import fraud_rule_engine
from app.api.v1.api import api_router
from app.models.models import User
from app.core.security import get_password_hash

DEMO_USERS = [
    {"email": "analyst@fraudguard.demo", "name": "Marcus Vance (Fraud Analyst)", "role": "Fraud Analyst", "pwd": "Analyst@123"},
    {"email": "investigator@fraudguard.demo", "name": "Elena Rostova (Investigator)", "role": "Investigator", "pwd": "Investigator@123"}
]

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: ensure tables and rules
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        fraud_rule_engine.ensure_default_rules(db)
        # Purge legacy users not in DEMO_USERS
        allowed_emails = [u["email"] for u in DEMO_USERS]
        db.query(User).filter(~User.email.in_(allowed_emails)).delete(synchronize_session=False)
        # Idempotently seed users
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
    finally:
        db.close()
    yield
    # Shutdown

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Explainable Healthcare Insurance Claim Fraud Detection & Review Platform (100% Synthetic Demo Data)",
    version=settings.VERSION,
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Permits local development ports
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global validation error formatter
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": exc.errors(), "message": "Request validation failed. Please check submitted parameters."}
    )

# Include API Router
app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/")
def root():
    return {
        "app": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "status": "operational",
        "docs_url": "/docs",
        "disclaimer": settings.DATA_DISCLAIMER
    }

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "disclaimer": settings.DATA_DISCLAIMER
    }
