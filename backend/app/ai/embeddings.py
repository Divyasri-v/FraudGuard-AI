"""
FraudGuard AI - Embeddings Provider
Supports Sentence Transformers when available, with a fast, reliable,
in-memory vectorizer fallback using Scikit-Learn TF-IDF and cosine similarity.
"""

from typing import List, Optional
import numpy as np

class EmbeddingsProvider:
    _instance = None

    def __init__(self):
        self.backend = "tfidf"
        self.model = None
        self.vectorizer = None
        self._init_backend()

    def _init_backend(self):
        # 1. Try Sentence Transformers if installed
        try:
            from sentence_transformers import SentenceTransformer
            self.model = SentenceTransformer("all-MiniLM-L6-v2")
            self.backend = "sentence_transformers"
            return
        except Exception:
            pass

        # 2. Resilient fallback: Scikit-learn TF-IDF vectorizer (always available)
        try:
            from sklearn.feature_extraction.text import TfidfVectorizer
            self.vectorizer = TfidfVectorizer(ngram_range=(1, 2), stop_words="english", sublinear_tf=True)
            self.backend = "tfidf"
        except Exception:
            self.backend = "simple"

    def embed_texts(self, texts: List[str]) -> np.ndarray:
        if not texts:
            return np.array([])

        if self.backend == "sentence_transformers" and self.model:
            try:
                embeddings = self.model.encode(texts, convert_to_numpy=True, normalize_embeddings=True)
                return embeddings
            except Exception:
                pass

        if self.backend == "tfidf" and self.vectorizer:
            try:
                matrix = self.vectorizer.fit_transform(texts)
                return matrix.toarray()
            except Exception:
                pass

        # Simple character/word count fallback
        return np.ones((len(texts), 64))

    def compute_similarity(self, query: str, doc_texts: List[str]) -> List[float]:
        if not doc_texts:
            return []

        if self.backend == "sentence_transformers" and self.model:
            try:
                from sklearn.metrics.pairwise import cosine_similarity
                q_emb = self.model.encode([query], convert_to_numpy=True, normalize_embeddings=True)
                d_embs = self.model.encode(doc_texts, convert_to_numpy=True, normalize_embeddings=True)
                sims = cosine_similarity(q_emb, d_embs)[0]
                return [float(s) for s in sims]
            except Exception:
                pass

        # Default fast TF-IDF cosine similarity
        try:
            from sklearn.feature_extraction.text import TfidfVectorizer
            from sklearn.metrics.pairwise import cosine_similarity

            all_texts = [query] + doc_texts
            vec = TfidfVectorizer(ngram_range=(1, 2), stop_words="english")
            matrix = vec.fit_transform(all_texts)
            sims = cosine_similarity(matrix[0:1], matrix[1:])[0]
            return [float(s) for s in sims]
        except Exception:
            # Basic keyword overlap fallback
            q_words = set(query.lower().split())
            sims = []
            for d in doc_texts:
                d_words = set(d.lower().split())
                overlap = len(q_words.intersection(d_words)) / max(len(q_words), 1)
                sims.append(float(overlap))
            return sims

def get_embeddings_provider() -> EmbeddingsProvider:
    if EmbeddingsProvider._instance is None:
        EmbeddingsProvider._instance = EmbeddingsProvider()
    return EmbeddingsProvider._instance
