# ============================================================
# Adbar Platform — Makefile
# Common development commands
# ============================================================

.PHONY: help dev build test lint format migrate seed docker-up docker-down clean

# Default target
help: ## Show this help message
	@echo "Adbar Platform — Available Commands"
	@echo "===================================="
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'

# ── Development ──────────────────────────────────────────

dev: ## Start all services in development mode
	npm run dev

dev-gateway: ## Start only the API Gateway
	npm run dev:gateway

dev-web: ## Start only the web frontend
	cd frontend/web && npm run dev

# ── Build ────────────────────────────────────────────────

build: ## Build all services
	npm run build

build-affected: ## Build only affected services
	npm run build:affected

# ── Testing ─────────────────────────────────────────────

test: ## Run all unit tests
	npm run test

test-affected: ## Run tests for affected services only
	npm run test:affected

test-e2e: ## Run end-to-end tests
	npm run test:e2e

test-coverage: ## Run tests with coverage
	npx jest --coverage --passWithNoTests

# ── Linting & Formatting ────────────────────────────────

lint: ## Lint all services
	npm run lint

lint-fix: ## Lint and auto-fix all services
	npm run lint:fix

format: ## Format all code with Prettier
	npm run format

format-check: ## Check formatting without changes
	npm run format:check

typecheck: ## Run TypeScript type checking
	npm run typecheck

# ── Database ─────────────────────────────────────────────

prisma-generate: ## Generate Prisma client
	npm run prisma:generate

migrate: ## Run database migrations
	npm run prisma:migrate

migrate-prod: ## Run production migrations
	npm run prisma:migrate:prod

migrate-create: ## Create a new migration (usage: make migrate-create NAME=add_users_table)
	npx prisma migrate dev --name $(NAME) --schema=database/prisma/schema.prisma

seed: ## Seed the database with initial data
	npm run prisma:seed

studio: ## Open Prisma Studio
	npm run prisma:studio

db-reset: ## Reset database (drop all tables and re-run migrations)
	npx prisma migrate reset --schema=database/prisma/schema.prisma --force

# ── Docker ───────────────────────────────────────────────

docker-up: ## Start all Docker services (development)
	docker compose -f infrastructure/docker/docker-compose.dev.yml up -d

docker-down: ## Stop all Docker services
	docker compose -f infrastructure/docker/docker-compose.dev.yml down

docker-logs: ## View Docker service logs
	docker compose -f infrastructure/docker/docker-compose.dev.yml logs -f

docker-clean: ## Remove all Docker containers, volumes, and networks
	docker compose -f infrastructure/docker/docker-compose.dev.yml down -v --remove-orphans

docker-rebuild: ## Rebuild and restart Docker services
	docker compose -f infrastructure/docker/docker-compose.dev.yml up -d --build

docker-prod-up: ## Start production Docker stack
	docker compose -f infrastructure/docker/docker-compose.prod.yml up -d

docker-prod-down: ## Stop production Docker stack
	docker compose -f infrastructure/docker/docker-compose.prod.yml down

# ── Kubernetes ───────────────────────────────────────────

k8s-dev: ## Deploy to dev Kubernetes cluster
	kubectl apply -k infrastructure/kubernetes/overlays/dev

k8s-staging: ## Deploy to staging Kubernetes cluster
	kubectl apply -k infrastructure/kubernetes/overlays/staging

k8s-prod: ## Deploy to production Kubernetes cluster
	kubectl apply -k infrastructure/kubernetes/overlays/prod

# ── Cleanup ──────────────────────────────────────────────

clean: ## Remove build artifacts and dependencies
	rm -rf node_modules
	find . -name 'node_modules' -type d -prune -exec rm -rf '{}' +
	find . -name 'dist' -type d -prune -exec rm -rf '{}' +
	find . -name '.next' -type d -prune -exec rm -rf '{}' +

clean-cache: ## Clear Nx cache
	rm -rf .nx/cache
	npx nx reset

# ── Setup ────────────────────────────────────────────────

setup: ## Initial project setup
	npm ci
	npm run prisma:generate
	npm run build

setup-dev: ## Full development environment setup
	cp -n .env.example .env || true
	npm ci
	npm run prisma:generate
	npm run migrate
	npm run seed
	@echo ""
	@echo "✅ Development environment ready!"
	@echo "   Run 'make dev' to start all services"
	@echo "   Run 'make docker-up' to start infrastructure services"

# ── CI/CD helpers ────────────────────────────────────────

ci-lint: lint format-check typecheck ## Run all CI checks

ci-test: test ci-lint ## Run full CI pipeline locally

ci-build: ci-test build ## Full CI build pipeline
