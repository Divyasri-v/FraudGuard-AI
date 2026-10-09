"""
FraudGuard AI - RAG Service
Orchestrates vector indexing, similarity retrieval, and claim context assembly.
Supports ChromaDB when available, with a resilient in-memory vector store fallback.
"""

from typing import List, Dict, Any, Optional
import os
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.ai.knowledge_base import get_all_knowledge_documents
from app.ai.embeddings import get_embeddings_provider
from app.models.models import Claim, FraudDetection, Patient, Provider, Investigation, InvestigationNote, SupportingDocument

class RAGService:
    _instance = None

    def __init__(self):
        self.chroma_client = None
        self.chroma_collection = None
        self.use_chroma = False
        self.docs = get_all_knowledge_documents()
        self.embeddings = get_embeddings_provider()
        self._init_vector_store()

    def _init_vector_store(self):
        try:
            import chromadb
            # Use persistent or Ephemeral client
            chroma_dir = os.path.join(os.path.dirname(__file__), "data", "chroma")
            os.makedirs(chroma_dir, exist_ok=True)
            self.chroma_client = chromadb.PersistentClient(path=chroma_dir)
            self.chroma_collection = self.chroma_client.get_or_create_collection(name="fraudguard_kb")

            # Check if collection is empty
            if self.chroma_collection.count() == 0:
                ids = [d["id"] for d in self.docs]
                documents = [d["content"] for d in self.docs]
                metadatas = [{"title": d["title"], "category": d["category"], "rule_code": d.get("rule_code", "")} for d in self.docs]
                self.chroma_collection.add(ids=ids, documents=documents, metadatas=metadatas)

            self.use_chroma = True
        except Exception:
            self.use_chroma = False

    def retrieve_relevant_chunks(self, query: str, top_k: int = 3) -> List[Dict[str, Any]]:
        if not query.strip():
            return []

        # 1. Try ChromaDB if initialized
        if self.use_chroma and self.chroma_collection:
            try:
                results = self.chroma_collection.query(query_texts=[query], n_results=min(top_k, len(self.docs)))
                chunks = []
                if results and "documents" in results and results["documents"]:
                    docs_retrieved = results["documents"][0]
                    metas_retrieved = results["metadatas"][0] if "metadatas" in results else [{}] * len(docs_retrieved)
                    for doc, meta in zip(docs_retrieved, metas_retrieved):
                        chunks.append({
                            "title": meta.get("title", "Knowledge Document"),
                            "content": doc,
                            "category": meta.get("category", "general"),
                            "rule_code": meta.get("rule_code", "")
                        })
                if chunks:
                    return chunks
            except Exception:
                pass

        # 2. Resilient In-Memory Vector Similarity Ranking
        doc_contents = [d["content"] for d in self.docs]
        similarities = self.embeddings.compute_similarity(query, doc_contents)

        # Rank docs by descending score
        scored_docs = []
        for doc, score in zip(self.docs, similarities):
            scored_docs.append({
                "title": doc["title"],
                "content": doc["content"],
                "category": doc["category"],
                "rule_code": doc.get("rule_code", ""),
                "score": score
            })

        scored_docs.sort(key=lambda x: x["score"], reverse=True)
        return scored_docs[:top_k]

    def build_investigation_context(
        self,
        query: str,
        claim_id: Optional[str],
        db: Session
    ) -> Dict[str, Any]:
        retrieved_chunks = self.retrieve_relevant_chunks(query, top_k=3)
        sources = [c["title"] for c in retrieved_chunks]

        claim_info = None
        evidence_data = {}

        if claim_id:
            claim = db.query(Claim).filter(Claim.claim_id == claim_id).first()
            if claim:
                patient = db.query(Patient).filter(Patient.patient_id == claim.patient_id).first()
                provider = db.query(Provider).filter(Provider.provider_id == claim.provider_id).first()
                detections = db.query(FraudDetection).filter(FraudDetection.claim_id == claim_id).all()
                triggered = [d for d in detections if d.triggered]
                docs = db.query(SupportingDocument).filter(SupportingDocument.claim_id == claim_id).all()
                inv = db.query(Investigation).filter(Investigation.claim_id == claim_id).first()
                notes = []
                if inv:
                    notes = db.query(InvestigationNote).filter(InvestigationNote.investigation_id == inv.id).order_by(desc(InvestigationNote.created_at)).limit(3).all()

                claim_info = {
                    "claim_id": claim.claim_id,
                    "patient_id": claim.patient_id,
                    "patient_name": patient.synthetic_name if patient else "Synthetic Patient",
                    "patient_age": patient.age if patient else "N/A",
                    "patient_plan": patient.insurance_plan if patient else "Standard",
                    "provider_id": claim.provider_id,
                    "provider_name": provider.provider_name if provider else "Synthetic Facility",
                    "provider_type": provider.provider_type if provider else "General Hospital",
                    "provider_suspicious_rate": f"{(provider.historical_suspicious_rate * 100):.1f}%" if provider else "0.0%",
                    "service_date": str(claim.service_date),
                    "submission_date": str(claim.submission_date),
                    "procedure_code": claim.procedure_code,
                    "diagnosis_code": claim.diagnosis_code,
                    "service_type": claim.service_type,
                    "claimed_amount": float(claim.claimed_amount or 0.0),
                    "expected_amount": float(claim.expected_amount or 0.0),
                    "tariff_ratio": round(float(claim.claimed_amount or 0.0) / max(float(claim.expected_amount or 1.0), 1.0), 2),
                    "risk_score": float(claim.risk_score or 0.0),
                    "ml_anomaly_score": float(claim.ml_anomaly_score or 0.0),
                    "hybrid_score": float(claim.hybrid_score or 0.0),
                    "risk_level": claim.risk_level,
                    "claim_status": claim.claim_status,
                    "supporting_document_status": claim.supporting_document_status,
                    "authorization_status": claim.authorization_status,
                    "why_flagged": claim.why_flagged or "No explicit explanation generated.",
                    "triggered_rules": [
                        {
                            "rule_code": d.rule_code,
                            "rule_name": d.rule_name,
                            "reason": d.reason,
                            "contribution": d.risk_contribution
                        }
                        for d in triggered
                    ],
                    "documents_count": len(docs),
                    "investigation_status": inv.status if inv else "NO_FORMAL_CASE",
                    "recent_notes": [n.content for n in notes]
                }

                evidence_data = {
                    "claim_id": claim.claim_id,
                    "risk_level": claim.risk_level,
                    "hybrid_score": claim.hybrid_score,
                    "claimed_amount": f"₹{claim.claimed_amount:,.2f}",
                    "expected_amount": f"₹{claim.expected_amount:,.2f}",
                    "provider_name": provider.provider_name if provider else claim.provider_id,
                    "triggered_rules": [d.rule_name for d in triggered]
                }
                sources.insert(0, f"Synthetic Claim Record: {claim.claim_id}")

        return {
            "claim_info": claim_info,
            "evidence_data": evidence_data,
            "retrieved_chunks": retrieved_chunks,
            "sources": sources
        }

def get_rag_service() -> RAGService:
    if RAGService._instance is None:
        RAGService._instance = RAGService()
    return RAGService._instance
