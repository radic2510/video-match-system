.PHONY: help install dev prod test clean

help:
	@echo "Available commands:"
	@echo "  make install    - Install all dependencies"
	@echo "  make dev       - Start development environment"
	@echo "  make prod      - Build and start production"
	@echo "  make test      - Run all tests"
	@echo "  make clean     - Clean build artifacts"

install:
	cd frontend && npm install
	cd backend && ./gradlew build
	cd ml-service && pip install -r requirements/dev.txt
	./infrastructure/scripts/install/setup-models.sh

dev:
	docker-compose up -d postgres redis
	cd frontend && npm run dev &
	cd backend && ./gradlew bootRun &
	cd ml-service && uvicorn app.main:app --reload &

prod:
	docker-compose -f docker-compose.prod.yml up --build

test:
	cd frontend && npm test
	cd backend && ./gradlew test
	cd ml-service && pytest

clean:
	cd frontend && rm -rf node_modules .next
	cd backend && ./gradlew clean
	cd ml-service && find . -type d -name __pycache__ -exec rm -rf {} +
	docker-compose down -v