"""Ensemble embedding extraction."""

from typing import List, Tuple

import cv2
import numpy as np

from app.models.clip_encoder import CLIPEncoder
from app.models.dino_encoder import DINOv2Encoder


class EnsembleEmbedding:
    """Combine CLIP and DINOv2 embeddings."""

    def __init__(
        self,
        clip_encoder: CLIPEncoder,
        dino_encoder: DINOv2Encoder,
        weights: Tuple[float, float] = (0.6, 0.4),
    ):
        """Initialize ensemble.

        Args:
            clip_encoder: CLIP encoder
            dino_encoder: DINOv2 encoder
            weights: (clip_weight, dino_weight) - should sum to 1.0
        """
        self.clip_encoder = clip_encoder
        self.dino_encoder = dino_encoder
        self.clip_weight, self.dino_weight = weights

        if not np.isclose(sum(weights), 1.0):
            raise ValueError(f"Weights must sum to 1.0, got {sum(weights)}")

    def extract_embedding(self, image: np.ndarray) -> np.ndarray:
        """Extract ensemble embedding from image.

        Args:
            image: Input image [H, W, 3]

        Returns:
            Ensemble embedding [768]
        """
        # Extract individual embeddings
        clip_emb = self.clip_encoder.encode(image)
        dino_emb = self.dino_encoder.encode(image)

        # Combine with weights
        ensemble = self.combine_embeddings(clip_emb, dino_emb)

        return ensemble

    def extract_multiscale_embeddings(
        self, image: np.ndarray, scales: List[float] = [1.0, 0.75, 0.5]
    ) -> List[np.ndarray]:
        """Extract embeddings at multiple scales.

        Args:
            image: Input image
            scales: List of scale factors

        Returns:
            List of embeddings for each scale
        """
        embeddings = []

        for scale in scales:
            if scale != 1.0:
                h, w = image.shape[:2]
                new_h, new_w = int(h * scale), int(w * scale)
                scaled = cv2.resize(image, (new_w, new_h), interpolation=cv2.INTER_LINEAR)
            else:
                scaled = image

            embedding = self.extract_embedding(scaled)
            embeddings.append(embedding)

        return embeddings

    def combine_embeddings(
        self, clip_emb: np.ndarray, dino_emb: np.ndarray
    ) -> np.ndarray:
        """Combine CLIP and DINOv2 embeddings.

        Args:
            clip_emb: CLIP embedding [768]
            dino_emb: DINOv2 embedding [768]

        Returns:
            Combined embedding [768]
        """
        combined = clip_emb * self.clip_weight + dino_emb * self.dino_weight

        # Normalize
        norm = np.linalg.norm(combined)
        if norm > 0:
            combined = combined / norm

        return combined
