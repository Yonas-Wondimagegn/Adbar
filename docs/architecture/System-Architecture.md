# Adbar (አድባር) — System Architecture

**Version:** 1.0.0  
**Date:** 2026-06-21  

---

## 1. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CLIENT LAYER                                       │
│                                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐  │
│  │ Next.js  │  │ Flutter  │  │   PWA    │  │   USSD   │  │  Admin App   │  │
│  │   Web    │  │  Mobile  │  │ Offline  │  │ Gateway  │  │   (Web)      │  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘  └──────┬───────┘  │
│       │              │              │              │               │          │
└───────┼──────────────┼──────────────┼──────────────┼───────────────┼──────────┘
        │              │              │              │               │
┌───────┼──────────────┼──────────────┼──────────────┼───────────────┼──────────┐
│       ▼              ▼              ▼              ▼               ▼          │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │                         API GATEWAY (Kong / Nginx)                     │  │
│  │  ┌─────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │  │
│  │  │  Auth   │  │  Rate    │  │  Load    │  │  SSL     │  │ Request  │  │  │
│  │  │  JWT    │  │  Limit   │  │  Balance │  │  Terminate│  │ Routing  │  │  │
│  │  └─────────┘  └──────────┘  └──────────┘  └──────────┘  └──────────┘  │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
                                       │
┌──────────────────────────────────────┼──────────────────────────────────────┐
│                          SERVICE LAYER (Microservices)                      │
│                                      │                                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─┴───────────┐  ┌─────────────┐        │
│  │   Auth      │  │   User      │  │  Product     │  │   Order     │        │
│  │  Service    │  │  Service    │  │  Service     │  │  Service    │        │
│  └──────┬──────┘  └──────┬──────┘  └──────┬───────┘  └──────┬──────┘        │
│         │                │                │                  │               │
│  ┌──────┴──────┐  ┌──────┴──────┐  ┌──────┴───────┐  ┌──────┴──────┐        │
│  │  Payment    │  │  Escrow     │  │  Wallet       │  │  Freelance  │        │
│  │  Service    │  │  Service    │  │  Service      │  │  Service    │        │
│  │ (Adapters)  │  │             │  │  (AU Ledger)  │  │             │        │
│  └──────┬──────┘  └──────┬──────┘  └──────┬───────┘  └──────┬──────┘        │
│         │                │                │                  │               │
│  ┌──────┴──────┐  ┌──────┴──────┐  ┌──────┴───────┐  ┌──────┴──────┐        │
│  │  Job        │  │  Contract   │  │  Messaging   │  │ Notification│        │
│  │  Service    │  │  Service    │  │  Service     │  │  Service    │        │
│  └──────┬──────┘  └──────┬──────┘  └──────┬───────┘  └──────┬──────┘        │
│         │                │                │                  │               │
│  ┌──────┴──────┐  ┌──────┴──────┐  ┌──────┴───────┐  ┌──────┴──────┐        │
│  │  Search     │  │  Review     │  │  Dispute     │  │  KYC        │        │
│  │  Service    │  │  Service    │  │  Service     │  │  Service    │        │
│  │ (Elastic)   │  │             │  │              │  │ (Adapters)  │        │
│  └──────┬──────┘  └──────┬──────┘  └──────┬───────┘  └──────┬──────┘        │
│         │                │                │                  │               │
│  ┌──────┴──────┐  ┌──────┴──────┐  ┌──────┴───────┐  ┌──────┴──────┐        │
│  │  USSD       │  │  Analytics  │  │  AI Matching │  │  Admin      │        │
│  │  Service    │  │  Service    │  │  Service     │  │  Service    │        │
│  └─────────────┘  └─────────────┘  └──────────────┘  └─────────────┘        │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
                                       │
┌──────────────────────────────────────┼──────────────────────────────────────┐
│                          DATA LAYER                                          │
│                                      │                                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─┴───────────┐  ┌─────────────┐        │
│  │ PostgreSQL  │  │    Redis    │  │Elasticsearch │  │   AWS S3    │        │
│  │ (Primary)   │  │   (Cache)   │  │  (Search)    │  │  (Storage)  │        │
│  └─────────────┘  └─────────────┘  └──────────────┘  └─────────────┘        │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
                                       │
┌──────────────────────────────────────┼──────────────────────────────────────┐
│                     MESSAGE QUEUE / EVENT BUS                                │
│                                      │                                       │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │                    Apache Kafka / RabbitMQ                              │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐               │  │
│  │  │  Order   │  │ Payment  │  │  User    │  │ Notif    │               │  │
│  │  │  Events  │  │ Events   │  │ Events   │  │ Events   │               │  │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘               │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
                                       │
┌──────────────────────────────────────┼──────────────────────────────────────┐
│                     EXTERNAL INTEGRATIONS                                    │
│                                      │                                       │
│  ┌──────────┐ ┌──────────┐ ┌────────┴───┐ ┌──────────┐ ┌──────────┐       │
│  │  Chapa   │ │SantimPay │ │  Stripe    │ │  PayPal  │ │ Fayda    │       │
│  │ Adapter  │ │ Adapter  │ │  Adapter   │ │  Adapter │ │ Adapter  │       │
│  └──────────┘ └──────────┘ └────────────┘ └──────────┘ └──────────┘       │
│                                                                              │
│  ┌──────────┐ ┌──────────┐ ┌────────────┐ ┌──────────┐ ┌──────────┐       │
│  │Telecom   │ │  SMS     │ │  Email     │ │  Push    │ │  OAuth   │       │
│  │USSD GW   │ │ Gateway  │ │  Service   │ │  Notif   │ │ Providers│       │
│  └──────────┘ └──────────┘ └────────────┘ └──────────┘ └──────────┘       │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Microservices Architecture

### 2.1 Service Inventory

| Service | Port | Database | Cache | Description |
|---------|------|----------|-------|-------------|
| API Gateway | 3000 | - | - | Kong/Nginx gateway |
| Auth | 3001 | auth_db | Redis | Authentication & authorization |
| User | 3002 | user_db | Redis | User profiles, roles, permissions |
| Product | 3003 | product_db | Redis | Product catalog, categories, variants |
| Order | 3004 | order_db | Redis | Order management, status tracking |
| Payment | 3005 | payment_db | - | Payment processing, adapter registry |
| Escrow | 3006 | escrow_db | - | Escrow management |
| Wallet | 3007 | wallet_db | Redis | AU ledger, balances, withdrawals |
| Freelance | 3008 | freelance_db | Redis | Freelancer profiles, portfolios |
| Job | 3009 | job_db | Redis | Job postings, proposals |
| Contract | 3010 | contract_db | - | Contract management, e-signatures |
| Messaging | 3011 | msg_db | Redis | Real-time chat, file sharing |
| Notification | 3012 | notif_db | Redis | Email, SMS, push, in-app |
| Search | 3013 | - | - | Elasticsearch integration |
| Review | 3014 | review_db | Redis | Reviews, ratings, moderation |
| Dispute | 3015 | dispute_db | - | Dispute management, mediation |
| KYC | 3016 | kyc_db | - | Identity verification, adapter registry |
| USSD | 3017 | - | Redis | USSD session management |
| Analytics | 3018 | analytics_db | Redis | Reporting, dashboards |
| AI Matching | 3019 | ai_db | Redis | Recommendation engine |
| Admin | 3020 | - | Redis | Admin operations, aggregated views |

### 2.2 Service Communication

**Synchronous (REST/gRPC):**
- Auth → All services (token validation)
- User → All services (user data)
- Product → Order, Search, AI Matching
- Order → Payment, Wallet, Notification
- Payment → Escrow, Wallet

**Asynchronous (Kafka/RabbitMQ):**
- Order events → Notification, Analytics, Search index
- Payment events → Wallet, Escrow, Notification, Analytics
- User events → Analytics, AI Matching
- Review events → AI Matching, Analytics
- Dispute events → Wallet, Escrow, Notification

---

## 3. API Gateway Design

### 3.1 Gateway Responsibilities
- **Authentication:** JWT validation, token refresh
- **Rate Limiting:** Per-user, per-IP, per-endpoint
- **Load Balancing:** Round-robin with health checks
- **SSL Termination:** HTTPS enforcement
- **Request Routing:** Path-based routing to services
- **CORS:** Cross-origin resource sharing
- **Request/Response Transformation:** API versioning
- **Circuit Breaker:** Fail-fast for unhealthy services

### 3.2 Route Configuration

```
/api/v1/auth/*          → Auth Service (3001)
/api/v1/users/*         → User Service (3002)
/api/v1/products/*      → Product Service (3003)
/api/v1/orders/*        → Order Service (3004)
/api/v1/payments/*      → Payment Service (3005)
/api/v1/escrow/*        → Escrow Service (3006)
/api/v1/wallet/*        → Wallet Service (3007)
/api/v1/freelancers/*   → Freelance Service (3008)
/api/v1/jobs/*          → Job Service (3009)
/api/v1/contracts/*     → Contract Service (3010)
/api/v1/messages/*      → Messaging Service (3011)
/api/v1/notifications/* → Notification Service (3012)
/api/v1/search/*        → Search Service (3013)
/api/v1/reviews/*       → Review Service (3014)
/api/v1/disputes/*      → Dispute Service (3015)
/api/v1/kyc/*           → KYC Service (3016)
/api/v1/ussd/*          → USSD Service (3017)
/api/v1/analytics/*     → Analytics Service (3018)
/api/v1/ai/*            → AI Matching Service (3019)
/api/v1/admin/*         → Admin Service (3020)
```

---

## 4. Event-Driven Architecture

### 4.1 Event Topics

| Topic | Producers | Consumers | Description |
|-------|-----------|-----------|-------------|
| `order.created` | Order | Payment, Notification, Analytics | New order placed |
| `order.paid` | Payment | Order, Wallet, Notification, Analytics | Payment confirmed |
| `order.shipped` | Order | Notification, Analytics | Order shipped |
| `order.delivered` | Order | Wallet, Notification, Analytics | Order delivered |
| `order.cancelled` | Order | Payment, Wallet, Notification | Order cancelled |
| `payment.initiated` | Payment | Notification | Payment started |
| `payment.success` | Payment | Order, Wallet, Escrow, Analytics | Payment successful |
| `payment.failed` | Payment | Order, Notification | Payment failed |
| `escrow.funded` | Escrow | Contract, Notification | Escrow funded |
| `escrow.released` | Escrow | Wallet, Notification, Analytics | Escrow released |
| `escrow.refunded` | Escrow | Wallet, Notification | Escrow refunded |
| `contract.created` | Contract | Notification | New contract |
| `contract.signed` | Contract | Escrow, Notification | Contract signed |
| `contract.completed` | Contract | Wallet, Review, Analytics | Contract completed |
| `dispute.opened` | Dispute | Escrow, Notification | Dispute opened |
| `dispute.resolved` | Dispute | Escrow, Wallet, Analytics | Dispute resolved |
| `user.registered` | User | Notification, Analytics, AI | New user |
| `user.verified` | KYC | User, Notification | User verified |
| `review.created` | Review | AI, Analytics | New review |
| `message.sent` | Messaging | Notification | New message |

### 4.2 Event Schema

```typescript
interface AdbarEvent {
  id: string;           // UUID
  type: string;         // Topic name
  version: string;      // Schema version
  timestamp: DateTime;  // ISO 8601
  source: string;       // Service name
  data: Record<string, unknown>;
  metadata: {
    userId?: string;
    correlationId: string;
    causationId?: string;
  };
}
```

---

## 5. Caching Strategy

### 5.1 Cache Layers

| Layer | Technology | TTL | Use Case |
|-------|-----------|-----|----------|
| CDN | CloudFront | 1 hour | Static assets, product images |
| API Gateway | Redis | 5 min | Rate limit counters, token blacklist |
| Application | Redis | Varies | Session data, user profiles, product catalog |
| Database | PostgreSQL | - | Query result cache, materialized views |

### 5.2 Cache Invalidation

- **Write-through:** User profile updates
- **Write-behind:** Product view counts, search popularity
- **TTL-based:** Product catalog (5 min), exchange rates (1 hour)
- **Event-driven:** Order status changes, inventory updates

---

## 6. Deployment Architecture

### 6.1 Kubernetes Cluster Layout

```
┌─────────────────────────────────────────────────────────────┐
│                    Kubernetes Cluster                         │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                  Ingress Controller                    │   │
│  │              (NGINX Ingress / AWS ALB)                │   │
│  └──────────────────────┬───────────────────────────────┘   │
│                          │                                    │
│  ┌──────────────────────┴───────────────────────────────┐   │
│  │                  API Gateway Pods (3+)                │   │
│  └──────────────────────┬───────────────────────────────┘   │
│                          │                                    │
│  ┌──────────┬──────────┬─┴────┬──────────┬──────────┐      │
│  │ Auth     │ User     │Product│ Order    │ Payment  │      │
│  │ Pods(3)  │ Pods(3)  │Pods(3)│ Pods(3)  │ Pods(3)  │      │
│  └──────────┴──────────┴───────┴──────────┴──────────┘      │
│  ┌──────────┬──────────┬───────┬──────────┬──────────┐      │
│  │ Escrow   │ Wallet   │Job    │ Contract │ Messaging│      │
│  │ Pods(2)  │ Pods(3)  │Pods(3)│ Pods(2)  │ Pods(3)  │      │
│  └──────────┴──────────┴───────┴──────────┴──────────┘      │
│  ┌──────────┬──────────┬───────┬──────────┬──────────┐      │
│  │ Notif    │ Search   │Review │ Dispute  │ KYC      │      │
│  │ Pods(3)  │ Pods(3)  │Pods(2)│ Pods(2)  │ Pods(2)  │      │
│  └──────────┴──────────┴───────┴──────────┴──────────┘      │
│  ┌──────────┬──────────┬───────┬──────────┐                  │
│  │ USSD     │Analytics │AI     │ Admin    │                  │
│  │ Pods(2)  │ Pods(2)  │Pods(2)│ Pods(2)  │                  │
│  └──────────┴──────────┴───────┴──────────┘                  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Data Layer (StatefulSets)                │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐  │   │
│  │  │PostgreSQL│ │  Redis   │ │  Kafka   │ │Elastic │  │   │
│  │  │  (HA)    │ │ (Cluster)│ │ (Cluster)│ │Search  │  │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └────────┘  │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 6.2 Auto-Scaling Policies

| Service | Min Pods | Max Pods | CPU Target | Memory Target |
|---------|----------|----------|------------|---------------|
| API Gateway | 3 | 10 | 60% | 70% |
| Auth | 3 | 8 | 60% | 70% |
| User | 3 | 8 | 60% | 70% |
| Product | 3 | 10 | 60% | 70% |
| Order | 3 | 10 | 60% | 70% |
| Payment | 3 | 8 | 50% | 60% |
| Messaging | 3 | 15 | 60% | 70% |
| Notification | 3 | 10 | 60% | 70% |
| Search | 3 | 8 | 60% | 70% |
| Others | 2 | 6 | 60% | 70% |

---

## 7. Network Architecture

### 7.1 VPC Design

```
┌─────────────────────────────────────────────────────────────┐
│                      AWS VPC (10.0.0.0/16)                   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Public Subnets (10.0.1.0/24, etc.)       │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐            │   │
│  │  │   ALB    │  │  NAT GW  │  │ Bastion  │            │   │
│  │  └──────────┘  └──────────┘  └──────────┘            │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │           Private App Subnets (10.0.10.0/24, etc.)    │   │
│  │  ┌────────────────────────────────────────────────┐   │   │
│  │  │           Kubernetes Worker Nodes               │   │   │
│  │  └────────────────────────────────────────────────┘   │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │           Private Data Subnets (10.0.20.0/24, etc.)   │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐            │   │
│  │  │PostgreSQL│  │  Redis   │  │  Kafka   │            │   │
│  │  └──────────┘  └──────────┘  └──────────┘            │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 8. Scalability Design

### 8.1 Horizontal Scaling
- **Stateless services:** Scale pods based on CPU/memory/custom metrics
- **Database:** Read replicas for read-heavy services, connection pooling (PgBouncer)
- **Cache:** Redis Cluster with automatic sharding
- **Search:** Elasticsearch cluster with shard replication
- **Message Queue:** Kafka partition scaling

### 8.2 Database Sharding Strategy
- **User data:** Shard by user_id (consistent hashing)
- **Order data:** Shard by order_date (time-based partitioning)
- **Product data:** Shard by category_id
- **Message data:** Shard by conversation_id

### 8.3 Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| API Response (p50) | < 100ms | Gateway metrics |
| API Response (p95) | < 200ms | Gateway metrics |
| API Response (p99) | < 500ms | Gateway metrics |
| Search Latency | < 500ms | Search service metrics |
| Page Load (3G) | < 2s | Real user monitoring |
| Concurrent Users | 100,000 | Load testing |
| Throughput | 10,000 RPS | Load testing |
