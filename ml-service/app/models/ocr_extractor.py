"""PaddleOCR text extractor implementation."""

from dataclasses import dataclass
from typing import List

import numpy as np


@dataclass
class TextRegion:
    """OCR detected text region."""

    text: str
    confidence: float
    bbox: List[List[int]]  # 4 corner points


class PaddleOCRExtractor:
    """PaddleOCR for text extraction."""

    def __init__(
        self,
        use_angle_cls: bool = True,
        lang: str = "en",
        show_log: bool = False,
    ):
        """Initialize PaddleOCR.

        Args:
            use_angle_cls: Use angle classification
            lang: Language (default: English)
            show_log: Show debug logs
        """
        self.use_angle_cls = use_angle_cls
        self.lang = lang
        self.show_log = show_log

        # For testing without actual PaddleOCR installation
        self.ocr = None
        self.last_inference_time_ms = 0.0

    def extract_text(self, image: np.ndarray) -> List[TextRegion]:
        """Extract text from image.

        Args:
            image: Input image [H, W, 3] in BGR format

        Returns:
            List of TextRegion objects
        """
        if image is None or image.size == 0:
            raise ValueError("Invalid image provided")

        # Placeholder implementation
        # In production, this would use PaddleOCR
        # For now, return empty list for testing
        return []

    def extract_text_simple(self, image: np.ndarray) -> List[str]:
        """Extract only text strings (simplified).

        Args:
            image: Input image

        Returns:
            List of detected text strings
        """
        regions = self.extract_text(image)
        return [region.text for region in regions]
