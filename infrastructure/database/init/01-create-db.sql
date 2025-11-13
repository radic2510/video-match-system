-- Create database and user for Video Match System
-- This script is executed by postgres superuser

-- Create user if not exists
DO
$do$
BEGIN
   IF NOT EXISTS (
      SELECT FROM pg_catalog.pg_roles
      WHERE  rolname = 'videomatch') THEN

      CREATE USER videomatch WITH PASSWORD 'changeme123';
   END IF;
END
$do$;

-- Create database if not exists
SELECT 'CREATE DATABASE videomatch'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'videomatch')\gexec

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE videomatch TO videomatch;

-- Connect to the database and grant schema privileges
\c videomatch

GRANT ALL ON SCHEMA public TO videomatch;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO videomatch;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO videomatch;

-- Set default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO videomatch;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO videomatch;
