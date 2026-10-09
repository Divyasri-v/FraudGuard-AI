import json
from typing import List, Tuple, Dict, Any
from app.core.config import settings
from app.fraud_engine.rules.base import RuleResult

class RiskScoringEngine:
    @staticmethod
    def calculate_rule_score(results: List[RuleResult]) -> float:
        """Sums risk contribution from all triggered rules, capped at 100."""
        raw_score = sum(r.risk_contribution for r in results if r.triggered)
        return min(round(raw_score, 1), 100.0)

    @staticmethod
    def calculate_hybrid_score(rule_score: float, ml_score: float, rule_weight: float = None, ml_weight: float = None) -> float:
        """Blends rule score and ML score according to configured weights."""
        rw = rule_weight if rule_weight is not None else settings.ML_RULE_WEIGHT
        mw = ml_weight if ml_weight is not None else settings.ML_ANOMALY_WEIGHT
        total_w = rw + mw
        if total_w <= 0:
            return rule_score
        rw_norm = rw / total_w
        mw_norm = mw / total_w
        hybrid = (rule_score * rw_norm) + (ml_score * mw_norm)
        return min(round(hybrid, 1), 100.0)

    @staticmethod
    def get_risk_level(score: float) -> str:
        """Maps risk score to 4 standardized tiers."""
        if score <= 30.0:
            return "LOW"
        elif score <= 60.0:
            return "MEDIUM"
        elif score <= 80.0:
            return "HIGH"
        else:
            return "CRITICAL"

    @staticmethod
    def generate_explanations(results: List[RuleResult], ml_score: float, provider_rate: float = 0.0) -> str:
        """Generates plain-language Explainable AI bullet points."""
        bullet_points = []
        triggered_results = [r for r in results if r.triggered]

        for idx, res in enumerate(triggered_results, start=1):
            bullet_points.append(f"{idx}. [{res.rule_name}] {res.reason} (Risk Contribution: +{res.risk_contribution:.0f})")

        if ml_score >= 60.0:
            bullet_points.append(
                f"{len(bullet_points) + 1}. [Machine Learning Anomaly] Unsupervised Isolation Forest model flagged unusual multidimensional feature combinations (ML Anomaly Score: {ml_score:.1f}/100)."
            )

        if provider_rate >= 0.15:
            bullet_points.append(
                f"{len(bullet_points) + 1}. [Provider History] Healthcare provider exhibits an elevated historical synthetic risk rate of {provider_rate * 100:.1f}%."
            )

        if not bullet_points:
            return "No suspicious patterns detected. Claim parameters fall within expected clinical benchmarks and billing rules."

        return "\n".join(bullet_points)

risk_scoring_engine = RiskScoringEngine()
