"""CLIP encoder implementation."""

import time
from typing import List

import cv2
import numpy as np

from app.models.base import BaseModel


class CLIPEncoder(BaseModel):
    """CLIP model for image embedding extraction."""

    # CLIP normalization parameters (ImageNet stats)
    CLIP_MEAN = np.array([0.48145466, 0.4578275, 0.40821073], dtype=np.float32)
    CLIP_STD = np.array([0.26862954, 0.26130258, 0.27577711], dtype=np.float32)

    def __init__(
        self,
        model_path: str,
        embedding_dim: int = 768,
        input_size: int = 224,
        normalize: bool = True,
        gpu_device: int = 0,
        use_gpu: bool = True,
    ):
        """Initialize CLIP encoder.

        Args:
            model_path: Path to ONNX model
            embedding_dim: Embedding dimension (default: 768)
            input_size: Input image size (default: 224)
            normalize: Whether to L2 normalize embeddings
            gpu_device: GPU device ID
            use_gpu: Use GPU acceleration
        """
        self.embedding_dim = embedding_dim
        self.input_size = input_size
        self.normalize = normalize

        super().__init__(model_path, gpu_device, use_gpu)

    def encode(self, image: np.ndarray) -> np.ndarray:
        """Extract embedding from image.

        Args:
            image: Input image [H, W, 3] in BGR format

        Returns:
            Embedding vector [embedding_dim]

        Raises:
            ValueError: If image is invalid
        """
        if image is None or image.size == 0:
            raise ValueError("Invalid image provided")

        if len(image.shape) != 3 or image.shape[2] != 3:
            raise ValueError(f"Expected image shape (H, W, 3), got {image.shape}")

        # Preprocess
        input_tensor = self.preprocess(image)

        # Inference
        start = time.perf_counter()
        raw_output = self.inference(input_tensor)
        self.last_inference_time_ms = (time.perf_counter() - start) * 1000

        # Postprocess
        embedding = self.postprocess(raw_output)

        return embedding

    def encode_batch(self, images: List[np.ndarray]) -> np.ndarray:
        """Extract embeddings from multiple images.

        Args:
            images: List of input images

        Returns:
            Embedding matrix [batch_size, embedding_dim]
        """
        embeddings = []

        for image in images:
            embedding = self.encode(image)
            embeddings.append(embedding)

        return np.stack(embeddings, axis=0)

    def preprocess(self, image: np.ndarray) -> np.ndarray:
        """Preprocess image for CLIP.

        Args:
            image: Input image [H, W, 3] in BGR format

        Returns:
            Preprocessed tensor [1, 3, input_size, input_size]
        """
        # Convert BGR to RGB
        rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)

        # Resize to input size
        resized = cv2.resize(rgb, (self.input_size, self.input_size), interpolation=cv2.INTER_LINEAR)

        # Convert to float and normalize to [0, 1]
        normalized = resized.astype(np.float32) / 255.0

        # Apply CLIP normalization (mean and std)
        normalized = (normalized - self.CLIP_MEAN) / self.CLIP_STD

        # HWC to CHW
        transposed = np.transpose(normalized, (2, 0, 1))

        # Add batch dimension
        batched = np.expand_dims(transposed, axis=0)

        return batched

    def postprocess(self, raw_output: np.ndarray) -> np.ndarray:
        """Postprocess CLIP output.

        Args:
            raw_output: Model output [1, embedding_dim] or [embedding_dim]

        Returns:
            Embedding vector [embedding_dim]
        """
        # Remove batch dimension if present
        if len(raw_output.shape) == 2:
            embedding = raw_output[0]
        else:
            embedding = raw_output

        # Ensure correct shape
        if len(embedding.shape) != 1:
            raise ValueError(f"Expected 1D embedding, got shape {embedding.shape}")

        # L2 normalization if enabled
        if self.normalize:
            embedding = self._l2_normalize(embedding)

        return embedding.astype(np.float32)

    def _l2_normalize(self, vector: np.ndarray) -> np.ndarray:
        """L2 normalize a vector.

        Args:
            vector: Input vector

        Returns:
            Normalized vector with L2 norm = 1
        """
        norm = np.linalg.norm(vector)
        if norm > 0:
            return vector / norm
        else:
            return vector
