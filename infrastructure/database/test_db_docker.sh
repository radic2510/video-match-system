#!/bin/bash

# Database Setup Test Script (Docker version)
# Tests database configuration via Docker Compose
# TDD: This should PASS after implementation

set -e

echo "========================================"
echo "Testing PostgreSQL Database Setup"
echo "========================================"
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counters
PASSED=0
FAILED=0

# Helper function to run SQL via Docker
run_sql() {
    docker compose exec -T postgres psql -U videomatch -d videomatch -t -c "$1" 2>/dev/null | xargs
}

# Helper function to run test
run_test() {
    local test_name="$1"
    local test_query="$2"

    echo -n "Testing: $test_name... "

    if docker compose exec -T postgres psql -U videomatch -d videomatch -t -c "$test_query" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ PASSED${NC}"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}✗ FAILED${NC}"
        ((FAILED++))
        return 1
    fi
}

# Helper function to run test with expected result
run_test_with_result() {
    local test_name="$1"
    local test_query="$2"
    local expected="$3"

    echo -n "Testing: $test_name... "

    result=$(run_sql "$test_query")

    if [ "$result" = "$expected" ]; then
        echo -e "${GREEN}✓ PASSED${NC} (got: $result)"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}✗ FAILED${NC} (expected: $expected, got: $result)"
        ((FAILED++))
        return 1
    fi
}

echo "1. Database Connection Tests"
echo "----------------------------"

# Test 1: PostgreSQL is running and accessible
if docker compose exec -T postgres psql -U videomatch -d videomatch -c "SELECT 1;" > /dev/null 2>&1; then
    echo -e "Testing: Database connection... ${GREEN}✓ PASSED${NC}"
    ((PASSED++))
else
    echo -e "Testing: Database connection... ${RED}✗ FAILED${NC}"
    echo "Error: Cannot connect to PostgreSQL database"
    echo "Make sure PostgreSQL is running: docker compose up -d postgres"
    exit 1
fi

echo ""
echo "2. Extension Tests"
echo "------------------"

# Test 2: pgvector extension is installed
run_test_with_result "pgvector extension installed" \
    "SELECT COUNT(*) FROM pg_extension WHERE extname = 'vector';" \
    "1"

# Test 3: uuid-ossp extension is installed
run_test_with_result "uuid-ossp extension installed" \
    "SELECT COUNT(*) FROM pg_extension WHERE extname = 'uuid-ossp';" \
    "1"

# Test 4: pgcrypto extension is installed
run_test_with_result "pgcrypto extension installed" \
    "SELECT COUNT(*) FROM pg_extension WHERE extname = 'pgcrypto';" \
    "1"

echo ""
echo "3. Table Existence Tests"
echo "------------------------"

# Test tables exist
run_test "users table exists" \
    "SELECT to_regclass('public.users');"

run_test "videos table exists" \
    "SELECT to_regclass('public.videos');"

run_test "video_embeddings table exists" \
    "SELECT to_regclass('public.video_embeddings');"

run_test "image_matches table exists" \
    "SELECT to_regclass('public.image_matches');"

run_test "advertisement_metadata table exists" \
    "SELECT to_regclass('public.advertisement_metadata');"

run_test "display_detections table exists" \
    "SELECT to_regclass('public.display_detections');"

run_test "ml_inference_logs table exists" \
    "SELECT to_regclass('public.ml_inference_logs');"

run_test "user_feedback table exists" \
    "SELECT to_regclass('public.user_feedback');"

run_test "match_candidates table exists" \
    "SELECT to_regclass('public.match_candidates');"

run_test "system_metrics table exists" \
    "SELECT to_regclass('public.system_metrics');"

run_test "processing_queue table exists" \
    "SELECT to_regclass('public.processing_queue');"

echo ""
echo "4. Table Structure Tests"
echo "------------------------"

# Test users table columns
run_test_with_result "users table has 8 columns" \
    "SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'users';" \
    "8"

# Test video_embeddings has vector column
run_test_with_result "video_embeddings has embedding column" \
    "SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'video_embeddings' AND column_name = 'embedding';" \
    "1"

# Test vector column type (pgvector)
echo -n "Testing: embedding column is vector type... "
result=$(run_sql "SELECT udt_name FROM information_schema.columns WHERE table_name = 'video_embeddings' AND column_name = 'embedding';")
if [ "$result" = "vector" ]; then
    echo -e "${GREEN}✓ PASSED${NC} (type: vector)"
    ((PASSED++))
else
    echo -e "${RED}✗ FAILED${NC} (expected: vector, got: $result)"
    ((FAILED++))
fi

echo ""
echo "5. Index Tests"
echo "--------------"

# Test primary key indexes
run_test "users primary key index" \
    "SELECT indexname FROM pg_indexes WHERE tablename = 'users' AND indexname = 'users_pkey';"

run_test "videos primary key index" \
    "SELECT indexname FROM pg_indexes WHERE tablename = 'videos' AND indexname = 'videos_pkey';"

# Test vector index
echo -n "Testing: video_embeddings vector index... "
index_count=$(run_sql "SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'video_embeddings' AND indexname LIKE '%embedding%';")
if [ "$index_count" -ge "1" ]; then
    echo -e "${GREEN}✓ PASSED${NC} (found $index_count index(es))"
    ((PASSED++))
else
    echo -e "${RED}✗ FAILED${NC}"
    ((FAILED++))
fi

echo ""
echo "6. Constraint Tests"
echo "-------------------"

# Test unique constraints
run_test "users email unique constraint" \
    "SELECT constraint_name FROM information_schema.table_constraints WHERE table_name = 'users' AND constraint_type = 'UNIQUE' AND constraint_name LIKE '%email%';"

echo ""
echo "7. Data Insertion Tests"
echo "-----------------------"

# Test insert user
echo -n "Testing: Insert test user... "
if docker compose exec -T postgres psql -U videomatch -d videomatch -c "
    INSERT INTO users (id, email, name, password_hash, role, created_at)
    VALUES (
        gen_random_uuid(),
        'test_$(date +%s)@example.com',
        'Test User',
        'hashed_password',
        'USER',
        NOW()
    );" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ PASSED${NC}"
    ((PASSED++))
else
    echo -e "${RED}✗ FAILED${NC}"
    ((FAILED++))
fi

# Test insert video
echo -n "Testing: Insert test video... "
if docker compose exec -T postgres psql -U videomatch -d videomatch -c "
    INSERT INTO videos (id, video_path, brand_name, campaign_name, status, created_at)
    VALUES (
        gen_random_uuid(),
        '/test/video.mp4',
        'Test Brand',
        'Test Campaign',
        'READY',
        NOW()
    );" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ PASSED${NC}"
    ((PASSED++))
else
    echo -e "${RED}✗ FAILED${NC}"
    ((FAILED++))
fi

# Test insert vector embedding
echo -n "Testing: Insert vector embedding... "
TEST_VIDEO_ID=$(run_sql "SELECT id FROM videos WHERE brand_name = 'Test Brand' ORDER BY created_at DESC LIMIT 1;")
if [ ! -z "$TEST_VIDEO_ID" ]; then
    # Create a 768-dimensional zero vector
    ZERO_VECTOR=$(python3 -c "print('[' + ','.join(['0'] * 768) + ']')")
    if docker compose exec -T postgres psql -U videomatch -d videomatch -c "
        INSERT INTO video_embeddings (id, video_id, frame_number, timestamp, embedding, created_at)
        VALUES (
            gen_random_uuid(),
            '$TEST_VIDEO_ID'::uuid,
            1,
            0.0,
            '$ZERO_VECTOR'::vector(768),
            NOW()
        );" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ PASSED${NC}"
        ((PASSED++))
    else
        echo -e "${RED}✗ FAILED${NC}"
        ((FAILED++))
    fi
else
    echo -e "${RED}✗ FAILED${NC} (no test video found)"
    ((FAILED++))
fi

echo ""
echo "8. Cleanup Test Data"
echo "--------------------"

echo -n "Cleaning up test data... "
docker compose exec -T postgres psql -U videomatch -d videomatch -c "
    DELETE FROM video_embeddings WHERE video_id IN (SELECT id FROM videos WHERE brand_name = 'Test Brand');
    DELETE FROM videos WHERE brand_name = 'Test Brand';
    DELETE FROM users WHERE email LIKE 'test_%@example.com';
" > /dev/null 2>&1
echo -e "${GREEN}✓ Done${NC}"

echo ""
echo "========================================"
echo "Test Results"
echo "========================================"
echo -e "Total tests: $((PASSED + FAILED))"
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed!${NC}"
    echo "Database is properly configured."
    exit 0
else
    echo -e "${RED}✗ Some tests failed.${NC}"
    echo "Please check the database configuration."
    exit 1
fi
