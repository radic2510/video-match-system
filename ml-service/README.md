# ML Service

Machine learning inference service for the Video Match System.

## Overview

This service provides ML inference endpoints for:
- Display detection (YOLOv8)
- Feature extraction (CLIP + DINOv2)
- Advertisement matching
- Video preprocessing

## Development

### Setup

```bash
# Install dependencies
pip install -r requirements/dev.txt

# Download models (placeholder for now)
python scripts/download_models.py
```

### Running Tests

```bash
# Run all tests with coverage
pytest

# Run specific test file
pytest tests/unit/test_yolo_detector.py -v

# Run with coverage report
pytest --cov=app --cov-report=html
```

### Running the Service

```bash
# Development mode
uvicorn app.main:app --reload --port 8000

# Production mode
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

## API Documentation

Once running, visit:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Architecture

```
app/
├── api/          # FastAPI routes
├── core/         # Configuration
├── models/       # ML model wrappers (ONNX)
├── services/     # Business logic
│   ├── preprocessing/
│   ├── inference/
│   ├── vector_db/
│   └── cache/
└── utils/        # Utilities
```

## Models

All models use ONNX Runtime for inference:

- **YOLOv8-Display**: Display detection (25MB)
- **CLIP-ViT-L/14**: Primary embeddings (890MB)
- **DINOv2-base**: Secondary embeddings (350MB)
- **Real-ESRGAN-x4**: Image enhancement (64MB)
- **PaddleOCR**: Text extraction (16MB)

## Performance Targets

- Display detection: < 50ms
- Embedding extraction: < 20ms
- Full pipeline: < 1500ms
- Throughput: 500-1000 req/hour
