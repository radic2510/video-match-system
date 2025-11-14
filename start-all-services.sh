#!/bin/bash

# Video Match System - Start All Services
# 모든 서비스를 자동으로 시작하고 준비 상태를 확인합니다.

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

log_error() {
    echo -e "${RED}[✗]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

# 서비스 준비 대기 함수
wait_for_service() {
    local service_name=$1
    local health_url=$2
    local max_wait=$3

    log_info "Waiting for $service_name to be ready..."

    local elapsed=0
    while [ $elapsed -lt $max_wait ]; do
        response=$(curl -s "$health_url" 2>/dev/null || echo "")

        if echo "$response" | grep -q "UP\|healthy\|running"; then
            log_success "$service_name is ready!"
            return 0
        fi

        echo -n "."
        sleep 2
        elapsed=$((elapsed + 2))
    done

    echo ""
    log_error "$service_name failed to start within ${max_wait}s"
    return 1
}

echo "=========================================="
echo "Video Match System - Service Startup"
echo "=========================================="
echo ""

# 1. PostgreSQL 시작
log_info "=== 1단계: PostgreSQL 시작 ==="

if docker compose ps postgres 2>/dev/null | grep -q "Up"; then
    log_warning "PostgreSQL이 이미 실행 중입니다."
else
    log_info "PostgreSQL 시작 중..."
    docker compose up -d postgres

    log_info "PostgreSQL이 준비될 때까지 대기 (최대 30초)..."
    sleep 5

    # PostgreSQL 준비 확인
    for i in {1..10}; do
        if docker compose exec -T postgres pg_isready -U videomatch 2>/dev/null | grep -q "accepting"; then
            log_success "PostgreSQL 준비 완료!"
            break
        fi
        echo -n "."
        sleep 2
    done
    echo ""
fi
echo ""

# 2. Backend 빌드
log_info "=== 2단계: Backend 빌드 ==="
cd backend

if [ ! -d "build" ] || [ ! -f "core-service/build/libs/core-service-1.0.0.jar" ]; then
    log_info "Backend 빌드 중... (최초 실행 시 시간이 걸릴 수 있습니다)"
    ./gradlew build -x test
    log_success "Backend 빌드 완료!"
else
    log_info "Backend가 이미 빌드되어 있습니다."
fi

cd ..
echo ""

# 3. Core Service 시작
log_info "=== 3단계: Core Service 시작 (포트 8081) ==="

if lsof -i :8081 >/dev/null 2>&1; then
    log_warning "포트 8081이 이미 사용 중입니다."
else
    log_info "Core Service 시작 중..."
    cd backend
    nohup ./gradlew :core-service:bootRun > ../logs/core-service.log 2>&1 &
    CORE_PID=$!
    echo $CORE_PID > ../logs/core-service.pid
    cd ..

    wait_for_service "Core Service" "http://localhost:8081/actuator/health" 60
fi
echo ""

# 4. Processing Service 시작
log_info "=== 4단계: Processing Service 시작 (포트 8082) ==="

if lsof -i :8082 >/dev/null 2>&1; then
    log_warning "포트 8082가 이미 사용 중입니다."
else
    log_info "Processing Service 시작 중..."
    cd backend
    nohup ./gradlew :processing-service:bootRun > ../logs/processing-service.log 2>&1 &
    PROCESSING_PID=$!
    echo $PROCESSING_PID > ../logs/processing-service.pid
    cd ..

    wait_for_service "Processing Service" "http://localhost:8082/actuator/health" 60
fi
echo ""

# 5. API Gateway 시작
log_info "=== 5단계: API Gateway 시작 (포트 8080) ==="

if lsof -i :8080 >/dev/null 2>&1; then
    log_warning "포트 8080이 이미 사용 중입니다."
else
    log_info "API Gateway 시작 중..."
    cd backend
    nohup ./gradlew :api-gateway:bootRun > ../logs/api-gateway.log 2>&1 &
    GATEWAY_PID=$!
    echo $GATEWAY_PID > ../logs/api-gateway.pid
    cd ..

    wait_for_service "API Gateway" "http://localhost:8080/actuator/health" 60
fi
echo ""

# 6. ML Service 시작
log_info "=== 6단계: ML Service 시작 (포트 8000) ==="

if lsof -i :8000 >/dev/null 2>&1; then
    log_warning "포트 8000이 이미 사용 중입니다."
else
    log_info "ML Service 시작 중..."

    # 가상환경 확인
    if [ ! -d "ml-service/venv" ]; then
        log_info "Python 가상환경 생성 중..."
        cd ml-service
        python3 -m venv venv
        source venv/bin/activate
        pip install -r requirements/base.txt
        cd ..
    fi

    cd ml-service
    source venv/bin/activate 2>/dev/null || true
    nohup uvicorn app.main:app --host 0.0.0.0 --port 8000 > ../logs/ml-service.log 2>&1 &
    ML_PID=$!
    echo $ML_PID > ../logs/ml-service.pid
    cd ..

    wait_for_service "ML Service" "http://localhost:8000/" 60
fi
echo ""

# 7. Frontend 시작 (선택사항)
log_info "=== 7단계: Frontend 시작 (포트 3000) - 선택사항 ==="

read -p "Frontend를 시작하시겠습니까? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    if lsof -i :3000 >/dev/null 2>&1; then
        log_warning "포트 3000이 이미 사용 중입니다."
    else
        log_info "Frontend 시작 중..."
        cd frontend

        if [ ! -d "node_modules" ]; then
            log_info "npm 의존성 설치 중..."
            npm install
        fi

        if [ ! -f ".env.local" ]; then
            log_info ".env.local 생성 중..."
            echo "NEXT_PUBLIC_API_URL=http://localhost:8080" > .env.local
        fi

        nohup npm run dev > ../logs/frontend.log 2>&1 &
        FRONTEND_PID=$!
        echo $FRONTEND_PID > ../logs/frontend.pid
        cd ..

        log_info "Frontend 시작 중... (15초 대기)"
        sleep 15
        log_success "Frontend 준비 완료! http://localhost:3000"
    fi
else
    log_info "Frontend 시작을 건너뜁니다."
fi
echo ""

# 최종 상태 확인
echo "=========================================="
echo "서비스 시작 완료!"
echo "=========================================="
echo ""

log_info "실행 중인 서비스:"
echo ""

curl -s http://localhost:8081/actuator/health >/dev/null 2>&1 && echo -e "${GREEN}✓${NC} Core Service:       http://localhost:8081" || echo -e "${RED}✗${NC} Core Service:       http://localhost:8081"
curl -s http://localhost:8082/actuator/health >/dev/null 2>&1 && echo -e "${GREEN}✓${NC} Processing Service: http://localhost:8082" || echo -e "${RED}✗${NC} Processing Service: http://localhost:8082"
curl -s http://localhost:8080/actuator/health >/dev/null 2>&1 && echo -e "${GREEN}✓${NC} API Gateway:        http://localhost:8080" || echo -e "${RED}✗${NC} API Gateway:        http://localhost:8080"
curl -s http://localhost:8000/ >/dev/null 2>&1 && echo -e "${GREEN}✓${NC} ML Service:         http://localhost:8000" || echo -e "${RED}✗${NC} ML Service:         http://localhost:8000"
docker compose ps postgres 2>/dev/null | grep -q "Up" && echo -e "${GREEN}✓${NC} PostgreSQL:         localhost:5432" || echo -e "${RED}✗${NC} PostgreSQL:         localhost:5432"
curl -s http://localhost:3000 >/dev/null 2>&1 && echo -e "${GREEN}✓${NC} Frontend:           http://localhost:3000" || echo -e "${YELLOW}○${NC} Frontend:           Not started"

echo ""
log_info "로그 파일 위치: logs/"
log_info "통합 테스트 실행: ./test-integration.sh"
echo ""

log_success "모든 서비스가 준비되었습니다! 🎉"
