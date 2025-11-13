"""Tests for PaddleOCR extractor."""

import numpy as np
import pytest

from app.models.ocr_extractor import PaddleOCRExtractor


class TestPaddleOCRExtractor:
    """Test suite for PaddleOCR extractor."""

    def test_extractor_initialization(self):
        """Test that extractor can be initialized."""
        # Given / When
        extractor = PaddleOCRExtractor(lang="en")

        # Then
        assert extractor is not None
        assert extractor.lang == "en"

    def test_extract_text_with_invalid_image_raises_error(self):
        """Test that invalid image raises error."""
        # Given
        extractor = PaddleOCRExtractor()
        invalid_image = np.array([])

        # When / Then
        with pytest.raises(ValueError):
            extractor.extract_text(invalid_image)

    def test_extract_text_returns_list(self):
        """Test that extract_text returns a list."""
        # Given
        extractor = PaddleOCRExtractor()
        image = np.random.randint(0, 256, (640, 640, 3), dtype=np.uint8)

        # When
        result = extractor.extract_text(image)

        # Then
        assert isinstance(result, list)
