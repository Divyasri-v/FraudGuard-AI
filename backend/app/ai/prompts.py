"""
FraudGuard AI - Prompt Templates for Gemini 2.5 Flash
Enforces strict anti-hallucination, grounded reasoning, and SIU terminology standards.
"""

from typing import Dict, Any, List, Optional

SYSTEM_INSTRUCTION = """You are the Lead Healthcare Insurance Fraud Investigation Assistant for FraudGuard AI.
Your role is to assist Special Investigation Unit (SIU) analysts and clinical claim adjudicators by explaining flagged claims, clarifying fraud detection rules, summarizing evidence, and recommending grounded next steps.

CRITICAL INSTRUCTIONS & COMPLIANCE BOUNDARIES:
1. STRICT GROUNDING: Base all factual assertions exclusively on the provided Synthetic Claim Telemetry and Retrieved Knowledge Base chunks.
2. NO HALLUCINATION: If a detail (such as operative notes, clinical vital signs, or provider contact) is not in the context, explicitly state that it is not available in the synthetic claim ledger. Never invent medical facts.
3. ASSISTIVE NATURE: This system is an academic decision-support platform. It does NOT legally prove fraud.
4. MANDATORY TERMINOLOGY: Use professional, neutral investigative terms:
   - "Suspicious Claim"
   - "Fraud Risk"
   - "Requires Review"
   - "Anomaly Detected"
   Do NOT declare any claim as legally proven fraud or any person as a criminal.
5. STRUCTURED RESPONSE:
   - Provide a clear, professional assessment.
   - Clearly distinguish DETECTED EVIDENCE (what the rule and ML telemetry found) from INVESTIGATOR RECOMMENDATIONS (what human steps to take).
   - Use clean Markdown formatting with headers, bullet points, and bold metric callouts.
6. DATA SAFETY: All patient, provider, and claim records are 100% synthetic demo data for academic demonstration.
"""

def format_investigation_prompt(
    query: str,
    claim_info: Optional[Dict[str, Any]],
    retrieved_chunks: List[Dict[str, Any]]
) -> str:
    sections = []

    # 1. Retrieved Knowledge Base Chunks
    if retrieved_chunks:
        kb_text = "### RETRIEVED KNOWLEDGE BASE CONTEXT:\n"
        for i, c in enumerate(retrieved_chunks, 1):
            kb_text += f"\n[{i}] **{c.get('title', 'Knowledge Chunk')}**:\n{c.get('content', '')}\n"
        sections.append(kb_text)

    # 2. Claim Specific Telemetry
    if claim_info:
        rules_triggered_text = ""
        if claim_info.get("triggered_rules"):
            for r in claim_info["triggered_rules"]:
                rules_triggered_text += f"\n  - **{r['rule_name']}** ({r['rule_code']}): {r['reason']} [Contribution: +{r['contribution']} pts]"
        else:
            rules_triggered_text = "\n  - None (Score driven primarily by ML Anomaly detection or standard variance)"

        claim_text = (
            "### TARGET SYNTHETIC CLAIM TELEMETRY:\n"
            f"- **Claim ID**: {claim_info.get('claim_id')}\n"
            f"- **Service Date**: {claim_info.get('service_date')} | **Submission Date**: {claim_info.get('submission_date')}\n"
            f"- **Service Category**: {claim_info.get('service_type')} (Procedure Code: {claim_info.get('procedure_code')}, ICD: {claim_info.get('diagnosis_code')})\n"
            f"- **Financials**: Claimed ₹{claim_info.get('claimed_amount', 0):,.2f} vs Benchmark Expected ₹{claim_info.get('expected_amount', 0):,.2f} (Tariff Ratio: {claim_info.get('tariff_ratio', 1.0)}×)\n"
            f"- **Risk Profile**: Hybrid Score = **{claim_info.get('hybrid_score', 0)}/100** ({claim_info.get('risk_level', 'LOW')} RISK)\n"
            f"  - Rule-Based Score: {claim_info.get('risk_score', 0)} pts\n"
            f"  - Machine Learning Anomaly Score: {claim_info.get('ml_anomaly_score', 0)} pts (Isolation Forest)\n"
            f"- **Triggered Fraud Rules**:{rules_triggered_text}\n"
            f"- **Automated Explanation**: {claim_info.get('why_flagged')}\n"
            f"- **Demographics**: Patient {claim_info.get('patient_name')} ({claim_info.get('patient_id')}, Age {claim_info.get('patient_age')}, Plan: {claim_info.get('patient_plan')})\n"
            f"- **Provider**: {claim_info.get('provider_name')} ({claim_info.get('provider_id')}, Type: {claim_info.get('provider_type')}, Historical Suspicious Rate: {claim_info.get('provider_suspicious_rate')})\n"
            f"- **Documentation Status**: Document Status: {claim_info.get('supporting_document_status')} | Pre-Auth Status: {claim_info.get('authorization_status')}\n"
            f"- **Investigation Status**: {claim_info.get('investigation_status')}\n"
        )
        if claim_info.get("recent_notes"):
            claim_text += f"- **Existing Investigator Notes**: {'; '.join(claim_info['recent_notes'])}\n"

        sections.append(claim_text)

    # 3. User Query
    user_query_text = (
        "### INVESTIGATOR INQUIRY:\n"
        f"\"{query}\"\n\n"
        "Please provide an accurate, grounded, explainable response answering the inquiry above based strictly on the provided context."
    )
    sections.append(user_query_text)

    return "\n\n".join(sections)
