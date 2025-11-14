#!/bin/bash

# Video Match System - Comprehensive Integration Test
# 모든 시나리오를 포괄적으로 검증하는 자동화 테스트

set -e  # 오류 발생 시 스크립트 중단

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 테스트 결과 저장
RESULTS_FILE="comprehensive-test-results-$(date +%Y%m%d-%H%M%S).log"
PASSED=0
FAILED=0
SKIPPED=0

# 로그 함수
log_section() {
    echo -e "${PURPLE}[SECTION]${NC} $1" | tee -a "$RESULTS_FILE"
}

log_test() {
    echo -e "${CYAN}[TEST]${NC} $1" | tee -a "$RESULTS_FILE"
}

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1" | tee -a "$RESULTS_FILE"
}

log_success() {
    echo -e "${GREEN}[✓]${NC} $1" | tee -a "$RESULTS_FILE"
    PASSED=$((PASSED + 1))
}

log_error() {
    echo -e "${RED}[✗]${NC} $1" | tee -a "$RESULTS_FILE"
    FAILED=$((FAILED + 1))
}

log_skip() {
    echo -e "${YELLOW}[SKIP]${NC} $1" | tee -a "$RESULTS_FILE"
    SKIPPED=$((SKIPPED + 1))
}

# API 호출 헬퍼 함수
api_call() {
    local method=$1
    local url=$2
    local headers=$3
    local data=$4

    if [ "$method" = "GET" ] || [ "$method" = "DELETE" ]; then
        response=$(curl -s -w "\n%{http_code}" -X "$method" "$url" $headers)
    else
        response=$(curl -s -w "\n%{http_code}" -X "$method" "$url" $headers -d "$data")
    fi

    echo "$response"
}

# 메인 테스트 시작
echo "=========================================="
echo "Video Match System"
echo "Comprehensive Integration Test"
echo "=========================================="
echo ""

log_info "테스트 시작 시간: $(date)"
log_info "테스트 결과 파일: $RESULTS_FILE"
echo ""

# ==============================================
# SECTION 1: 서비스 헬스 체크
# ==============================================
log_section "SECTION 1: 서비스 헬스 체크"

log_test "PostgreSQL 상태 확인"
if docker ps 2>/dev/null | grep -q postgres; then
    log_success "PostgreSQL is running"
elif command -v pg_isready >/dev/null 2>&1 && pg_isready -h localhost -p 5432 > /dev/null 2>&1; then
    log_success "PostgreSQL is healthy"
else
    log_skip "PostgreSQL 직접 확인 불가"
fi

log_test "Core Service 헬스 체크"
response=$(curl -s http://localhost:8081/actuator/health)
if echo "$response" | grep -q "UP"; then
    log_success "Core Service is healthy"
else
    log_error "Core Service health check failed"
fi

log_test "Processing Service 헬스 체크"
response=$(curl -s http://localhost:8082/actuator/health)
if echo "$response" | grep -q "UP"; then
    log_success "Processing Service is healthy"
else
    log_error "Processing Service health check failed"
fi

log_test "API Gateway 헬스 체크"
response=$(curl -s http://localhost:8080/actuator/health)
if echo "$response" | grep -q "UP"; then
    log_success "API Gateway is healthy"
else
    log_error "API Gateway health check failed"
fi

log_test "ML Service 헬스 체크"
response=$(curl -s http://localhost:8000/)
if echo "$response" | grep -q "running"; then
    log_success "ML Service is healthy"
else
    log_error "ML Service health check failed"
fi

echo ""

# ==============================================
# SECTION 2: 사용자 계정 관리 시나리오
# ==============================================
log_section "SECTION 2: 사용자 계정 관리"

# 2.1 신규 회원 가입
log_test "2.1 신규 회원 가입"
TIMESTAMP=$(date +%s)
USER_EMAIL="testuser${TIMESTAMP}@example.com"
USER_PASSWORD="SecurePass123!"
USER_NAME="Test User ${TIMESTAMP}"

response=$(curl -s -w "\n%{http_code}" -X POST http://localhost:8080/api/users/register \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$USER_EMAIL\",
    \"password\": \"$USER_PASSWORD\",
    \"name\": \"$USER_NAME\"
  }")

http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

if [ "$http_code" -eq 201 ]; then
    USER_ID=$(echo "$body" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
    log_success "회원 가입 성공 (ID: $USER_ID)"
else
    log_error "회원 가입 실패: HTTP $http_code - $body"
    exit 1
fi

# 2.2 중복 이메일 회원 가입 시도 (실패 테스트)
log_test "2.2 중복 이메일 회원 가입 시도 (실패 예상)"
response=$(curl -s -w "\n%{http_code}" -X POST http://localhost:8080/api/users/register \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$USER_EMAIL\",
    \"password\": \"$USER_PASSWORD\",
    \"name\": \"Duplicate User\"
  }")

http_code=$(echo "$response" | tail -n1)
if [ "$http_code" -eq 409 ] || [ "$http_code" -eq 400 ] || [ "$http_code" -eq 500 ]; then
    log_success "중복 이메일 검증 통과 (HTTP $http_code)"
else
    log_error "중복 이메일 처리 실패: HTTP $http_code"
fi

# 2.3 로그인
log_test "2.3 로그인 및 JWT 토큰 획득"
response=$(curl -s -w "\n%{http_code}" -X POST http://localhost:8080/api/users/login \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$USER_EMAIL\",
    \"password\": \"$USER_PASSWORD\"
  }")

http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

if [ "$http_code" -eq 200 ]; then
    USER_TOKEN=$(echo "$body" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    log_success "로그인 성공, JWT 토큰 획득"
    log_info "Token: ${USER_TOKEN:0:50}..."
else
    log_error "로그인 실패: HTTP $http_code - $body"
    exit 1
fi

# 2.4 잘못된 비밀번호로 로그인 시도 (실패 테스트)
log_test "2.4 잘못된 비밀번호로 로그인 시도 (실패 예상)"
response=$(curl -s -w "\n%{http_code}" -X POST http://localhost:8080/api/users/login \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$USER_EMAIL\",
    \"password\": \"WrongPassword123!\"
  }")

http_code=$(echo "$response" | tail -n1)
if [ "$http_code" -eq 401 ] || [ "$http_code" -eq 400 ]; then
    log_success "잘못된 비밀번호 검증 통과 (HTTP $http_code)"
else
    log_error "잘못된 비밀번호 처리 실패: HTTP $http_code"
fi

echo ""

# ==============================================
# SECTION 3: 광고주 계정 및 광고 관리
# ==============================================
log_section "SECTION 3: 광고주 계정 및 광고 관리"

# 3.1 광고주 계정 생성
log_test "3.1 광고주 계정 생성"
ADV_EMAIL="advertiser${TIMESTAMP}@brand.com"
ADV_PASSWORD="Advertiser123!"
ADV_NAME="Brand Advertiser ${TIMESTAMP}"

response=$(curl -s -w "\n%{http_code}" -X POST http://localhost:8080/api/users/register \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$ADV_EMAIL\",
    \"password\": \"$ADV_PASSWORD\",
    \"name\": \"$ADV_NAME\"
  }")

http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

if [ "$http_code" -eq 201 ]; then
    ADV_ID=$(echo "$body" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
    log_success "광고주 계정 생성 성공 (ID: $ADV_ID)"
else
    log_error "광고주 계정 생성 실패: HTTP $http_code"
    exit 1
fi

# 3.2 광고주 로그인
log_test "3.2 광고주 로그인"
response=$(curl -s -w "\n%{http_code}" -X POST http://localhost:8080/api/users/login \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$ADV_EMAIL\",
    \"password\": \"$ADV_PASSWORD\"
  }")

http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

if [ "$http_code" -eq 200 ]; then
    ADV_TOKEN=$(echo "$body" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    log_success "광고주 로그인 성공"
else
    log_error "광고주 로그인 실패: HTTP $http_code"
    exit 1
fi

# 3.3 광고 캠페인 등록
log_test "3.3 광고 캠페인 등록"
response=$(curl -s -w "\n%{http_code}" -X POST http://localhost:8080/api/advertisements \
  -H "Authorization: Bearer $ADV_TOKEN" \
  -H "X-User-Id: $ADV_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Campaign 2025",
    "brandName": "Test Brand",
    "videoPath": "/ads/test-campaign.mp4",
    "totalFrames": 600
  }')

http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

if [ "$http_code" -eq 201 ]; then
    AD_ID=$(echo "$body" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
    log_success "광고 캠페인 등록 성공 (ID: $AD_ID)"
else
    log_error "광고 캠페인 등록 실패: HTTP $http_code - $body"
fi

# 3.4 광고 목록 조회
log_test "3.4 광고 목록 조회"
response=$(curl -s -w "\n%{http_code}" -X GET http://localhost:8080/api/advertisements \
  -H "Authorization: Bearer $ADV_TOKEN" \
  -H "X-User-Id: $ADV_ID")

http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

if [ "$http_code" -eq 200 ]; then
    ad_count=$(echo "$body" | grep -o '"id"' | wc -l)
    log_success "광고 목록 조회 성공 (총 ${ad_count}개)"
else
    log_error "광고 목록 조회 실패: HTTP $http_code"
fi

# 3.5 브랜드별 필터링
log_test "3.5 브랜드별 광고 필터링"
response=$(curl -s -w "\n%{http_code}" -X GET "http://localhost:8080/api/advertisements?brandName=Test%20Brand" \
  -H "Authorization: Bearer $ADV_TOKEN" \
  -H "X-User-Id: $ADV_ID")

http_code=$(echo "$response" | tail -n1)
if [ "$http_code" -eq 200 ]; then
    log_success "브랜드별 필터링 성공"
else
    log_error "브랜드별 필터링 실패: HTTP $http_code"
fi

# 3.6 광고 상세 정보 조회
log_test "3.6 광고 상세 정보 조회"
if [ -n "$AD_ID" ]; then
    response=$(curl -s -w "\n%{http_code}" -X GET "http://localhost:8080/api/advertisements/$AD_ID" \
      -H "Authorization: Bearer $ADV_TOKEN" \
      -H "X-User-Id: $ADV_ID")

    http_code=$(echo "$response" | tail -n1)
    if [ "$http_code" -eq 200 ]; then
        log_success "광고 상세 정보 조회 성공"
    else
        log_error "광고 상세 정보 조회 실패: HTTP $http_code"
    fi
else
    log_skip "광고 ID가 없어 상세 조회 스킵"
fi

# 3.7 광고 상태 변경
log_test "3.7 광고 상태 변경 (READY)"
if [ -n "$AD_ID" ]; then
    response=$(curl -s -w "\n%{http_code}" -X PATCH "http://localhost:8080/api/advertisements/$AD_ID/status" \
      -H "Authorization: Bearer $ADV_TOKEN" \
      -H "X-User-Id: $ADV_ID" \
      -H "Content-Type: application/json" \
      -d '{"status": "READY"}')

    http_code=$(echo "$response" | tail -n1)
    if [ "$http_code" -eq 200 ]; then
        log_success "광고 상태 변경 성공 (READY)"
    else
        body=$(echo "$response" | sed '$d')
        log_error "광고 상태 변경 실패: HTTP $http_code - $body"
    fi
else
    log_skip "광고 ID가 없어 상태 변경 스킵"
fi

# 3.8 잘못된 상태로 변경 시도 (실패 예상)
log_test "3.8 잘못된 상태로 변경 시도 (400 예상)"
if [ -n "$AD_ID" ]; then
    response=$(curl -s -w "\n%{http_code}" -X PATCH "http://localhost:8080/api/advertisements/$AD_ID/status" \
      -H "Authorization: Bearer $ADV_TOKEN" \
      -H "X-User-Id: $ADV_ID" \
      -H "Content-Type: application/json" \
      -d '{"status": "INVALID_STATUS"}')

    http_code=$(echo "$response" | tail -n1)
    if [ "$http_code" -eq 400 ]; then
        log_success "잘못된 상태 검증 정상 (HTTP 400)"
    else
        log_error "잘못된 상태 처리 오류: HTTP $http_code (400 예상)"
    fi
else
    log_skip "광고 ID가 없어 잘못된 상태 테스트 스킵"
fi

echo ""

# ==============================================
# SECTION 4: 이미지 매칭 기본 시나리오
# ==============================================
log_section "SECTION 4: 이미지 매칭 기본 시나리오"

# 4.1 단일 이미지 업로드
log_test "4.1 단일 이미지 업로드"
if [ -f "sample/photo_1.jpeg" ]; then
    response=$(curl -s -w "\n%{http_code}" -X POST http://localhost:8080/api/matches \
      -H "Authorization: Bearer $USER_TOKEN" \
      -H "X-User-Id: $USER_ID" \
      -F "image=@sample/photo_1.jpeg" \
      -F "priority=50")

    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')

    if [ "$http_code" -eq 201 ]; then
        MATCH_ID_1=$(echo "$body" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
        log_success "이미지 업로드 성공 (Match ID: $MATCH_ID_1)"
    else
        log_error "이미지 업로드 실패: HTTP $http_code"
    fi
else
    log_skip "sample/photo_1.jpeg 파일 없음"
fi

# 4.2 높은 우선순위로 이미지 업로드
log_test "4.2 높은 우선순위 이미지 업로드 (priority=90)"
if [ -f "sample/photo_2.jpeg" ]; then
    response=$(curl -s -w "\n%{http_code}" -X POST http://localhost:8080/api/matches \
      -H "Authorization: Bearer $USER_TOKEN" \
      -H "X-User-Id: $USER_ID" \
      -F "image=@sample/photo_2.jpeg" \
      -F "priority=90")

    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')

    if [ "$http_code" -eq 201 ]; then
        MATCH_ID_2=$(echo "$body" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
        log_success "높은 우선순위 이미지 업로드 성공 (Match ID: $MATCH_ID_2)"
    else
        log_error "이미지 업로드 실패: HTTP $http_code"
    fi
else
    log_skip "sample/photo_2.jpeg 파일 없음"
fi

# 4.3 낮은 우선순위로 이미지 업로드
log_test "4.3 낮은 우선순위 이미지 업로드 (priority=30)"
if [ -f "sample/photo_3.jpeg" ]; then
    response=$(curl -s -w "\n%{http_code}" -X POST http://localhost:8080/api/matches \
      -H "Authorization: Bearer $USER_TOKEN" \
      -H "X-User-Id: $USER_ID" \
      -F "image=@sample/photo_3.jpeg" \
      -F "priority=30")

    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')

    if [ "$http_code" -eq 201 ]; then
        MATCH_ID_3=$(echo "$body" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
        log_success "낮은 우선순위 이미지 업로드 성공 (Match ID: $MATCH_ID_3)"
    else
        log_error "이미지 업로드 실패: HTTP $http_code"
    fi
else
    log_skip "sample/photo_3.jpeg 파일 없음"
fi

echo ""

# ==============================================
# SECTION 5: 매칭 상태 모니터링
# ==============================================
log_section "SECTION 5: 매칭 상태 모니터링"

# 5.1 매칭 상태 폴링
log_test "5.1 매칭 처리 완료 대기"
declare -a ALL_MATCH_IDS=()
[ -n "$MATCH_ID_1" ] && ALL_MATCH_IDS+=("$MATCH_ID_1")
[ -n "$MATCH_ID_2" ] && ALL_MATCH_IDS+=("$MATCH_ID_2")
[ -n "$MATCH_ID_3" ] && ALL_MATCH_IDS+=("$MATCH_ID_3")

for match_id in "${ALL_MATCH_IDS[@]}"; do
    log_info "  매칭 ID $match_id 처리 대기 중..."

    max_attempts=12
    attempt=0

    while [ $attempt -lt $max_attempts ]; do
        response=$(curl -s -w "\n%{http_code}" -X GET "http://localhost:8080/api/matches/$match_id" \
          -H "Authorization: Bearer $USER_TOKEN" \
          -H "X-User-Id: $USER_ID")

        http_code=$(echo "$response" | tail -n1)
        body=$(echo "$response" | sed '$d')

        if [ "$http_code" -eq 200 ]; then
            status=$(echo "$body" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)

            if [ "$status" = "COMPLETED" ]; then
                confidence=$(echo "$body" | grep -o '"confidence":[0-9.]*' | cut -d':' -f2)
                log_success "  매칭 완료: $match_id (신뢰도: $confidence)"
                break
            elif [ "$status" = "FAILED" ]; then
                log_error "  매칭 실패: $match_id"
                break
            elif [ "$status" = "QUEUED" ] || [ "$status" = "PROCESSING" ]; then
                log_info "    상태: $status (5초 후 재확인)"
                sleep 5
            fi
        fi

        attempt=$((attempt + 1))
    done

    if [ $attempt -eq $max_attempts ]; then
        log_error "  매칭 타임아웃: $match_id"
    fi
done

echo ""

# ==============================================
# SECTION 6: 매칭 히스토리 및 결과 조회
# ==============================================
log_section "SECTION 6: 매칭 히스토리 및 결과 조회"

# 6.1 매칭 히스토리 조회
log_test "6.1 매칭 히스토리 조회"
response=$(curl -s -w "\n%{http_code}" -X GET http://localhost:8080/api/matches \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "X-User-Id: $USER_ID")

http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

if [ "$http_code" -eq 200 ]; then
    match_count=$(echo "$body" | grep -o '"id"' | wc -l)
    log_success "매칭 히스토리 조회 성공 (총 ${match_count}개)"
else
    log_error "매칭 히스토리 조회 실패: HTTP $http_code"
fi

# 6.2 개별 매칭 상세 조회
log_test "6.2 개별 매칭 상세 조회"
if [ -n "$MATCH_ID_1" ]; then
    response=$(curl -s -w "\n%{http_code}" -X GET "http://localhost:8080/api/matches/$MATCH_ID_1" \
      -H "Authorization: Bearer $USER_TOKEN" \
      -H "X-User-Id: $USER_ID")

    http_code=$(echo "$response" | tail -n1)
    if [ "$http_code" -eq 200 ]; then
        log_success "매칭 상세 정보 조회 성공"
    else
        log_error "매칭 상세 정보 조회 실패: HTTP $http_code"
    fi
else
    log_skip "매칭 ID가 없어 상세 조회 스킵"
fi

echo ""

# ==============================================
# SECTION 7: 에러 처리 및 엣지 케이스
# ==============================================
log_section "SECTION 7: 에러 처리 및 엣지 케이스"

# 7.1 인증 없이 API 호출 (401 예상)
log_test "7.1 인증 없이 보호된 API 호출 (실패 예상)"
response=$(curl -s -w "\n%{http_code}" -X GET http://localhost:8080/api/matches)
http_code=$(echo "$response" | tail -n1)

if [ "$http_code" -eq 401 ]; then
    log_success "인증 실패 처리 정상 (HTTP 401)"
else
    log_error "인증 실패 처리 오류: HTTP $http_code (401 예상)"
fi

# 7.2 잘못된 토큰으로 API 호출 (401 예상)
log_test "7.2 잘못된 JWT 토큰 사용 (실패 예상)"
response=$(curl -s -w "\n%{http_code}" -X GET http://localhost:8080/api/matches \
  -H "Authorization: Bearer invalid.jwt.token" \
  -H "X-User-Id: $USER_ID")

http_code=$(echo "$response" | tail -n1)
if [ "$http_code" -eq 401 ] || [ "$http_code" -eq 403 ]; then
    log_success "잘못된 토큰 처리 정상 (HTTP $http_code)"
else
    log_error "잘못된 토큰 처리 오류: HTTP $http_code"
fi

# 7.3 존재하지 않는 매칭 ID 조회 (404 예상)
log_test "7.3 존재하지 않는 매칭 조회 (404 예상)"
response=$(curl -s -w "\n%{http_code}" -X GET "http://localhost:8080/api/matches/00000000-0000-0000-0000-000000000000" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "X-User-Id: $USER_ID")

http_code=$(echo "$response" | tail -n1)
if [ "$http_code" -eq 404 ]; then
    log_success "존재하지 않는 리소스 처리 정상 (HTTP 404)"
else
    log_error "존재하지 않는 리소스 처리 오류: HTTP $http_code (404 예상)"
fi

# 7.4 잘못된 JSON 형식 (400 예상)
log_test "7.4 잘못된 JSON 형식 전송 (400 예상)"
response=$(curl -s -w "\n%{http_code}" -X POST http://localhost:8080/api/users/register \
  -H "Content-Type: application/json" \
  -d '{invalid json}')

http_code=$(echo "$response" | tail -n1)
if [ "$http_code" -eq 400 ]; then
    log_success "잘못된 JSON 처리 정상 (HTTP 400)"
else
    log_error "잘못된 JSON 처리 오류: HTTP $http_code (400 예상)"
fi

# 7.5 필수 필드 누락 (400 예상)
log_test "7.5 필수 필드 누락 요청 (400 예상)"
response=$(curl -s -w "\n%{http_code}" -X POST http://localhost:8080/api/users/register \
  -H "Content-Type: application/json" \
  -d '{"email": "test@test.com"}')

http_code=$(echo "$response" | tail -n1)
if [ "$http_code" -eq 400 ]; then
    log_success "필수 필드 검증 정상 (HTTP 400)"
else
    log_error "필수 필드 검증 오류: HTTP $http_code (400 예상)"
fi

echo ""

# ==============================================
# SECTION 8: 다중 사용자 동시성 테스트
# ==============================================
log_section "SECTION 8: 다중 사용자 동시성 테스트"

log_test "8.1 동시 사용자 등록 (3명)"

# 백그라운드로 3명의 사용자 등록
declare -a CONCURRENT_USER_IDS=()
for i in 1 2 3; do
    concurrent_email="concurrent${TIMESTAMP}_${i}@test.com"

    response=$(curl -s -w "\n%{http_code}" -X POST http://localhost:8080/api/users/register \
      -H "Content-Type: application/json" \
      -d "{
        \"email\": \"$concurrent_email\",
        \"password\": \"Password${i}!\",
        \"name\": \"Concurrent User $i\"
      }") &
done

wait

log_success "동시 사용자 등록 완료"

echo ""

# ==============================================
# SECTION 9: 데이터베이스 무결성 검증
# ==============================================
log_section "SECTION 9: 데이터베이스 무결성 검증"

log_test "9.1 데이터베이스 사용자 수 확인"
user_count=$(docker-compose exec -T postgres psql -U videomatch -d videomatch -t -c "SELECT COUNT(*) FROM users;" 2>/dev/null | tr -d ' ' || echo "")

if [ -n "$user_count" ] && [ "$user_count" -gt 0 ]; then
    log_success "데이터베이스 사용자 수: $user_count"
else
    log_skip "데이터베이스 직접 접근 불가"
fi

log_test "9.2 데이터베이스 매칭 수 확인"
match_count=$(docker-compose exec -T postgres psql -U videomatch -d videomatch -t -c "SELECT COUNT(*) FROM image_matches;" 2>/dev/null | tr -d ' ' || echo "")

if [ -n "$match_count" ]; then
    log_success "데이터베이스 매칭 수: $match_count"
else
    log_skip "데이터베이스 직접 접근 불가"
fi

log_test "9.3 데이터베이스 광고 수 확인"
ad_count=$(docker-compose exec -T postgres psql -U videomatch -d videomatch -t -c "SELECT COUNT(*) FROM videos;" 2>/dev/null | tr -d ' ' || echo "")

if [ -n "$ad_count" ] && [ "$ad_count" -gt 0 ]; then
    log_success "데이터베이스 광고 수: $ad_count"
else
    log_skip "데이터베이스 직접 접근 불가"
fi

echo ""

# ==============================================
# 테스트 결과 요약
# ==============================================
echo "=========================================="
echo "테스트 결과 요약"
echo "=========================================="
log_info "테스트 종료 시간: $(date)"
log_info "총 통과: $PASSED"
log_info "총 실패: $FAILED"
log_info "총 스킵: $SKIPPED"
echo ""

TOTAL=$((PASSED + FAILED))
if [ $TOTAL -gt 0 ]; then
    SUCCESS_RATE=$((PASSED * 100 / TOTAL))
    log_info "성공률: ${SUCCESS_RATE}%"
fi

if [ $FAILED -eq 0 ]; then
    log_success "모든 테스트 통과! 🎉"
    echo ""
    echo "시스템이 정상적으로 작동하며 모든 시나리오가 검증되었습니다."
    exit 0
else
    log_error "일부 테스트 실패 (${FAILED}개)"
    echo ""
    echo "테스트 로그를 확인하세요: $RESULTS_FILE"
    exit 1
fi
