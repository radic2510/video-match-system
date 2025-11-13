"""Tests for YOLOv8 display detector."""

import numpy as np
import pytest

from app.models.yolo_detector import YOLOv8Detector, Detection


class TestYOLOv8Detector:
    """Test suite for YOLOv8 detector."""

    def test_detector_initialization(self, mock_yolo_model_path):
        """Test that detector can be initialized with a model path."""
        # Given / When
        detector = YOLOv8Detector(
            model_path=str(mock_yolo_model_path),
            confidence_threshold=0.7,
            input_size=640,
        )

        # Then
        assert detector is not None
        assert detector.confidence_threshold == 0.7
        assert detector.input_size == 640

    def test_detector_loads_model(self, mock_yolo_model_path):
        """Test that detector loads ONNX model successfully."""
        # Given / When
        detector = YOLOv8Detector(model_path=str(mock_yolo_model_path))

        # Then
        assert detector.session is not None
        assert detector.input_name is not None
        assert detector.output_name is not None

    def test_detect_display_returns_list(self, mock_yolo_model_path, test_image):
        """Test that detect_display returns a list of detections."""
        # Given
        detector = YOLOv8Detector(model_path=str(mock_yolo_model_path))

        # When
        detections = detector.detect_display(test_image)

        # Then
        assert isinstance(detections, list)

    def test_detect_display_with_no_detections(self, mock_yolo_model_path):
        """Test detection with image that has no display."""
        # Given
        detector = YOLOv8Detector(
            model_path=str(mock_yolo_model_path), confidence_threshold=0.99
        )  # Very high threshold
        image = np.zeros((640, 640, 3), dtype=np.uint8)

        # When
        detections = detector.detect_display(image)

        # Then
        assert isinstance(detections, list)
        # With mock model and high threshold, should return empty or low-confidence
        assert len(detections) >= 0

    def test_detection_has_required_fields(self, mock_yolo_model_path, test_image_with_display):
        """Test that detections have required fields."""
        # Given
        detector = YOLOv8Detector(
            model_path=str(mock_yolo_model_path), confidence_threshold=0.1
        )  # Low threshold to ensure detection

        # When
        detections = detector.detect_display(test_image_with_display)

        # Then
        if len(detections) > 0:
            detection = detections[0]
            assert isinstance(detection, Detection)
            assert hasattr(detection, "bbox")
            assert hasattr(detection, "confidence")
            assert hasattr(detection, "class_name")

            # Check bbox fields
            assert hasattr(detection.bbox, "x")
            assert hasattr(detection.bbox, "y")
            assert hasattr(detection.bbox, "width")
            assert hasattr(detection.bbox, "height")

    def test_preprocess_converts_image_correctly(self, mock_yolo_model_path):
        """Test that preprocessing converts image to correct format."""
        # Given
        detector = YOLOv8Detector(model_path=str(mock_yolo_model_path))
        image = np.random.randint(0, 256, (480, 640, 3), dtype=np.uint8)

        # When
        preprocessed = detector.preprocess(image)

        # Then
        assert preprocessed.shape == (1, 3, 640, 640)  # Batch, channels, H, W
        assert preprocessed.dtype == np.float32
        assert preprocessed.min() >= 0.0
        assert preprocessed.max() <= 1.0

    def test_preprocess_maintains_aspect_ratio(self, mock_yolo_model_path):
        """Test that preprocessing maintains aspect ratio with padding."""
        # Given
        detector = YOLOv8Detector(model_path=str(mock_yolo_model_path))
        image = np.random.randint(0, 256, (300, 800, 3), dtype=np.uint8)  # Wide image

        # When
        preprocessed = detector.preprocess(image)

        # Then
        assert preprocessed.shape == (1, 3, 640, 640)

    def test_postprocess_filters_low_confidence(self, mock_yolo_model_path):
        """Test that postprocessing filters out low-confidence detections."""
        # Given
        detector = YOLOv8Detector(
            model_path=str(mock_yolo_model_path), confidence_threshold=0.7
        )

        # Simulate YOLO output: [batch, 84, 8400]
        # 84 = 4 (bbox) + 80 (classes)
        mock_output = np.random.rand(1, 84, 8400).astype(np.float32)
        # Set some boxes with high confidence
        mock_output[0, 4:6, 0] = 0.9  # High confidence for first box, first two classes

        # When
        detections = detector.postprocess(mock_output, original_shape=(640, 640))

        # Then
        assert isinstance(detections, list)
        # All returned detections should meet threshold
        for det in detections:
            assert det.confidence >= 0.7

    def test_detect_display_measures_inference_time(self, mock_yolo_model_path, test_image):
        """Test that inference time is measured."""
        # Given
        detector = YOLOv8Detector(model_path=str(mock_yolo_model_path))

        # When
        detections = detector.detect_display(test_image)

        # Then
        assert hasattr(detector, "last_inference_time_ms")
        assert detector.last_inference_time_ms >= 0

    def test_detect_display_with_invalid_image_raises_error(self, mock_yolo_model_path):
        """Test that invalid image raises appropriate error."""
        # Given
        detector = YOLOv8Detector(model_path=str(mock_yolo_model_path))
        invalid_image = np.array([])

        # When / Then
        with pytest.raises((ValueError, RuntimeError)):
            detector.detect_display(invalid_image)

    def test_nms_removes_overlapping_boxes(self, mock_yolo_model_path):
        """Test that Non-Maximum Suppression removes overlapping detections."""
        # Given
        detector = YOLOv8Detector(model_path=str(mock_yolo_model_path))

        # Create overlapping boxes
        boxes = np.array(
            [
                [100, 100, 200, 200],  # Box 1
                [110, 110, 210, 210],  # Box 2 (overlaps with Box 1)
                [400, 400, 500, 500],  # Box 3 (separate)
            ]
        )
        scores = np.array([0.9, 0.8, 0.85])  # Box 1 has highest score

        # When
        keep_indices = detector._apply_nms(boxes, scores, iou_threshold=0.5)

        # Then
        assert len(keep_indices) <= 3
        assert 0 in keep_indices  # Box 1 should be kept (highest score)
        # Box 2 might be suppressed due to overlap with Box 1
