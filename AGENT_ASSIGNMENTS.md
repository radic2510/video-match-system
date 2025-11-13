# Agent Assignments - Detailed Task Breakdown

## ⚠️ MANDATORY RULES FOR ALL AGENTS

Before starting any work, **ALL AGENTS MUST**:

### 1. Follow TDD (Test-Driven Development)
```
🔴 Write Test FIRST → 🟢 Implement → 🔵 Refactor → Commit
```
- **Never** write implementation before tests
- **All tests must pass** before committing
- See `DEVELOPMENT_GUIDELINES.md` for TDD examples

### 2. Feature-Based Commits
- **Commit** after each complete feature (with tests)
- **Push** after 3-5 features or end of day
- **Never commit** failing tests

### 3. Decision Requests
- Need user input? Create `personal/YYYY-MM-DD_NN.md`
- See `personal/README.md` for template
- Examples: architectural choices, resource requests, ambiguous requirements

### 4. Required Reading
- 📖 `DEVELOPMENT_GUIDELINES.md` - TDD workflow and examples
- 📖 `API_CONTRACTS.md` - API specifications (MUST follow exactly)
- 📖 `GIT_STRATEGY.md` - Git workflow and commit conventions

---

## Agent A: Infrastructure Engineer

### Branch: `feature/infrastructure`

### Tasks

#### 1. Docker Compose Setup
**File:** `docker-compose.yml`

```yaml
# Development environment
services:
  - postgres (with pgvector)
  - redis
  - backend
  - ml-service
  - frontend
  - nginx
```

**File:** `docker-compose.prod.yml`
- Production optimizations
- Volume configurations
- Resource limits

**Estimated time:** 4 hours

---

#### 2. PostgreSQL Configuration
**Directory:** `infrastructure/database/`

**Files to create:**
- `init/01-create-db.sql` - Database creation
- `init/02-extensions.sql` - pgvector extension
- `init/03-create-tables.sql` - Initial schema
- `init/04-create-indexes.sql` - Performance indexes
- `init/05-seed-data.sql` - Test data

**Key tables:**
- users
- videos
- video_embeddings (with vector column)
- image_matches
- advertisement_metadata
- display_detections
- ml_inference_logs
- user_feedback

**Estimated time:** 8 hours

---

#### 3. Redis Configuration
**File:** `infrastructure/redis/redis.conf`
- Persistence settings
- Memory limits
- Eviction policy

**Estimated time:** 2 hours

---

#### 4. Nginx Configuration
**File:** `infrastructure/nginx/nginx.conf`
- Reverse proxy setup
- Load balancing
- Static file serving
- WebSocket support

**Estimated time:** 3 hours

---

#### 5. Installation Scripts
**Directory:** `infrastructure/scripts/install/`

**Files:**
- `install.sh` - Main installation script
- `setup-gpu.sh` - CUDA/GPU setup validation
- `setup-models.sh` - Download ML models

**Estimated time:** 4 hours

---

### Deliverables Checklist
- [ ] `docker-compose.yml` working
- [ ] `docker-compose.prod.yml` configured
- [ ] PostgreSQL with pgvector ready
- [ ] Database schema created
- [ ] Redis configured
- [ ] Nginx configured
- [ ] All initialization scripts tested
- [ ] Documentation updated

**Total Duration:** 2-3 days

---

## Agent B: Backend Core Developer

### Branch: `feature/backend-core`

### Tasks

#### 1. Common Module
**Directory:** `backend/common/src/main/kotlin/com/videomatch/common/`

**Packages:**
- `exception/` - Custom exceptions
  - `VideoMatchException.kt`
  - `ResourceNotFoundException.kt`
  - `ValidationException.kt`
  - `InsufficientGPUMemoryException.kt`
- `utils/` - Utility classes
  - `HashUtils.kt`
  - `ImageUtils.kt`
  - `DateTimeUtils.kt`
- `logging/` - Logging configuration
  - `LoggingConfig.kt`
- `validation/` - Input validation
  - `Validators.kt`

**Estimated time:** 1 day

---

#### 2. Core Service - Domain Models
**Directory:** `backend/core-service/src/main/kotlin/com/videomatch/core/domain/model/`

**Models:**
```kotlin
// User.kt
data class User(
    val id: UUID,
    val email: String,
    val name: String,
    val role: UserRole,
    val createdAt: Instant
)

// Advertisement.kt
data class Advertisement(
    val id: UUID,
    val videoPath: String,
    val brandName: String,
    val campaignName: String,
    val metadata: AdvertisementMetadata,
    val createdAt: Instant
)

// Match.kt
data class Match(
    val id: UUID,
    val userId: UUID,
    val videoId: UUID,
    val imagePath: String,
    val confidence: Float,
    val frameNumber: Int,
    val processingTimeMs: Long,
    val createdAt: Instant
)
```

**Estimated time:** 1 day

---

#### 3. Core Service - Repository Layer
**Directory:** `backend/core-service/src/main/kotlin/com/videomatch/core/domain/repository/`

**Repositories:**
- `UserRepository.kt`
- `AdvertisementRepository.kt`
- `MatchRepository.kt`

**Implementation:**
- `infrastructure/persistence/` - JPA implementations

**Estimated time:** 1.5 days

---

#### 4. Core Service - Service Layer
**Directory:** `backend/core-service/src/main/kotlin/com/videomatch/core/domain/service/`

**Services:**
```kotlin
// UserService.kt
interface UserService {
    suspend fun createUser(request: CreateUserRequest): User
    suspend fun getUser(id: UUID): User
    suspend fun updateUser(id: UUID, request: UpdateUserRequest): User
    suspend fun deleteUser(id: UUID)
}

// AdvertisementService.kt
interface AdvertisementService {
    suspend fun uploadAdvertisement(request: UploadVideoRequest): Advertisement
    suspend fun getAdvertisement(id: UUID): Advertisement
    suspend fun listAdvertisements(page: Int, size: Int): Page<Advertisement>
    suspend fun deleteAdvertisement(id: UUID)
}

// MatchService.kt
interface MatchService {
    suspend fun getMatch(id: UUID): Match
    suspend fun listMatches(userId: UUID?, page: Int, size: Int): Page<Match>
    suspend fun getUserMatchHistory(userId: UUID): List<Match>
}
```

**Estimated time:** 2 days

---

#### 5. Core Service - REST API Controllers
**Directory:** `backend/core-service/src/main/kotlin/com/videomatch/core/presentation/controller/`

**Controllers:**
```kotlin
// UserController.kt
@RestController
@RequestMapping("/api/v1/users")
class UserController

// AdvertisementController.kt
@RestController
@RequestMapping("/api/v1/advertisements")
class AdvertisementController

// MatchController.kt
@RestController
@RequestMapping("/api/v1/matches")
class MatchController
```

**Estimated time:** 1.5 days

---

#### 6. Database Migrations
**Directory:** `backend/core-service/src/main/resources/db/migration/`

**Flyway migrations:**
- `V1__init_schema.sql`
- `V2__add_indexes.sql`
- `V3__add_vector_extension.sql`

**Estimated time:** 0.5 days

---

#### 7. Unit Tests
**Directory:** `backend/core-service/src/test/`

**Test coverage:**
- Repository tests with testcontainers
- Service layer tests with MockK
- Controller tests with MockMvc

**Target:** > 80% coverage

**Estimated time:** 1 day

---

### Deliverables Checklist
- [ ] Common module complete
- [ ] Domain models defined
- [ ] Repository layer implemented
- [ ] Service layer implemented
- [ ] REST API controllers working
- [ ] Flyway migrations ready
- [ ] Unit tests > 80% coverage
- [ ] API documentation (Swagger)

**Total Duration:** 7-8 days

---

## Agent C: ML Service Developer

### Branch: `feature/ml-service`

### Tasks

#### 1. Project Structure Setup
**Directory:** `ml-service/`

**Setup:**
```bash
ml-service/
├── app/
│   ├── api/
│   ├── core/
│   ├── models/
│   ├── services/
│   └── utils/
├── tests/
├── requirements/
└── scripts/
```

**Files:**
- `requirements/base.txt`
- `requirements/dev.txt`
- `pyproject.toml`
- `setup.cfg`

**Estimated time:** 2 hours

---

#### 2. Model Loaders (ONNX Runtime)
**Directory:** `ml-service/app/models/`

**Files:**

```python
# base.py
class BaseModel:
    def __init__(self, model_path: str, gpu_device: int = 0)
    def load(self)
    def preprocess(self, input_data)
    def inference(self, preprocessed_input)
    def postprocess(self, raw_output)

# yolo_detector.py
class YOLOv8Detector(BaseModel):
    def detect_display(self, image: np.ndarray) -> List[Detection]

# clip_encoder.py
class CLIPEncoder(BaseModel):
    def encode(self, image: np.ndarray) -> np.ndarray

# dino_encoder.py
class DINOv2Encoder(BaseModel):
    def encode(self, image: np.ndarray) -> np.ndarray

# esrgan_enhancer.py
class RealESRGANEnhancer(BaseModel):
    def enhance(self, image: np.ndarray) -> np.ndarray

# ocr_extractor.py
class PaddleOCRExtractor(BaseModel):
    def extract_text(self, image: np.ndarray) -> List[TextRegion]
```

**Estimated time:** 2 days

---

#### 3. Preprocessing Pipeline
**Directory:** `ml-service/app/services/preprocessing/`

**Files:**

```python
# video_processor.py
class VideoProcessor:
    def process_advertisement_video(self, video_path: str) -> ProcessedVideo

# frame_extractor.py
class AdaptiveFrameExtractor:
    def extract_frames(
        self,
        video_path: str,
        min_fps: float = 0.5,
        max_fps: float = 2.0,
        scene_change_threshold: float = 0.3,
        entropy_threshold: float = 0.6
    ) -> List[Frame]

    def remove_duplicate_frames(
        self,
        frames: List[Frame],
        similarity_threshold: float = 0.95
    ) -> List[Frame]

# image_processor.py
class ImageProcessor:
    def detect_display(self, image: np.ndarray) -> Detection
    def extract_display_region(self, image: np.ndarray, bbox: BBox) -> np.ndarray
    def correct_perspective(self, image: np.ndarray) -> np.ndarray
    def assess_quality(self, image: np.ndarray) -> float
    def enhance_quality(self, image: np.ndarray) -> np.ndarray
```

**Estimated time:** 2.5 days

---

#### 4. Matching Engine
**Directory:** `ml-service/app/services/inference/`

**Files:**

```python
# pipeline.py
class InferencePipeline:
    async def process_viewer_photo(
        self,
        image: np.ndarray,
        priority: str = "normal"
    ) -> MatchResult

# ensemble.py
class EnsembleEmbedding:
    def extract_multiscale_embeddings(
        self,
        image: np.ndarray,
        scales: List[float] = [1.0, 0.75, 0.5]
    ) -> List[Embedding]

    def combine_embeddings(
        self,
        clip_emb: np.ndarray,
        dino_emb: np.ndarray,
        weights: List[float] = [0.6, 0.4]
    ) -> np.ndarray

# matching.py
class AdvancedMatcher:
    def match_with_verification(
        self,
        query_image: np.ndarray,
        candidates: List[Candidate]
    ) -> List[VerifiedMatch]

    def verify_with_sift(self, img1: np.ndarray, img2: np.ndarray) -> float
    def verify_with_color_histogram(self, img1: np.ndarray, img2: np.ndarray) -> float
    def verify_with_ocr(self, img1: np.ndarray, img2: np.ndarray) -> float
    def calculate_final_score(self, scores: Dict[str, float]) -> float
```

**Estimated time:** 3 days

---

#### 5. Vector Database Integration
**Directory:** `ml-service/app/services/vector_db/`

**Files:**

```python
# faiss_client.py
class FAISSVectorStore:
    def __init__(self, index_type: str, dimension: int)
    def add_embeddings(self, embeddings: np.ndarray, metadata: List[Dict])
    def search(self, query: np.ndarray, top_k: int = 30) -> List[SearchResult]
    def save_index(self, path: str)
    def load_index(self, path: str)

# index_manager.py
class VectorIndexManager:
    def select_index_type(self, total_vectors: int) -> IndexConfig
    def build_index(self, embeddings: np.ndarray) -> faiss.Index
    def optimize_index(self)
    def rebuild_schedule(self) -> CronSchedule
```

**Estimated time:** 1.5 days

---

#### 6. Caching Layer
**Directory:** `ml-service/app/services/cache/`

**Files:**

```python
# embedding_cache.py
class TwoTierCache:
    def __init__(
        self,
        memory_cache_size: int = 10_000,
        disk_cache_path: str = "/data/cache"
    )

    def get_or_compute(
        self,
        key: str,
        compute_fn: Callable
    ) -> np.ndarray

    def invalidate(self, key: str)
    def clear_old_entries(self, max_age_hours: int = 24)
```

**Estimated time:** 1 day

---

#### 7. FastAPI Service
**Directory:** `ml-service/app/api/`

**Files:**

```python
# routes/inference.py
@router.post("/inference/detect-display")
async def detect_display(image: UploadFile)

@router.post("/inference/extract-embedding")
async def extract_embedding(image: UploadFile)

@router.post("/inference/match-advertisement")
async def match_advertisement(image: UploadFile)

@router.post("/preprocess/video")
async def preprocess_video(video: UploadFile)

# routes/health.py
@router.get("/health")
async def health_check()

@router.get("/health/models")
async def models_health()
```

**Estimated time:** 1 day

---

#### 8. Testing
**Directory:** `ml-service/tests/`

**Test suites:**
- Unit tests for each model
- Integration tests for pipeline
- Performance benchmarks
- Edge case tests

**Target:** > 75% coverage

**Estimated time:** 1.5 days

---

### Deliverables Checklist
- [ ] All model loaders working with ONNX Runtime
- [ ] Preprocessing pipeline complete
- [ ] Matching engine with verification
- [ ] FAISS vector search integrated
- [ ] Two-tier caching implemented
- [ ] FastAPI endpoints functional
- [ ] Model benchmarks documented
- [ ] Unit tests > 75% coverage
- [ ] Performance tests passing

**Total Duration:** 10-12 days

---

## Agent D: Frontend Developer

### Branch: `feature/frontend`

### Tasks

#### 1. Project Initialization
**Directory:** `frontend/`

**Setup:**
```bash
npx create-next-app@latest frontend --typescript --tailwind --app
cd frontend
npm install shadcn-ui zustand @tanstack/react-query
```

**Estimated time:** 1 hour

---

#### 2. Mock API Client
**Directory:** `frontend/src/lib/api/`

**Files:**

```typescript
// client.ts
export class VideoMatchAPIClient {
  constructor(baseURL: string, useMock: boolean = true)

  async uploadImage(file: File): Promise<UploadResponse>
  async getMatchResult(matchId: string): Promise<MatchResult>
  async listAdvertisements(): Promise<Advertisement[]>
  async getUserHistory(): Promise<Match[]>
}

// mock-server.ts
export class MockAPIServer {
  setupMockHandlers(): MSWHandler[]
}
```

**Estimated time:** 4 hours

---

#### 3. State Management
**Directory:** `frontend/src/stores/`

**Files:**

```typescript
// authStore.ts
interface AuthState {
  user: User | null
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

// matchStore.ts
interface MatchState {
  currentMatch: Match | null
  matchHistory: Match[]
  isProcessing: boolean
  uploadImage: (file: File) => Promise<void>
  fetchHistory: () => Promise<void>
}
```

**Estimated time:** 3 hours

---

#### 4. UI Components
**Directory:** `frontend/src/components/`

**Components:**

```typescript
// features/ImageUpload/ImageUpload.tsx
- Drag & drop zone
- File validation
- Preview
- Upload progress

// features/MatchResult/MatchResult.tsx
- Match confidence display
- Matched video info
- Alternative candidates
- Feedback buttons

// features/VideoPlayer/VideoPlayer.tsx
- Video playback
- Frame navigation
- Timestamp display

// features/ProcessingStatus/ProcessingStatus.tsx
- Real-time status updates (via mock)
- Progress indicator
- Queue position
```

**Estimated time:** 2 days

---

#### 5. Pages
**Directory:** `frontend/src/app/`

**Pages:**

```typescript
// (auth)/login/page.tsx
- Login form
- Form validation

// (dashboard)/page.tsx
- Image upload section
- Recent matches
- Quick stats

// (dashboard)/history/page.tsx
- Match history table
- Filters and search

// (dashboard)/analytics/page.tsx
- Charts and graphs (with mock data)
- Performance metrics

// (dashboard)/admin/advertisements/page.tsx
- Advertisement list
- Upload new video
- Manage existing ads
```

**Estimated time:** 2 days

---

#### 6. Responsive Design
**All components and pages**

**Requirements:**
- Mobile-first approach
- Breakpoints: sm, md, lg, xl
- Touch-friendly interactions

**Estimated time:** 1 day

---

#### 7. Component Tests
**Directory:** `frontend/tests/`

**Test coverage:**
- Component rendering tests
- User interaction tests
- Mock API integration tests

**Estimated time:** 1 day

---

### Deliverables Checklist
- [ ] Next.js project initialized
- [ ] Tailwind + shadcn/ui configured
- [ ] Mock API client working
- [ ] State management with Zustand
- [ ] All UI components complete
- [ ] All pages implemented
- [ ] Responsive design verified
- [ ] Component tests passing
- [ ] Storybook documentation (optional)

**Total Duration:** 5-7 days

---

## Agent E: Backend Integration Engineer

### Branch: `feature/backend-integration`

**Prerequisites:** Agent B completes Core Service

### Tasks

#### 1. Processing Service - Priority Queue
**Directory:** `backend/processing-service/src/main/kotlin/com/videomatch/processing/queue/`

**Files:**

```kotlin
// PriorityQueue.kt
class PriorityProcessingQueue(
    private val maxConcurrent: Int = 4
) {
    fun enqueue(imagePath: String, priority: String): String
    fun processNextBatch()
    private fun calculatePriority(...): Float
    private fun determineBatchSize(): Int
}

// TaskProcessor.kt
class TaskProcessor {
    suspend fun processTask(task: ProcessingTask): MatchResult
}
```

**Estimated time:** 1.5 days

---

#### 2. ML Service Client
**Directory:** `backend/processing-service/src/main/kotlin/com/videomatch/processing/ml/client/`

**Files:**

```kotlin
// MLServiceClient.kt
interface MLServiceClient {
    suspend fun detectDisplay(image: ByteArray): Detection
    suspend fun extractEmbedding(image: ByteArray): Embedding
    suspend fun matchAdvertisement(image: ByteArray): MatchResult
}

// MLServiceGrpcClient.kt
class MLServiceGrpcClient : MLServiceClient {
    // gRPC implementation
}
```

**Estimated time:** 1 day

---

#### 3. Resource Monitoring
**Directory:** `backend/processing-service/src/main/kotlin/com/videomatch/processing/monitoring/`

**Files:**

```kotlin
// ResourceMonitor.kt
class ResourceMonitor {
    @Scheduled(fixedDelay = 5000)
    fun monitorResources()

    private fun getCpuUsage(): Float
    private fun getRamUsage(): Float
    private fun getGpuMemoryUsage(): Float
}

// MetricsCollector.kt
class MetricsCollector {
    fun recordInference(modelName: String, duration: Long)
    fun recordResourceUsage(cpu: Float, ram: Float, gpu: Float)
}
```

**Estimated time:** 0.5 days

---

#### 4. API Gateway
**Directory:** `backend/api-gateway/src/main/kotlin/com/videomatch/gateway/`

**Files:**

```kotlin
// config/SecurityConfig.kt
@Configuration
class SecurityConfig {
    @Bean
    fun securityFilterChain(): SecurityFilterChain
}

// config/WebSocketConfig.kt
@Configuration
class WebSocketConfig : WebSocketMessageBrokerConfigurer

// filter/RateLimitFilter.kt
class RateLimitFilter : OncePerRequestFilter()

// config/RouteConfig.kt
@Configuration
class RouteConfig {
    @Bean
    fun routes(): RouterFunction<ServerResponse>
}
```

**Estimated time:** 1 day

---

#### 5. Integration Tests
**Directory:** `backend/integration-tests/`

**Tests:**
- Backend ↔ ML Service communication
- End-to-end processing flow
- WebSocket communication
- Error handling and retries

**Estimated time:** 0.5 days

---

### Deliverables Checklist
- [ ] Processing Service complete
- [ ] ML Service client (gRPC) working
- [ ] Resource monitoring active
- [ ] API Gateway configured
- [ ] WebSocket support working
- [ ] Integration tests passing
- [ ] Documentation updated

**Total Duration:** 3-4 days

---

## Agent F: Frontend Integration Engineer

### Branch: `feature/frontend-integration`

**Prerequisites:** Agent D completes frontend with mock, Agent E completes integration

### Tasks

#### 1. Real API Client
**Directory:** `frontend/src/lib/api/`

**Updates:**

```typescript
// Switch from mock to real API
const client = new VideoMatchAPIClient(
  process.env.NEXT_PUBLIC_API_URL,
  false // useMock = false
)
```

**Estimated time:** 2 hours

---

#### 2. WebSocket Integration
**Directory:** `frontend/src/hooks/`

**Files:**

```typescript
// useWebSocket.ts
export function useWebSocket(matchId: string) {
  const [status, setStatus] = useState<ProcessingStatus>()
  const [progress, setProgress] = useState<number>(0)

  useEffect(() => {
    const ws = new WebSocket(`${WS_URL}/matches/${matchId}`)
    // Handle messages
  }, [matchId])

  return { status, progress }
}

// Update components to use real-time updates
```

**Estimated time:** 4 hours

---

#### 3. Error Handling
**All components and pages**

**Improvements:**
- Network error handling
- Validation errors display
- Retry mechanisms
- Toast notifications

**Estimated time:** 4 hours

---

#### 4. Admin Dashboard
**Directory:** `frontend/src/app/(dashboard)/admin/`

**Complete pages:**
- Analytics dashboard (real data)
- System monitoring
- User management
- Advertisement management

**Estimated time:** 1 day

---

#### 5. E2E Tests
**Directory:** `frontend/e2e/`

**Tests with Playwright:**
- Complete user flow: login → upload → view result
- Admin flows
- Error scenarios

**Estimated time:** 4 hours

---

### Deliverables Checklist
- [ ] Mock API replaced with real API
- [ ] WebSocket real-time updates working
- [ ] Error handling complete
- [ ] Admin dashboard functional
- [ ] E2E tests passing
- [ ] Performance optimized
- [ ] Documentation updated

**Total Duration:** 2-3 days

---

## Summary

| Agent | Branch | Duration | Dependencies |
|-------|--------|----------|--------------|
| A: Infrastructure | feature/infrastructure | 2-3 days | None |
| B: Backend Core | feature/backend-core | 7-8 days | Agent A (DB) |
| C: ML Service | feature/ml-service | 10-12 days | None |
| D: Frontend | feature/frontend | 5-7 days | None (mock) |
| E: Integration | feature/backend-integration | 3-4 days | Agent B |
| F: Frontend Integration | feature/frontend-integration | 2-3 days | Agent D, E |

**Critical Path:** Agent C (ML Service) - 10-12 days

**Total Calendar Time:** ~16-18 days with parallel execution
