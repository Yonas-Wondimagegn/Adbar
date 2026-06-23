# Adbar (አድባር) — DevOps Architecture & CI/CD

**Version:** 1.0.0  
**Date:** 2026-06-21  

---

## 1. CI/CD Pipeline

### 1.1 GitHub Actions Workflow

```yaml
# infrastructure/ci-cd/.github/workflows/main.yml

name: Adbar CI/CD Pipeline

on:
  push:
    branches: [main, develop, 'release/*']
  pull_request:
    branches: [main, develop]

env:
  REGISTRY: ghcr.io
  IMAGE_PREFIX: adbar

jobs:
  # ========================================
  # Stage 1: Lint & Static Analysis
  # ========================================
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Lint
        run: npm run lint
      
      - name: Type check
        run: npm run type-check
      
      - name: Security audit
        run: npm audit --audit-level=high

  # ========================================
  # Stage 2: Unit Tests
  # ========================================
  test:
    runs-on: ubuntu-latest
    needs: lint
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_DB: adbar_test
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
        ports: ['5432:5432']
      redis:
        image: redis:7
        ports: ['6379:6379']
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run unit tests
        run: npm run test:unit -- --coverage
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/adbar_test
          REDIS_URL: redis://localhost:6379
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3

  # ========================================
  # Stage 3: Integration Tests
  # ========================================
  integration-test:
    runs-on: ubuntu-latest
    needs: test
    steps:
      - uses: actions/checkout@v4
      
      - name: Run integration tests
        run: |
          docker compose -f infrastructure/docker/docker-compose.test.yml up -d
          npm run test:integration
          docker compose -f infrastructure/docker/docker-compose.test.yml down

  # ========================================
  # Stage 4: Security Scanning
  # ========================================
  security-scan:
    runs-on: ubuntu-latest
    needs: lint
    steps:
      - uses: actions/checkout@v4
      
      - name: Run Snyk security scan
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
        with:
          args: --severity-threshold=high
      
      - name: Run Trivy vulnerability scanner
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'fs'
          severity: 'CRITICAL,HIGH'

  # ========================================
  # Stage 5: Build & Push Docker Images
  # ========================================
  build:
    runs-on: ubuntu-latest
    needs: [test, integration-test, security-scan]
    if: github.event_name == 'push'
    strategy:
      matrix:
        service:
          - api-gateway
          - auth-service
          - user-service
          - product-service
          - order-service
          - payment-service
          - escrow-service
          - wallet-service
          - freelance-service
          - job-service
          - contract-service
          - messaging-service
          - notification-service
          - search-service
          - review-service
          - dispute-service
          - kyc-service
          - ussd-service
          - analytics-service
          - ai-matching-service
          - admin-service
          - web-frontend
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3
      
      - name: Login to Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      
      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: .
          file: ./infrastructure/docker/Dockerfile.${{ matrix.service }}
          push: true
          tags: |
            ${{ env.REGISTRY }}/${{ env.IMAGE_PREFIX }}/${{ matrix.service }}:${{ github.sha }}
            ${{ env.REGISTRY }}/${{ env.IMAGE_PREFIX }}/${{ matrix.service }}:latest
          cache-from: type=gha
          cache-to: type=gha,mode=max

  # ========================================
  # Stage 6: Deploy to Staging
  # ========================================
  deploy-staging:
    runs-on: ubuntu-latest
    needs: build
    if: github.ref == 'refs/heads/develop'
    environment: staging
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Configure kubectl
        uses: azure/setup-kubectl@v3
      
      - name: Set Kubernetes context
        uses: azure/k8s-set-context@v3
        with:
          kubeconfig: ${{ secrets.KUBE_CONFIG_STAGING }}
      
      - name: Deploy to staging
        run: |
          kubectl set image deployment/api-gateway \
            api-gateway=${{ env.REGISTRY }}/${{ env.IMAGE_PREFIX }}/api-gateway:${{ github.sha }} \
            -n adbar-staging
          # Repeat for all services...
          kubectl rollout status deployment/api-gateway -n adbar-staging --timeout=300s
      
      - name: Run smoke tests
        run: npm run test:smoke -- --env=staging

  # ========================================
  # Stage 7: Deploy to Production
  # ========================================
  deploy-production:
    runs-on: ubuntu-latest
    needs: build
    if: github.ref == 'refs/heads/main'
    environment: production
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Configure kubectl
        uses: azure/setup-kubectl@v3
      
      - name: Set Kubernetes context
        uses: azure/k8s-set-context@v3
        with:
          kubeconfig: ${{ secrets.KUBE_CONFIG_PRODUCTION }}
      
      - name: Deploy to production (canary)
        run: |
          # Canary deployment: 10% traffic first
          kubectl apply -k infrastructure/kubernetes/overlays/prod/canary/
          sleep 300  # Wait 5 minutes
          
          # Check error rate
          ERROR_RATE=$(curl -s "http://prometheus:9090/api/v1/query?query=rate(http_requests_total{status=~'5..'}[5m])" | jq '.data.result[0].value[1]')
          
          if (( $(echo "$ERROR_RATE > 0.01" | bc -l) )); then
            echo "Error rate too high, rolling back"
            kubectl rollout undo deployment/api-gateway -n adbar
            exit 1
          fi
          
          # Full rollout
          kubectl apply -k infrastructure/kubernetes/overlays/prod/
          kubectl rollout status deployment/api-gateway -n adbar --timeout=600s
      
      - name: Notify deployment
        uses: slackapi/slack-github-action@v1
        with:
          payload: |
            {"text": "Adbar production deployment: ${{ github.sha }}"}
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK }}
```

---

## 2. Docker Configuration

### 2.1 Multi-stage Dockerfile (Backend Service)

```dockerfile
# infrastructure/docker/Dockerfile.service

# Stage 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --only=production && cp -R node_modules /prod_modules
RUN npm ci

# Stage 2: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build
RUN npm run prisma:generate

# Stage 3: Production
FROM node:20-alpine AS production
WORKDIR /app

# Security: Run as non-root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S adbar -u 1001

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=deps /prod_modules ./node_modules

USER adbar

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

CMD ["node", "dist/main.js"]
```

### 2.2 Docker Compose (Development)

```yaml
# infrastructure/docker/docker-compose.dev.yml

version: '3.9'

services:
  # ========================================
  # Databases
  # ========================================
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: adbar_dev
      POSTGRES_USER: adbar
      POSTGRES_PASSWORD: adbar_dev_password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U adbar"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  elasticsearch:
    image: elasticsearch:8.12.0
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
      - "ES_JAVA_OPTS=-Xms512m -Xmx512m"
    ports:
      - "9200:9200"
    volumes:
      - es_data:/usr/share/elasticsearch/data

  kafka:
    image: confluentinc/cp-kafka:7.5.0
    depends_on:
      - zookeeper
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka:9092
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
    ports:
      - "9092:9092"

  zookeeper:
    image: confluentinc/cp-zookeeper:7.5.0
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181
    ports:
      - "2181:2181"

  # ========================================
  # Backend Services
  # ========================================
  api-gateway:
    build:
      context: ../../backend
      dockerfile: ../infrastructure/docker/Dockerfile.api-gateway
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgresql://adbar:adbar_dev_password@postgres:5432/adbar_dev
      - REDIS_URL=redis://redis:6379
      - JWT_ACCESS_SECRET=dev_access_secret_change_in_prod
      - JWT_REFRESH_SECRET=dev_refresh_secret_change_in_prod
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy

  # Other services follow same pattern...

  # ========================================
  # Frontend
  # ========================================
  web:
    build:
      context: ../../frontend/web
      dockerfile: ../../infrastructure/docker/Dockerfile.web
    ports:
      - "3001:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://localhost:3000
    depends_on:
      - api-gateway

  # ========================================
  # Monitoring
  # ========================================
  prometheus:
    image: prom/prometheus:v2.50.0
    ports:
      - "9090:9090"
    volumes:
      - ../monitoring/prometheus.yml:/etc/prometheus/prometheus.yml

  grafana:
    image: grafana/grafana:10.3.0
    ports:
      - "3002:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana_data:/var/lib/grafana

volumes:
  postgres_data:
  redis_data:
  es_data:
  grafana_data:
```

---

## 3. Kubernetes Manifests

### 3.1 Base Deployment

```yaml
# infrastructure/kubernetes/base/deployment.yaml

apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-gateway
  namespace: adbar
  labels:
    app: api-gateway
    version: v1
spec:
  replicas: 3
  selector:
    matchLabels:
      app: api-gateway
  template:
    metadata:
      labels:
        app: api-gateway
        version: v1
    spec:
      serviceAccountName: adbar-api
      securityContext:
        runAsNonRoot: true
        runAsUser: 1001
        fsGroup: 1001
      containers:
        - name: api-gateway
          image: ghcr.io/adbar/api-gateway:latest
          ports:
            - containerPort: 3000
              protocol: TCP
          resources:
            requests:
              cpu: 250m
              memory: 256Mi
            limits:
              cpu: 500m
              memory: 512Mi
          livenessProbe:
            httpGet:
              path: /health
              port: 3000
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /ready
              port: 3000
            initialDelaySeconds: 5
            periodSeconds: 5
          envFrom:
            - configMapRef:
                name: adbar-config
            - secretRef:
                name: adbar-secrets
---
apiVersion: v1
kind: Service
metadata:
  name: api-gateway
  namespace: adbar
spec:
  selector:
    app: api-gateway
  ports:
    - port: 80
      targetPort: 3000
  type: ClusterIP
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-gateway-hpa
  namespace: adbar
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-gateway
  minReplicas: 3
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 60
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 70
```

### 3.2 Ingress Configuration

```yaml
# infrastructure/kubernetes/base/ingress.yaml

apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: adbar-ingress
  namespace: adbar
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/rate-limit: "100"
    nginx.ingress.kubernetes.io/rate-limit-window: "1m"
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/proxy-body-size: "10m"
spec:
  tls:
    - hosts:
        - api.adbar.com
        - www.adbar.com
      secretName: adbar-tls
  rules:
    - host: api.adbar.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: api-gateway
                port:
                  number: 80
    - host: www.adbar.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: web-frontend
                port:
                  number: 80
```

---

## 4. Monitoring & Observability

### 4.1 Prometheus Configuration

```yaml
# infrastructure/monitoring/prometheus.yml

global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "alerts.yml"

scrape_configs:
  - job_name: 'kubernetes-pods'
    kubernetes_sd_configs:
      - role: pod
    relabel_configs:
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
        action: keep
        regex: true

  - job_name: 'adbar-services'
    static_configs:
      - targets:
          - 'api-gateway:3000'
          - 'auth-service:3001'
          - 'payment-service:3005'
          - 'wallet-service:3007'
          - 'order-service:3004'

# Custom metrics to track:
# - http_requests_total{method, path, status}
# - http_request_duration_seconds{method, path}
# - payment_transactions_total{provider, currency, status}
# - payment_transaction_duration_seconds{provider}
# - wallet_balance_total{currency, type}
# - escrow_funded_total{currency}
# - ussd_sessions_total{action}
# - sms_sent_total{provider, status}
```

### 4.2 Alert Rules

```yaml
# infrastructure/monitoring/alerts.yml

groups:
  - name: adbar-alerts
    rules:
      # High error rate
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m]) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value | humanizePercentage }}"

      # Payment provider down
      - alert: PaymentProviderDown
        expr: payment_provider_health_status == 0
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Payment provider {{ $labels.provider }} is down"

      # High payment failure rate
      - alert: HighPaymentFailureRate
        expr: rate(payment_transactions_total{status="failed"}[15m]) / rate(payment_transactions_total[15m]) > 0.1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High payment failure rate for {{ $labels.provider }}"

      # USSD gateway down
      - alert: UssdGatewayDown
        expr: ussd_gateway_health_status == 0
        for: 1m
        labels:
          severity: warning
        annotations:
          summary: "USSD gateway is unreachable"

      # SMS delivery failure
      - alert: SmsDeliveryFailure
        expr: rate(sms_sent_total{status="failed"}[15m]) / rate(sms_sent_total[15m]) > 0.15
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "SMS delivery failure rate high for {{ $labels.provider }}"

      # Wallet currency mismatch (fraud signal)
      - alert: WalletCurrencyMismatch
        expr: increase(wallet_currency_mismatch_total[5m]) > 0
        for: 0m
        labels:
          severity: critical
        annotations:
          summary: "Wallet currency mismatch detected - possible fraud"

      # High latency
      - alert: HighLatency
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "P95 latency above 1 second"

      # Pod restart loop
      - alert: PodCrashLooping
        expr: rate(kube_pod_container_status_restarts_total[15m]) > 0
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Pod {{ $labels.pod }} is crash looping"
```

### 4.3 Grafana Dashboards

**Key Dashboards:**
1. **Platform Overview:** Users, orders, GMV, active sessions
2. **Payment Dashboard:** Transactions by provider, success rates, latency, AU balances
3. **Service Health:** Pod status, error rates, latency per service
4. **USSD/SMS Analytics:** Session volume, SMS delivery rates
5. **Security Dashboard:** Failed logins, fraud alerts, rate limit hits
6. **Infrastructure:** CPU, memory, disk, network per node

### 4.4 ELK Stack Logging

```yaml
# infrastructure/monitoring/filebeat.yml

filebeat.inputs:
  - type: container
    paths:
      - /var/lib/docker/containers/*/*.log
    processors:
      - add_kubernetes_metadata:
          host: ${NODE_NAME}
          matchers:
            - logs_path:
                logs_path: "/var/lib/docker/containers/"

output.elasticsearch:
  hosts: ["elasticsearch:9200"]
  index: "adbar-logs-%{+yyyy.MM.dd}"

# Log format (JSON from all services):
# {
#   "timestamp": "2026-06-21T10:00:00Z",
#   "level": "info",
#   "service": "payment-service",
#   "traceId": "abc123",
#   "userId": "uuid",
#   "action": "payment.initiated",
#   "data": { ... }
# }
```

---

## 5. Infrastructure as Code (Terraform)

```hcl
# infrastructure/terraform/main.tf

terraform {
  required_version = ">= 1.5"
  
  backend "s3" {
    bucket = "adbar-terraform-state"
    key    = "prod/terraform.tfstate"
    region = "eu-west-1"
  }
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.25"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# VPC
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "5.0.0"

  name = "adbar-vpc"
  cidr = "10.0.0.0/16"

  azs             = ["${var.aws_region}a", "${var.aws_region}b", "${var.aws_region}c"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]

  enable_nat_gateway = true
  single_nat_gateway = false

  tags = {
    Project     = "adbar"
    Environment = var.environment
  }
}

# EKS Cluster
module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "19.0.0"

  cluster_name    = "adbar-${var.environment}"
  cluster_version = "1.28"

  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnets

  eks_managed_node_groups = {
    general = {
      desired_size = 3
      min_size     = 2
      max_size     = 10

      instance_types = ["m6i.xlarge"]
      capacity_type  = "ON_DEMAND"
    }

    spot = {
      desired_size = 2
      min_size     = 0
      max_size     = 10

      instance_types = ["m6i.large", "m5.large", "m5a.large"]
      capacity_type  = "SPOT"
    }
  }
}

# RDS PostgreSQL
module "rds" {
  source  = "terraform-aws-modules/rds/aws"
  version = "6.0.0"

  identifier = "adbar-${var.environment}"

  engine               = "postgres"
  engine_version       = "16"
  instance_class       = "db.r6g.xlarge"
  allocated_storage    = 100
  max_allocated_storage = 500

  db_name  = "adbar"
  username = "adbar_admin"
  port     = 5432

  multi_az               = true
  subnet_ids             = module.vpc.private_subnets
  vpc_security_group_ids = [aws_security_group.rds.id]

  backup_retention_period = 30
  deletion_protection     = true

  performance_insights_enabled = true
}

# ElastiCache Redis
module "redis" {
  source  = "terraform-aws-modules/elasticache/aws"
  version = "1.0.0"

  cluster_id = "adbar-${var.environment}"

  engine               = "redis"
  engine_version       = "7.0"
  node_type            = "cache.r6g.large"
  num_cache_nodes      = 3

  subnet_ids = module.vpc.private_subnets
}

# S3 Buckets
resource "aws_s3_bucket" "media" {
  bucket = "adbar-media-${var.environment}"

  tags = {
    Project     = "adbar"
    Environment = var.environment
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "media" {
  bucket = aws_s3_bucket.media.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# CloudFront CDN
resource "aws_cloudfront_distribution" "cdn" {
  enabled = true

  origin {
    domain_name = aws_s3_bucket.media.bucket_regional_domain_name
    origin_id   = "adbar-media"

    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.oai.cloudfront_access_identity_path
    }
  }

  default_cache_behavior {
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "adbar-media"
    viewer_protocol_policy = "redirect-to-https"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    min_ttl     = 0
    default_ttl = 3600
    max_ttl     = 86400
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = false
    acm_certificate_arn            = aws_acm_certificate.cert.arn
    ssl_support_method             = "sni-only"
  }
}

# AWS Secrets Manager
resource "aws_secretsmanager_secret" "payment_keys" {
  name = "adbar/payment-keys-${var.environment}"
}

resource "aws_secretsmanager_secret_version" "payment_keys" {
  secret_id = aws_secretsmanager_secret.payment_keys.id
  secret_string = jsonencode({
    CHAPA_SECRET_KEY      = var.chapa_secret_key
    SANTIMPAY_PRIVATE_KEY = var.santimpay_private_key
    STRIPE_SECRET_KEY     = var.stripe_secret_key
    PAYPAL_CLIENT_SECRET  = var.paypal_client_secret
  })
}
```
