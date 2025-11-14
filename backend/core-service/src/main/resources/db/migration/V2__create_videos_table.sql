-- Create videos (advertisements) table
CREATE TABLE IF NOT EXISTS videos (
    id UUID PRIMARY KEY,
    campaign_name VARCHAR(200) NOT NULL,
    brand_name VARCHAR(100) NOT NULL,
    video_path TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL,
    frame_count INTEGER,
    status VARCHAR(20) NOT NULL
);

-- Create index on brand_name for faster lookups
CREATE INDEX IF NOT EXISTS idx_videos_brand_name ON videos(brand_name);
CREATE INDEX IF NOT EXISTS idx_videos_status ON videos(status);
