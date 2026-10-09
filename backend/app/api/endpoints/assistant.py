import re
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user, log_audit
from app.models.models import User
from app.core.config import settings
from app.ai.rag_service import get_rag_service
from app.ai.llm_service import get_llm_service

router = APIRouter()

class AssistantQueryRequest(BaseModel):
    question: Optional[str] = None
    query: Optional[str] = None
    claim_id: Optional[str] = None
    investigation_id: Optional[int] = None

@router.post("/query")
def query_assistant(
    payload: AssistantQueryRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query_text = (payload.question or payload.query or "").strip()
    if not query_text:
        return {
            "answer": (
                "Please provide a question or inquiry. For example:\n"
                "• *'Why was CLM00001 flagged?'*\n"
                "• *'Explain the duplicate billing rule.'*\n"
                "• *'What clinical evidence is missing for CLM00002?'*\n"
                "• *'Summarize the hybrid risk scoring formula.'*"
            ),
            "sources": ["FraudGuard AI Assistant"],
            "claim_id": None,
            "evidence_data": {},
            "is_llm_powered": False,
            "model": "Prompt Guide",
            "disclaimer": settings.DATA_DISCLAIMER
        }

    # Extract or infer claim_id
    claim_match = re.search(r"CLM\d{4,5}", query_text, re.IGNORECASE)
    target_claim_id = payload.claim_id or (claim_match.group(0).upper() if claim_match else None)

    # 1. RAG retrieval & claim context assembly
    rag_service = get_rag_service()
    context_data = rag_service.build_investigation_context(
        query=query_text,
        claim_id=target_claim_id,
        db=db
    )

    # If the user asked about a specific claim ID that doesn't exist in DB:
    if target_claim_id and not context_data.get("claim_info"):
        return {
            "answer": (
                f"I could not locate claim **{target_claim_id}** in the synthetic claim repository. "
                "Please check the ID and ensure it corresponds to an ingested synthetic record (e.g. `CLM00001` - `CLM10000`)."
            ),
            "sources": ["Database Verification"],
            "claim_id": target_claim_id,
            "evidence_data": {},
            "is_llm_powered": False,
            "model": "Database Index",
            "disclaimer": settings.DATA_DISCLAIMER
        }

    # 2. LLM response generation via Gemini 2.5 Flash with Grounded RAG fallback
    llm_service = get_llm_service()
    answer_text, is_llm, model_name = llm_service.generate_investigation_response(
        query=query_text,
        claim_info=context_data.get("claim_info"),
        retrieved_chunks=context_data.get("retrieved_chunks", [])
    )

    log_audit(
        db=db,
        user_email=current_user.email,
        action="ASSISTANT_QUERY",
        entity_type="AI_ASSISTANT",
        entity_id=target_claim_id or "GENERAL_INQUIRY",
        details={"query": query_text, "model": model_name, "is_llm": is_llm}
    )

    return {
        "answer": answer_text,
        "sources": context_data.get("sources", []),
        "claim_id": target_claim_id,
        "evidence_data": context_data.get("evidence_data", {}),
        "is_llm_powered": is_llm,
        "model": model_name,
        "disclaimer": settings.DATA_DISCLAIMER
    }
