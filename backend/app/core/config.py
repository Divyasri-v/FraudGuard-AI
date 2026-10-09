import os
import json
from typing import List
from pydantic import Field
try:
    from pydantic_settings import BaseSettings
except ImportError:
    from pydantic import BaseModel as BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "FraudGuard AI"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./fraudguard.db")
    JWT_SECRET: str = os.getenv("JWT_SECRET", "demo-secret-key-fraudguard-ai-academic-prototype-2026")
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174"
    ]
    ML_RULE_WEIGHT: float = float(os.getenv("ML_RULE_WEIGHT", "0.70"))
    ML_ANOMALY_WEIGHT: float = float(os.getenv("ML_ANOMALY_WEIGHT", "0.30"))
    MAX_CLAIMS: int = int(os.getenv("MAX_CLAIMS", "10000"))
    DEFAULT_SEED: int = 42
    DATA_DISCLAIMER: str = "SYNTHETIC DEMO DATA – NOT REAL PATIENT DATA"
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
