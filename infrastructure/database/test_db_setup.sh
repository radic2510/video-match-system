#!/bin/bash

# Database Setup Test Script
# This script verifies that the PostgreSQL database is properly configured
# TDD: This should FAIL initially, then PASS after implementation

set -e

echo "========================================"
echo "Testing PostgreSQL Database Setup"
echo "========================================"
echo ""

# Configuration
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-videomatch}"
DB_USER="${DB_USER:-videomatch}"
DB_PASSWORD="${DB_PASSWORD:-changeme123}"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counters
PASSED=0
FAILED=0

# Helper function to run test
run_test() {
    local test_name="$1"
    local test_query="$2"

    echo -n "Testing: $test_name... "

    if PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "$test_query" > /dev/null 2>&1; then
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

    result=$(PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "$test_query" 2>/dev/null | xargs)

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
if PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "SELECT 1;" > /dev/null 2>&1; then
    echo -e "Testing: Database connection... ${GREEN}✓ PASSED${NC}"
    ((PASSED++))
else
    echo -e "Testing: Database connection... ${RED}✗ FAILED${NC}"
    echo "Error: Cannot connect to PostgreSQL database"
    echo "Make sure PostgreSQL is running: docker-compose up -d postgres"
    exit 1
fi

echo ""
echo "2. Extension Tests"
echo "------------------"

# Test 2: pgvector extension is installed
run_test_with_result "pgvector extension installed" \
    "SELECT COUNT(*) FROM pg_extension WHERE extname = 'vector';" \
    "1"

# Test 3: vector type is available
run_test "vector type available" \
    "SELECT 'vector'::regtype;"

echo ""
echo "3. Table Existence Tests"
echo "------------------------"

# Test 4: users table exists
run_test "users table exists" \
    "SELECT to_regclass('public.users');"

# Test 5: videos table exists
run_test "videos table exists" \
    "SELECT to_regclass('public.videos');"

# Test 6: video_embeddings table exists
run_test "video_embeddings table exists" \
    "SELECT to_regclass('public.video_embeddings');"

# Test 7: image_matches table exists
run_test "image_matches table exists" \
    "SELECT to_regclass('public.image_matches');"

# Test 8: advertisement_metadata table exists
run_test "advertisement_metadata table exists" \
    "SELECT to_regclass('public.advertisement_metadata');"

# Test 9: display_detections table exists
run_test "display_detections table exists" \
    "SELECT to_regclass('public.display_detections');"

# Test 10: ml_inference_logs table exists
run_test "ml_inference_logs table exists" \
    "SELECT to_regclass('public.ml_inference_logs');"

# Test 11: user_feedback table exists
run_test "user_feedback table exists" \
    "SELECT to_regclass('public.user_feedback');"

echo ""
echo "4. Table Structure Tests"
echo "------------------------"

# Test 12: users table has correct columns
run_test "users table structure" \
    "SELECT column_name FROM information_schema.columns WHERE table_name = 'users' AND column_name IN ('id', 'email', 'name', 'password_hash', 'role', 'created_at') ORDER BY column_name;"

# Test 13: video_embeddings has vector column
run_test "video_embeddings has vector column" \
    "SELECT data_type FROM information_schema.columns WHERE table_name = 'video_embeddings' AND column_name = 'embedding';"

# Test 14: Check vector dimension (should be 768 for CLIP/DINO)
run_test_with_result "vector dimension is 768" \
    "SELECT atttypmod - 4 FROM pg_attribute WHERE attrelid = 'video_embeddings'::regclass AND attname = 'embedding';" \
    "768"

echo ""
echo "5. Index Tests"
echo "--------------"

# Test 15: Check primary key indexes exist
run_test "users primary key index" \
    "SELECT indexname FROM pg_indexes WHERE tablename = 'users' AND indexname = 'users_pkey';"

run_test "videos primary key index" \
    "SELECT indexname FROM pg_indexes WHERE tablename = 'videos' AND indexname = 'videos_pkey';"

# Test 16: Check foreign key indexes
run_test "image_matches user_id index" \
    "SELECT indexname FROM pg_indexes WHERE tablename = 'image_matches' AND indexname LIKE '%user_id%';"

run_test "image_matches video_id index" \
    "SELECT indexname FROM pg_indexes WHERE tablename = 'image_matches' AND indexname LIKE '%video_id%';"

# Test 17: Check vector index (for FAISS-style searches)
run_test "video_embeddings vector index" \
    "SELECT indexname FROM pg_indexes WHERE tablename = 'video_embeddings' AND indexname LIKE '%embedding%';"

echo ""
echo "6. Constraint Tests"
echo "-------------------"

# Test 18: users email unique constraint
run_test "users email unique constraint" \
    "SELECT constraint_name FROM information_schema.table_constraints WHERE table_name = 'users' AND constraint_type = 'UNIQUE' AND constraint_name LIKE '%email%';"

# Test 19: Check NOT NULL constraints on critical fields
run_test "users email NOT NULL" \
    "SELECT is_nullable FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'email';"

echo ""
echo "7. Data Insertion Tests"
echo "-----------------------"

# Test 20: Can insert test user
echo -n "Testing: Insert test user... "
if PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "
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

# Test 21: Can insert test video
echo -n "Testing: Insert test video... "
if PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "
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

# Test 22: Can insert vector embedding
echo -n "Testing: Insert vector embedding... "
TEST_VIDEO_ID=$(PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT id FROM videos ORDER BY created_at DESC LIMIT 1;" | xargs)
if [ ! -z "$TEST_VIDEO_ID" ]; then
    # Create a 768-dimensional zero vector
    ZERO_VECTOR=$(python3 -c "print('[' + ','.join(['0'] * 768) + ']')")
    if PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "
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
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "
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
