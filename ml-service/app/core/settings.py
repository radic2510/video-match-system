"""Application settings and configuration."""

from pathlib import Path
from typing import Optional

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings."""

    # Application
    app_name: str = "VideoMatch ML Service"
    app_version: str = "1.0.0"
    debug: bool = False

    # API
    api_key: str = "dev-secret-key"
    host: str = "0.0.0.0"
    port: int = 8000

    # GPU Settings
    gpu_device: int = 0
    cuda_visible_devices: str = "0"
    gpu_memory_threshold: float = 0.85  # 85% threshold

    # Model Paths
    models_dir: Path = Path(__file__).parent.parent.parent / "models"
    yolo_model_path: Optional[Path] = None
    clip_model_path: Optional[Path] = None
    dino_model_path: Optional[Path] = None
    esrgan_model_path: Optional[Path] = None
    ocr_model_path: Optional[Path] = None

    # Inference Settings
    yolo_confidence_threshold: float = 0.7
    yolo_input_size: int = 640

    clip_embedding_dim: int = 768
    dino_embedding_dim: int = 768
    ensemble_weights: list[float] = [0.6, 0.4]  # CLIP, DINO

    # Processing Settings
    max_batch_size: int = 32
    min_batch_size: int = 4
    quality_threshold: float = 0.5  # Use ESRGAN if quality < 0.5

    # Cache Settings
    cache_dir: Path = Path("/data/cache")
    memory_cache_size: int = 10000  # Number of embeddings
    cache_max_age_hours: int = 24

    # FAISS Settings
    faiss_index_type: str = "IVF"  # IVF or HNSW
    faiss_nlist: int = 100  # For IVF
    faiss_nprobe: int = 10
    vector_db_path: Path = Path("/data/vector_index")

    # Performance
    cpu_threshold: float = 0.80
    ram_threshold: float = 0.90

    class Config:
        env_file = ".env"
        env_prefix = "ML_"


# Global settings instance
settings = Settings()
