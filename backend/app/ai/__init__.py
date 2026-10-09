"""
FraudGuard AI - AI Investigation Assistant Package
Integrates Gemini 2.5 Flash, Knowledge Base, and RAG Service.
"""

from app.ai.rag_service import get_rag_service, RAGService
from app.ai.llm_service import get_llm_service, LLMService
from app.ai.knowledge_base import get_all_knowledge_documents
from app.ai.embeddings import get_embeddings_provider, EmbeddingsProvider

__all__ = [
    "get_rag_service",
    "RAGService",
    "get_llm_service",
    "LLMService",
    "get_all_knowledge_documents",
    "get_embeddings_provider",
    "EmbeddingsProvider"
]
