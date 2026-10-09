import os
import joblib
import numpy as np
import pandas as pd
from typing import List, Dict, Any, Tuple, Optional
from sklearn.ensemble import IsolationForest
from app.core.config import settings

MODEL_DIR = os.path.join(os.path.dirname(__file__), "saved_models")
MODEL_PATH = os.path.join(MODEL_DIR, "isolation_forest.joblib")

FEATURE_NAMES = [
    "claim_amount",
    "expected_amount",
    "amount_ratio",
    "claim_frequency",
    "provider_claim_frequency",
    "patient_claim_frequency",
    "duplicate_count",
    "documentation_score",
    "authorization_score",
    "service_frequency",
    "time_gap",
    "provider_suspicious_rate"
]

class ClaimAnomalyDetector:
    def __init__(self):
        self.model: Optional[IsolationForest] = None
        self.feature_names = FEATURE_NAMES
        self.load_model()

    def load_model(self):
        if os.path.exists(MODEL_PATH):
            try:
                self.model = joblib.load(MODEL_PATH)
            except Exception:
                self.model = None

    def save_model(self):
        os.makedirs(MODEL_DIR, exist_ok=True)
        if self.model:
            joblib.dump(self.model, MODEL_PATH)

    def extract_features_single(self, claim: Any, provider: Optional[Any] = None, patient_claim_count: int = 1, provider_claim_count: int = 10, duplicate_count: int = 0) -> List[float]:
        claimed_amount = float(claim.claimed_amount)
        expected_amount = float(max(claim.expected_amount, 1.0))
        amount_ratio = claimed_amount / expected_amount

        doc_score = 1.0 if claim.supporting_document_status in ["COMPLETE", "VERIFIED"] else (0.5 if claim.supporting_document_status == "PARTIAL" else 0.0)
        auth_score = 1.0 if claim.authorization_status in ["PRE_APPROVED", "APPROVED"] else (0.5 if claim.authorization_status == "PENDING" else 0.0)
        prov_rate = float(provider.historical_suspicious_rate) if provider else 0.05

        return [
            claimed_amount,
            expected_amount,
            amount_ratio,
            1.0,  # claim_frequency
            float(provider_claim_count),
            float(patient_claim_count),
            float(duplicate_count),
            doc_score,
            auth_score,
            float(claim.quantity if hasattr(claim, "quantity") else 1),
            3.0,  # time_gap (days)
            prov_rate
        ]

    def train_on_dataframe(self, df: pd.DataFrame):
        """Train IsolationForest on synthetic claims feature DataFrame."""
        X = df[self.feature_names].values
        # Isolation Forest with fixed seed for reproducibility
        self.model = IsolationForest(
            n_estimators=100,
            contamination=0.15,
            random_state=settings.DEFAULT_SEED,
            n_jobs=-1
        )
        self.model.fit(X)
        self.save_model()

    def predict_anomaly_score(self, features: List[float]) -> Tuple[float, bool]:
        """
        Returns (anomaly_score_0_to_100, is_anomaly).
        IsolationForest decision_function returns negative values for anomalies.
        We map score to a clear 0-100 scale where higher is more suspicious.
        """
        if self.model is None:
            # Fallback heuristic calculation if model not yet trained
            amount_ratio = features[2]
            doc_score = features[7]
            auth_score = features[8]
            prov_rate = features[11]
            heuristic = min(100.0, max(0.0, (amount_ratio - 1.0) * 30 + (1 - doc_score) * 25 + (1 - auth_score) * 20 + prov_rate * 50))
            return round(heuristic, 1), heuristic >= 60.0

        X = np.array([features])
        raw_score = self.model.decision_function(X)[0] # typical range [-0.5, 0.5]
        # Invert and normalize: lower decision_function => higher anomaly
        # Typically values below 0 are anomalies.
        # Map roughly from [-0.3, 0.2] to [100, 0]
        normalized = (0.25 - raw_score) / 0.5 * 100.0
        score = float(np.clip(normalized, 0.0, 100.0))
        is_anomaly = bool(self.model.predict(X)[0] == -1)
        return round(score, 1), is_anomaly

anomaly_detector = ClaimAnomalyDetector()
