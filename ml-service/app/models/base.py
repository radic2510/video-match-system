"""Base model class for all ML models."""

import time
from abc import ABC, abstractmethod
from pathlib import Path
from typing import Any, Optional

import numpy as np
import onnxruntime as ort


class BaseModel(ABC):
    """Abstract base class for ML models using ONNX Runtime."""

    def __init__(
        self,
        model_path: str,
        gpu_device: int = 0,
        use_gpu: bool = True,
    ):
        """Initialize the model.

        Args:
            model_path: Path to ONNX model file
            gpu_device: GPU device index (default: 0)
            use_gpu: Whether to use GPU acceleration
        """
        self.model_path = Path(model_path)
        self.gpu_device = gpu_device
        self.use_gpu = use_gpu

        # Performance tracking
        self.last_inference_time_ms: float = 0.0

        # Load model
        self.session: Optional[ort.InferenceSession] = None
        self.input_name: Optional[str] = None
        self.output_name: Optional[str] = None
        self._load_model()

    def _load_model(self) -> None:
        """Load ONNX model with appropriate providers."""
        providers = self._get_providers()

        try:
            self.session = ort.InferenceSession(
                str(self.model_path),
                providers=providers,
            )

            # Get input/output names
            if self.session.get_inputs():
                self.input_name = self.session.get_inputs()[0].name

            if self.session.get_outputs():
                self.output_name = self.session.get_outputs()[0].name

        except Exception as e:
            raise RuntimeError(f"Failed to load model from {self.model_path}: {e}")

    def _get_providers(self) -> list[str]:
        """Get execution providers based on configuration.

        Returns:
            List of provider names in priority order
        """
        if self.use_gpu:
            # Try GPU first, fall back to CPU
            return [
                ("CUDAExecutionProvider", {"device_id": self.gpu_device}),
                "CPUExecutionProvider",
            ]
        else:
            return ["CPUExecutionProvider"]

    def _measure_time(self, func, *args, **kwargs) -> tuple[Any, float]:
        """Measure execution time of a function.

        Returns:
            Tuple of (function result, time in milliseconds)
        """
        start = time.perf_counter()
        result = func(*args, **kwargs)
        elapsed_ms = (time.perf_counter() - start) * 1000
        return result, elapsed_ms

    @abstractmethod
    def preprocess(self, input_data: Any) -> np.ndarray:
        """Preprocess input data for model inference.

        Args:
            input_data: Raw input data

        Returns:
            Preprocessed numpy array ready for inference
        """
        pass

    @abstractmethod
    def postprocess(self, raw_output: np.ndarray, **kwargs) -> Any:
        """Postprocess model output.

        Args:
            raw_output: Raw model output
            **kwargs: Additional parameters for postprocessing

        Returns:
            Processed output in desired format
        """
        pass

    def inference(self, preprocessed_input: np.ndarray) -> np.ndarray:
        """Run inference on preprocessed input.

        Args:
            preprocessed_input: Preprocessed input array

        Returns:
            Raw model output
        """
        if self.session is None:
            raise RuntimeError("Model not loaded")

        if self.input_name is None:
            raise RuntimeError("Input name not determined")

        result = self.session.run(None, {self.input_name: preprocessed_input})
        return result[0] if result else np.array([])
