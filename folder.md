
## 전체 프로젝트 구성 (mono repo)

video-match-system/
├── .github/
│   ├── workflows/
│   │   ├── ci.yml
│   │   ├── test.yml
│   │   └── build.yml
│   └── CODEOWNERS
│
├── frontend/                 # React/Next.js 프론트엔드
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── next.config.js
│
├── backend/                  # Spring Boot 백엔드 (Kotlin)
│   ├── api-gateway/
│   ├── core-service/
│   ├── processing-service/
│   ├── common/
│   └── build.gradle.kts
│
├── ml-service/              # Python ML 서비스
│   ├── app/
│   ├── models/
│   ├── tests/
│   ├── requirements.txt
│   └── Dockerfile
│
├── infrastructure/          # 인프라 설정
│   ├── docker/
│   ├── nginx/
│   ├── database/
│   └── scripts/
│
├── shared/                  # 공통 리소스
│   ├── proto/              # gRPC 정의
│   ├── contracts/          # API 스펙
│   └── configs/
│
├── tools/                   # 개발 도구
│   ├── scripts/
│   ├── monitoring/
│   └── testing/
│
├── models/                  # ML 모델 파일 (Git LFS)
│   ├── yolov8/
│   ├── clip/
│   ├── dinov2/
│   └── README.md
│
├── docker-compose.yml       # 로컬 개발 환경
├── docker-compose.prod.yml  # 프로덕션 환경
├── Makefile                # 빌드/배포 자동화
├── .env.example
├── .gitignore
├── .gitattributes          # Git LFS 설정
└── README.md


### Frontend (React/Next.js)

frontend/
├── src/
│   ├── app/                    # Next.js 13+ App Router
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   └── register/
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx
│   │   │   ├── analytics/
│   │   │   └── settings/
│   │   ├── api/                # API Routes
│   │   └── layout.tsx
│   │
│   ├── components/
│   │   ├── common/
│   │   │   ├── Button/
│   │   │   ├── Modal/
│   │   │   └── Layout/
│   │   ├── features/
│   │   │   ├── ImageUpload/
│   │   │   ├── MatchResult/
│   │   │   └── VideoPlayer/
│   │   └── ui/                 # shadcn/ui components
│   │
│   ├── hooks/
│   │   ├── useWebSocket.ts
│   │   ├── useImageUpload.ts
│   │   └── useMatchResult.ts
│   │
│   ├── lib/
│   │   ├── api/
│   │   │   ├── client.ts
│   │   │   └── endpoints.ts
│   │   ├── utils/
│   │   └── constants/
│   │
│   ├── stores/                 # Zustand/Redux
│   │   ├── authStore.ts
│   │   └── matchStore.ts
│   │
│   ├── styles/
│   │   ├── globals.css
│   │   └── variables.css
│   │
│   └── types/
│       ├── api.d.ts
│       └── global.d.ts
│
├── public/
│   ├── images/
│   └── fonts/
│
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
├── package.json
├── tsconfig.json
├── next.config.js
├── tailwind.config.js
└── .eslintrc.json


### Backend (Spring Boot - Kotlin)

backend/
├── api-gateway/
│   ├── src/
│   │   ├── main/
│   │   │   ├── kotlin/
│   │   │   │   └── com/videomatch/gateway/
│   │   │   │       ├── config/
│   │   │   │       │   ├── SecurityConfig.kt
│   │   │   │       │   ├── WebSocketConfig.kt
│   │   │   │       │   └── RouteConfig.kt
│   │   │   │       ├── filter/
│   │   │   │       │   ├── AuthFilter.kt
│   │   │   │       │   └── RateLimitFilter.kt
│   │   │   │       ├── handler/
│   │   │   │       └── Application.kt
│   │   │   └── resources/
│   │   │       ├── application.yml
│   │   │       └── application-local.yml
│   │   └── test/
│   └── build.gradle.kts
│
├── core-service/
│   ├── src/
│   │   ├── main/
│   │   │   ├── kotlin/
│   │   │   │   └── com/videomatch/core/
│   │   │   │       ├── domain/
│   │   │   │       │   ├── model/
│   │   │   │       │   │   ├── User.kt
│   │   │   │       │   │   ├── Advertisement.kt
│   │   │   │       │   │   └── Match.kt
│   │   │   │       │   ├── repository/
│   │   │   │       │   └── service/
│   │   │   │       ├── application/
│   │   │   │       │   ├── usecase/
│   │   │   │       │   └── dto/
│   │   │   │       ├── infrastructure/
│   │   │   │       │   ├── persistence/
│   │   │   │       │   ├── messaging/
│   │   │   │       │   └── storage/
│   │   │   │       └── presentation/
│   │   │   │           ├── controller/
│   │   │   │           └── websocket/
│   │   │   └── resources/
│   │   │       ├── db/migration/
│   │   │       │   ├── V1__init_schema.sql
│   │   │       │   └── V2__add_indexes.sql
│   │   │       └── application.yml
│   │   └── test/
│   └── build.gradle.kts
│
├── processing-service/
│   ├── src/
│   │   ├── main/
│   │   │   ├── kotlin/
│   │   │   │   └── com/videomatch/processing/
│   │   │   │       ├── queue/
│   │   │   │       │   ├── PriorityQueue.kt
│   │   │   │       │   └── TaskProcessor.kt
│   │   │   │       ├── ml/
│   │   │   │       │   ├── MLModelManager.kt
│   │   │   │       │   ├── PipelineOrchestrator.kt
│   │   │   │       │   └── client/
│   │   │   │       │       ├── MLServiceClient.kt
│   │   │   │       │       └── VectorDBClient.kt
│   │   │   │       ├── monitoring/
│   │   │   │       │   ├── ResourceMonitor.kt
│   │   │   │       │   └── MetricsCollector.kt
│   │   │   │       └── cache/
│   │   │   │           ├── LocalCache.kt
│   │   │   │           └── CacheManager.kt
│   │   │   └── resources/
│   │   └── test/
│   └── build.gradle.kts
│
├── common/                      # 공통 라이브러리
│   ├── src/
│   │   └── main/
│   │       └── kotlin/
│   │           └── com/videomatch/common/
│   │               ├── exception/
│   │               ├── utils/
│   │               ├── logging/
│   │               └── validation/
│   └── build.gradle.kts
│
├── buildSrc/                    # Gradle 빌드 설정
│   ├── src/
│   │   └── main/
│   │       └── kotlin/
│   │           ├── Dependencies.kt
│   │           └── Versions.kt
│   └── build.gradle.kts
│
├── gradle.properties
├── settings.gradle.kts
└── build.gradle.kts            # 루트 빌드 파일


### ML Service (Python)

ml-service/
├── app/
│   ├── api/
│   │   ├── __init__.py
│   │   ├── routes/
│   │   │   ├── inference.py
│   │   │   ├── health.py
│   │   │   └── preprocessing.py
│   │   └── dependencies.py
│   │
│   ├── core/
│   │   ├── __init__.py
│   │   ├── config.py
│   │   ├── settings.py
│   │   └── exceptions.py
│   │
│   ├── models/
│   │   ├── __init__.py
│   │   ├── base.py
│   │   ├── yolo_detector.py
│   │   ├── clip_encoder.py
│   │   ├── dino_encoder.py
│   │   ├── esrgan_enhancer.py
│   │   └── ocr_extractor.py
│   │
│   ├── services/
│   │   ├── __init__.py
│   │   ├── preprocessing/
│   │   │   ├── video_processor.py
│   │   │   ├── frame_extractor.py
│   │   │   └── image_processor.py
│   │   ├── inference/
│   │   │   ├── pipeline.py
│   │   │   ├── ensemble.py
│   │   │   └── matching.py
│   │   ├── vector_db/
│   │   │   ├── faiss_client.py
│   │   │   └── index_manager.py
│   │   └── cache/
│   │       └── embedding_cache.py
│   │
│   ├── utils/
│   │   ├── __init__.py
│   │   ├── image_utils.py
│   │   ├── video_utils.py
│   │   └── metrics.py
│   │
│   └── main.py
│
├── models/                     # 모델 가중치 (심볼릭 링크)
│   └── -> ../../models/
│
├── tests/
│   ├── unit/
│   ├── integration/
│   └── fixtures/
│
├── scripts/
│   ├── download_models.py
│   ├── validate_models.py
│   └── benchmark.py
│
├── requirements/
│   ├── base.txt
│   ├── dev.txt
│   └── prod.txt
│
├── requirements.txt
├── pyproject.toml
├── setup.cfg
├── .flake8
├── .mypy.ini
├── Dockerfile
└── docker-compose.override.yml


### Infrastructure

infrastructure/
├── docker/
│   ├── backend/
│   │   └── Dockerfile
│   ├── ml-service/
│   │   └── Dockerfile
│   └── nginx/
│       ├── Dockerfile
│       └── nginx.conf
│
├── database/
│   ├── init/
│   │   ├── 01-create-db.sql
│   │   ├── 02-create-tables.sql
│   │   └── 03-seed-data.sql
│   └── backup/
│       └── backup.sh
│
├── scripts/
│   ├── install/
│   │   ├── install.sh
│   │   ├── setup-gpu.sh
│   │   └── setup-models.sh
│   ├── deploy/
│   │   ├── deploy.sh
│   │   └── rollback.sh
│   └── maintenance/
│       ├── cleanup.sh
│       ├── optimize.sh
│       └── monitor.sh
│
└── systemd/
    ├── videomatch-backend.service
    ├── videomatch-ml.service
    └── videomatch-nginx.service


