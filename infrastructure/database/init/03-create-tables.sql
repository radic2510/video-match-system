-- Create tables for Video Match System
-- Connect to videomatch database

\c videomatch

-- Set timezone
SET timezone = 'UTC';

-- =====================================================
-- Users Table
-- =====================================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'USER' CHECK (role IN ('USER', 'ADMIN')),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    last_login_at TIMESTAMP
);

COMMENT ON TABLE users IS 'User accounts for authentication and authorization';
COMMENT ON COLUMN users.role IS 'User role: USER or ADMIN';

-- =====================================================
-- Videos (Advertisements) Table
-- =====================================================
CREATE TABLE IF NOT EXISTS videos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    video_path TEXT NOT NULL,
    brand_name VARCHAR(100) NOT NULL,
    campaign_name VARCHAR(200) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PROCESSING' CHECK (status IN ('PROCESSING', 'READY', 'FAILED')),
    frame_count INTEGER,
    duration_seconds FLOAT,
    resolution VARCHAR(20),
    file_size_bytes BIGINT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMP,
    error_message TEXT
);

COMMENT ON TABLE videos IS 'Advertisement videos to match against';
COMMENT ON COLUMN videos.status IS 'Processing status: PROCESSING, READY, FAILED';

-- =====================================================
-- Video Embeddings Table (with pgvector)
-- =====================================================
CREATE TABLE IF NOT EXISTS video_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
    frame_number INTEGER NOT NULL,
    timestamp FLOAT NOT NULL,
    embedding vector(768) NOT NULL,
    thumbnail_path TEXT,
    frame_entropy FLOAT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_video_frame UNIQUE (video_id, frame_number)
);

COMMENT ON TABLE video_embeddings IS 'Frame embeddings for vector similarity search';
COMMENT ON COLUMN video_embeddings.embedding IS '768-dimensional embedding vector (CLIP + DINOv2 ensemble)';
COMMENT ON COLUMN video_embeddings.frame_entropy IS 'Shannon entropy of frame (information content)';

-- =====================================================
-- Image Matches Table
-- =====================================================
CREATE TABLE IF NOT EXISTS image_matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    video_id UUID REFERENCES videos(id) ON DELETE SET NULL,
    image_path TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'QUEUED' CHECK (status IN ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED')),
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    current_stage VARCHAR(50),
    priority FLOAT NOT NULL DEFAULT 0.5,
    queue_position INTEGER,

    -- Results
    matched BOOLEAN,
    confidence FLOAT CHECK (confidence >= 0 AND confidence <= 1),
    frame_number INTEGER,
    frame_timestamp FLOAT,
    processing_time_ms INTEGER,

    -- Verification scores
    embedding_score FLOAT CHECK (embedding_score >= 0 AND embedding_score <= 1),
    sift_score FLOAT CHECK (sift_score >= 0 AND sift_score <= 1),
    color_score FLOAT CHECK (color_score >= 0 AND color_score <= 1),
    text_score FLOAT CHECK (text_score >= 0 AND text_score <= 1),

    -- Timestamps
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    started_at TIMESTAMP,
    completed_at TIMESTAMP,

    -- Error handling
    error_code VARCHAR(50),
    error_message TEXT,
    retry_count INTEGER DEFAULT 0
);

COMMENT ON TABLE image_matches IS 'User-submitted images and matching results';
COMMENT ON COLUMN image_matches.priority IS 'Processing priority (0-1, higher = more urgent)';
COMMENT ON COLUMN image_matches.current_stage IS 'Current processing stage for real-time updates';

-- =====================================================
-- Advertisement Metadata Table
-- =====================================================
CREATE TABLE IF NOT EXISTS advertisement_metadata (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
    dominant_colors JSONB,
    text_regions JSONB,
    logo_embedding vector(512),
    scene_count INTEGER,
    avg_frame_entropy FLOAT,
    total_unique_frames INTEGER,
    scene_transitions JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_video_metadata UNIQUE (video_id)
);

COMMENT ON TABLE advertisement_metadata IS 'Additional metadata extracted from advertisements';
COMMENT ON COLUMN advertisement_metadata.dominant_colors IS 'Array of {color, percentage} objects';
COMMENT ON COLUMN advertisement_metadata.text_regions IS 'Array of {text, bbox, confidence} objects';

-- =====================================================
-- Display Detections Table
-- =====================================================
CREATE TABLE IF NOT EXISTS display_detections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    image_match_id UUID NOT NULL REFERENCES image_matches(id) ON DELETE CASCADE,
    original_image_path TEXT NOT NULL,
    detection_bbox JSONB NOT NULL,
    detection_confidence FLOAT NOT NULL CHECK (detection_confidence >= 0 AND detection_confidence <= 1),
    perspective_corrected BOOLEAN DEFAULT FALSE,
    corrected_image_path TEXT,
    quality_score FLOAT CHECK (quality_score >= 0 AND quality_score <= 1),
    enhancement_applied BOOLEAN DEFAULT FALSE,
    enhancement_method VARCHAR(50),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE display_detections IS 'Display detection results from YOLOv8';
COMMENT ON COLUMN display_detections.detection_bbox IS 'Bounding box: {x, y, width, height}';
COMMENT ON COLUMN display_detections.quality_score IS 'Image quality assessment (0-1)';

-- =====================================================
-- ML Inference Logs Table
-- =====================================================
CREATE TABLE IF NOT EXISTS ml_inference_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_name VARCHAR(50) NOT NULL,
    model_version VARCHAR(20),
    input_size INTEGER,
    batch_size INTEGER,
    inference_time_ms INTEGER NOT NULL,
    gpu_memory_used_mb INTEGER,
    success BOOLEAN NOT NULL,
    error_message TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE ml_inference_logs IS 'ML model performance and error tracking';

-- =====================================================
-- User Feedback Table
-- =====================================================
CREATE TABLE IF NOT EXISTS user_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES image_matches(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    is_correct BOOLEAN NOT NULL,
    correct_video_id UUID REFERENCES videos(id) ON DELETE SET NULL,
    feedback_type VARCHAR(50) CHECK (feedback_type IN ('WRONG_MATCH', 'NO_MATCH', 'PARTIAL_MATCH')),
    user_comment TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE user_feedback IS 'User corrections for model improvement';
COMMENT ON COLUMN user_feedback.is_correct IS 'Whether the match was correct';

-- =====================================================
-- Alternative Candidates Table (for match results)
-- =====================================================
CREATE TABLE IF NOT EXISTS match_candidates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES image_matches(id) ON DELETE CASCADE,
    video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
    frame_number INTEGER NOT NULL,
    confidence FLOAT NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
    rank INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE match_candidates IS 'Alternative match candidates for each image';

-- =====================================================
-- System Metrics Table (for monitoring)
-- =====================================================
CREATE TABLE IF NOT EXISTS system_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_name VARCHAR(50) NOT NULL,
    metric_value FLOAT NOT NULL,
    metric_unit VARCHAR(20),
    tags JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE system_metrics IS 'System performance metrics (CPU, GPU, memory, etc.)';

-- =====================================================
-- Processing Queue Table (for job management)
-- =====================================================
CREATE TABLE IF NOT EXISTS processing_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES image_matches(id) ON DELETE CASCADE,
    priority FLOAT NOT NULL DEFAULT 0.5,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED')),
    assigned_worker VARCHAR(50),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    CONSTRAINT unique_match_queue UNIQUE (match_id)
);

COMMENT ON TABLE processing_queue IS 'Priority queue for image processing jobs';

-- Grant permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO videomatch;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO videomatch;
