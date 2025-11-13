-- Create videos (advertisements) table
CREATE TABLE IF NOT EXISTS videos (
    id UUID PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    brand_name VARCHAR(255) NOT NULL,
    video_path VARCHAR(1000) NOT NULL,
    uploaded_at TIMESTAMP NOT NULL,
    total_frames INTEGER NOT NULL,
    status VARCHAR(50) NOT NULL
);

-- Create index on brand_name for faster lookups
CREATE INDEX IF NOT EXISTS idx_videos_brand_name ON videos(brand_name);
CREATE INDEX IF NOT EXISTS idx_videos_status ON videos(status);
