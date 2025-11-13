// API Type Definitions based on API_CONTRACTS.md

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'USER' | 'ADMIN';
  createdAt: string;
}

export interface Advertisement {
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

export interface AdvertisementMetadata {
  duration: number;
  resolution: string;
  dominantColors: ColorInfo[];
  textRegions: TextRegion[];
}

export interface ColorInfo {
  color: string;
  percentage: number;
}

export interface TextRegion {
  text: string;
  confidence: number;
}

export interface Match {
  matchId: string;
  userId?: string;
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  progress?: number;
  currentStage?: string;
  result?: MatchResult;
  createdAt: string;
  completedAt?: string;
}

export interface MatchResult {
  matched: boolean;
  advertisement?: {
    id: string;
    brandName: string;
    campaignName: string;
  };
  confidence: number;
  frameNumber: number;
  timestamp: number;
  processingTimeMs: number;
  verificationScores: {
    embedding: number;
    sift: number;
    color: number;
    text: number;
  };
  alternativeCandidates: Candidate[];
}

export interface Candidate {
  advertisementId: string;
  brandName: string;
  confidence: number;
}

export interface UploadResponse {
  matchId: string;
  status: 'QUEUED';
  queuePosition: number;
  estimatedWaitTimeMs: number;
  createdAt: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  expiresIn: number;
  user: User;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export interface PageResponse<T> {
  content: T[];
  pageable: {
    pageNumber: number;
    pageSize: number;
    totalElements: number;
    totalPages: number;
  };
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: any;
    timestamp: string;
    requestId?: string;
  };
}

export interface WebSocketMessage {
  type: 'STATUS_UPDATE' | 'MATCH_COMPLETE' | 'ERROR';
  matchId: string;
  status?: string;
  progress?: number;
  currentStage?: string;
  result?: MatchResult;
  error?: {
    code: string;
    message: string;
    recoverable: boolean;
  };
  timestamp: string;
}
