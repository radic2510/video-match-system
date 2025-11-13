"""Tests for DINOv2 encoder."""

import numpy as np
import pytest

from app.models.dino_encoder import DINOv2Encoder


class TestDINOv2Encoder:
    """Test suite for DINOv2 encoder."""

    def test_encoder_initialization(self, mock_dino_model_path):
        """Test that encoder can be initialized with a model path."""
        # Given / When
        encoder = DINOv2Encoder(model_path=str(mock_dino_model_path), embedding_dim=768)

        # Then
        assert encoder is not None
        assert encoder.embedding_dim == 768

    def test_encoder_loads_model(self, mock_dino_model_path):
        """Test that encoder loads ONNX model successfully."""
        # Given / When
        encoder = DINOv2Encoder(model_path=str(mock_dino_model_path))

        # Then
        assert encoder.session is not None
        assert encoder.input_name is not None
        assert encoder.output_name is not None

    def test_encode_returns_correct_shape(self, mock_dino_model_path, test_image):
        """Test that encode returns embedding of correct shape."""
        # Given
        encoder = DINOv2Encoder(model_path=str(mock_dino_model_path), embedding_dim=768)

        # When
        embedding = encoder.encode(test_image)

        # Then
        assert isinstance(embedding, np.ndarray)
        assert embedding.shape == (768,)
        assert embedding.dtype == np.float32

    def test_encode_normalizes_embedding(self, mock_dino_model_path, test_image):
        """Test that embedding is L2 normalized."""
        # Given
        encoder = DINOv2Encoder(
            model_path=str(mock_dino_model_path), normalize=True, embedding_dim=768
        )

        # When
        embedding = encoder.encode(test_image)

        # Then
        # L2 norm should be approximately 1.0
        norm = np.linalg.norm(embedding)
        assert np.isclose(norm, 1.0, atol=1e-5)

    def test_preprocess_resizes_image(self, mock_dino_model_path):
        """Test that preprocessing resizes image correctly."""
        # Given
        encoder = DINOv2Encoder(model_path=str(mock_dino_model_path), input_size=224)
        image = np.random.randint(0, 256, (480, 640, 3), dtype=np.uint8)

        # When
        preprocessed = encoder.preprocess(image)

        # Then
        assert preprocessed.shape == (1, 3, 224, 224)
        assert preprocessed.dtype == np.float32

    def test_encode_measures_inference_time(self, mock_dino_model_path, test_image):
        """Test that inference time is measured."""
        # Given
        encoder = DINOv2Encoder(model_path=str(mock_dino_model_path))

        # When
        _ = encoder.encode(test_image)

        # Then
        assert hasattr(encoder, "last_inference_time_ms")
        assert encoder.last_inference_time_ms >= 0

    def test_encode_with_invalid_image_raises_error(self, mock_dino_model_path):
        """Test that invalid image raises appropriate error."""
        # Given
        encoder = DINOv2Encoder(model_path=str(mock_dino_model_path))
        invalid_image = np.array([])

        # When / Then
        with pytest.raises((ValueError, RuntimeError)):
            encoder.encode(invalid_image)

    def test_encode_batch(self, mock_dino_model_path, test_image):
        """Test batch encoding of multiple images."""
        # Given
        encoder = DINOv2Encoder(model_path=str(mock_dino_model_path), embedding_dim=768)
        images = [test_image, test_image.copy(), test_image.copy()]

        # When
        embeddings = encoder.encode_batch(images)

        # Then
        assert isinstance(embeddings, np.ndarray)
        assert embeddings.shape == (3, 768)
        assert embeddings.dtype == np.float32
