"""YOLOv8 display detector implementation."""

import time
from dataclasses import dataclass
from typing import List, Tuple

import cv2
import numpy as np

from app.models.base import BaseModel


@dataclass
class BoundingBox:
    """Bounding box coordinates."""

    x: int
    y: int
    width: int
    height: int


@dataclass
class Detection:
    """Object detection result."""

    bbox: BoundingBox
    confidence: float
    class_name: str


class YOLOv8Detector(BaseModel):
    """YOLOv8 model for display detection."""

    def __init__(
        self,
        model_path: str,
        confidence_threshold: float = 0.7,
        input_size: int = 640,
        iou_threshold: float = 0.45,
        gpu_device: int = 0,
        use_gpu: bool = True,
    ):
        """Initialize YOLOv8 detector.

        Args:
            model_path: Path to ONNX model
            confidence_threshold: Minimum confidence for detections
            input_size: Input image size (default: 640)
            iou_threshold: IoU threshold for NMS
            gpu_device: GPU device ID
            use_gpu: Use GPU acceleration
        """
        self.confidence_threshold = confidence_threshold
        self.input_size = input_size
        self.iou_threshold = iou_threshold

        super().__init__(model_path, gpu_device, use_gpu)

    def detect_display(self, image: np.ndarray) -> List[Detection]:
        """Detect displays in image.

        Args:
            image: Input image [H, W, 3] in BGR format

        Returns:
            List of Detection objects

        Raises:
            ValueError: If image is invalid
        """
        if image is None or image.size == 0:
            raise ValueError("Invalid image provided")

        if len(image.shape) != 3 or image.shape[2] != 3:
            raise ValueError(f"Expected image shape (H, W, 3), got {image.shape}")

        original_shape = image.shape[:2]

        # Preprocess
        input_tensor = self.preprocess(image)

        # Inference
        start = time.perf_counter()
        raw_output = self.inference(input_tensor)
        self.last_inference_time_ms = (time.perf_counter() - start) * 1000

        # Postprocess
        detections = self.postprocess(raw_output, original_shape=original_shape)

        return detections

    def preprocess(self, image: np.ndarray) -> np.ndarray:
        """Preprocess image for YOLOv8.

        Args:
            image: Input image [H, W, 3] in BGR format

        Returns:
            Preprocessed tensor [1, 3, input_size, input_size]
        """
        # Resize with padding to maintain aspect ratio
        resized, _, _ = self._resize_with_padding(image, (self.input_size, self.input_size))

        # Convert BGR to RGB
        rgb = cv2.cvtColor(resized, cv2.COLOR_BGR2RGB)

        # Normalize to [0, 1]
        normalized = rgb.astype(np.float32) / 255.0

        # HWC to CHW
        transposed = np.transpose(normalized, (2, 0, 1))

        # Add batch dimension
        batched = np.expand_dims(transposed, axis=0)

        return batched

    def _resize_with_padding(
        self, image: np.ndarray, target_size: Tuple[int, int]
    ) -> Tuple[np.ndarray, float, Tuple[int, int]]:
        """Resize image with padding to maintain aspect ratio.

        Args:
            image: Input image
            target_size: Target (width, height)

        Returns:
            Tuple of (resized_image, scale, padding)
        """
        h, w = image.shape[:2]
        target_w, target_h = target_size

        # Calculate scale
        scale = min(target_w / w, target_h / h)

        # Calculate new dimensions
        new_w = int(w * scale)
        new_h = int(h * scale)

        # Resize
        resized = cv2.resize(image, (new_w, new_h), interpolation=cv2.INTER_LINEAR)

        # Create padded image
        padded = np.full((target_h, target_w, 3), 114, dtype=np.uint8)  # Gray padding

        # Calculate padding
        pad_w = (target_w - new_w) // 2
        pad_h = (target_h - new_h) // 2

        # Place resized image in center
        padded[pad_h : pad_h + new_h, pad_w : pad_w + new_w] = resized

        return padded, scale, (pad_w, pad_h)

    def postprocess(
        self, raw_output: np.ndarray, original_shape: Tuple[int, int]
    ) -> List[Detection]:
        """Postprocess YOLOv8 output.

        Args:
            raw_output: Model output [1, 84, 8400]
                       84 = 4 (bbox: x, y, w, h) + 80 (class scores)
            original_shape: Original image shape (H, W)

        Returns:
            List of Detection objects
        """
        if raw_output.size == 0:
            return []

        # YOLOv8 output format: [batch, 84, num_boxes]
        if len(raw_output.shape) == 3:
            raw_output = raw_output[0]  # Remove batch dimension

        # Transpose to [num_boxes, 84]
        predictions = raw_output.T

        # Extract boxes and scores
        boxes = predictions[:, :4]  # x, y, w, h
        class_scores = predictions[:, 4:]  # 80 class scores

        # Get max class score and index for each box
        max_scores = np.max(class_scores, axis=1)
        max_classes = np.argmax(class_scores, axis=1)

        # Filter by confidence threshold
        mask = max_scores >= self.confidence_threshold
        boxes = boxes[mask]
        scores = max_scores[mask]
        classes = max_classes[mask]

        if len(boxes) == 0:
            return []

        # Convert from center format to corner format
        x_center, y_center, width, height = boxes.T
        x1 = x_center - width / 2
        y1 = y_center - height / 2
        x2 = x_center + width / 2
        y2 = y_center + height / 2

        boxes_xyxy = np.stack([x1, y1, x2, y2], axis=1)

        # Apply NMS
        keep_indices = self._apply_nms(boxes_xyxy, scores, self.iou_threshold)

        # Scale boxes to original image size
        scale_x = original_shape[1] / self.input_size
        scale_y = original_shape[0] / self.input_size

        detections = []
        for idx in keep_indices:
            x1, y1, x2, y2 = boxes_xyxy[idx]

            # Scale to original size
            x1 = int(x1 * scale_x)
            y1 = int(y1 * scale_y)
            x2 = int(x2 * scale_x)
            y2 = int(y2 * scale_y)

            bbox = BoundingBox(x=x1, y=y1, width=x2 - x1, height=y2 - y1)

            detection = Detection(
                bbox=bbox, confidence=float(scores[idx]), class_name="display"
            )

            detections.append(detection)

        return detections

    def _apply_nms(
        self, boxes: np.ndarray, scores: np.ndarray, iou_threshold: float
    ) -> List[int]:
        """Apply Non-Maximum Suppression.

        Args:
            boxes: Bounding boxes in xyxy format [N, 4]
            scores: Confidence scores [N]
            iou_threshold: IoU threshold for suppression

        Returns:
            List of indices to keep
        """
        if len(boxes) == 0:
            return []

        # Sort by score (descending)
        sorted_indices = np.argsort(scores)[::-1]

        keep = []
        while len(sorted_indices) > 0:
            # Pick box with highest score
            current = sorted_indices[0]
            keep.append(int(current))

            if len(sorted_indices) == 1:
                break

            # Calculate IoU with remaining boxes
            current_box = boxes[current]
            remaining_boxes = boxes[sorted_indices[1:]]

            ious = self._calculate_iou_vectorized(current_box, remaining_boxes)

            # Keep boxes with IoU below threshold
            mask = ious < iou_threshold
            sorted_indices = sorted_indices[1:][mask]

        return keep

    def _calculate_iou_vectorized(
        self, box: np.ndarray, boxes: np.ndarray
    ) -> np.ndarray:
        """Calculate IoU between one box and multiple boxes (vectorized).

        Args:
            box: Single box [4] in xyxy format
            boxes: Multiple boxes [N, 4] in xyxy format

        Returns:
            IoU values [N]
        """
        # Calculate intersection
        x1 = np.maximum(box[0], boxes[:, 0])
        y1 = np.maximum(box[1], boxes[:, 1])
        x2 = np.minimum(box[2], boxes[:, 2])
        y2 = np.minimum(box[3], boxes[:, 3])

        intersection = np.maximum(0, x2 - x1) * np.maximum(0, y2 - y1)

        # Calculate union
        box_area = (box[2] - box[0]) * (box[3] - box[1])
        boxes_area = (boxes[:, 2] - boxes[:, 0]) * (boxes[:, 3] - boxes[:, 1])
        union = box_area + boxes_area - intersection

        # Avoid division by zero
        iou = np.where(union > 0, intersection / union, 0)

        return iou
