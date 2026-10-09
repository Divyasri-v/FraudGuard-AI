from typing import Dict, Any, Optional
from pydantic import BaseModel

class RuleResult(BaseModel):
    rule_code: str
    rule_name: str
    triggered: bool
    risk_contribution: float
    severity: str  # LOW, MEDIUM, HIGH, CRITICAL
    reason: Optional[str] = None
    evidence: Optional[Dict[str, Any]] = None

class BaseRule:
    rule_code: str
    rule_name: str
    default_severity: str = "MEDIUM"
    default_weight: float = 20.0

    def evaluate(self, claim: Any, db: Any, rule_config: Optional[Any] = None) -> RuleResult:
        raise NotImplementedError
