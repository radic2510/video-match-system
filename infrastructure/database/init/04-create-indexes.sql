-- Create indexes for optimal query performance
-- Connect to videomatch database

\c videomatch

-- =====================================================
-- Users Table Indexes
-- =====================================================

-- Email lookup (for login)
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Role-based queries
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Recent users
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC);

-- =====================================================
-- Videos Table Indexes
-- =====================================================

-- Status filtering
CREATE INDEX IF NOT EXISTS idx_videos_status ON videos(status);

-- Brand/campaign search
CREATE INDEX IF NOT EXISTS idx_videos_brand_name ON videos(brand_name);
CREATE INDEX IF NOT EXISTS idx_videos_campaign_name ON videos(campaign_name);

-- Recent videos
CREATE INDEX IF NOT EXISTS idx_videos_created_at ON videos(created_at DESC);

-- Processing queries
CREATE INDEX IF NOT EXISTS idx_videos_status_created_at ON videos(status, created_at DESC);

-- =====================================================
-- Video Embeddings Table Indexes
-- =====================================================

-- Video-based lookups
CREATE INDEX IF NOT EXISTS idx_embeddings_video_id ON video_embeddings(video_id);

-- Frame number lookup
CREATE INDEX IF NOT EXISTS idx_embeddings_video_frame ON video_embeddings(video_id, frame_number);

-- Vector similarity search using HNSW (Hierarchical Navigable Small World)
-- This is optimized for approximate nearest neighbor search
CREATE INDEX IF NOT EXISTS idx_embeddings_vector_hnsw ON video_embeddings
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Alternative: IVFFlat index (commented out, use if HNSW is not available)
-- CREATE INDEX IF NOT EXISTS idx_embeddings_vector_ivfflat ON video_embeddings
-- USING ivfflat (embedding vector_cosine_ops)
-- WITH (lists = 100);

COMMENT ON INDEX idx_embeddings_vector_hnsw IS 'HNSW index for fast vector similarity search';

-- =====================================================
-- Image Matches Table Indexes
-- =====================================================

-- User's matches
CREATE INDEX IF NOT EXISTS idx_matches_user_id ON image_matches(user_id);

-- Matched video lookup
CREATE INDEX IF NOT EXISTS idx_matches_video_id ON image_matches(video_id);

-- Status filtering
CREATE INDEX IF NOT EXISTS idx_matches_status ON image_matches(status);

-- Queue management
CREATE INDEX IF NOT EXISTS idx_matches_status_priority ON image_matches(status, priority DESC)
WHERE status = 'QUEUED';

CREATE INDEX IF NOT EXISTS idx_matches_queue_position ON image_matches(queue_position)
WHERE status = 'QUEUED';

-- Recent matches
CREATE INDEX IF NOT EXISTS idx_matches_created_at ON image_matches(created_at DESC);

-- User's recent matches
CREATE INDEX IF NOT EXISTS idx_matches_user_created ON image_matches(user_id, created_at DESC);

-- Match results filtering
CREATE INDEX IF NOT EXISTS idx_matches_matched_confidence ON image_matches(matched, confidence DESC)
WHERE matched = TRUE;

-- Processing analytics
CREATE INDEX IF NOT EXISTS idx_matches_completed_at ON image_matches(completed_at DESC)
WHERE status = 'COMPLETED';

-- =====================================================
-- Advertisement Metadata Table Indexes
-- =====================================================

-- Video metadata lookup
CREATE INDEX IF NOT EXISTS idx_metadata_video_id ON advertisement_metadata(video_id);

-- GIN index for JSONB columns (for searching within JSON)
CREATE INDEX IF NOT EXISTS idx_metadata_colors_gin ON advertisement_metadata USING GIN (dominant_colors);
CREATE INDEX IF NOT EXISTS idx_metadata_text_gin ON advertisement_metadata USING GIN (text_regions);

-- =====================================================
-- Display Detections Table Indexes
-- =====================================================

-- Match-based lookup
CREATE INDEX IF NOT EXISTS idx_detections_match_id ON display_detections(image_match_id);

-- Quality filtering
CREATE INDEX IF NOT EXISTS idx_detections_quality ON display_detections(quality_score DESC);

-- =====================================================
-- ML Inference Logs Table Indexes
-- =====================================================

-- Model performance queries
CREATE INDEX IF NOT EXISTS idx_inference_logs_model ON ml_inference_logs(model_name, created_at DESC);

-- Error tracking
CREATE INDEX IF NOT EXISTS idx_inference_logs_success ON ml_inference_logs(success, created_at DESC);

-- Time-based queries
CREATE INDEX IF NOT EXISTS idx_inference_logs_created_at ON ml_inference_logs(created_at DESC);

-- =====================================================
-- User Feedback Table Indexes
-- =====================================================

-- Match feedback lookup
CREATE INDEX IF NOT EXISTS idx_feedback_match_id ON user_feedback(match_id);

-- User's feedback
CREATE INDEX IF NOT EXISTS idx_feedback_user_id ON user_feedback(user_id);

-- Incorrect matches (for retraining)
CREATE INDEX IF NOT EXISTS idx_feedback_incorrect ON user_feedback(is_correct, created_at DESC)
WHERE is_correct = FALSE;

-- =====================================================
-- Match Candidates Table Indexes
-- =====================================================

-- Match candidates lookup
CREATE INDEX IF NOT EXISTS idx_candidates_match_id ON match_candidates(match_id);

-- Ranked candidates
CREATE INDEX IF NOT EXISTS idx_candidates_match_rank ON match_candidates(match_id, rank);

-- =====================================================
-- System Metrics Table Indexes
-- =====================================================

-- Metric name queries
CREATE INDEX IF NOT EXISTS idx_metrics_name ON system_metrics(metric_name, created_at DESC);

-- Time-based analytics
CREATE INDEX IF NOT EXISTS idx_metrics_created_at ON system_metrics(created_at DESC);

-- GIN index for tags
CREATE INDEX IF NOT EXISTS idx_metrics_tags_gin ON system_metrics USING GIN (tags);

-- =====================================================
-- Processing Queue Table Indexes
-- =====================================================

-- Queue management (priority-based)
CREATE INDEX IF NOT EXISTS idx_queue_status_priority ON processing_queue(status, priority DESC)
WHERE status = 'PENDING';

-- Worker assignment
CREATE INDEX IF NOT EXISTS idx_queue_worker ON processing_queue(assigned_worker, status);

-- Match lookup
CREATE INDEX IF NOT EXISTS idx_queue_match_id ON processing_queue(match_id);

-- =====================================================
-- Analyze tables for query planner
-- =====================================================

ANALYZE users;
ANALYZE videos;
ANALYZE video_embeddings;
ANALYZE image_matches;
ANALYZE advertisement_metadata;
ANALYZE display_detections;
ANALYZE ml_inference_logs;
ANALYZE user_feedback;
ANALYZE match_candidates;
ANALYZE system_metrics;
ANALYZE processing_queue;

-- Print index summary
SELECT
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
