"""Two-tier caching for embeddings."""

import hashlib
import time
from pathlib import Path
from typing import Optional, Callable, Dict

import numpy as np


class TwoTierCache:
    """Two-tier cache: memory + disk."""

    def __init__(
        self,
        memory_cache_size: int = 10000,
        disk_cache_path: Optional[Path] = None,
        max_age_hours: int = 24,
    ):
        """Initialize cache.

        Args:
            memory_cache_size: Max number of entries in memory
            disk_cache_path: Path for disk cache
            max_age_hours: Max age of cache entries
        """
        self.memory_cache_size = memory_cache_size
        self.disk_cache_path = disk_cache_path
        self.max_age_seconds = max_age_hours * 3600

        # Memory cache: key -> (embedding, timestamp)
        self.memory_cache: Dict[str, tuple] = {}

        # Stats
        self.hits = 0
        self.misses = 0

    def get_or_compute(
        self, key: str, compute_fn: Callable[[], np.ndarray]
    ) -> np.ndarray:
        """Get embedding from cache or compute it.

        Args:
            key: Cache key (e.g., image hash)
            compute_fn: Function to compute embedding if not cached

        Returns:
            Embedding array
        """
        # Check memory cache
        if key in self.memory_cache:
            embedding, timestamp = self.memory_cache[key]
            if time.time() - timestamp < self.max_age_seconds:
                self.hits += 1
                return embedding

        # Check disk cache
        if self.disk_cache_path is not None:
            disk_embedding = self._load_from_disk(key)
            if disk_embedding is not None:
                self.hits += 1
                # Add to memory cache
                self._add_to_memory(key, disk_embedding)
                return disk_embedding

        # Cache miss - compute
        self.misses += 1
        embedding = compute_fn()

        # Store in caches
        self._add_to_memory(key, embedding)
        if self.disk_cache_path is not None:
            self._save_to_disk(key, embedding)

        return embedding

    def get(self, key: str) -> Optional[np.ndarray]:
        """Get embedding from cache.

        Args:
            key: Cache key

        Returns:
            Embedding or None if not found
        """
        if key in self.memory_cache:
            embedding, timestamp = self.memory_cache[key]
            if time.time() - timestamp < self.max_age_seconds:
                return embedding
        return None

    def set(self, key: str, embedding: np.ndarray) -> None:
        """Store embedding in cache.

        Args:
            key: Cache key
            embedding: Embedding to store
        """
        self._add_to_memory(key, embedding)
        if self.disk_cache_path is not None:
            self._save_to_disk(key, embedding)

    def invalidate(self, key: str) -> None:
        """Remove entry from cache.

        Args:
            key: Cache key
        """
        if key in self.memory_cache:
            del self.memory_cache[key]

        if self.disk_cache_path is not None:
            cache_file = self.disk_cache_path / f"{key}.npy"
            if cache_file.exists():
                cache_file.unlink()

    def clear_old_entries(self) -> int:
        """Remove old entries from cache.

        Returns:
            Number of entries removed
        """
        current_time = time.time()
        removed = 0

        # Clean memory cache
        keys_to_remove = []
        for key, (_, timestamp) in self.memory_cache.items():
            if current_time - timestamp >= self.max_age_seconds:
                keys_to_remove.append(key)

        for key in keys_to_remove:
            del self.memory_cache[key]
            removed += 1

        return removed

    def get_hit_rate(self) -> float:
        """Calculate cache hit rate.

        Returns:
            Hit rate [0, 1]
        """
        total = self.hits + self.misses
        if total == 0:
            return 0.0
        return self.hits / total

    def _add_to_memory(self, key: str, embedding: np.ndarray) -> None:
        """Add to memory cache with LRU eviction."""
        # Simple LRU: remove oldest if full
        if len(self.memory_cache) >= self.memory_cache_size:
            # Find oldest entry
            oldest_key = min(
                self.memory_cache.keys(),
                key=lambda k: self.memory_cache[k][1],
            )
            del self.memory_cache[oldest_key]

        self.memory_cache[key] = (embedding, time.time())

    def _save_to_disk(self, key: str, embedding: np.ndarray) -> None:
        """Save embedding to disk."""
        if self.disk_cache_path is None:
            return

        self.disk_cache_path.mkdir(parents=True, exist_ok=True)
        cache_file = self.disk_cache_path / f"{key}.npy"
        np.save(cache_file, embedding)

    def _load_from_disk(self, key: str) -> Optional[np.ndarray]:
        """Load embedding from disk."""
        if self.disk_cache_path is None:
            return None

        cache_file = self.disk_cache_path / f"{key}.npy"
        if not cache_file.exists():
            return None

        # Check age
        mtime = cache_file.stat().st_mtime
        if time.time() - mtime >= self.max_age_seconds:
            return None

        return np.load(cache_file)

    @staticmethod
    def compute_image_hash(image: np.ndarray) -> str:
        """Compute hash for image to use as cache key.

        Args:
            image: Input image

        Returns:
            Hash string
        """
        # Use image bytes for hashing
        image_bytes = image.tobytes()
        return hashlib.sha256(image_bytes).hexdigest()
