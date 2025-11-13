"""Pytest configuration and fixtures."""

import tempfile
from pathlib import Path

import numpy as np
import pytest

from tests.fixtures.mock_models import (
    create_mock_yolo_model,
    create_mock_clip_model,
    create_mock_dino_model,
    create_test_image,
    create_test_image_with_display,
)


@pytest.fixture(scope="session")
def temp_models_dir():
    """Create a temporary directory for mock models."""
    with tempfile.TemporaryDirectory() as tmpdir:
        yield Path(tmpdir)


@pytest.fixture(scope="session")
def mock_yolo_model_path(temp_models_dir):
    """Create and return path to mock YOLOv8 model."""
    model_path = temp_models_dir / "yolo_mock.onnx"
    create_mock_yolo_model(str(model_path))
    return model_path


@pytest.fixture(scope="session")
def mock_clip_model_path(temp_models_dir):
    """Create and return path to mock CLIP model."""
    model_path = temp_models_dir / "clip_mock.onnx"
    create_mock_clip_model(str(model_path))
    return model_path


@pytest.fixture(scope="session")
def mock_dino_model_path(temp_models_dir):
    """Create and return path to mock DINOv2 model."""
    model_path = temp_models_dir / "dino_mock.onnx"
    create_mock_dino_model(str(model_path))
    return model_path


@pytest.fixture
def test_image():
    """Create a test image."""
    return create_test_image()


@pytest.fixture
def test_image_with_display():
    """Create a test image with a display region."""
    return create_test_image_with_display()


@pytest.fixture
def sample_embedding():
    """Create a sample embedding vector."""
    return np.random.randn(768).astype(np.float32)


@pytest.fixture
def sample_bbox():
    """Create a sample bounding box."""
    return {
        "x": 100,
        "y": 150,
        "width": 200,
        "height": 300,
    }
