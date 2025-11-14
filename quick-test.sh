#!/bin/bash

# Video Match System - Quick Test Script
# 빠른 API 테스트를 위한 스크립트

set -e

echo "=========================================="
echo "Video Match System - Quick Test"
echo "=========================================="
echo ""

# 1. 사용자 등록
echo "1. 사용자 등록 중..."
TIMESTAMP=$(date +%s)
USER_EMAIL="test${TIMESTAMP}@example.com"
PASSWORD="Test1234Pass"

REGISTER_RESPONSE=$(curl -s -X POST http://localhost:8080/api/users/register \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$USER_EMAIL\", \"password\": \"$PASSWORD\", \"name\": \"Quick Test\"}")

if echo "$REGISTER_RESPONSE" | grep -q "id"; then
    echo "✓ 사용자 등록 성공"
    echo "   Email: $USER_EMAIL"
    USER_ID=$(echo "$REGISTER_RESPONSE" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
    echo "   ID: $USER_ID"
else
    echo "✗ 사용자 등록 실패"
    echo "$REGISTER_RESPONSE"
    exit 1
fi
echo ""

# 2. 로그인
echo "2. 로그인 중..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:8080/api/users/login \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$USER_EMAIL\", \"password\": \"$PASSWORD\"}")

if echo "$LOGIN_RESPONSE" | grep -q "token"; then
    TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    echo "✓ 로그인 성공"
    echo "   Token: ${TOKEN:0:50}..."
else
    echo "✗ 로그인 실패"
    echo "$LOGIN_RESPONSE"
    exit 1
fi
echo ""

# 3. 광고 생성
echo "3. 광고 생성 중..."
AD_RESPONSE=$(curl -s -X POST http://localhost:8080/api/advertisements \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Quick Test Ad",
    "brandName": "Test Brand",
    "videoPath": "/test/video.mp4",
    "totalFrames": 100
  }')

if echo "$AD_RESPONSE" | grep -q "id"; then
    echo "✓ 광고 생성 성공"
    AD_ID=$(echo "$AD_RESPONSE" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
    echo "   ID: $AD_ID"
    echo ""
    echo "광고 상세 정보:"
    echo "$AD_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$AD_RESPONSE"
else
    echo "✗ 광고 생성 실패"
    echo "$AD_RESPONSE"
    exit 1
fi
echo ""

# 4. 광고 목록 조회
echo "4. 광고 목록 조회 중..."
LIST_RESPONSE=$(curl -s -X GET "http://localhost:8080/api/advertisements" \
  -H "Authorization: Bearer $TOKEN")

if echo "$LIST_RESPONSE" | grep -q "id"; then
    AD_COUNT=$(echo "$LIST_RESPONSE" | grep -o '"id":"[^"]*"' | wc -l)
    echo "✓ 광고 목록 조회 성공"
    echo "   총 광고 수: $AD_COUNT"
else
    echo "✗ 광고 목록 조회 실패"
    echo "$LIST_RESPONSE"
fi
echo ""

echo "=========================================="
echo "✅ 모든 테스트 완료!"
echo "=========================================="
echo ""
echo "테스트 계정 정보:"
echo "  Email: $USER_EMAIL"
echo "  Password: $PASSWORD"
echo "  User ID: $USER_ID"
echo ""
echo "생성된 광고:"
echo "  Ad ID: $AD_ID"
echo ""
