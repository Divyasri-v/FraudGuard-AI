"""
FraudGuard AI - LLM Service (Google Gemini 2.5 Flash)
Integrates Gemini 2.5 Flash with robust timeout handling, quota protection,
and graceful offline/fallback generation.
"""

from typing import Dict, Any, List, Optional, Tuple
import os
import logging
from app.core.config import settings
from app.ai.prompts import SYSTEM_INSTRUCTION, format_investigation_prompt

logger = logging.getLogger(__name__)

class LLMService:
    _instance = None

    def __init__(self):
        self.client = None
        self.model_name = getattr(settings, "GEMINI_MODEL", "gemini-2.5-flash")
        self.api_key = getattr(settings, "GEMINI_API_KEY", "") or os.getenv("GEMINI_API_KEY", "")
        self._init_client()

    def _init_client(self):
        self.api_key = getattr(settings, "GEMINI_API_KEY", "") or os.getenv("GEMINI_API_KEY", "")
        if self.api_key and self.api_key.strip() and not self.api_key.startswith("your_"):
            try:
                from google import genai
                self.client = genai.Client(api_key=self.api_key.strip())
            except Exception as e:
                logger.warning(f"Could not initialize Google GenAI Client: {e}")
                self.client = None
        else:
            self.client = None

    def generate_investigation_response(
        self,
        query: str,
        claim_info: Optional[Dict[str, Any]],
        retrieved_chunks: List[Dict[str, Any]]
    ) -> Tuple[str, bool, str]:
        """
        Generates an investigation response using Gemini 2.5 Flash if available,
        or grounded deterministic RAG analysis if the LLM API is unavailable.
        Returns: (answer_markdown, is_llm_generated, model_used)
        """
        # Re-check API key dynamically in case environment variable was set after startup
        if not self.client:
            self._init_client()

        formatted_prompt = format_investigation_prompt(query, claim_info, retrieved_chunks)

        # 1. Attempt Gemini 2.5 Flash Call if client is available
        if self.client:
            try:
                from google.genai import types
                response = self.client.models.generate_content(
                    model=self.model_name,
                    contents=formatted_prompt,
                    config=types.GenerateContentConfig(
                        system_instruction=SYSTEM_INSTRUCTION,
                        temperature=0.2,
                        max_output_tokens=1024
                    )
                )
                if response and response.text:
                    return response.text.strip(), True, self.model_name
            except Exception as e:
                logger.warning(f"Gemini API execution failed, falling back to grounded RAG generator: {e}")

        # 2. Resilient Grounded Fallback Response (Never crashes the application)
        fallback_text = self._build_grounded_fallback(query, claim_info, retrieved_chunks)
        return fallback_text, False, "Grounded RAG Engine (Telemetry Mode)"

    def _build_grounded_fallback(
        self,
        query: str,
        claim_info: Optional[Dict[str, Any]],
        retrieved_chunks: List[Dict[str, Any]]
    ) -> str:
        """
        Builds a comprehensive, grounded investigation report directly from
        the retrieved domain knowledge chunks and claim telemetry.
        """
        lines = []

        if claim_info:
            cid = claim_info["claim_id"]
            risk_lvl = claim_info["risk_level"]
            score = claim_info["hybrid_score"]
            lines.append(f"### Claim Investigation Dossier: **{cid}**")
            lines.append(f"**Assessed Risk Level**: **{risk_lvl}** (Hybrid Score: **{score}/100**)")
            lines.append(
                f"- **Rule-Based Score**: {claim_info['risk_score']} pts | "
                f"**ML Anomaly Score**: {claim_info['ml_anomaly_score']} pts (Isolation Forest)"
            )
            lines.append(
                f"- **Financial Telemetry**: Claimed ₹{claim_info['claimed_amount']:,.2f} "
                f"(Expected Benchmark: ₹{claim_info['expected_amount']:,.2f}, Tariff Ratio: {claim_info['tariff_ratio']}×)"
            )
            lines.append(f"- **Provider**: {claim_info['provider_name']} ({claim_info['provider_id']}, Historic Suspicious Rate: {claim_info['provider_suspicious_rate']})")
            lines.append(f"- **Patient**: {claim_info['patient_name']} ({claim_info['patient_id']}, Plan: {claim_info['patient_plan']})")

            # Triggered rules section
            if claim_info.get("triggered_rules"):
                lines.append("\n#### Detected Rule Anomalies:")
                for r in claim_info["triggered_rules"]:
                    lines.append(f"• **{r['rule_name']}** (+{r['contribution']} pts): {r['reason']}")
            else:
                lines.append("\n#### Detected Rule Anomalies:\n• No deterministic fraud rule triggered. Risk score driven by Isolation Forest multivariate outlier detection.")

            # Automated explainable AI rationale
            lines.append(f"\n#### Explainable AI Triage Rationale:\n{claim_info.get('why_flagged', 'Parameters within standard bounds.')}")

            # Recommendations
            lines.append("\n#### Recommended Special Investigation (SIU) Next Steps:")
            if claim_info["supporting_document_status"] == "MISSING":
                lines.append("1. **Request Primary Documents**: Claim lacks mandatory itemized billing ledger or diagnostic records.")
            if claim_info["authorization_status"] != "PRE_APPROVED":
                lines.append("2. **Audit Prior Authorization**: Verify clinical necessity justification against hospital policy guidelines.")
            lines.append(f"3. **Provider Outreach**: Request synthetic encounter notes from {claim_info['provider_name']} before adjudicating approval.")
        else:
            lines.append("### FraudGuard AI Knowledge Base Response\n")
            if retrieved_chunks:
                top_chunk = retrieved_chunks[0]
                lines.append(f"**{top_chunk.get('title', 'Domain Knowledge')}**\n")
                lines.append(top_chunk.get("content", ""))
                if len(retrieved_chunks) > 1:
                    lines.append("\n#### Related Domain Protocols:")
                    for c in retrieved_chunks[1:]:
                        lines.append(f"• **{c.get('title')}**: {c.get('content')[:160]}...")
            else:
                lines.append(
                    "You can ask questions regarding the 10 healthcare fraud rules (e.g. 'Explain duplicate billing'), "
                    "or specify a synthetic claim ID (e.g. 'Why was CLM00001 flagged?') to review detailed clinical and billing telemetry."
                )

        lines.append("\n\n> *Note: AI Assistant operating in Grounded Telemetry Mode. Configure `GEMINI_API_KEY` in `.env` to enable dynamic Gemini 2.5 Flash generation.*")
        return "\n".join(lines)

def get_llm_service() -> LLMService:
    if LLMService._instance is None:
        LLMService._instance = LLMService()
    return LLMService._instance
