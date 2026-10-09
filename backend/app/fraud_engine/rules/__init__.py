from app.fraud_engine.rules.base import BaseRule, RuleResult
from app.fraud_engine.rules.rule01_duplicate_billing import DuplicateBillingRule
from app.fraud_engine.rules.rule02_upcoding import UpcodingRule
from app.fraud_engine.rules.rule03_unbundling import UnbundlingRule
from app.fraud_engine.rules.rule04_phantom_billing import PhantomBillingRule
from app.fraud_engine.rules.rule05_false_claim import FalseClaimRule
from app.fraud_engine.rules.rule06_inflated_billing import InflatedBillingRule
from app.fraud_engine.rules.rule07_incorrect_billing import IncorrectBillingRule
from app.fraud_engine.rules.rule08_unsupported_services import UnsupportedServicesRule
from app.fraud_engine.rules.rule09_impossible_timing import ImpossibleTimingRule
from app.fraud_engine.rules.rule10_mutually_exclusive import MutuallyExclusiveServicesRule

ALL_RULES = [
    DuplicateBillingRule(),
    UpcodingRule(),
    UnbundlingRule(),
    PhantomBillingRule(),
    FalseClaimRule(),
    InflatedBillingRule(),
    IncorrectBillingRule(),
    UnsupportedServicesRule(),
    ImpossibleTimingRule(),
    MutuallyExclusiveServicesRule(),
]

__all__ = [
    "BaseRule",
    "RuleResult",
    "ALL_RULES",
    "DuplicateBillingRule",
    "UpcodingRule",
    "UnbundlingRule",
    "PhantomBillingRule",
    "FalseClaimRule",
    "InflatedBillingRule",
    "IncorrectBillingRule",
    "UnsupportedServicesRule",
    "ImpossibleTimingRule",
    "MutuallyExclusiveServicesRule",
]
