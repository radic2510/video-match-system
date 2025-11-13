"""FastAPI application entry point."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import inference, health
from app.core.settings import settings


# Global model instances (loaded on startup)
models = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan events for model loading/unloading."""
    # Startup: Load models
    print("Loading ML models...")
    # In production, would load real models here
    # models["yolo"] = YOLOv8Detector(settings.yolo_model_path)
    # models["clip"] = CLIPEncoder(settings.clip_model_path)
    # etc.
    print("Models loaded successfully")

    yield

    # Shutdown: Clean up
    print("Shutting down ML service...")
    models.clear()


# Create app
app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="ML inference service for Video Match System",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health.router, prefix="/api/v1", tags=["health"])
app.include_router(inference.router, prefix="/api/v1", tags=["inference"])


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "service": settings.app_name,
        "version": settings.app_version,
        "status": "running",
    }
