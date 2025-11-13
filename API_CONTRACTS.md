# API Contracts

This document defines the API contracts between services in the Video Match System. All agents must adhere to these contracts.

## Overview

```
Frontend ←→ API Gateway ←→ Core Service
                           ←→ Processing Service ←→ ML Service
```

---

## 1. Backend REST API (Core Service)

**Base URL:** `http://localhost:8080/api/v1`

### 1.1 User Management

#### POST /users/register
Register a new user.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "name": "John Doe"
}
```

**Response:** `201 Created`
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "name": "John Doe",
  "role": "USER",
  "createdAt": "2025-01-15T10:00:00Z"
}
```

---

#### POST /users/login
Authenticate user.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response:** `200 OK`
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 3600,
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "USER"
  }
}
```

---

### 1.2 Advertisement Management

#### POST /advertisements
Upload a new advertisement video.

**Request:** `multipart/form-data`
```
video: [binary file]
brandName: "Nike"
campaignName: "Just Do It 2025"
```

**Response:** `201 Created`
```json
{
  "id": "660e8400-e29b-41d4-a716-446655440001",
  "videoPath": "/data/videos/660e8400-e29b-41d4-a716-446655440001.mp4",
  "brandName": "Nike",
  "campaignName": "Just Do It 2025",
  "status": "PROCESSING",
  "frameCount": null,
  "createdAt": "2025-01-15T10:05:00Z"
}
```

---

#### GET /advertisements/{id}
Get advertisement details.

**Response:** `200 OK`
```json
{
  "id": "660e8400-e29b-41d4-a716-446655440001",
  "videoPath": "/data/videos/660e8400-e29b-41d4-a716-446655440001.mp4",
  "brandName": "Nike",
  "campaignName": "Just Do It 2025",
  "status": "READY",
  "frameCount": 450,
  "metadata": {
    "duration": 15.0,
    "resolution": "1920x1080",
    "dominantColors": [
      {"color": "#FF5733", "percentage": 0.35},
      {"color": "#000000", "percentage": 0.25}
    ],
    "textRegions": [
      {"text": "Just Do It", "confidence": 0.98}
    ]
  },
  "createdAt": "2025-01-15T10:05:00Z",
  "processedAt": "2025-01-15T10:07:00Z"
}
```

---

#### GET /advertisements
List all advertisements.

**Query Params:**
- `page` (default: 0)
- `size` (default: 20)
- `status` (optional: PROCESSING, READY, FAILED)

**Response:** `200 OK`
```json
{
  "content": [
    {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "brandName": "Nike",
      "campaignName": "Just Do It 2025",
      "status": "READY",
      "frameCount": 450,
      "createdAt": "2025-01-15T10:05:00Z"
    }
  ],
  "pageable": {
    "pageNumber": 0,
    "pageSize": 20,
    "totalElements": 50,
    "totalPages": 3
  }
}
```

---

### 1.3 Image Matching

#### POST /matches
Submit an image for matching.

**Request:** `multipart/form-data`
```
image: [binary file]
priority: "normal" | "high" | "low" (default: "normal")
```

**Response:** `202 Accepted`
```json
{
  "matchId": "770e8400-e29b-41d4-a716-446655440002",
  "status": "QUEUED",
  "queuePosition": 3,
  "estimatedWaitTimeMs": 5000,
  "createdAt": "2025-01-15T10:10:00Z"
}
```

---

#### GET /matches/{id}
Get match result.

**Response:** `200 OK`

**When processing:**
```json
{
  "matchId": "770e8400-e29b-41d4-a716-446655440002",
  "status": "PROCESSING",
  "progress": 45,
  "currentStage": "EMBEDDING_EXTRACTION",
  "createdAt": "2025-01-15T10:10:00Z"
}
```

**When complete:**
```json
{
  "matchId": "770e8400-e29b-41d4-a716-446655440002",
  "status": "COMPLETED",
  "result": {
    "matched": true,
    "advertisement": {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "brandName": "Nike",
      "campaignName": "Just Do It 2025"
    },
    "confidence": 0.94,
    "frameNumber": 234,
    "timestamp": 7.8,
    "processingTimeMs": 1250,
    "verificationScores": {
      "embedding": 0.92,
      "sift": 0.95,
      "color": 0.88,
      "text": 0.91
    },
    "alternativeCandidates": [
      {
        "advertisementId": "660e8400-e29b-41d4-a716-446655440003",
        "brandName": "Adidas",
        "confidence": 0.78
      }
    ]
  },
  "createdAt": "2025-01-15T10:10:00Z",
  "completedAt": "2025-01-15T10:10:01.25Z"
}
```

---

#### GET /matches
List user's match history.

**Query Params:**
- `userId` (required for admins, auto-filled for users)
- `page` (default: 0)
- `size` (default: 20)
- `startDate` (optional)
- `endDate` (optional)

**Response:** `200 OK`
```json
{
  "content": [
    {
      "matchId": "770e8400-e29b-41d4-a716-446655440002",
      "status": "COMPLETED",
      "confidence": 0.94,
      "brandName": "Nike",
      "createdAt": "2025-01-15T10:10:00Z"
    }
  ],
  "pageable": {
    "pageNumber": 0,
    "pageSize": 20,
    "totalElements": 15,
    "totalPages": 1
  }
}
```

---

### 1.4 Feedback

#### POST /matches/{id}/feedback
Submit feedback on match result.

**Request:**
```json
{
  "isCorrect": false,
  "correctVideoId": "660e8400-e29b-41d4-a716-446655440003",
  "feedbackType": "WRONG_MATCH",
  "comment": "The actual ad was Adidas, not Nike"
}
```

**Response:** `200 OK`
```json
{
  "feedbackId": "880e8400-e29b-41d4-a716-446655440004",
  "matchId": "770e8400-e29b-41d4-a716-446655440002",
  "acknowledged": true,
  "createdAt": "2025-01-15T10:15:00Z"
}
```

---

## 2. WebSocket API

**URL:** `ws://localhost:8080/ws/matches/{matchId}`

### Connection
```javascript
const ws = new WebSocket('ws://localhost:8080/ws/matches/770e8400-...');
```

### Message Format

**Status Update:**
```json
{
  "type": "STATUS_UPDATE",
  "matchId": "770e8400-e29b-41d4-a716-446655440002",
  "status": "PROCESSING",
  "progress": 45,
  "currentStage": "EMBEDDING_EXTRACTION",
  "timestamp": "2025-01-15T10:10:00.500Z"
}
```

**Completion:**
```json
{
  "type": "MATCH_COMPLETE",
  "matchId": "770e8400-e29b-41d4-a716-446655440002",
  "result": {
    "matched": true,
    "confidence": 0.94,
    "advertisementId": "660e8400-e29b-41d4-a716-446655440001"
  },
  "timestamp": "2025-01-15T10:10:01.250Z"
}
```

**Error:**
```json
{
  "type": "ERROR",
  "matchId": "770e8400-e29b-41d4-a716-446655440002",
  "error": {
    "code": "DISPLAY_NOT_DETECTED",
    "message": "No display detected in the image",
    "recoverable": false
  },
  "timestamp": "2025-01-15T10:10:00.800Z"
}
```

---

## 3. ML Service API (Internal)

**Base URL:** `http://localhost:8000/api/v1`

### 3.1 Display Detection

#### POST /inference/detect-display
Detect display in image.

**Request:** `multipart/form-data`
```
image: [binary file]
```

**Response:** `200 OK`
```json
{
  "detections": [
    {
      "bbox": {
        "x": 150,
        "y": 200,
        "width": 800,
        "height": 600
      },
      "confidence": 0.95,
      "class": "display"
    }
  ],
  "inferenceTimeMs": 45
}
```

---

### 3.2 Embedding Extraction

#### POST /inference/extract-embedding
Extract embedding from display image.

**Request:** `multipart/form-data`
```
image: [binary file]
model: "ensemble" | "clip" | "dino" (default: "ensemble")
```

**Response:** `200 OK`
```json
{
  "embedding": [0.123, -0.456, 0.789, ...],  // 768 dimensions
  "model": "ensemble",
  "inferenceTimeMs": 35
}
```

---

### 3.3 Advertisement Matching

#### POST /inference/match-advertisement
Match viewer photo to advertisements.

**Request:** `multipart/form-data`
```
image: [binary file]
topK: 30 (default)
```

**Response:** `200 OK`
```json
{
  "matched": true,
  "bestMatch": {
    "videoId": "660e8400-e29b-41d4-a716-446655440001",
    "frameNumber": 234,
    "confidence": 0.94,
    "scores": {
      "embedding": 0.92,
      "sift": 0.95,
      "color": 0.88,
      "text": 0.91
    }
  },
  "alternativeCandidates": [
    {
      "videoId": "660e8400-e29b-41d4-a716-446655440003",
      "frameNumber": 120,
      "confidence": 0.78
    }
  ],
  "processingStages": {
    "displayDetection": 45,
    "perspectiveCorrection": 30,
    "qualityAssessment": 10,
    "embeddingExtraction": 35,
    "vectorSearch": 50,
    "verification": 100
  },
  "totalInferenceTimeMs": 270
}
```

---

### 3.4 Video Preprocessing

#### POST /preprocess/video
Preprocess advertisement video.

**Request:** `multipart/form-data`
```
video: [binary file]
videoId: "660e8400-e29b-41d4-a716-446655440001"
```

**Response:** `202 Accepted`
```json
{
  "taskId": "preprocess-660e8400-e29b-41d4-a716-446655440001",
  "status": "PROCESSING",
  "estimatedTimeMs": 30000
}
```

#### GET /preprocess/video/{taskId}
Check preprocessing status.

**Response:** `200 OK`
```json
{
  "taskId": "preprocess-660e8400-e29b-41d4-a716-446655440001",
  "status": "COMPLETED",
  "result": {
    "videoId": "660e8400-e29b-41d4-a716-446655440001",
    "totalFrames": 450,
    "uniqueFrames": 287,
    "embeddingsGenerated": 287,
    "metadata": {
      "dominantColors": [...],
      "textRegions": [...],
      "avgFrameEntropy": 6.8
    }
  },
  "processingTimeMs": 28500
}
```

---

### 3.5 Health Check

#### GET /health
Service health check.

**Response:** `200 OK`
```json
{
  "status": "healthy",
  "models": {
    "yolov8": "loaded",
    "clip": "loaded",
    "dino": "loaded",
    "esrgan": "loaded",
    "ocr": "loaded"
  },
  "gpu": {
    "available": true,
    "memoryUsed": 6800,
    "memoryTotal": 10240,
    "utilization": 66
  },
  "cache": {
    "memoryEntries": 8540,
    "diskSizeGB": 12.5,
    "hitRate": 0.78
  }
}
```

---

## 4. Error Responses

All APIs follow a consistent error response format.

### Standard Error Response

**4xx Client Errors:**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid file format. Expected: JPG, PNG",
    "details": {
      "field": "image",
      "rejectedValue": "video.mp4"
    },
    "timestamp": "2025-01-15T10:10:00Z"
  }
}
```

**5xx Server Errors:**
```json
{
  "error": {
    "code": "INTERNAL_SERVER_ERROR",
    "message": "GPU memory allocation failed",
    "details": {
      "gpuMemoryUsed": 9500,
      "gpuMemoryTotal": 10240,
      "recoverable": true
    },
    "timestamp": "2025-01-15T10:10:00Z",
    "requestId": "req-12345"
  }
}
```

### Common Error Codes

**Backend:**
- `VALIDATION_ERROR` - Input validation failed
- `RESOURCE_NOT_FOUND` - Requested resource doesn't exist
- `UNAUTHORIZED` - Authentication required
- `FORBIDDEN` - Insufficient permissions
- `RATE_LIMIT_EXCEEDED` - Too many requests
- `INTERNAL_SERVER_ERROR` - Unexpected server error

**ML Service:**
- `DISPLAY_NOT_DETECTED` - No display found in image
- `LOW_QUALITY_IMAGE` - Image quality too low
- `MODEL_ERROR` - ML model inference failed
- `GPU_MEMORY_ERROR` - Insufficient GPU memory
- `NO_MATCH_FOUND` - No matching advertisement found

---

## 5. Data Types

### User
```typescript
interface User {
  id: string;  // UUID
  email: string;
  name: string;
  role: 'USER' | 'ADMIN';
  createdAt: string;  // ISO 8601
}
```

### Advertisement
```typescript
interface Advertisement {
  id: string;
  videoPath: string;
  brandName: string;
  campaignName: string;
  status: 'PROCESSING' | 'READY' | 'FAILED';
  frameCount: number | null;
  metadata?: AdvertisementMetadata;
  createdAt: string;
  processedAt?: string;
}

interface AdvertisementMetadata {
  duration: number;
  resolution: string;
  dominantColors: ColorInfo[];
  textRegions: TextRegion[];
}
```

### Match
```typescript
interface Match {
  matchId: string;
  userId: string;
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  progress?: number;  // 0-100
  currentStage?: string;
  result?: MatchResult;
  createdAt: string;
  completedAt?: string;
}

interface MatchResult {
  matched: boolean;
  advertisement?: {
    id: string;
    brandName: string;
    campaignName: string;
  };
  confidence: number;  // 0-1
  frameNumber: number;
  timestamp: number;  // seconds
  processingTimeMs: number;
  verificationScores: {
    embedding: number;
    sift: number;
    color: number;
    text: number;
  };
  alternativeCandidates: Candidate[];
}
```

---

## 6. Contract Testing

### For Agents

**Backend Agents (B, E):**
- Implement OpenAPI spec
- Use contract testing (Pact, Spring Cloud Contract)
- Validate all endpoints match this document

**ML Service Agent (C):**
- Implement all inference endpoints
- Return exact response formats
- Include proper error handling

**Frontend Agent (D):**
- Create TypeScript types from this document
- Use MSW (Mock Service Worker) for testing
- Implement retry and error handling

---

## 7. Versioning

- API version is included in the URL: `/api/v1/`
- Breaking changes require a new version
- Old versions maintained for 3 months after deprecation

---

## 8. Authentication

**All Backend APIs (except /users/register, /users/login):**
```
Authorization: Bearer <JWT_TOKEN>
```

**ML Service APIs:**
- Internal only (no external access)
- Service-to-service authentication via API key
```
X-API-Key: <SERVICE_API_KEY>
```

---

## Notes for Agents

1. **Agent A (Infrastructure):** Ensure database schema supports all data types defined here
2. **Agent B (Backend Core):** Implement exactly these endpoints with proper validation
3. **Agent C (ML Service):** Focus on performance; response times are critical
4. **Agent D (Frontend):** Use this as the single source of truth for API integration
5. **Agent E (Integration):** Validate end-to-end contract compliance
6. **Agent F (Frontend Integration):** Handle all error codes gracefully

**Any changes to this document must be communicated to ALL agents immediately.**
