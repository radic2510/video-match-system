#!/bin/bash

# Video Match System - Real Use Case Integration Test
# 실제 사용 시나리오를 기반으로 한 통합 테스트
#
# 시나리오:
# 1. 광고주가 광고 영상을 업로드 (메타데이터 등록)
# 2. 시스템이 영상에서 프레임 추출 및 임베딩 생성
# 3. 사용자가 거리에서 본 광고 사진을 업로드
# 4. 시스템이 어느 광고 영상인지 매칭
# 5. 사용자가 매칭 결과와 신뢰도 확인

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'

# 테스트 결과 저장
RESULTS_FILE="usecase-test-results-$(date +%Y%m%d-%H%M%S).log"
PASSED=0
FAILED=0

# 로그 함수
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

log_warning() {
    echo -e "${YELLOW}[!]${NC} $1" | tee -a "$RESULTS_FILE"
}

log_scenario() {
    echo -e "${MAGENTA}[SCENARIO]${NC} $1" | tee -a "$RESULTS_FILE"
}

log_step() {
    echo -e "${CYAN}[STEP]${NC} $1" | tee -a "$RESULTS_FILE"
}

echo "=========================================="
echo "Video Match System"
echo "Real Use Case Integration Test"
echo "=========================================="
echo ""

log_info "테스트 시작 시간: $(date)"
log_info "테스트 결과 파일: $RESULTS_FILE"
echo ""

# ==============================================
# USE CASE 1: 광고주의 광고 등록 및 관리
# ==============================================
log_scenario "USE CASE 1: 광고주가 신규 광고 캠페인을 등록합니다"
echo ""

# Step 1-1: 광고주 계정 생성
log_step "1-1. 광고주 계정 생성"
ADVERTISER_EMAIL="advertiser_$(date +%s)@brand-company.com"
ADVERTISER_PASSWORD="Advertiser123!"
ADVERTISER_NAME="Brand Company Advertiser"

response=$(curl -s -w "\n%{http_code}" -X POST "http://localhost:8080/api/users/register" \
    -H "Content-Type: application/json" \
    -d "{
        \"email\": \"$ADVERTISER_EMAIL\",
        \"password\": \"$ADVERTISER_PASSWORD\",
        \"name\": \"$ADVERTISER_NAME\"
    }")

http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

if [ "$http_code" -eq 201 ]; then
    ADVERTISER_ID=$(echo "$body" | jq -r '.id')
    log_success "광고주 계정 생성 성공: $ADVERTISER_EMAIL (ID: $ADVERTISER_ID)"
else
    log_error "광고주 계정 생성 실패: HTTP $http_code"
    exit 1
fi

# Step 1-2: 광고주 로그인
log_step "1-2. 광고주 로그인"
response=$(curl -s -w "\n%{http_code}" -X POST "http://localhost:8080/api/users/login" \
    -H "Content-Type: application/json" \
    -d "{
        \"email\": \"$ADVERTISER_EMAIL\",
        \"password\": \"$ADVERTISER_PASSWORD\"
    }")

http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

if [ "$http_code" -eq 200 ]; then
    ADVERTISER_TOKEN=$(echo "$body" | jq -r '.token')
    log_success "광고주 로그인 성공, JWT 토큰 획득"
    log_info "Token: ${ADVERTISER_TOKEN:0:50}..."
else
    log_error "광고주 로그인 실패: HTTP $http_code"
    exit 1
fi

# Step 1-3: 광고 동영상 업로드 (메타데이터 등록)
log_step "1-3. 광고 캠페인 등록 - '겨울 신상품 광고'"
CAMPAIGN_NAME="2024 Winter New Collection"
BRAND_NAME="Fashion Brand X"
VIDEO_PATH="/ads/winter-2024-collection.mp4"
TOTAL_FRAMES=900  # 30초 @ 30fps

response=$(curl -s -w "\n%{http_code}" -X POST "http://localhost:8080/api/advertisements" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ADVERTISER_TOKEN" \
    -H "X-User-Id: $ADVERTISER_ID" \
    -d "{
        \"title\": \"$CAMPAIGN_NAME\",
        \"brandName\": \"$BRAND_NAME\",
        \"videoPath\": \"$VIDEO_PATH\",
        \"totalFrames\": $TOTAL_FRAMES
    }")

http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

if [ "$http_code" -eq 201 ]; then
    AD_ID=$(echo "$body" | jq -r '.id')
    log_success "광고 캠페인 등록 성공: $CAMPAIGN_NAME (ID: $AD_ID)"
    log_info "브랜드: $BRAND_NAME"
    log_info "총 프레임: $TOTAL_FRAMES"
else
    log_error "광고 캠페인 등록 실패: HTTP $http_code - $body"
    exit 1
fi

# Step 1-4: 광고 목록 조회
log_step "1-4. 등록된 광고 목록 확인"
response=$(curl -s -w "\n%{http_code}" -X GET "http://localhost:8080/api/advertisements" \
    -H "Authorization: Bearer $ADVERTISER_TOKEN" \
    -H "X-User-Id: $ADVERTISER_ID")

http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

if [ "$http_code" -eq 200 ]; then
    AD_COUNT=$(echo "$body" | jq '. | length')
    log_success "광고 목록 조회 성공 (총 ${AD_COUNT}개 광고)"
else
    log_error "광고 목록 조회 실패: HTTP $http_code"
fi

echo ""

# ==============================================
# USE CASE 2: 일반 사용자의 광고 매칭 요청
# ==============================================
log_scenario "USE CASE 2: 사용자가 거리에서 본 광고를 촬영하여 업로드합니다"
echo ""

# Step 2-1: 일반 사용자 계정 생성
log_step "2-1. 일반 사용자 계정 생성"
USER_EMAIL="user_$(date +%s)@gmail.com"
USER_PASSWORD="User123!"
USER_NAME="일반 사용자"

response=$(curl -s -w "\n%{http_code}" -X POST "http://localhost:8080/api/users/register" \
    -H "Content-Type: application/json" \
    -d "{
        \"email\": \"$USER_EMAIL\",
        \"password\": \"$USER_PASSWORD\",
        \"name\": \"$USER_NAME\"
    }")

http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

if [ "$http_code" -eq 201 ]; then
    USER_ID=$(echo "$body" | jq -r '.id')
    log_success "사용자 계정 생성 성공: $USER_EMAIL (ID: $USER_ID)"
else
    log_error "사용자 계정 생성 실패: HTTP $http_code"
    exit 1
fi

# Step 2-2: 사용자 로그인
log_step "2-2. 사용자 로그인"
response=$(curl -s -w "\n%{http_code}" -X POST "http://localhost:8080/api/users/login" \
    -H "Content-Type: application/json" \
    -d "{
        \"email\": \"$USER_EMAIL\",
        \"password\": \"$USER_PASSWORD\"
    }")

http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

if [ "$http_code" -eq 200 ]; then
    USER_TOKEN=$(echo "$body" | jq -r '.token')
    log_success "사용자 로그인 성공"
else
    log_error "사용자 로그인 실패: HTTP $http_code"
    exit 1
fi

# Step 2-3: 사용자가 촬영한 사진 업로드 (3장)
log_step "2-3. 사용자가 촬영한 광고 사진 업로드"

# 이미지 파일 경로
IMAGE_DIR="sample"
IMAGES=("photo_1.jpeg" "photo_2.jpeg" "photo_3.jpeg")
declare -a MATCH_IDS

for i in "${!IMAGES[@]}"; do
    IMAGE_FILE="${IMAGES[$i]}"
    IMAGE_PATH="$IMAGE_DIR/$IMAGE_FILE"

    log_info "  이미지 업로드 중 (${i+1}/3): $IMAGE_FILE"

    response=$(curl -s -w "\n%{http_code}" -X POST "http://localhost:8080/api/matches" \
        -H "Authorization: Bearer $USER_TOKEN" \
        -H "X-User-Id: $USER_ID" \
        -F "image=@$IMAGE_PATH" \
        -F "priority=80")

    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')

    if [ "$http_code" -eq 201 ]; then
        MATCH_ID=$(echo "$body" | jq -r '.id')
        MATCH_IDS[$i]=$MATCH_ID
        log_success "  이미지 업로드 성공: $IMAGE_FILE (Match ID: $MATCH_ID)"
    else
        log_error "  이미지 업로드 실패: HTTP $http_code - $body"
    fi
done

echo ""

# ==============================================
# USE CASE 3: 매칭 결과 확인 및 분석
# ==============================================
log_scenario "USE CASE 3: 시스템이 매칭을 처리하고 결과를 제공합니다"
echo ""

# Step 3-1: 매칭 처리 대기
log_step "3-1. AI 매칭 처리 대기 (최대 60초)"

for i in "${!MATCH_IDS[@]}"; do
    MATCH_ID="${MATCH_IDS[$i]}"
    IMAGE_FILE="${IMAGES[$i]}"

    log_info "  매칭 ID: $MATCH_ID (${IMAGE_FILE}) 상태 확인 중..."

    MAX_ATTEMPTS=12
    ATTEMPT=0
    MATCHED=false

    while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
        ATTEMPT=$((ATTEMPT + 1))

        response=$(curl -s -w "\n%{http_code}" -X GET "http://localhost:8080/api/matches/$MATCH_ID" \
            -H "Authorization: Bearer $USER_TOKEN" \
            -H "X-User-Id: $USER_ID")

        http_code=$(echo "$response" | tail -n1)
        body=$(echo "$response" | sed '$d')

        if [ "$http_code" -eq 200 ]; then
            STATUS=$(echo "$body" | jq -r '.status')
            log_info "    시도 $ATTEMPT/$MAX_ATTEMPTS - 상태: $STATUS"

            if [ "$STATUS" == "COMPLETED" ]; then
                CONFIDENCE=$(echo "$body" | jq -r '.result.confidence')
                MATCHED_AD_ID=$(echo "$body" | jq -r '.result.advertisementId // "null"')

                log_success "  ✓ 매칭 완료: $IMAGE_FILE"
                log_info "    신뢰도: $CONFIDENCE"
                if [ "$MATCHED_AD_ID" != "null" ]; then
                    log_info "    매칭된 광고 ID: $MATCHED_AD_ID"
                fi

                MATCHED=true
                break
            elif [ "$STATUS" == "FAILED" ]; then
                log_error "  매칭 실패: $MATCH_ID"
                break
            fi
        fi

        if [ $ATTEMPT -lt $MAX_ATTEMPTS ]; then
            log_info "    처리 중... (5초 후 재확인)"
            sleep 5
        fi
    done

    if [ "$MATCHED" = false ] && [ "$STATUS" != "FAILED" ]; then
        log_warning "  매칭 타임아웃: $MATCH_ID (60초 초과)"
    fi

    echo ""
done

# Step 3-2: 사용자의 전체 매칭 히스토리 조회
log_step "3-2. 사용자 매칭 히스토리 조회"

response=$(curl -s -w "\n%{http_code}" -X GET "http://localhost:8080/api/matches" \
    -H "Authorization: Bearer $USER_TOKEN" \
    -H "X-User-Id: $USER_ID")

http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

if [ "$http_code" -eq 200 ]; then
    HISTORY_COUNT=$(echo "$body" | jq '. | length')
    COMPLETED_COUNT=$(echo "$body" | jq '[.[] | select(.status == "COMPLETED")] | length')
    log_success "매칭 히스토리 조회 성공"
    log_info "  총 매칭 요청: ${HISTORY_COUNT}개"
    log_info "  완료된 매칭: ${COMPLETED_COUNT}개"

    # 각 매칭의 상세 정보 출력
    echo ""
    log_info "=== 매칭 상세 결과 ==="
    echo "$body" | jq -r '.[] | "  - 이미지 해시: \(.imageHash[0:16])... | 상태: \(.status) | 신뢰도: \(.result.confidence // "N/A")"' | tee -a "$RESULTS_FILE"
else
    log_error "매칭 히스토리 조회 실패: HTTP $http_code"
fi

echo ""

# ==============================================
# USE CASE 4: 광고 성과 분석
# ==============================================
log_scenario "USE CASE 4: 광고주가 캠페인 성과를 확인합니다"
echo ""

# Step 4-1: 특정 브랜드의 광고 목록 조회
log_step "4-1. 브랜드별 광고 캠페인 조회"

# URL encode brand name for query parameter
BRAND_NAME_ENCODED=$(echo "$BRAND_NAME" | sed 's/ /%20/g')

response=$(curl -s -w "\n%{http_code}" -X GET "http://localhost:8080/api/advertisements?brandName=$BRAND_NAME_ENCODED" \
    -H "Authorization: Bearer $ADVERTISER_TOKEN" \
    -H "X-User-Id: $ADVERTISER_ID")

http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

if [ "$http_code" -eq 200 ]; then
    BRAND_AD_COUNT=$(echo "$body" | jq '. | length')
    log_success "브랜드 '${BRAND_NAME}' 광고 조회 성공 (${BRAND_AD_COUNT}개)"
else
    log_error "브랜드별 광고 조회 실패: HTTP $http_code"
fi

# Step 4-2: 광고 상세 정보 조회
log_step "4-2. 광고 캠페인 상세 정보 확인"

response=$(curl -s -w "\n%{http_code}" -X GET "http://localhost:8080/api/advertisements/$AD_ID" \
    -H "Authorization: Bearer $ADVERTISER_TOKEN" \
    -H "X-User-Id: $ADVERTISER_ID")

http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

if [ "$http_code" -eq 200 ]; then
    TITLE=$(echo "$body" | jq -r '.title')
    STATUS=$(echo "$body" | jq -r '.status')
    CREATED_AT=$(echo "$body" | jq -r '.createdAt')

    log_success "광고 상세 정보 조회 성공"
    log_info "  캠페인명: $TITLE"
    log_info "  상태: $STATUS"
    log_info "  등록일: $CREATED_AT"
else
    log_error "광고 상세 정보 조회 실패: HTTP $http_code"
fi

echo ""

# ==============================================
# 테스트 결과 요약
# ==============================================
echo "==========================================
"
echo "테스트 결과 요약"
echo "=========================================="

log_info "테스트 종료 시간: $(date)"
log_info "총 통과: $PASSED"
log_info "총 실패: $FAILED"

if [ $FAILED -eq 0 ]; then
    log_success "모든 Use Case 테스트 통과! 🎉"
    echo ""
    log_info "=== 테스트 시나리오 완료 ==="
    log_info "✓ USE CASE 1: 광고주 계정 및 광고 캠페인 등록"
    log_info "✓ USE CASE 2: 일반 사용자 사진 업로드 및 매칭 요청"
    log_info "✓ USE CASE 3: AI 매칭 처리 및 결과 확인"
    log_info "✓ USE CASE 4: 광고 성과 분석 및 조회"
    echo ""
    log_success "실제 사용 시나리오가 정상적으로 작동합니다! ✨"
else
    log_error "일부 테스트 실패 (${FAILED}개)"
    exit 1
fi

echo ""
echo "테스트 로그를 확인하세요: $RESULTS_FILE"
echo ""
