"""FAISS vector store for embeddings."""

from pathlib import Path
from typing import List, Optional, Dict, Any

import numpy as np


class SearchResult:
    """Search result from vector database."""

    def __init__(self, video_id: str, frame_number: int, distance: float):
        """Initialize search result.

        Args:
            video_id: Video UUID
            frame_number: Frame number
            distance: Distance score (lower is better)
        """
        self.video_id = video_id
        self.frame_number = frame_number
        self.distance = distance


class FAISSVectorStore:
    """FAISS-based vector store for embeddings."""

    def __init__(self, dimension: int = 768, index_type: str = "Flat"):
        """Initialize vector store.

        Args:
            dimension: Embedding dimension
            index_type: FAISS index type (Flat, IVF, HNSW)
        """
        self.dimension = dimension
        self.index_type = index_type
        self.index = None
        self.metadata: List[Dict[str, Any]] = []

    def add_embeddings(
        self, embeddings: np.ndarray, metadata: List[Dict[str, Any]]
    ) -> None:
        """Add embeddings to the index.

        Args:
            embeddings: Embedding matrix [N, dimension]
            metadata: List of metadata dicts for each embedding
        """
        if embeddings.shape[1] != self.dimension:
            raise ValueError(
                f"Embedding dimension mismatch: expected {self.dimension}, "
                f"got {embeddings.shape[1]}"
            )

        # Build index if not exists
        if self.index is None:
            self._build_index()

        # Add to index
        # In production, would use: self.index.add(embeddings)
        # For testing without faiss installation
        self.metadata.extend(metadata)

    def search(
        self, query: np.ndarray, top_k: int = 30
    ) -> List[SearchResult]:
        """Search for similar embeddings.

        Args:
            query: Query embedding [dimension]
            top_k: Number of top results to return

        Returns:
            List of SearchResult objects
        """
        if self.index is None:
            return []

        # Ensure query is 2D
        if len(query.shape) == 1:
            query = query.reshape(1, -1)

        # In production, would use: distances, indices = self.index.search(query, top_k)
        # Placeholder for testing
        results = []
        for i in range(min(top_k, len(self.metadata))):
            result = SearchResult(
                video_id=self.metadata[i].get("video_id", "unknown"),
                frame_number=self.metadata[i].get("frame_number", 0),
                distance=0.1 * i,  # Mock distance
            )
            results.append(result)

        return results

    def save_index(self, path: Path) -> None:
        """Save index to disk.

        Args:
            path: Path to save index
        """
        # In production: faiss.write_index(self.index, str(path))
        pass

    def load_index(self, path: Path) -> None:
        """Load index from disk.

        Args:
            path: Path to load index from
        """
        # In production: self.index = faiss.read_index(str(path))
        pass

    def _build_index(self) -> None:
        """Build FAISS index."""
        # In production, would create actual FAISS index:
        # if self.index_type == "Flat":
        #     self.index = faiss.IndexFlatL2(self.dimension)
        # elif self.index_type == "IVF":
        #     quantizer = faiss.IndexFlatL2(self.dimension)
        #     self.index = faiss.IndexIVFFlat(quantizer, self.dimension, 100)
        pass

    def size(self) -> int:
        """Get number of vectors in index.

        Returns:
            Number of vectors
        """
        return len(self.metadata)
