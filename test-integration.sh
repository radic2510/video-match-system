#!/bin/bash

# Video Match System - Automated Integration Test
# 이 스크립트는 sample 데이터를 사용하여 전체 시스템을 자동으로 테스트합니다.

set -e  # 오류 발생 시 스크립트 중단

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 테스트 결과 저장
RESULTS_FILE="test-results-$(date +%Y%m%d-%H%M%S).log"
PASSED=0
FAILED=0

# 로그 함수
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1" | tee -a "$RESULTS_FILE"
}

log_success() {
    echo -e "${GREEN}[✓]${NC} $1" | tee -a "$RESULTS_FILE"
    ((PASSED++))
}

log_error() {
    echo -e "${RED}[✗]${NC} $1" | tee -a "$RESULTS_FILE"
    ((FAILED++))
}

log_warning() {
    echo -e "${YELLOW}[!]${NC} $1" | tee -a "$RESULTS_FILE"
}

# API 호출 및 응답 확인 함수
api_call() {
    local method=$1
    local url=$2
    local data=$3
    local headers=$4
    local expected_status=$5

    if [ -n "$headers" ]; then
        response=$(curl -s -w "\n%{http_code}" -X "$method" "$url" $headers -d "$data")
    else
        response=$(curl -s -w "\n%{http_code}" -X "$method" "$url" -H "Content-Type: application/json" -d "$data")
    fi

    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')

    if [ "$http_code" -eq "$expected_status" ]; then
        echo "$body"
        return 0
    else
        log_error "Expected status $expected_status, got $http_code"
        echo "$body"
        return 1
    fi
}

# 서비스 헬스 체크
check_service_health() {
    local service_name=$1
    local health_url=$2

    log_info "Checking $service_name health..."

    response=$(curl -s "$health_url" || echo "")

    if echo "$response" | grep -q "UP\|healthy\|running"; then
        log_success "$service_name is healthy"
        return 0
    else
        log_error "$service_name is not healthy: $response"
        return 1
    fi
}

# 메인 테스트 시작
echo "=========================================="
echo "Video Match System - Integration Test"
echo "=========================================="
echo ""

log_info "시작 시간: $(date)"
log_info "테스트 결과 파일: $RESULTS_FILE"
echo ""

# 1. 서비스 헬스 체크
log_info "=== 1단계: 서비스 헬스 체크 ==="
check_service_health "PostgreSQL" "http://localhost:5432" || log_warning "PostgreSQL 직접 헬스 체크 불가 (정상일 수 있음)"
check_service_health "Core Service" "http://localhost:8081/actuator/health" || log_warning "Core Service 헬스 체크 실패 (서비스가 실행 중일 수 있음)"
check_service_health "Processing Service" "http://localhost:8082/actuator/health" || log_warning "Processing Service 헬스 체크 실패 (서비스가 실행 중일 수 있음)"
check_service_health "API Gateway" "http://localhost:8080/actuator/health" || log_warning "API Gateway 헬스 체크 실패 (서비스가 실행 중일 수 있음)"
check_service_health "ML Service" "http://localhost:8000/" || log_warning "ML Service 헬스 체크 실패 (서비스가 실행 중일 수 있음)"
echo ""

# 2. 사용자 등록
log_info "=== 2단계: 사용자 등록 ==="
TIMESTAMP=$(date +%s)
USER_EMAIL="test${TIMESTAMP}@videomatch.com"
USER_PASSWORD="Test123!"
USER_NAME="Test User ${TIMESTAMP}"

log_info "등록할 사용자: $USER_EMAIL"

register_response=$(curl -s -X POST http://localhost:8080/api/users/register \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$USER_EMAIL\",
    \"password\": \"$USER_PASSWORD\",
    \"name\": \"$USER_NAME\"
  }")

if echo "$register_response" | grep -q "id"; then
    USER_ID=$(echo "$register_response" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
    log_success "사용자 등록 성공: $USER_EMAIL (ID: $USER_ID)"
else
    log_error "사용자 등록 실패: $register_response"
    exit 1
fi
echo ""

# 3. 로그인
log_info "=== 3단계: 로그인 ==="

login_response=$(curl -s -X POST http://localhost:8080/api/users/login \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$USER_EMAIL\",
    \"password\": \"$USER_PASSWORD\"
  }")

if echo "$login_response" | grep -q "token"; then
    TOKEN=$(echo "$login_response" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    log_success "로그인 성공, JWT 토큰 획득"
    log_info "Token: ${TOKEN:0:50}..."
else
    log_error "로그인 실패: $login_response"
    exit 1
fi
echo ""

# 4. 광고 생성
log_info "=== 4단계: 광고 생성 ==="

ad_response=$(curl -s -X POST http://localhost:8080/api/advertisements \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Sample Advertisement",
    "brandName": "Demo Brand",
    "videoPath": "/sample/video_1.mp4",
    "totalFrames": 300
  }')

if echo "$ad_response" | grep -q "id"; then
    AD_ID=$(echo "$ad_response" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
    log_success "광고 생성 성공 (ID: $AD_ID)"
else
    log_error "광고 생성 실패: $ad_response"
fi
echo ""

# 5. 이미지 매칭 테스트 (sample/photo_1.jpeg, photo_2.jpeg, photo_3.jpeg)
log_info "=== 5단계: 이미지 매칭 테스트 ==="

SAMPLE_DIR="sample"
PHOTOS=("photo_1.jpeg" "photo_2.jpeg" "photo_3.jpeg")

declare -a MATCH_IDS

for photo in "${PHOTOS[@]}"; do
    photo_path="$SAMPLE_DIR/$photo"

    if [ ! -f "$photo_path" ]; then
        log_warning "샘플 이미지를 찾을 수 없습니다: $photo_path"
        continue
    fi

    log_info "이미지 업로드 중: $photo"

    match_response=$(curl -s -X POST http://localhost:8080/api/matches \
      -H "Authorization: Bearer $TOKEN" \
      -F "image=@$photo_path" \
      -F "priority=high")

    if echo "$match_response" | grep -q "matchId\|id"; then
        MATCH_ID=$(echo "$match_response" | grep -o '"matchId":"[^"]*"' | cut -d'"' -f4)
        if [ -z "$MATCH_ID" ]; then
            MATCH_ID=$(echo "$match_response" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
        fi
        MATCH_IDS+=("$MATCH_ID")
        log_success "이미지 업로드 성공: $photo (Match ID: $MATCH_ID)"
    else
        log_error "이미지 업로드 실패: $photo - $match_response"
    fi
done
echo ""

# 6. 매치 상태 폴링
log_info "=== 6단계: 매치 상태 확인 ==="

for match_id in "${MATCH_IDS[@]}"; do
    log_info "매치 ID $match_id 상태 확인 중..."

    # 최대 60초 동안 폴링
    max_attempts=12
    attempt=0

    while [ $attempt -lt $max_attempts ]; do
        status_response=$(curl -s http://localhost:8080/api/matches/$match_id \
          -H "Authorization: Bearer $TOKEN")

        status=$(echo "$status_response" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)

        log_info "  시도 $((attempt+1))/$max_attempts - 상태: $status"

        if [ "$status" = "COMPLETED" ]; then
            log_success "매치 완료: $match_id"

            # 결과 확인
            if echo "$status_response" | grep -q "confidence"; then
                confidence=$(echo "$status_response" | grep -o '"confidence":[0-9.]*' | cut -d':' -f2)
                log_info "  신뢰도: $confidence"
            fi

            break
        elif [ "$status" = "FAILED" ]; then
            log_error "매치 실패: $match_id"
            log_error "  응답: $status_response"
            break
        elif [ "$status" = "QUEUED" ] || [ "$status" = "PROCESSING" ]; then
            log_info "  매치 진행 중... (5초 후 재확인)"
            sleep 5
        else
            log_warning "  알 수 없는 상태: $status"
            sleep 5
        fi

        ((attempt++))
    done

    if [ $attempt -eq $max_attempts ]; then
        log_error "매치 타임아웃: $match_id (60초 초과)"
    fi

    echo ""
done

# 7. 매치 히스토리 조회
log_info "=== 7단계: 매치 히스토리 조회 ==="

history_response=$(curl -s http://localhost:8080/api/matches \
  -H "Authorization: Bearer $TOKEN")

if echo "$history_response" | grep -q "id\|matchId"; then
    match_count=$(echo "$history_response" | grep -o '"id":"[^"]*"' | wc -l)
    log_success "매치 히스토리 조회 성공 (총 ${match_count}개)"
else
    log_error "매치 히스토리 조회 실패: $history_response"
fi
echo ""

# 8. 데이터베이스 확인
log_info "=== 8단계: 데이터베이스 확인 ==="

log_info "데이터베이스 사용자 수 확인..."
user_count=$(docker-compose exec -T postgres psql -U videomatch -d videomatch -t -c "SELECT COUNT(*) FROM users;" 2>/dev/null | tr -d ' ')
if [ -n "$user_count" ] && [ "$user_count" -gt 0 ]; then
    log_success "데이터베이스 사용자 수: $user_count"
else
    log_warning "데이터베이스 사용자 수 확인 실패 (Docker 환경이 아닐 수 있음)"
fi

log_info "데이터베이스 매치 수 확인..."
match_count=$(docker-compose exec -T postgres psql -U videomatch -d videomatch -t -c "SELECT COUNT(*) FROM image_matches;" 2>/dev/null | tr -d ' ')
if [ -n "$match_count" ] && [ "$match_count" -gt 0 ]; then
    log_success "데이터베이스 매치 수: $match_count"
else
    log_warning "데이터베이스 매치 수 확인 실패 (Docker 환경이 아닐 수 있음)"
fi
echo ""

# 테스트 결과 요약
echo "=========================================="
echo "테스트 결과 요약"
echo "=========================================="
log_info "종료 시간: $(date)"
log_info "총 통과: $PASSED"
log_info "총 실패: $FAILED"

if [ $FAILED -eq 0 ]; then
    log_success "모든 테스트 통과! 🎉"
    echo ""
    echo "시스템이 정상적으로 작동합니다."
    exit 0
else
    log_error "일부 테스트 실패 (${FAILED}개)"
    echo ""
    echo "테스트 로그를 확인하세요: $RESULTS_FILE"
    exit 1
fi
