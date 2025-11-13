# 이미지-비디오 매칭 시스템 아키텍처

## 1. 시스템 개요

### 1.1 비즈니스 컨텍스트
- **광고주**: 15-30초 광고 영상 제공
- **시청자**: 디스플레이 촬영 사진 제출
- **목적**: 어떤 광고가 재생 중인지 자동 식별

### 1.2 기술적 도전과제
- 다양한 촬영 각도/거리
- 조명 반사, 모아레 패턴
- 부분 가림, 흔들림
- 디스플레이 영역 자동 검출

### 1.3 운영 환경
- **배포 환경**: 데스크탑 (온프레미스)
- **시스템 사양**: 
  - CPU: Intel i7-11700K (8코어 16스레드)
  - RAM: 64GB DDR4
  - GPU: NVIDIA RTX 3080 (10GB VRAM)
  - Storage: NVMe SSD 2TB
- **예상 처리량**: 시간당 500-1000건

### 1.4 하이브리드 아키텍쳐 
┌──────────────────────────────────────────────────────────────────┐
│                    Frontend (React/Next.js)                      │
│                   - 이미지 업로드 UI                               │
│                   - 실시간 매칭 결과 표시                           │
│                   - 관리자 대시보드                                 │
└────────────────┬─────────────────────────────────────────────────┘
                 │ WebSocket / REST API
┌────────────────┴─────────────────────────────────────────────────┐
│              Spring Boot API Gateway (Kotlin)                    │
│              - 인증/인가                                          │
│              - Rate Limiting                                     │
│              - Request Routing                                   │
└────────┬──────────────────┬─────────────────┬───────────────────┘
         │                  │                 │
┌────────┴────────┐ ┌───────┴──────┐ ┌───────┴───────────────────┐
│ Business Logic  │ │ ML Pipeline  │ │ Processing Queue Service  │
│ (Spring Boot)   │ │ Coordinator  │ │ (Priority Queue)          │
│                 │ │ (Kotlin)     │ │ - 우선순위 관리            │
│ - 사용자 관리    │ │              │ │ - 배치 처리               │
│ - 광고 관리      │ │ - 모델 선택   │ │ - 리소스 모니터링          │
│ - 결과 저장      │ │ - 파이프라인  │ └───────────────────────────┘
│ - 피드백 수집    │ │   오케스트레이션│
└────────┬────────┘ └───────┬──────┘
         │                  │ gRPC/REST
         │          ┌───────┴──────────────────────────────┐
         │          │     ML Inference Service             │
         │          │     (Python FastAPI)                 │
         │          ├───────────────────────────────────────┤
         │          │ ┌─────────────┐ ┌─────────────────┐ │
         │          │ │YOLOv8       │ │CLIP/DINOv2      │ │
         │          │ │Display      │ │Embedding        │ │
         │          │ │Detection    │ │Extraction       │ │
         │          │ └─────────────┘ └─────────────────┘ │
         │          │ ┌─────────────┐ ┌─────────────────┐ │
         │          │ │Real-ESRGAN  │ │PaddleOCR        │ │
         │          │ │Enhancement  │ │Text Detection   │ │
         │          │ └─────────────┘ └─────────────────┘ │
         │          │        ONNX Runtime (GPU)           │
         │          └───────────────┬───────────────────┘
         │                          │
┌────────┴─────────────┬────────────┴──────────┬──────────────────┐
│   PostgreSQL         │   Vector DB           │  Local Storage   │
│                      │   (FAISS)             │                  │
│ - 사용자 데이터       │                       │ - 원본 이미지     │
│ - 광고 메타데이터     │ - 영상 임베딩         │ - 처리된 이미지   │
│ - 매칭 결과          │ - 인덱스 구조         │ - 모델 파일(1.3GB)│
│ - 피드백             │ - kNN 검색           │ - 썸네일         │
│ - 분석 데이터        │                       │                  │
└──────────────────────┴───────────────────────┴──────────────────┘
                                │
                    ┌───────────┴──────────────┐
                    │   Local Cache Layer      │
                    │   (Memory + Disk)        │
                    │ - 임베딩 캐시            │
                    │ - 결과 캐시              │
                    │ - LRU 정책               │
                    └──────────────────────────┘

시스템 리소스:
- CPU: i7-11700K (8코어 16스레드)
- RAM: 64GB (Spring Boot 32GB, Python 20GB, DB/Cache 12GB)
- GPU: RTX 3080 10GB (모델 로딩 ~3GB, 추론용 ~6GB, 여유 1GB)


## 2. ML 모델 아키텍처

### 2.1 모델 파이프라인
```
┌─────────────────────────────────────────────────┐
│                입력 이미지                       │
└─────────────────┬───────────────────────────────┘
                  ▼
┌─────────────────────────────────────────────────┐
│          Stage 1: 디스플레이 검출               │
│              (YOLOv8-Display)                    │
└─────────────────┬───────────────────────────────┘
                  ▼
┌─────────────────────────────────────────────────┐
│          Stage 2: 영역 추출 & 보정              │
│         (OpenCV Homography + Crop)              │
└─────────────────┬───────────────────────────────┘
                  ▼
┌─────────────────────────────────────────────────┐
│          Stage 3: 품질 개선 (선택적)            │
│            (Real-ESRGAN / Deblur)               │
└─────────────────┬───────────────────────────────┘
                  ▼
┌─────────────────────────────────────────────────┐
│          Stage 4: 특징 추출                     │
│       (CLIP + DINOv2 Ensemble)                  │
└─────────────────┬───────────────────────────────┘
                  ▼
┌─────────────────────────────────────────────────┐
│          Stage 5: 유사도 검색                   │
│         (FAISS/Milvus Vector DB)                │
└─────────────────┬───────────────────────────────┘
                  ▼
┌─────────────────────────────────────────────────┐
│          Stage 6: 정밀 검증                     │
│     (SIFT/ORB + Color Histogram + OCR)          │
└─────────────────┬───────────────────────────────┘
                  ▼
┌─────────────────────────────────────────────────┐
│              최종 매칭 결과                      │
└─────────────────────────────────────────────────┘
```

### 2.2 모델별 상세 스펙

#### 2.2.1 YOLOv8-Display (디스플레이 검출)
```yaml
model:
  name: YOLOv8-Display
  type: Object Detection
  framework: ONNX Runtime
  input_size: [640, 640]
  output: 
    - bounding_boxes: [x, y, width, height]
    - confidence: float
    - class: "display"
  
training:
  dataset: Custom (TV, Monitor, Billboard, Phone)
  images: 10,000+
  augmentation:
    - Various angles
    - Different lighting
    - Partial occlusion
  
performance:
  inference_time: 50ms (RTX 3080)
  mAP: 0.92
  confidence_threshold: 0.7
```

#### 2.2.2 CLIP-ViT-L/14 (주요 임베딩 모델)
```yaml
model:
  name: CLIP-ViT-L/14
  type: Vision Transformer
  framework: ONNX Runtime
  input_size: [3, 224, 224]
  output_dim: 768
  
optimization:
  quantization: INT8
  batch_size: 32
  gpu_memory: 2GB
  
performance:
  inference_time: 15ms per image
  batch_inference: 200ms for 32 images
```

#### 2.2.3 DINOv2-base (보조 임베딩 모델)
```yaml
model:
  name: DINOv2-base
  type: Self-supervised ViT
  framework: ONNX Runtime
  input_size: [3, 224, 224]
  output_dim: 768
  
purpose:
  - Fine-grained visual features
  - Robust to distortions
  - Better at partial matching
```

#### 2.2.4 Real-ESRGAN (선택적 품질 개선)
```yaml
model:
  name: Real-ESRGAN-x4
  type: Super Resolution
  framework: ONNX Runtime
  scale_factor: 4x
  
activation_condition:
  - Image resolution < 224x224
  - Blur detection score > 0.3
  - User configuration enabled
  
performance:
  inference_time: 500ms (RTX 3080)
  quality_improvement: 2-3x PSNR
```

#### 2.2.5 PaddleOCR (텍스트 추출)
```yaml
model:
  name: PaddleOCR-v4
  type: OCR
  components:
    - Text Detection (DB++)
    - Text Recognition (SVTR)
  languages: [ko, en]
  
usage:
  - Brand name extraction
  - Campaign slogan matching
  - Supplementary verification
```

## 3. 처리 플로우 상세

### 3.1 광고 영상 전처리 (오프라인)

```python
def preprocess_advertisement(video_path):
    """광고 영상 사전 처리 및 인덱싱"""
    
    try:
        # 0. 비디오 검증
        if not validate_video(video_path):
            return handle_corrupted_video(video_path)
        
        # 1. 프레임 추출 (적응형 샘플링)
        frames = extract_frames_adaptive(
            video_path,
            min_fps=0.5,
            max_fps=2.0,
            scene_change_threshold=0.3,
            entropy_threshold=0.6  # 정보량 기반 필터링 추가
        )
        
        # 1-1. 중복 프레임 제거
        unique_frames = remove_duplicate_frames(
            frames,
            similarity_threshold=0.95  # 95% 이상 유사한 프레임 제거
        )
        
        # 2. 각 프레임별 다중 임베딩 추출
        embeddings = []
        for frame in unique_frames:
            # CLIP 임베딩
            clip_emb = clip_model.encode(frame)
            
            # DINOv2 임베딩
            dino_emb = dino_model.encode(frame)
            
            # 앙상블 임베딩 (concatenate or weighted average)
            combined_emb = combine_embeddings(clip_emb, dino_emb, weights=[0.6, 0.4])
            
            embeddings.append({
                'frame_number': frame.number,
                'timestamp': frame.timestamp,
                'embedding': combined_emb,
                'thumbnail': save_thumbnail(frame),
                'frame_entropy': calculate_entropy(frame)  # 프레임 정보량 저장
            })
        
        # 3. 추가 메타데이터 추출
        metadata = {
            'dominant_colors': extract_color_palette(unique_frames),
            'text_regions': detect_text_regions(unique_frames),
            'brand_logo': detect_and_encode_logo(unique_frames),
            'scene_transitions': detect_scene_changes(video_path),
            'avg_frame_entropy': calculate_avg_entropy(unique_frames),
            'total_unique_frames': len(unique_frames)
        }
        
        # 4. 벡터 DB 인덱싱
        index_to_vector_db(embeddings, metadata)
        
        return embeddings, metadata
        
    except VideoProcessingError as e:
        log_error(f"Video processing failed: {e}")
        return handle_video_processing_error(video_path, e)

def remove_duplicate_frames(frames, similarity_threshold=0.95):
    """중복 프레임 제거를 통한 저장 공간 최적화"""
    unique_frames = []
    prev_embedding = None
    
    for frame in frames:
        curr_embedding = get_quick_embedding(frame)  # 빠른 해싱 기반 임베딩
        
        if prev_embedding is None:
            unique_frames.append(frame)
        else:
            similarity = cosine_similarity(prev_embedding, curr_embedding)
            if similarity < similarity_threshold:
                unique_frames.append(frame)
                prev_embedding = curr_embedding
    
    return unique_frames

def calculate_entropy(frame):
    """프레임의 정보량 계산 (정적 장면 필터링용)"""
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    hist = cv2.calcHist([gray], [0], None, [256], [0, 256])
    hist = hist.ravel() / hist.sum()
    
    # Shannon entropy
    entropy = -np.sum(hist * np.log2(hist + 1e-10))
    return entropy
```

### 3.2 시청자 사진 처리 (온라인)

```python
def process_viewer_photo(image_path, priority_level='normal'):
    """시청자가 촬영한 사진 처리 with 우선순위 큐 지원"""
    
    # 0. 우선순위 큐에 작업 추가
    task_id = processing_queue.enqueue(
        image_path, 
        priority=get_priority_score(priority_level, image_path)
    )
    
    # 1. 디스플레이 검출
    detections = yolo_model.detect(image_path)
    if not detections:
        return handle_no_display_found()
    
    # 가장 확실한 디스플레이 선택
    best_display = max(detections, key=lambda x: x.confidence)
    
    # 2. 디스플레이 영역 추출
    display_region = crop_region(image, best_display.bbox)
    
    # 3. 왜곡 보정 (필요시)
    if is_perspective_distorted(display_region):
        display_region = correct_perspective(display_region)
    
    # 4. 품질 평가 및 개선
    quality_score = assess_image_quality(display_region)
    if quality_score < 0.5:
        # 저품질 이미지 개선
        display_region = enhance_image(display_region)
    
    # 5. 노이즈 제거
    display_region = remove_noise(display_region)
    
    # 6. 임베딩 추출 (다중 스케일)
    embeddings = extract_multiscale_embeddings(display_region)
    
    # 7. 벡터 검색
    candidates = vector_search(embeddings, top_k=30)
    
    # 8. 정밀 검증
    verified_matches = verify_matches(display_region, candidates)
    
    # 9. 최종 결과
    result = select_best_match(verified_matches)
    
    # 10. 처리 완료 알림
    processing_queue.mark_complete(task_id, result)
    
    return result
```

### 3.3 다중 스케일 매칭

```python
def extract_multiscale_embeddings(image):
    """다양한 스케일에서 임베딩 추출"""
    
    scales = [1.0, 0.75, 0.5]  # 원본, 75%, 50%
    embeddings = []
    
    for scale in scales:
        # 리사이즈
        scaled_image = resize(image, scale)
        
        # 슬라이딩 윈도우 (scale에 따라 다르게)
        windows = generate_sliding_windows(
            scaled_image,
            window_size=224,
            stride=112 if scale == 1.0 else 224
        )
        
        for window in windows:
            # CLIP 임베딩
            clip_emb = clip_model.encode(window)
            embeddings.append(clip_emb)
            
            # 빠른 매칭을 위해 상위 N개만 유지
            if len(embeddings) > 10:
                embeddings = filter_top_embeddings(embeddings)
    
    return embeddings
```

### 3.4 실시간 처리 최적화

```kotlin
package com.videomatch.ml.processing

import java.util.concurrent.PriorityBlockingQueue
import kotlinx.coroutines.*

/**
 * 우선순위 기반 처리 큐
 * 데스크탑 환경에서 효율적인 리소스 활용
 */
class PriorityProcessingQueue(
    private val maxConcurrent: Int = 4  // RTX 3080 기준 동시 처리 수
) {
    
    private val queue = PriorityBlockingQueue<ProcessingTask>(
        100,
        compareByDescending { it.priority }
    )
    
    private val processingScope = CoroutineScope(
        Dispatchers.Default + SupervisorJob()
    )
    
    data class ProcessingTask(
        val id: String,
        val imagePath: String,
        val priority: Float,
        val timestamp: Long = System.currentTimeMillis(),
        val callback: (MatchResult) -> Unit
    )
    
    fun enqueue(
        imagePath: String,
        priorityLevel: String = "normal"
    ): String {
        val taskId = UUID.randomUUID().toString()
        val priority = calculatePriority(imagePath, priorityLevel)
        
        val task = ProcessingTask(
            id = taskId,
            imagePath = imagePath,
            priority = priority,
            callback = { /* 결과 처리 */ }
        )
        
        queue.offer(task)
        processNextBatch()
        
        return taskId
    }
    
    private fun calculatePriority(
        imagePath: String,
        priorityLevel: String
    ): Float {
        var priority = when (priorityLevel) {
            "high" -> 1.0f
            "normal" -> 0.5f
            "low" -> 0.2f
            else -> 0.5f
        }
        
        // 이미지 품질 기반 우선순위 조정
        val preliminaryQuality = assessQuickQuality(imagePath)
        priority *= preliminaryQuality
        
        // 대기 시간 기반 보정 (오래 기다린 작업 우선순위 상승)
        val waitTime = System.currentTimeMillis() - task.timestamp
        if (waitTime > 5000) {  // 5초 이상 대기
            priority *= 1.5f
        }
        
        return priority.coerceIn(0f, 2f)
    }
    
    private fun processNextBatch() {
        processingScope.launch {
            while (queue.isNotEmpty()) {
                val batch = mutableListOf<ProcessingTask>()
                
                // GPU 메모리를 고려한 배치 크기 결정
                val batchSize = determineBatchSize()
                
                repeat(batchSize) {
                    queue.poll()?.let { batch.add(it) }
                }
                
                if (batch.isNotEmpty()) {
                    processBatch(batch)
                }
            }
        }
    }
    
    private fun determineBatchSize(): Int {
        // RTX 3080 10GB VRAM 기준 동적 배치 크기 결정
        val availableMemory = getAvailableGPUMemory()
        return when {
            availableMemory > 8000 -> 32  // 8GB 이상 여유
            availableMemory > 4000 -> 16  // 4GB 이상 여유
            availableMemory > 2000 -> 8   // 2GB 이상 여유
            else -> 4  // 최소 배치
        }
    }
}
```

### 3.5 벡터 DB 인덱싱 전략

```python
class VectorIndexStrategy:
    """벡터 DB 인덱싱 전략 관리"""
    
    def __init__(self, total_vectors: int):
        self.total_vectors = total_vectors
        self.index_type = self._select_index_type()
        self.shard_strategy = self._determine_sharding()
        
    def _select_index_type(self):
        """데이터 규모에 따른 인덱스 타입 선택"""
        if self.total_vectors < 100_000:
            # 소규모: 정확도 우선
            return {
                'type': 'FLAT',  # 브루트포스 검색
                'metric': 'L2'
            }
        elif self.total_vectors < 1_000_000:
            # 중규모: HNSW (Hierarchical Navigable Small World)
            return {
                'type': 'HNSW',
                'M': 16,  # 연결 수
                'ef_construction': 200,
                'ef_search': 100
            }
        else:
            # 대규모: IVF (Inverted File Index)
            return {
                'type': 'IVF_PQ',
                'nlist': int(math.sqrt(self.total_vectors)),  # 클러스터 수
                'nprobe': 32,  # 검색할 클러스터 수
                'm': 8,  # PQ 서브벡터 수
            }
    
    def _determine_sharding(self):
        """샤딩 전략 결정"""
        if self.total_vectors < 500_000:
            return {'enabled': False}
        
        # 광고 ID 기반 샤딩
        return {
            'enabled': True,
            'strategy': 'hash',  # 해시 기반 샤딩
            'num_shards': max(2, self.total_vectors // 500_000),
            'replication_factor': 1  # 데스크탑 환경이므로 복제 불필요
        }
    
    def rebuild_schedule(self):
        """인덱스 리빌딩 주기 결정"""
        # 새벽 시간대 자동 리빌딩
        return {
            'enabled': True,
            'schedule': '0 3 * * *',  # 매일 새벽 3시
            'condition': 'fragmentation > 0.3 or days_since_last_rebuild > 7'
        }
```

## 4. 데이터베이스 스키마 보완

### 4.1 추가 테이블

```sql
-- 광고 메타데이터 테이블
CREATE TABLE advertisement_metadata (
    id UUID PRIMARY KEY,
    video_id UUID REFERENCES videos(id),
    brand_name VARCHAR(100),
    campaign_name VARCHAR(200),
    dominant_colors JSONB,  -- [{color: '#FF5733', percentage: 0.23}, ...]
    text_regions JSONB,     -- [{text: '브랜드명', bbox: [x,y,w,h]}, ...]
    logo_embedding vector(512),
    scene_count INTEGER,
    avg_frame_entropy FLOAT,  -- 프레임 정보량 평균
    total_unique_frames INTEGER,  -- 중복 제거 후 프레임 수
    created_at TIMESTAMP DEFAULT NOW()
);

-- 디스플레이 검출 결과
CREATE TABLE display_detections (
    id UUID PRIMARY KEY,
    image_match_id UUID REFERENCES image_matches(id),
    original_image_path TEXT,
    detection_bbox JSONB,  -- {x, y, width, height}
    detection_confidence FLOAT,
    perspective_corrected BOOLEAN DEFAULT FALSE,
    corrected_image_path TEXT,
    quality_score FLOAT,
    enhancement_applied BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ML 모델 실행 로그
CREATE TABLE ml_inference_logs (
    id UUID PRIMARY KEY,
    model_name VARCHAR(50),
    model_version VARCHAR(20),
    input_size INTEGER,
    inference_time_ms INTEGER,
    gpu_memory_used_mb INTEGER,
    batch_size INTEGER,
    success BOOLEAN,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 품질 제어 테이블
CREATE TABLE quality_control (
    id UUID PRIMARY KEY,
    image_match_id UUID,
    quality_score FLOAT,
    failure_reason VARCHAR(200),
    retry_count INT DEFAULT 0,
    should_manual_review BOOLEAN DEFAULT FALSE,
    reviewed_at TIMESTAMP
);

-- 사용자 피드백 수집
CREATE TABLE user_feedback (
    id UUID PRIMARY KEY,
    match_id UUID REFERENCES image_matches(id),
    is_correct BOOLEAN,
    correct_video_id UUID,
    feedback_type VARCHAR(50), -- 'wrong_match', 'no_match', 'partial_match'
    user_comment TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 분석용 집계 테이블
CREATE TABLE match_analytics_daily (
    date DATE PRIMARY KEY,
    total_matches INT,
    unique_users INT,
    avg_confidence FLOAT,
    top_matched_videos JSONB,
    processing_time_p50 FLOAT,
    processing_time_p99 FLOAT,
    gpu_utilization_avg FLOAT,
    memory_usage_max_gb FLOAT
);

-- 인덱스 전략
CREATE INDEX idx_matches_created_at ON image_matches(created_at DESC);
CREATE INDEX idx_matches_user_video ON image_matches(user_id, video_id);
CREATE INDEX idx_embeddings_video_frame ON video_embeddings(video_id, frame_number);
CREATE INDEX idx_inference_logs_model_time ON ml_inference_logs(model_name, created_at DESC);
CREATE INDEX idx_feedback_match_id ON user_feedback(match_id);

-- 파티셔닝 전략 (시간 기반 - 로컬 스토리지 관리)
CREATE TABLE image_matches_2025_01 PARTITION OF image_matches
    FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
```

## 5. Spring Boot 애플리케이션 구현

### 5.1 Configuration

```kotlin
package com.videomatch.config

import org.springframework.context.annotation.Configuration
import org.springframework.context.annotation.Bean
import org.springframework.boot.context.properties.ConfigurationProperties
import javax.sql.DataSource
import com.zaxxer.hikari.HikariConfig
import com.zaxxer.hikari.HikariDataSource

@Configuration
@ConfigurationProperties(prefix = "app.ml")
class MLConfiguration {
    var modelPath: String = "/models"
    var maxBatchSize: Int = 32
    var gpuMemoryLimit: Int = 9000  // 9GB (RTX 3080 10GB 중 1GB 여유)
    var onnxThreads: Int = 8  // i7-11700K 8코어 활용
    
    @Bean
    fun modelManager(): MLModelManager {
        return MLModelManager(
            modelPath = modelPath,
            config = MLConfig(
                maxBatchSize = maxBatchSize,
                gpuMemoryLimit = gpuMemoryLimit,
                onnxInterOpThreads = onnxThreads / 2,
                onnxIntraOpThreads = onnxThreads
            )
        )
    }
}

@Configuration
class DatabaseConfig {
    @Bean
    fun dataSource(): DataSource {
        val config = HikariConfig().apply {
            jdbcUrl = "jdbc:postgresql://localhost:5432/videomatch"
            username = "videomatch"
            password = "password"
            maximumPoolSize = 20  // 로컬 환경
            minimumIdle = 5
            connectionTimeout = 30000
            idleTimeout = 600000
            maxLifetime = 1800000
        }
        return HikariDataSource(config)
    }
}

@Configuration
class DesktopOptimizationConfig {
    @Bean
    fun resourceMonitor(): ResourceMonitor {
        return ResourceMonitor(
            cpuThreshold = 0.8f,  // CPU 80% 이상 시 알림
            ramThreshold = 0.9f,   // RAM 90% 이상 시 알림
            gpuMemoryThreshold = 0.85f  // GPU 메모리 85% 이상 시 알림
        )
    }
    
    @Bean
    fun localCacheManager(): LocalCacheManager {
        // 로컬 캐시 활용 (Redis 대신)
        return LocalCacheManager(
            maxSizeGb = 10,  // 10GB 캐시
            evictionPolicy = "LRU",
            ttlHours = 24
        )
    }
}
```

### 5.2 ML 모델 관리

```kotlin
package com.videomatch.ml

import org.springframework.stereotype.Service
import ai.onnxruntime.*
import org.opencv.core.Mat
import kotlinx.coroutines.*
import java.util.concurrent.atomic.AtomicLong

@Service
class MLModelManager(
    private val modelPath: String,
    private val config: MLConfig
) {
    private val env: OrtEnvironment = OrtEnvironment.getEnvironment()
    private val sessionOptions: OrtSession.SessionOptions
    
    // 모델 세션들
    private lateinit var yoloSession: OrtSession
    private lateinit var clipSession: OrtSession
    private lateinit var dinoSession: OrtSession
    private lateinit var esrganSession: OrtSession
    
    // GPU 메모리 추적
    private val currentGpuMemory = AtomicLong(0)
    
    init {
        sessionOptions = OrtSession.SessionOptions().apply {
            // GPU 프로바이더 설정 (RTX 3080)
            addCUDA(0)  // GPU 0번 사용
            setInterOpNumThreads(config.onnxInterOpThreads)
            setIntraOpNumThreads(config.onnxIntraOpThreads)
            setMemoryPatternOptimization(true)
            setExecutionMode(OrtSession.SessionOptions.ExecutionMode.SEQUENTIAL)
        }
        
        loadModels()
    }
    
    private fun loadModels() {
        // 모델 로딩 (순차적으로 메모리 관리)
        yoloSession = env.createSession(
            "$modelPath/yolov8-display.onnx",
            sessionOptions
        )
        updateGpuMemory(25)  // 25MB
        
        clipSession = env.createSession(
            "$modelPath/clip-vit-l-14.onnx",
            sessionOptions
        )
        updateGpuMemory(890)  // 890MB
        
        dinoSession = env.createSession(
            "$modelPath/dinov2-base.onnx",
            sessionOptions
        )
        updateGpuMemory(350)  // 350MB
        
        // Real-ESRGAN은 필요시만 로드
    }
    
    fun detectDisplay(image: Mat): List<Detection> {
        ensureGpuMemory(100)  // 추론에 필요한 메모리 확보
        
        val input = preprocessForYolo(image)
        val output = yoloSession.run(mapOf("images" to input))
        
        return parseYoloOutput(output)
    }
    
    fun extractCLIPEmbedding(image: Mat): FloatArray {
        ensureGpuMemory(200)
        
        val input = preprocessForCLIP(image)
        val output = clipSession.run(mapOf("pixel_values" to input))
        
        return output[0].value as FloatArray
    }
    
    fun extractDINOEmbedding(image: Mat): FloatArray {
        ensureGpuMemory(200)
        
        val input = preprocessForDINO(image)
        val output = dinoSession.run(mapOf("pixel_values" to input))
        
        return output[0].value as FloatArray
    }
    
    fun ensembleEmbeddings(
        clipEmb: FloatArray,
        dinoEmb: FloatArray,
        weights: FloatArray = floatArrayOf(0.6f, 0.4f)
    ): FloatArray {
        // 가중 평균 앙상블
        return FloatArray(clipEmb.size) { i ->
            clipEmb[i] * weights[0] + dinoEmb[i] * weights[1]
        }
    }
    
    private fun ensureGpuMemory(requiredMb: Long) {
        if (currentGpuMemory.get() + requiredMb > config.gpuMemoryLimit) {
            // 메모리 부족 시 캐시 정리 또는 대기
            clearUnusedCache()
            
            if (currentGpuMemory.get() + requiredMb > config.gpuMemoryLimit) {
                throw InsufficientGPUMemoryException(
                    "Required: ${requiredMb}MB, Available: ${config.gpuMemoryLimit - currentGpuMemory.get()}MB"
                )
            }
        }
    }
    
    private fun updateGpuMemory(deltaMb: Long) {
        currentGpuMemory.addAndGet(deltaMb)
    }
    
    fun assessImageQuality(image: Mat): Float {
        // 1. 블러 검출 (라플라시안 분산)
        val gray = Mat()
        Imgproc.cvtColor(image, gray, Imgproc.COLOR_BGR2GRAY)
        
        val laplacian = Mat()
        Imgproc.Laplacian(gray, laplacian, CvType.CV_64F)
        
        val mean = MatOfDouble()
        val std = MatOfDouble()
        Core.meanStdDev(laplacian, mean, std)
        
        val sharpness = std.get(0, 0)[0].toFloat() / 100f
        
        // 2. 밝기 평가
        val brightness = Core.mean(gray).`val`[0].toFloat() / 255f
        
        // 3. 대비 평가
        val contrast = (Core.minMaxLoc(gray).maxVal - Core.minMaxLoc(gray).minVal).toFloat() / 255f
        
        // 종합 점수 (0~1)
        return (sharpness * 0.5f + brightness * 0.25f + contrast * 0.25f).coerceIn(0f, 1f)
    }
}
```

### 5.3 매칭 엔진

```kotlin
package com.videomatch.ml.matching

import org.springframework.stereotype.Service
import kotlinx.coroutines.*
import java.util.concurrent.ConcurrentHashMap

@Service
class AdvancedMatchingEngine(
    private val modelManager: MLModelManager,
    private val vectorStore: VectorStoreService,
    private val ocrService: OCRService,
    private val processingQueue: PriorityProcessingQueue
) {
    
    suspend fun matchPhoto(processedPhoto: ProcessedPhoto): MatchResult = coroutineScope {
        // 1. 다중 스케일 임베딩 추출
        val embeddings = async { 
            extractMultiScaleEmbeddings(processedPhoto.processedImage) 
        }
        
        // 2. OCR 텍스트 추출 (병렬)
        val textContent = async { 
            ocrService.extractText(processedPhoto.processedImage) 
        }
        
        // 3. 색상 히스토그램 (병렬)
        val colorHist = async { 
            extractColorHistogram(processedPhoto.processedImage) 
        }
        
        // 4. 벡터 검색
        val candidates = embeddings.await().flatMap { embedding ->
            vectorStore.search(embedding, topK = 10)
        }.distinctBy { it.videoId }
            .take(30)
        
        // 5. 정밀 검증
        val verifiedMatches = candidates.map { candidate ->
            val scores = ConcurrentHashMap<String, Float>()
            
            // 임베딩 유사도
            scores["embedding"] = candidate.similarity
            
            // 텍스트 매칭
            val text = textContent.await()
            if (text.isNotEmpty()) {
                scores["text"] = matchText(text, candidate.metadata.textRegions)
            }
            
            // 색상 매칭
            scores["color"] = matchColorHistogram(
                colorHist.await(), 
                candidate.metadata.dominantColors
            )
            
            // SIFT 특징점 매칭 (상위 후보만)
            if (candidate.similarity > 0.8) {
                scores["sift"] = matchSIFTFeatures(
                    processedPhoto.processedImage,
                    loadFrame(candidate.videoId, candidate.frameNumber)
                )
            }
            
            VerifiedMatch(
                videoId = candidate.videoId,
                frameNumber = candidate.frameNumber,
                scores = scores,
                finalScore = calculateFinalScore(scores)
            )
        }
        
        // 6. 최종 선택
        val bestMatch = verifiedMatches.maxByOrNull { it.finalScore }
        
        return@coroutineScope MatchResult(
            matched = bestMatch,
            confidence = bestMatch?.finalScore ?: 0f,
            alternativeCandidates = verifiedMatches
                .sortedByDescending { it.finalScore }
                .take(5)
        )
    }
    
    private fun extractMultiScaleEmbeddings(image: Mat): List<Embedding> {
        val embeddings = mutableListOf<Embedding>()
        val scales = listOf(1.0f, 0.75f, 0.5f)
        
        for (scale in scales) {
            val scaled = resizeImage(image, scale)
            val windows = if (scale == 1.0f) {
                // 원본 크기에서는 슬라이딩 윈도우
                generateSlidingWindows(scaled, 224, stride = 112)
            } else {
                // 축소된 이미지는 전체
                listOf(scaled)
            }
            
            windows.forEach { window ->
                // CLIP + DINOv2 앙상블
                val clipEmb = modelManager.extractCLIPEmbedding(window)
                val dinoEmb = modelManager.extractDINOEmbedding(window)
                val ensemble = modelManager.ensembleEmbeddings(clipEmb, dinoEmb)
                
                embeddings.add(Embedding(
                    vector = ensemble,
                    scale = scale,
                    position = getWindowPosition(window)
                ))
            }
        }
        
        return embeddings
    }
    
    private fun calculateFinalScore(scores: Map<String, Float>): Float {
        val weights = mapOf(
            "embedding" to 0.4f,
            "sift" to 0.3f,
            "color" to 0.15f,
            "text" to 0.15f
        )
        
        return scores.entries.sumOf { (key, value) ->
            (weights[key] ?: 0f) * value
        }.toFloat()
    }
}
```

## 6. 성능 최적화 전략

### 6.1 데스크탑 환경 최적화

```kotlin
@Configuration
class DesktopPerformanceConfig {
    
    @Bean
    fun gpuMemoryManager(): GPUMemoryManager {
        return GPUMemoryManager(
            maxBatchSize = 32,
            modelCacheSize = 3,  // YOLO, CLIP, DINO
            dynamicBatching = true,
            memoryLimit = 9_000,  // 9GB (RTX 3080 10GB 중 1GB 여유)
            preloadModels = true  // 시작 시 모든 모델 미리 로드
        )
    }
    
    @Bean
    fun cpuOptimizer(): CPUOptimizer {
        return CPUOptimizer(
            cores = 8,  // i7-11700K
            threads = 16,
            affinityMask = 0xFF,  // 모든 코어 사용
            turboBoostEnabled = true
        )
    }
    
    @Bean
    fun localStorageOptimizer(): LocalStorageOptimizer {
        return LocalStorageOptimizer(
            basePath = "/data/videomatch",
            useSSD = true,
            enableCompression = true,
            maxCacheSizeGb = 20,  // 20GB 로컬 캐시
            cleanupSchedule = "0 4 * * *"  // 매일 새벽 4시 정리
        )
    }
}
```

### 6.2 캐싱 전략 (로컬 환경)

```kotlin
@Service
class LocalEmbeddingCache(
    private val cacheDir: Path = Paths.get("/data/cache/embeddings")
) {
    private val memoryCache = ConcurrentHashMap<String, FloatArray>()
    private val maxMemoryCacheSize = 10_000  // 메모리에 최대 10,000개 캐싱
    
    fun getOrCompute(
        imageHash: String,
        compute: () -> FloatArray
    ): FloatArray {
        // 1. 메모리 캐시 확인
        memoryCache[imageHash]?.let { return it }
        
        // 2. 디스크 캐시 확인
        val diskPath = cacheDir.resolve("$imageHash.emb")
        if (Files.exists(diskPath)) {
            val embedding = loadFromDisk(diskPath)
            updateMemoryCache(imageHash, embedding)
            return embedding
        }
        
        // 3. 계산 및 캐싱
        val embedding = compute()
        saveToDisk(diskPath, embedding)
        updateMemoryCache(imageHash, embedding)
        
        return embedding
    }
    
    private fun updateMemoryCache(key: String, value: FloatArray) {
        if (memoryCache.size >= maxMemoryCacheSize) {
            // LRU 정책으로 오래된 항목 제거
            val oldestKey = memoryCache.keys.first()
            memoryCache.remove(oldestKey)
        }
        memoryCache[key] = value
    }
}
```

### 6.3 리소스 모니터링

```kotlin
@Service
class ResourceMonitor(
    private val cpuThreshold: Float,
    private val ramThreshold: Float,
    private val gpuMemoryThreshold: Float
) {
    private val sigar = Sigar()
    
    @Scheduled(fixedDelay = 5000)  // 5초마다 체크
    fun monitorResources() {
        val cpuUsage = getCpuUsage()
        val ramUsage = getRamUsage()
        val gpuMemory = getGpuMemoryUsage()
        
        if (cpuUsage > cpuThreshold) {
            logger.warn("High CPU usage: ${cpuUsage * 100}%")
            adjustProcessingLoad(ProcessingLoadAdjustment.REDUCE_BATCH_SIZE)
        }
        
        if (ramUsage > ramThreshold) {
            logger.warn("High RAM usage: ${ramUsage * 100}%")
            triggerCacheCleanup()
        }
        
        if (gpuMemory > gpuMemoryThreshold) {
            logger.warn("High GPU memory usage: ${gpuMemory * 100}%")
            adjustProcessingLoad(ProcessingLoadAdjustment.PAUSE_LOW_PRIORITY)
        }
        
        // 메트릭 기록
        recordMetrics(cpuUsage, ramUsage, gpuMemory)
    }
    
    private fun getCpuUsage(): Float {
        return sigar.cpuPerc.combined.toFloat()
    }
    
    private fun getRamUsage(): Float {
        val mem = sigar.mem
        return (mem.used.toFloat() / mem.total.toFloat())
    }
    
    private fun getGpuMemoryUsage(): Float {
        // NVIDIA SMI를 통한 GPU 메모리 확인
        val process = ProcessBuilder("nvidia-smi", "--query-gpu=memory.used,memory.total", "--format=csv,noheader,nounits")
            .start()
        val output = process.inputStream.bufferedReader().readLine()
        val (used, total) = output.split(",").map { it.trim().toFloat() }
        return used / total
    }
}
```

## 7. 테스트 시나리오

### 7.1 단위 테스트

```kotlin
@Test
fun `should detect display in various conditions`() {
    val testImages = listOf(
        "front_view.jpg",
        "angle_30deg.jpg",
        "distance_5m.jpg",
        "with_reflection.jpg",
        "partial_occlusion.jpg"
    )
    
    testImages.forEach { imagePath ->
        val result = displayDetectionService.processViewerPhoto(imagePath)
        
        assertThat(result.confidence).isGreaterThan(0.7f)
        assertThat(result.displayBBox).isNotNull()
    }
}

@Test
fun `should match advertisement correctly`() {
    // Given
    val processedPhoto = prepareTestPhoto()
    val expectedVideoId = "test-ad-001"
    
    // When
    val result = runBlocking {
        matchingEngine.matchPhoto(processedPhoto)
    }
    
    // Then
    assertThat(result.matched?.videoId).isEqualTo(expectedVideoId)
    assertThat(result.confidence).isGreaterThan(0.8f)
}
```

### 7.2 엣지 케이스 테스트

```kotlin
@Test
fun `should handle edge cases gracefully`() {
    val edgeCases = mapOf(
        "black_and_white_display.jpg" to 0.7f,
        "cracked_screen.jpg" to 0.6f,
        "extreme_angle_60deg.jpg" to 0.65f,
        "multiple_displays.jpg" to 0.75f,
        "display_in_display.jpg" to 0.7f,  // TV 속 TV 광고
        "night_mode_inverted.jpg" to 0.6f,
        "curved_display.jpg" to 0.7f,
        "partial_frame_visible.jpg" to 0.5f
    )
    
    edgeCases.forEach { (imagePath, minConfidence) ->
        val result = displayDetectionService.processViewerPhoto(imagePath)
        
        assertThat(result.confidence)
            .withFailMessage("Failed for $imagePath")
            .isGreaterThanOrEqualTo(minConfidence)
    }
}

@Test
fun `should handle corrupted video gracefully`() {
    val corruptedVideo = "corrupted_video.mp4"
    
    val result = preprocessor.preprocess(corruptedVideo)
    
    assertThat(result.status).isEqualTo(ProcessingStatus.FAILED)
    assertThat(result.error).contains("corrupted", "invalid")
}
```

### 7.3 성능 테스트

```kotlin
@Test
fun `should process image within time limit`() {
    val image = loadTestImage()
    
    val duration = measureTimeMillis {
        runBlocking {
            val processed = displayDetectionService.processViewerPhoto(image)
            matchingEngine.matchPhoto(processed)
        }
    }
    
    assertThat(duration).isLessThan(2500) // 2.5초 이내
}

@Test
fun `should handle concurrent requests efficiently`() {
    val images = (1..100).map { loadTestImage("test_$it.jpg") }
    
    val startTime = System.currentTimeMillis()
    
    runBlocking {
        val jobs = images.map { image ->
            async {
                displayDetectionService.processViewerPhoto(image)
            }
        }
        
        jobs.awaitAll()
    }
    
    val totalTime = System.currentTimeMillis() - startTime
    val avgTime = totalTime / 100
    
    assertThat(avgTime).isLessThan(3000)  // 평균 3초 이내
    
    // 메모리 누수 체크
    val runtime = Runtime.getRuntime()
    val memoryAfter = runtime.totalMemory() - runtime.freeMemory()
    assertThat(memoryAfter).isLessThan(50_000_000_000L)  // 50GB 이내
}

@Test
fun `should handle GPU memory saturation`() {
    // GPU 메모리를 포화시키는 대량 요청
    val largeImages = (1..50).map { generateLargeImage() }
    
    val results = runBlocking {
        largeImages.map { image ->
            async {
                try {
                    matchingEngine.matchPhoto(ProcessedPhoto(image))
                } catch (e: InsufficientGPUMemoryException) {
                    null
                }
            }
        }.awaitAll()
    }
    
    // 일부는 실패해도 시스템은 계속 동작해야 함
    val successCount = results.count { it != null }
    assertThat(successCount).isGreaterThan(0)
}
```

## 8. 모니터링 메트릭

```kotlin
@Component
class MLMetricsCollector(
    private val meterRegistry: MeterRegistry
) {
    fun recordInference(modelName: String, duration: Long) {
        meterRegistry.timer("ml.inference", "model", modelName)
            .record(duration, TimeUnit.MILLISECONDS)
    }
    
    fun recordDetectionConfidence(confidence: Float) {
        meterRegistry.gauge("ml.detection.confidence", confidence)
    }
    
    fun recordMatchAccuracy(accuracy: Float) {
        meterRegistry.gauge("ml.match.accuracy", accuracy)
    }
    
    fun recordResourceUsage(cpu: Float, ram: Float, gpu: Float) {
        meterRegistry.gauge("system.cpu.usage", cpu)
        meterRegistry.gauge("system.ram.usage", ram)
        meterRegistry.gauge("system.gpu.memory.usage", gpu)
    }
    
    fun recordQueueSize(size: Int) {
        meterRegistry.gauge("processing.queue.size", size)
    }
    
    fun recordCacheHitRate(hitRate: Float) {
        meterRegistry.gauge("cache.hit.rate", hitRate)
    }
}

// 비즈니스 메트릭
@Component
class BusinessMetricsCollector(
    private val meterRegistry: MeterRegistry
) {
    fun recordAdView(videoId: String, confidence: Float) {
        meterRegistry.counter("ad.views.total", "video_id", videoId).increment()
        
        if (confidence > 0.9) {
            meterRegistry.counter("ad.views.high_confidence", "video_id", videoId).increment()
        }
    }
    
    fun recordUserExperience(totalTime: Long, successful: Boolean) {
        meterRegistry.timer("user.experience.total_time").record(totalTime, TimeUnit.MILLISECONDS)
        
        if (successful) {
            meterRegistry.counter("user.experience.success").increment()
        } else {
            meterRegistry.counter("user.experience.failure").increment()
        }
    }
}
```

## 9. 배포 고려사항 (데스크탑 환경)

### 9.1 모델 파일 관리
```yaml
models/
├── yolov8-display.onnx         (25MB)
├── clip-vit-l-14.onnx          (890MB)
├── dinov2-base.onnx            (350MB)
├── real-esrgan-x4.onnx         (64MB)
└── paddleocr/
    ├── det_model.onnx          (4MB)
    └── rec_model.onnx          (12MB)

총 용량: ~1.3GB
```

### 9.2 로컬 설치 스크립트

```bash
#!/bin/bash
# install.sh - 데스크탑 환경 설치 스크립트

echo "Video Match System Desktop Installation"

# 1. NVIDIA 드라이버 확인
if ! nvidia-smi &> /dev/null; then
    echo "ERROR: NVIDIA driver not found. Please install NVIDIA driver first."
    exit 1
fi

# 2. CUDA 확인 (11.8 권장)
cuda_version=$(nvcc --version | grep release | awk '{print $6}' | cut -d',' -f1)
echo "CUDA Version: $cuda_version"

# 3. 필수 패키지 설치
echo "Installing required packages..."
sudo apt-get update
sudo apt-get install -y \
    postgresql-14 \
    redis-server \
    openjdk-17-jdk \
    python3-pip \
    libopencv-dev

# 4. Python 의존성 설치
pip3 install \
    onnxruntime-gpu==1.16.3 \
    opencv-python \
    numpy \
    psycopg2

# 5. 데이터 디렉토리 생성
echo "Creating data directories..."
sudo mkdir -p /data/videomatch/{models,cache,uploads,logs}
sudo chown -R $USER:$USER /data/videomatch

# 6. 모델 다운로드
echo "Downloading ML models..."
cd /data/videomatch/models
wget https://storage.example.com/models/yolov8-display.onnx
wget https://storage.example.com/models/clip-vit-l-14.onnx
wget https://storage.example.com/models/dinov2-base.onnx

# 7. 데이터베이스 초기화
echo "Initializing database..."
sudo -u postgres createdb videomatch
sudo -u postgres psql videomatch < schema.sql

# 8. 서비스 등록
echo "Registering service..."
sudo cp videomatch.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable videomatch.service

echo "Installation complete!"
echo "Start service with: sudo systemctl start videomatch"
```

### 9.3 시스템 서비스 파일

```ini
# videomatch.service
[Unit]
Description=Video Match ML Service
After=postgresql.service

[Service]
Type=simple
User=videomatch
WorkingDirectory=/opt/videomatch
ExecStart=/usr/bin/java -Xms8G -Xmx32G -jar videomatch.jar
Restart=always
RestartSec=10

# 환경 변수
Environment="CUDA_VISIBLE_DEVICES=0"
Environment="TF_FORCE_GPU_ALLOW_GROWTH=true"
Environment="OMP_NUM_THREADS=8"

# 리소스 제한
LimitNOFILE=65536
LimitMEMLOCK=infinity

[Install]
WantedBy=multi-user.target
```

## 10. 예상 성능

### 처리 시간 분석 (데스크탑 환경)
| 단계 | 시간 (ms) | GPU 사용 | CPU 사용 |
|------|-----------|----------|----------|
| 디스플레이 검출 | 50 | Yes | Low |
| 영역 추출/보정 | 30 | No | Medium |
| 품질 개선 | 500 | Yes | Low |
| CLIP 임베딩 | 15 | Yes | Low |
| DINOv2 임베딩 | 20 | Yes | Low |
| 벡터 검색 | 50 | No | High |
| SIFT 매칭 | 100 | No | High |
| OCR | 200 | Yes | Medium |
| **총계** | **~500-1500** | - | - |

### 정확도 예상
- 정면 촬영: 95%+
- 각도 촬영 (30도): 90%+
- 원거리 (5m): 85%+
- 부분 가림 (20%): 80%+
- 반사/노이즈: 75%+

### 처리량 예상 (데스크탑 환경)
- 동시 처리: 4-8개 요청
- 시간당 처리량: 500-1000건
- 일일 최대 처리량: 15,000건
- GPU 메모리 사용: 평균 6-8GB
- RAM 사용: 평균 20-30GB

## 11. 유지보수 및 운영

### 11.1 일일 점검 사항
```kotlin
@Component
class DailyMaintenanceTask {
    
    @Scheduled(cron = "0 0 3 * * *")  // 매일 새벽 3시
    fun performDailyMaintenance() {
        // 1. 오래된 로그 정리
        cleanupOldLogs(daysToKeep = 30)
        
        // 2. 캐시 정리
        cleanupCache(threshold = 0.8)  // 80% 이상 차면 정리
        
        // 3. 임시 파일 삭제
        cleanupTempFiles()
        
        // 4. 데이터베이스 VACUUM
        performDatabaseMaintenance()
        
        // 5. 벡터 인덱스 최적화
        optimizeVectorIndexes()
        
        // 6. 성능 리포트 생성
        generatePerformanceReport()
    }
}
```

### 11.2 모델 업데이트 전략
```kotlin
class ModelUpdateStrategy {
    fun updateModel(
        modelType: String,
        newModelPath: String
    ): UpdateResult {
        // 1. 새 모델 검증
        val validation = validateNewModel(newModelPath)
        if (!validation.passed) {
            return UpdateResult.failed(validation.errors)
        }
        
        // 2. A/B 테스트 모드로 전환
        enableABTesting(modelType, newModelPath)
        
        // 3. 성능 모니터링 (24시간)
        val performanceMetrics = monitorPerformance(Duration.ofHours(24))
        
        // 4. 결과 분석 및 결정
        if (performanceMetrics.improvement > 0.05) {  // 5% 이상 개선
            commitModelUpdate(modelType, newModelPath)
            return UpdateResult.success()
        } else {
            rollbackModel(modelType)
            return UpdateResult.rollback()
        }
    }
}
```