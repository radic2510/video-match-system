# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Video Match System is an image-to-video matching application that identifies which advertisement video is being displayed in a user-submitted photo. The system uses ML models to detect displays, extract features, and match against a database of advertisement frames.

**Deployment Environment**: On-premises desktop with NVIDIA RTX 3080, Intel i7-11700K, 64GB RAM

## Common Commands

### Development Environment
```bash
# Install all dependencies
make install

# Start development environment (starts databases and all services)
make dev

# Run all tests
make test

# Clean build artifacts
make clean
```

### Individual Service Commands

**Frontend (React/Next.js)**:
```bash
cd frontend
npm install              # Install dependencies
npm run dev             # Start development server (port 3000)
npm test                # Run tests
npm run build           # Production build
npm run lint            # Run linter
```

**Backend (Spring Boot/Kotlin)**:
```bash
cd backend
./gradlew build         # Build all modules
./gradlew test          # Run all tests
./gradlew :core-service:test           # Test specific module
./gradlew bootRun       # Run application (port 8080)
./gradlew :api-gateway:bootRun         # Run specific service
./gradlew clean         # Clean build
```

**ML Service (Python/FastAPI)**:
```bash
cd ml-service
pip install -r requirements/dev.txt   # Install dev dependencies
uvicorn app.main:app --reload         # Start server (port 8000)
pytest                                # Run all tests
pytest tests/unit/                    # Run unit tests only
python -m pytest -v                   # Verbose test output
python scripts/download_models.py     # Download ML models
python scripts/benchmark.py           # Run performance benchmarks
```

### Docker Commands
```bash
# Development environment
docker-compose up -d postgres redis   # Start databases only
docker-compose up                     # Start all services
docker-compose down                   # Stop all services

# Production environment
docker-compose -f docker-compose.prod.yml up --build
docker-compose -f docker-compose.prod.yml down
```

### Database Management
```bash
# Connect to PostgreSQL
psql -h localhost -U videomatch -d videomatch

# Run migrations (Spring Boot uses Flyway)
cd backend && ./gradlew flywayMigrate

# Database backup
./infrastructure/scripts/backup/backup.sh
```

## Architecture Overview

### System Design

The system uses a hybrid architecture with three main components:

1. **Frontend (React/Next.js)**: User interface for image upload and result display
2. **Backend (Spring Boot/Kotlin)**: Business logic, API gateway, and processing coordination
3. **ML Service (Python/FastAPI)**: Machine learning inference pipeline

### ML Pipeline Flow

Images go through a multi-stage pipeline:

1. **Display Detection** (YOLOv8): Detect and extract display region from photo
2. **Perspective Correction**: Correct viewing angle distortions using OpenCV homography
3. **Quality Enhancement** (Real-ESRGAN): Improve low-quality images if needed
4. **Feature Extraction** (CLIP + DINOv2): Extract embeddings using ensemble model
5. **Vector Search** (FAISS): Find candidate matches in vector database
6. **Verification** (SIFT + Color + OCR): Refine results using multiple verification methods
7. **Final Scoring**: Combine all scores to determine best match

### Key Backend Modules

- **api-gateway**: Entry point, authentication, rate limiting, routing
- **core-service**: Business logic, user/advertisement/match management
- **processing-service**: ML pipeline coordination, priority queue, resource monitoring
- **common**: Shared utilities and exception handling

### ML Models

All models use ONNX Runtime with GPU acceleration:
- YOLOv8-Display (25MB): Display detection
- CLIP-ViT-L/14 (890MB): Primary embedding extraction
- DINOv2-base (350MB): Secondary embedding extraction
- Real-ESRGAN-x4 (64MB): Image super-resolution (conditional)
- PaddleOCR (16MB): Text extraction for verification

Total model size: ~1.3GB

## Code Structure Principles

### Backend (Kotlin)

- **Clean Architecture**: Domain → Application → Infrastructure → Presentation layers
- **Coroutines**: Use `suspend` functions and `async`/`await` for parallel processing
- **Null Safety**: Leverage Kotlin's type system, avoid `!!`
- **Immutability**: Prefer `val` over `var`, use data classes
- **Resource Management**: Monitor GPU/CPU/memory usage, implement graceful degradation

**Priority Processing Queue**: The system uses a priority-based queue to handle concurrent image processing requests. Priority is calculated based on:
- User-specified priority level
- Image quality (better quality = higher priority)
- Wait time (increases priority to prevent starvation)

### ML Service (Python)

- **FastAPI**: RESTful API with automatic OpenAPI documentation
- **ONNX Runtime**: GPU-accelerated inference for all models
- **Batch Processing**: Dynamic batch sizing based on GPU memory availability
- **Caching**: Two-tier cache (memory + disk) for embeddings

**Model Loading**: All models are pre-loaded at startup to minimize latency. GPU memory allocation:
- Models: ~3GB (YOLO + CLIP + DINO)
- Inference buffer: ~6GB
- Reserve: ~1GB

### Frontend (React/Next.js)

- **App Router**: Next.js 13+ app directory structure
- **TypeScript**: Strict mode enabled
- **State Management**: Use Zustand or Redux for global state
- **WebSocket**: Real-time updates for processing status
- **shadcn/ui**: Component library for consistent UI

## Performance Optimization

### Desktop Environment Specifics

The system is optimized for a single desktop environment (not distributed):

- **GPU Memory Management**: Actively monitor and manage 10GB VRAM, prevent OOM
- **CPU Utilization**: Leverage 8-core i7 with thread affinity
- **Local Caching**: 20GB disk cache + 10,000 embeddings in memory
- **Batch Processing**: Dynamic batching (4-32 images) based on available resources

### Expected Performance

- Processing time: 500-1500ms per image (depending on quality enhancement)
- Throughput: 500-1000 requests/hour
- Accuracy: 90%+ for typical viewing conditions

### Resource Monitoring

The system monitors and automatically adjusts based on:
- CPU usage threshold: 80%
- RAM usage threshold: 90%
- GPU memory threshold: 85%

When thresholds are exceeded, the system reduces batch size or pauses low-priority tasks.

## Database Schema

Primary tables:
- `users`: User authentication and management
- `videos`: Advertisement video metadata
- `video_embeddings`: Frame embeddings for vector search
- `image_matches`: Matching results and confidence scores
- `advertisement_metadata`: Brand names, colors, text regions, scene info
- `display_detections`: Display detection results and corrections
- `ml_inference_logs`: Model performance metrics
- `user_feedback`: User corrections for model improvement

The schema uses PostgreSQL with pgvector extension for vector operations and time-based partitioning for scalability.

## Testing Strategy

### Unit Tests

- Backend: JUnit 5 + MockK
- ML Service: pytest with fixtures
- Frontend: Jest + React Testing Library

### Integration Tests

- Test full ML pipeline with sample images
- Test API endpoints with real database
- Test WebSocket communication

### Performance Tests

- Measure end-to-end latency
- Test concurrent request handling
- Monitor GPU memory under load
- Verify cache hit rates

### Edge Cases to Test

- Multiple displays in one photo
- Extreme viewing angles (>45°)
- Low quality / blurry images
- Partial occlusion
- Reflections and moiré patterns
- Black and white displays
- Curved displays

## Development Workflow

1. **Feature branches**: Create branch from `main` for each feature
2. **Commit frequently**: After completing each subtask
3. **Testing**: Run relevant tests before committing
4. **Pull Requests**: Merge via PR after testing
5. **Model Updates**: Use A/B testing for model changes (24hr monitoring before rollout)

## GPU and CUDA Setup

The system requires:
- NVIDIA GPU with CUDA support (RTX 3080 recommended)
- CUDA 11.8+ and cuDNN
- NVIDIA driver 520+

ML Service automatically uses GPU 0 via `CUDA_VISIBLE_DEVICES=0` environment variable.

## Configuration Files

- **Backend**: `backend/*/src/main/resources/application.yml`
- **ML Service**: `ml-service/app/core/settings.py`
- **Frontend**: `frontend/.env.local`
- **Docker**: `docker-compose.yml` (dev), `docker-compose.prod.yml` (production)

## Key Implementation Notes

1. **Ensemble Embeddings**: Combine CLIP (60%) + DINOv2 (40%) for better accuracy
2. **Multi-Scale Matching**: Extract embeddings at 100%, 75%, 50% scales with sliding windows
3. **Adaptive Frame Extraction**: Use scene detection and entropy-based filtering to avoid storing duplicate/static frames
4. **Verification Pipeline**: Use multiple signals (embeddings, SIFT features, color histogram, OCR) with weighted scoring
5. **Error Handling**: Graceful degradation when GPU memory is insufficient or models fail

## Maintenance

Daily maintenance tasks run at 3 AM:
- Clean up old logs (30 days retention)
- Clean cache when >80% full
- Database VACUUM
- Vector index optimization
- Performance report generation

## Important Implementation Details

- **Never skip validation**: Always validate display detection confidence before proceeding
- **Memory management**: Check GPU memory before inference operations
- **Priority queue**: Only one task should be `in_progress` at a time
- **Caching**: Always check cache before computing embeddings
- **Logging**: Record inference times and resource usage for all ML operations
- **User feedback**: Store all matching results for potential model retraining
