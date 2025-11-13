"""Image preprocessing for viewer photos."""

import cv2
import numpy as np
from typing import Optional, Tuple

from app.models.yolo_detector import YOLOv8Detector, Detection
from app.models.esrgan_enhancer import RealESRGANEnhancer


class ImageProcessor:
    """Process viewer photos through the detection pipeline."""

    def __init__(
        self,
        yolo_detector: YOLOv8Detector,
        esrgan_enhancer: Optional[RealESRGANEnhancer] = None,
        quality_threshold: float = 0.5,
    ):
        """Initialize image processor.

        Args:
            yolo_detector: Display detector
            esrgan_enhancer: Image enhancer (optional)
            quality_threshold: Threshold for applying enhancement
        """
        self.yolo_detector = yolo_detector
        self.esrgan_enhancer = esrgan_enhancer
        self.quality_threshold = quality_threshold

    def process(self, image: np.ndarray) -> Tuple[np.ndarray, dict]:
        """Process image through the pipeline.

        Args:
            image: Input image [H, W, 3] in BGR format

        Returns:
            Tuple of (processed_image, metadata)

        Raises:
            ValueError: If no display detected
        """
        metadata = {}

        # 1. Detect display
        detections = self.yolo_detector.detect_display(image)
        metadata["detection_time_ms"] = self.yolo_detector.last_inference_time_ms

        if len(detections) == 0:
            raise ValueError("No display detected in image")

        # Use detection with highest confidence
        best_detection = max(detections, key=lambda d: d.confidence)
        metadata["detection_confidence"] = best_detection.confidence

        # 2. Extract display region
        display_region = self.extract_display_region(image, best_detection)

        # 3. Correct perspective
        corrected = self.correct_perspective(display_region)
        metadata["perspective_corrected"] = True

        # 4. Assess quality
        quality_score = self.assess_quality(corrected)
        metadata["quality_score"] = quality_score

        # 5. Enhance if needed
        if quality_score < self.quality_threshold and self.esrgan_enhancer is not None:
            enhanced = self.esrgan_enhancer.enhance(corrected)
            metadata["enhanced"] = True
            metadata["enhancement_time_ms"] = self.esrgan_enhancer.last_inference_time_ms
            processed_image = enhanced
        else:
            metadata["enhanced"] = False
            processed_image = corrected

        return processed_image, metadata

    def extract_display_region(
        self, image: np.ndarray, detection: Detection
    ) -> np.ndarray:
        """Extract display region from image.

        Args:
            image: Full image
            detection: Display detection

        Returns:
            Extracted display region
        """
        bbox = detection.bbox
        x, y, w, h = bbox.x, bbox.y, bbox.width, bbox.height

        # Clip to image boundaries
        h_img, w_img = image.shape[:2]
        x = max(0, x)
        y = max(0, y)
        w = min(w, w_img - x)
        h = min(h, h_img - y)

        region = image[y : y + h, x : x + w]
        return region

    def correct_perspective(self, image: np.ndarray) -> np.ndarray:
        """Correct perspective distortion.

        Args:
            image: Display region image

        Returns:
            Perspective-corrected image
        """
        # Placeholder for perspective correction
        # In production, would use homography transformation
        # For now, just return the image
        return image

    def assess_quality(self, image: np.ndarray) -> float:
        """Assess image quality.

        Args:
            image: Input image

        Returns:
            Quality score [0, 1] where higher is better
        """
        # Convert to grayscale
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

        # Calculate Laplacian variance (sharpness measure)
        laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()

        # Normalize to [0, 1] range
        # Typical sharp images have variance > 100
        quality_score = min(laplacian_var / 200.0, 1.0)

        return float(quality_score)
