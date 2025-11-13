-- Install required PostgreSQL extensions
-- Connect to videomatch database

\c videomatch

-- Install pgvector extension for vector similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- Install uuid-ossp for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Install pgcrypto for cryptographic functions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Verify extensions are installed
SELECT extname, extversion
FROM pg_extension
WHERE extname IN ('vector', 'uuid-ossp', 'pgcrypto');
