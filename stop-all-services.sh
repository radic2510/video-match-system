#!/bin/bash

# Video Match System - Stop All Services
# 모든 실행 중인 서비스를 중지합니다.

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

echo "=========================================="
echo "Video Match System - Stop All Services"
echo "=========================================="
echo ""

# PID 파일 기반으로 서비스 중지
stop_service() {
    local service_name=$1
    local pid_file=$2
    local port=$3

    if [ -f "$pid_file" ]; then
        pid=$(cat "$pid_file")
        if ps -p $pid > /dev/null 2>&1; then
            log_info "Stopping $service_name (PID: $pid)..."
            kill $pid
            sleep 2

            # 강제 종료 확인
            if ps -p $pid > /dev/null 2>&1; then
                log_info "Force killing $service_name..."
                kill -9 $pid
            fi

            log_success "$service_name stopped"
            rm "$pid_file"
        else
            log_info "$service_name is not running"
            rm "$pid_file"
        fi
    else
        # PID 파일이 없으면 포트 기반으로 종료
        if [ -n "$port" ]; then
            pid=$(lsof -ti :$port 2>/dev/null)
            if [ -n "$pid" ]; then
                log_info "Stopping $service_name on port $port (PID: $pid)..."
                kill $pid 2>/dev/null || kill -9 $pid 2>/dev/null
                log_success "$service_name stopped"
            else
                log_info "$service_name is not running"
            fi
        fi
    fi
}

# Frontend 중지
stop_service "Frontend" "logs/frontend.pid" "3000"

# ML Service 중지
stop_service "ML Service" "logs/ml-service.pid" "8000"

# API Gateway 중지
stop_service "API Gateway" "logs/api-gateway.pid" "8080"

# Processing Service 중지
stop_service "Processing Service" "logs/processing-service.pid" "8082"

# Core Service 중지
stop_service "Core Service" "logs/core-service.pid" "8081"

# Gradle 데몬 중지
log_info "Stopping Gradle daemon..."
cd backend && ./gradlew --stop && cd ..

# PostgreSQL 중지 (선택사항)
echo ""
read -p "PostgreSQL도 중지하시겠습니까? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    log_info "Stopping PostgreSQL..."
    docker compose stop postgres
    log_success "PostgreSQL stopped"
else
    log_info "PostgreSQL은 계속 실행됩니다."
fi

echo ""
log_success "모든 서비스가 중지되었습니다."
