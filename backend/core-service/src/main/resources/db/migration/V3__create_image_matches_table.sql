-- Create image_matches table
CREATE TABLE IF NOT EXISTS image_matches (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    image_hash VARCHAR(64) NOT NULL,
    status VARCHAR(50) NOT NULL,
    result TEXT,
    queue_position INTEGER NOT NULL,
    priority INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_image_matches_user_id ON image_matches(user_id);
CREATE INDEX IF NOT EXISTS idx_image_matches_status ON image_matches(status);
CREATE INDEX IF NOT EXISTS idx_image_matches_created_at ON image_matches(created_at);
