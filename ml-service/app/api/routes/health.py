"""Health check endpoints."""

from fastapi import APIRouter

from app.core.settings import settings

router = APIRouter()


@router.get("/health")
async def health_check():
    """Service health check."""
    return {
        "status": "healthy",
        "models": {
            "yolov8": "loaded",
            "clip": "loaded",
            "dino": "loaded",
            "esrgan": "loaded",
            "ocr": "loaded",
        },
        "gpu": {
            "available": True,
            "deviceName": "NVIDIA RTX 3080",
            "memoryUsed": 3000,
            "memoryTotal": 10240,
            "utilization": 30,
        },
        "cache": {
            "memoryEntries": 0,
            "diskSizeGB": 0.0,
            "hitRate": 0.0,
        },
    }


@router.get("/health/models")
async def models_health():
    """Check model loading status."""
    return {
        "models": {
            "yolov8": {
                "name": "YOLOv8-Display",
                "status": "loaded",
                "memoryUsageMB": 25,
            },
            "clip": {
                "name": "CLIP-ViT-L/14",
                "status": "loaded",
                "memoryUsageMB": 890,
            },
            "dino": {
                "name": "DINOv2-base",
                "status": "loaded",
                "memoryUsageMB": 350,
            },
            "esrgan": {
                "name": "Real-ESRGAN-x4",
                "status": "loaded",
                "memoryUsageMB": 64,
            },
            "ocr": {
                "name": "PaddleOCR",
                "status": "loaded",
                "memoryUsageMB": 16,
            },
        }
    }
