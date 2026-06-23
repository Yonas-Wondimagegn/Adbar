# Adbar (አድባር) — Project Summary & Document Index

**Version:** 1.0.0  
**Date:** 2026-06-21  
**Status:** Complete — Ready for Engineering Review  

---

## Project Overview

**Adbar (አድባር)** is a production-ready hybrid marketplace platform combining Amazon Marketplace, Upwork, Fiverr, Etsy, and Shopify into a unified ecosystem. Named after the traditional Ethiopian community gathering tree, Adbar serves as a digital meeting point for buyers, sellers, freelancers, and clients.

The platform acts **strictly as an intermediary** — it does not own inventory, employ freelancers, deliver products, or perform services.

---

## Document Index

| # | Document | Location | Description |
|---|----------|----------|-------------|
| 1 | **PRD** | `docs/prd/PRD.md` | Product Requirements Document — features, user types, NFRs |
| 2 | **BRD** | `docs/brd/BRD.md` | Business Requirements Document — market, financials, GTM |
| 3 | **System Architecture** | `docs/architecture/System-Architecture.md` | High-level architecture, microservices, event-driven design |
| 4 | **Payment Architecture** | `docs/architecture/Payment-Architecture.md` | Payment adapters, AU wallet, escrow, sequence diagrams |
| 5 | **Database Design** | `docs/database/Database-Design.md` | ERD, complete Prisma schema, indexes, partitioning |
| 6 | **API Specifications** | `docs/api/API-Specifications.md` | REST endpoints, GraphQL schema |
| 7 | **Security Architecture** | `docs/security/Security-Architecture.md` | Auth, RBAC, encryption, OWASP, compliance |
| 8 | **DevOps Architecture** | `docs/devops/DevOps-Architecture.md` | CI/CD, Docker, K8s, monitoring, Terraform |
| 9 | **Design System** | `docs/design-system/Design-System.md` | UI/UX, components, wireframes, user flows |
| 10 | **Mobile & AI** | `docs/mobile/Mobile-AI-Architecture.md` | Flutter architecture, offline-first, AI matching |
| 11 | **MVP & Roadmap** | `docs/planning/MVP-Roadmap.md` | MVP scope, sprints, team, costs, risks |

---

## Architecture Highlights

### Payment System
- **Adapter Pattern:** Chapa, SantimPay, Stripe, PayPal as pluggable adapters
- **Currency-Based Selection:** User picks currency first, then provider
- **AU Wallet:** Currency-tagged internal ledger — currencies are NEVER fungible
- **No Conversion:** Deliberate architectural omission to comply with NBE forex controls

### Low-Connectivity Resilience
- **USSD Channel:** Feature phone access via telecom aggregator
- **Offline-First PWA:** Service worker + IndexedDB cache-and-sync
- **SMS Notifications:** Parallel delivery (not fallback) for +251 numbers
- **Data-Saver Mode:** Aggressive image compression, lazy loading

### Staged Onboarding
- **Quick Store:** Phone + Fayda → store live as "Pending Verification"
- **Quick Profile:** Phone + email → profile live, KYC for escrow
- **Progressive Trust:** Transaction caps lift automatically with verification

### Trust & Safety
- **3-Level Verification:** Email/Phone → Fayda ID → Business
- **Fraud Protection:** AU currency mismatch = auto-blocked critical alert
- **Dispute Resolution:** Full workflow with fund freezing and mediation

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js, TypeScript, TailwindCSS, ShadCN UI |
| State | Zustand, React Query |
| Backend | NestJS, TypeScript |
| Database | PostgreSQL, Prisma ORM |
| Cache | Redis |
| Search | Elasticsearch |
| Real-time | Socket.IO, WebSockets |
| Mobile | Flutter |
| Payments | Adapter pattern (Chapa, SantimPay, Stripe, PayPal) |
| Identity | Adapter pattern (Fayda, Passport) |
| Storage | AWS S3 |
| Infrastructure | Docker, Kubernetes, AWS |
| Auth | JWT, OAuth, Google/Apple Login, MFA |
| CI/CD | GitHub Actions |
| Monitoring | Prometheus, Grafana, ELK Stack |

---

## Key Metrics & Targets

| Metric | MVP Target | Year 1 Target |
|--------|-----------|---------------|
| Users | 5,000 | 100,000 |
| Sellers | 200 | 5,000 |
| Freelancers | 100 | 10,000 |
| GMV | $200K | $5M |
| Uptime | 99.5% | 99.9% |
| Dispute Rate | < 3% | < 2% |

---

## Budget Summary

| Category | Annual Cost |
|----------|-------------|
| Team (15) | $888,000 |
| Infrastructure | $60,000 |
| Third-Party Services | $30,000 |
| Payment Processing | $150,000 |
| Operations | $60,000 |
| Marketing | $120,000 |
| Legal & Compliance | $36,000 |
| Contingency | $200,000 |
| **Total Year 1** | **~$1,544,000** |

---

## Getting Started

### Prerequisites
- Node.js 20+
- Docker & Docker Compose
- PostgreSQL 16+
- Redis 7+
- Elasticsearch 8+

### Quick Start

```bash
# Clone the repository
git clone https://github.com/adbar-platform/adbar.git
cd adbar

# Start development environment
docker compose -f infrastructure/docker/docker-compose.dev.yml up -d

# Install dependencies
npm ci

# Run database migrations
npm run prisma:migrate

# Seed initial data
npm run db:seed

# Start all services
npm run dev

# Access points:
# - Web: http://localhost:3001
# - API: http://localhost:3000
# - Admin: http://localhost:3001/admin
# - Grafana: http://localhost:3002
```

---

## Critical Architectural Decisions

1. **AD-001:** Payment Adapter Pattern — isolates provider code
2. **AD-002:** AU Currency-Tagging — prevents forex violations at schema level
3. **AD-003:** Microservices — independent scaling and team autonomy
4. **AD-004:** Event-Driven — Kafka for async communication
5. **AD-005:** Staged Onboarding — fast to list, strict to get paid
6. **AD-006:** USSD First-Class — feature phone support from day one
7. **AD-007:** Offline-First PWA — service worker + IndexedDB
8. **AD-008:** PostgreSQL — ACID compliance with schema-per-service

---

## Compliance Notes

- **Adbar is NOT a PSO** — it integrates licensed PSOs (Chapa, SantimPay)
- **AU currency-tagging** is the core AML control preventing cross-currency conversion
- All payment webhook events and AU balance mutations are **immutably audit-logged**
- **PCI DSS:** Card data never touches Adbar servers (hosted checkout only)
- **GDPR:** Full data portability, right to erasure, breach notification
- **NBE:** Architecture designed in consultation with Ethiopian fintech regulations

---

## Next Steps

1. **Review** all documents with engineering team
2. **Set up** development environment
3. **Begin Sprint 1** — Project Bootstrap & Auth
4. **Engage** Chapa for API credentials and sandbox access
5. **Engage** Fayda for identity verification API access
6. **Engage** Ethiopian telecom for USSD gateway partnership
7. **Recruit** remaining team members
8. **Begin** UI/UX design sprint in parallel

---

*This document is the single entry point for the Adbar (አድባር) platform. All detailed specifications are in the referenced documents above.*
