"""Real-ESRGAN image enhancer implementation."""

import time

import cv2
import numpy as np

from app.models.base import BaseModel


class RealESRGANEnhancer(BaseModel):
    """Real-ESRGAN model for image super-resolution."""

    def __init__(
        self,
        model_path: str,
        scale: int = 4,
        gpu_device: int = 0,
        use_gpu: bool = True,
    ):
        """Initialize Real-ESRGAN enhancer.

        Args:
            model_path: Path to ONNX model
            scale: Upscaling factor (default: 4x)
            gpu_device: GPU device ID
            use_gpu: Use GPU acceleration
        """
        self.scale = scale
        super().__init__(model_path, gpu_device, use_gpu)

    def enhance(self, image: np.ndarray) -> np.ndarray:
        """Enhance image quality.

        Args:
            image: Input image [H, W, 3] in BGR format

        Returns:
            Enhanced image [H*scale, W*scale, 3]

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
        enhanced = self.postprocess(raw_output, original_shape=original_shape)

        return enhanced

    def preprocess(self, image: np.ndarray) -> np.ndarray:
        """Preprocess image for Real-ESRGAN.

        Args:
            image: Input image [H, W, 3] in BGR format

        Returns:
            Preprocessed tensor [1, 3, H, W]
        """
        # Convert BGR to RGB
        rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)

        # Normalize to [0, 1]
        normalized = rgb.astype(np.float32) / 255.0

        # HWC to CHW
        transposed = np.transpose(normalized, (2, 0, 1))

        # Add batch dimension
        batched = np.expand_dims(transposed, axis=0)

        return batched

    def postprocess(
        self, raw_output: np.ndarray, original_shape: tuple
    ) -> np.ndarray:
        """Postprocess Real-ESRGAN output.

        Args:
            raw_output: Model output [1, 3, H*scale, W*scale]
            original_shape: Original image shape (H, W)

        Returns:
            Enhanced image [H*scale, W*scale, 3] in BGR format
        """
        # Remove batch dimension
        if len(raw_output.shape) == 4:
            output = raw_output[0]
        else:
            output = raw_output

        # CHW to HWC
        output = np.transpose(output, (1, 2, 0))

        # Denormalize from [0, 1] to [0, 255]
        output = np.clip(output * 255.0, 0, 255).astype(np.uint8)

        # Convert RGB to BGR
        bgr = cv2.cvtColor(output, cv2.COLOR_RGB2BGR)

        return bgr
