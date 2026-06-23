# Adbar (አድባር) — MVP, Roadmap & Planning

**Version:** 1.0.0  
**Date:** 2026-06-21  

---

## 1. MVP Definition

### 1.1 MVP Scope (Months 1-6)

The MVP focuses on validating the core marketplace hypothesis in Ethiopia with minimal but complete feature set.

#### MVP Must-Have Features

**Product Marketplace:**
- [x] User registration (email + phone with +251 support)
- [x] Quick Store onboarding (phone + Fayda, async verification)
- [x] Product listing (photos, variants, inventory)
- [x] Category management (3-level hierarchy)
- [x] Shopping cart and checkout
- [x] Order management (all 9 statuses)
- [x] Chapa payment integration (ETB)
- [x] AU Wallet system (ETB only for MVP)
- [x] Basic search (Elasticsearch)
- [x] Product reviews and ratings
- [x] Basic notifications (email + SMS)
- [x] Admin dashboard (users, orders, products)

**Freelance Marketplace (Basic):**
- [x] Freelancer profile creation (Quick Profile)
- [x] Job posting
- [x] Proposal submission
- [x] Basic contract generation
- [x] Escrow funding and release (ETB only)
- [x] Messaging (1:1)

**Trust & Safety:**
- [x] 3-level verification system
- [x] Fayda ID integration (async)
- [x] Product value caps for pending verification
- [x] Basic dispute management

**Infrastructure:**
- [x] Docker containerization
- [x] CI/CD pipeline
- [x] Basic monitoring (Prometheus + Grafana)
- [x] PostgreSQL + Redis
- [x] AWS S3 for media

#### MVP Out of Scope
- SantimPay integration (Phase 2)
- International payments (Stripe/PayPal) (Phase 2)
- USSD channel (Phase 2)
- Offline-first PWA (Phase 2)
- AI matching engine (Phase 3)
- Mobile apps (Phase 3)
- Advanced analytics (Phase 2)
- Product bundles (Phase 2)
- Time tracking (Phase 2)
- Video calls (Phase 3)

### 1.2 MVP Success Criteria

| Metric | Target |
|--------|--------|
| Registered Users | 5,000 |
| Active Sellers | 200 |
| Active Freelancers | 100 |
| Products Listed | 2,000 |
| Orders Completed | 1,000 |
| Contracts Completed | 100 |
| Payment Success Rate | > 95% |
| Dispute Rate | < 3% |
| Platform Uptime | 99.5% |
| Chapa Integration | Working end-to-end |
| Fayda Verification | Flow complete (may use mock API) |

---

## 2. Development Roadmap

### Phase 1: Foundation (Months 1-3)

**Sprint 1-2: Project Setup & Auth**
- Project scaffolding (NestJS monorepo)
- PostgreSQL + Prisma setup
- Auth service (register, login, JWT, OAuth)
- User service (profiles, roles, permissions)
- Basic API gateway

**Sprint 3-4: Product Catalog**
- Category service (hierarchical)
- Product service (CRUD, variants, images)
- Store service (Quick Store onboarding)
- Elasticsearch integration
- Basic search

**Sprint 5-6: Order Management**
- Order service (cart, checkout, status flow)
- Order items, shipping address
- Order notifications
- Basic admin dashboard

### Phase 2: Payments & Commerce (Months 4-6)

**Sprint 7-8: Payment Integration**
- Payment adapter pattern implementation
- Chapa adapter (hosted checkout)
- Transaction recording
- Webhook handling

**Sprint 9-10: Wallet & Escrow**
- Wallet service (AU ledger)
- Wallet balances (ETB)
- Escrow service (fund, release, refund)
- Withdrawal requests

**Sprint 11-12: MVP Completion**
- KYC service (Fayda adapter)
- Review service
- Dispute service (basic)
- SMS notifications (Ethiopian gateway)
- QA testing, bug fixes, launch prep

### Phase 3: Freelance & Expansion (Months 7-9)

**Sprint 13-14: Freelance Marketplace**
- Freelancer profiles, portfolios
- Job posting service
- Proposal system
- Contract management

**Sprint 15-16: Advanced Features**
- SantimPay adapter
- Milestone-based escrow
- Time tracking
- Advanced search filters
- Product recommendations (basic)

### Phase 4: Scale & Mobile (Months 10-12)

**Sprint 17-18: Low-Connectivity Features**
- USSD channel integration
- Offline-first PWA
- SMS notification enhancements
- Data-saver mode

**Sprint 19-20: Mobile & Analytics**
- Flutter mobile apps (buyer, seller)
- Advanced analytics dashboard
- Payment provider performance monitoring
- Admin dashboard enhancements

### Phase 5: Growth (Months 13-18)

- International payments (Stripe, PayPal)
- AI matching engine
- Advanced fraud detection
- Enterprise features
- East African expansion prep

---

## 3. Sprint Breakdown (Phase 1-2 Detail)

### Sprint 1 (Weeks 1-2): Project Bootstrap
| Task | Assignee | Points |
|------|----------|--------|
| Monorepo setup (Nx/Turborepo) | DevOps | 5 |
| NestJS base services scaffolding | Backend Lead | 8 |
| PostgreSQL + Prisma schema (core tables) | Backend | 8 |
| Docker compose (dev environment) | DevOps | 5 |
| CI/CD pipeline (lint, test, build) | DevOps | 8 |
| Auth service: register, login | Backend | 8 |
| JWT token generation + validation | Backend | 5 |
| API gateway setup | Backend | 5 |
| **Sprint Total** | | **52** |

### Sprint 2 (Weeks 3-4): Auth & Users
| Task | Assignee | Points |
|------|----------|--------|
| Email verification flow | Backend | 3 |
| Phone verification (+251 format) | Backend | 5 |
| OAuth (Google, Apple) | Backend | 8 |
| User profiles (CRUD) | Backend | 5 |
| Role-based access control | Backend | 8 |
| Password reset flow | Backend | 3 |
| Session management | Backend | 5 |
| Frontend: Auth pages | Frontend | 13 |
| **Sprint Total** | | **50** |

### Sprint 3 (Weeks 5-6): Categories & Products
| Task | Assignee | Points |
|------|----------|--------|
| Category service (hierarchical) | Backend | 8 |
| Product service (CRUD) | Backend | 13 |
| Product variants | Backend | 8 |
| Product images (S3 upload) | Backend | 5 |
| Store service (Quick Store) | Backend | 8 |
| Inventory tracking | Backend | 5 |
| Frontend: Product listing page | Frontend | 13 |
| Frontend: Product detail page | Frontend | 8 |
| **Sprint Total** | | **68** |

### Sprint 4 (Weeks 7-8): Search & Storefront
| Task | Assignee | Points |
|------|----------|--------|
| Elasticsearch integration | Backend | 13 |
| Product indexing | Backend | 5 |
| Search API (full-text, filters) | Backend | 8 |
| Auto-complete | Backend | 5 |
| Store slug pages | Backend | 5 |
| Storefront UI | Frontend | 13 |
| Search results page | Frontend | 8 |
| Category browse page | Frontend | 8 |
| **Sprint Total** | | **65** |

### Sprint 5 (Weeks 9-10): Cart & Orders
| Task | Assignee | Points |
|------|----------|--------|
| Shopping cart (Redis) | Backend | 8 |
| Order service (create, status) | Backend | 13 |
| Order items | Backend | 5 |
| Order status machine | Backend | 5 |
| Shipping address management | Backend | 5 |
| Order notifications | Backend | 5 |
| Frontend: Cart page | Frontend | 8 |
| Frontend: Checkout page | Frontend | 13 |
| Frontend: Order history | Frontend | 8 |
| **Sprint Total** | | **70** |

### Sprint 6 (Weeks 11-12): Admin & Polish
| Task | Assignee | Points |
|------|----------|--------|
| Admin service (users, orders, products) | Backend | 13 |
| Admin dashboard UI | Frontend | 21 |
| User management (suspend, roles) | Backend | 8 |
| Order management (admin view) | Backend | 5 |
| Product moderation | Backend | 5 |
| Basic analytics | Backend | 8 |
| **Sprint Total** | | **60** |

### Sprint 7 (Weeks 13-14): Chapa Integration
| Task | Assignee | Points |
|------|----------|--------|
| Payment adapter interface | Backend | 5 |
| Chapa adapter implementation | Backend | 13 |
| Transaction recording | Backend | 8 |
| Webhook handling + verification | Backend | 8 |
| Payment status polling | Backend | 5 |
| Frontend: Payment provider selection | Frontend | 8 |
| Frontend: Payment flow | Frontend | 8 |
| **Sprint Total** | | **55** |

### Sprint 8 (Weeks 15-16): Escrow & Wallet
| Task | Assignee | Points |
|------|----------|--------|
| Wallet service (AU ledger) | Backend | 13 |
| Wallet balance management | Backend | 8 |
| Escrow service (fund, release, refund) | Backend | 13 |
| Withdrawal requests | Backend | 5 |
| Frontend: Wallet page (AU-ETB card) | Frontend | 8 |
| Frontend: Escrow flow | Frontend | 8 |
| **Sprint Total** | | **55** |

---

## 4. Team Structure

### 4.1 Core Team (15 people)

| Role | Count | Responsibilities |
|------|-------|-----------------|
| **Engineering Lead / Architect** | 1 | Technical decisions, architecture review, code review |
| **Senior Backend Engineers** | 4 | Microservices development, payment integration, performance |
| **Senior Frontend Engineers** | 3 | Next.js web app, UI/UX implementation, PWA |
| **Mobile Engineer (Flutter)** | 1 | Flutter apps (Phase 3+) |
| **DevOps Engineer** | 1 | CI/CD, Kubernetes, AWS, monitoring |
| **QA Engineer** | 1 | Test automation, manual testing, bug tracking |
| **UI/UX Designer** | 1 | Design system, wireframes, user research |
| **Product Manager** | 1 | Requirements, sprint planning, stakeholder management |
| **Data Engineer** | 1 | Analytics, Elasticsearch, data pipelines |
| **Security Engineer** | 1 | Security architecture, penetration testing, compliance |

### 4.2 Extended Team (as needed)

| Role | When | Purpose |
|------|------|---------|
| Mobile Engineer #2 | Phase 3 | Second Flutter developer |
| Backend Engineers (2-3) | Phase 2-3 | Scale development capacity |
| Compliance Consultant | Phase 1 | NBE regulatory guidance |
| Payment Integration Specialist | Phase 1-2 | Chapa/SantimPay integration support |
| Customer Support | Phase 2 | User support, onboarding assistance |
| Marketing | Phase 2 | User acquisition, brand building |

### 4.3 Team Organization

```
Engineering Lead
├── Backend Team (4)
│   ├── Payment & Wallet sub-team (2)
│   ├── Marketplace sub-team (2)
│   └── Platform sub-team (shared)
├── Frontend Team (3)
│   ├── Web & PWA (2)
│   └── Admin Dashboard (1)
├── Mobile Team (1-2)
├── DevOps (1)
├── QA (1)
└── Data & Security (2)

Product Manager
├── UI/UX Designer (1)
└── Stakeholders
```

---

## 5. Cost Estimation

### 5.1 Personnel Costs (Annual)

| Role | Count | Monthly Salary | Annual Cost |
|------|-------|---------------|-------------|
| Engineering Lead | 1 | $8,000 | $96,000 |
| Senior Backend | 4 | $5,000 | $240,000 |
| Senior Frontend | 3 | $4,500 | $162,000 |
| Mobile Engineer | 1 | $4,500 | $54,000 |
| DevOps Engineer | 1 | $5,500 | $66,000 |
| QA Engineer | 1 | $3,500 | $42,000 |
| UI/UX Designer | 1 | $3,500 | $42,000 |
| Product Manager | 1 | $5,000 | $60,000 |
| Data Engineer | 1 | $5,000 | $60,000 |
| Security Engineer | 1 | $5,500 | $66,000 |
| **Total** | **15** | **$60,000** | **$888,000** |

### 5.2 Infrastructure Costs (Monthly)

| Service | Dev | Staging | Production |
|---------|-----|---------|------------|
| AWS EKS (Kubernetes) | $200 | $400 | $1,500 |
| RDS PostgreSQL | $100 | $200 | $800 |
| ElastiCache Redis | $50 | $100 | $400 |
| Elasticsearch | $100 | $200 | $600 |
| S3 Storage | $20 | $50 | $200 |
| CloudFront CDN | $10 | $30 | $300 |
| Kafka (MSK) | $50 | $100 | $400 |
| Monitoring (Grafana Cloud) | $0 | $50 | $200 |
| **Total** | **$530** | **$1,130** | **$4,400** |

### 5.3 Third-Party Services (Monthly)

| Service | Cost | Notes |
|---------|------|-------|
| Chapa Transaction Fees | ~2.5% of GMV | Per transaction |
| SantimPay Transaction Fees | ~2.5% of GMV | Per transaction (Phase 2) |
| Stripe Fees | 2.9% + $0.30 | International (Phase 2) |
| PayPal Fees | 2.9% + $0.30 | International (Phase 2) |
| Ethiopian SMS Gateway | $0.02/SMS | +251 numbers |
| International SMS | $0.05/SMS | Fallback |
| USSD Gateway | $500/month | Telecom aggregator |
| SendGrid (Email) | $90/month | 100K emails |
| Snyk (Security) | $150/month | Dependency scanning |
| GitHub Teams | $21/month | 3 seats minimum |
| **Total (MVP)** | **~$1,500 + transaction fees** | |

### 5.4 Total Year 1 Budget

| Category | Annual Cost |
|----------|-------------|
| Personnel (15) | $888,000 |
| Infrastructure (AWS) | $60,000 |
| Third-Party Services | $30,000 |
| Payment Processing Fees | $150,000 (est. $5M GMV) |
| Office & Operations | $60,000 |
| Marketing & User Acquisition | $120,000 |
| Legal & Compliance | $36,000 |
| Contingency (15%) | $200,000 |
| **Total Year 1** | **~$1,544,000** |

---

## 6. Risk Assessment

### 6.1 Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Chapa API instability | Medium | High | Adapter pattern, retry logic, fallback to SantimPay |
| Fayda API delays | High | Medium | Mock API for MVP, async verification |
| Elasticsearch performance | Low | Medium | Proper sharding, monitoring, query optimization |
| Payment webhook failures | Medium | High | Idempotent webhooks, polling fallback, reconciliation job |
| Database performance at scale | Medium | High | Read replicas, connection pooling, query optimization |
| Redis cache failures | Low | Medium | Cache-aside pattern, graceful degradation |

### 6.2 Business Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Low seller adoption | Medium | High | Quick Store onboarding, seller incentives |
| Low buyer adoption | Medium | High | Marketing, competitive pricing, trust building |
| Regulatory changes (NBE) | Medium | Critical | AU design, compliance-first, legal counsel |
| Fraud during pending verification | High | Medium | Transaction caps, progressive trust, monitoring |
| Competition from Jumia/local | Medium | Medium | Local focus, USSD, Amharic, better payments |
| Currency volatility (ETB) | High | Medium | AU per-currency isolation, no conversion |
| USSD gateway aggregator issues | Medium | Low | SMS fallback, multiple aggregator options |

### 6.3 Operational Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Key person dependency | Medium | High | Documentation, cross-training, code review |
| Security breach | Low | Critical | Security architecture, penetration testing, insurance |
| Data loss | Low | Critical | Automated backups, multi-AZ, disaster recovery |
| Payment provider license revocation | Low | High | Multiple providers, adapter pattern |
| Team scaling challenges | Medium | Medium | Clear architecture, documentation, onboarding process |

### 6.4 AML/Regulatory Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Cross-currency conversion exploit | Low | Critical | AU currency-tagging at schema level |
| Money laundering via marketplace | Medium | High | KYC/AML, transaction monitoring, SAR reporting |
| PSO licensing changes | Low | Critical | Multiple provider adapters, legal monitoring |
| Data protection violations | Low | High | GDPR compliance, encryption, access controls |

---

## 7. Future Expansion Strategy

### 7.1 Phase 2 Features (Months 7-12)
- SantimPay integration (direct Telebirr charge)
- International payments (Stripe, PayPal)
- USSD channel for feature phones
- Offline-first PWA
- Advanced analytics dashboard
- AI-powered product recommendations
- Mobile apps (Flutter)

### 7.2 Phase 3 Features (Months 13-18)
- AI freelancer matching engine
- ETB-denominated cross-border remittance
- Additional Ethiopian/East African PSPs (ArifPay, TeleBirr-direct)
- Enterprise features (bulk orders, API access)
- Video calls and screen sharing
- Advanced fraud detection (ML-based)

### 7.3 Phase 4 Features (Months 19-24)
- East African expansion (Kenya, Djibouti, Somalia)
- Purchasable platform-credit token (Upwork Connects–style)
  - Non-cash, non-transferable
  - Spent on boosted listings, proposal submissions
  - Explicitly out of scope for v1
- Advanced seller tools (inventory forecasting, pricing optimization)
- White-label marketplace solution
- API marketplace for third-party integrations

### 7.4 Long-Term Vision (Years 2-3)
- Pan-African marketplace
- B2B wholesale marketplace
- Logistics integration (last-mile delivery)
- Buy-now-pay-later (BNPL) for ETB
- Cryptocurrency payment adapter (if regulations permit)
- AI-powered dispute resolution
- Predictive analytics for sellers

---

## 8. Key Architectural Decisions

### AD-001: Payment Adapter Pattern
**Decision:** Use Strategy pattern for payment providers  
**Rationale:** Isolates provider-specific code, enables adding new providers without modifying checkout/escrow logic  
**Trade-off:** Slightly more initial code, but massive long-term flexibility

### AD-002: AU Currency-Tagging
**Decision:** Enforce currency non-fungibility at the database schema level  
**Rationale:** Prevents cross-currency conversion that would violate NBE foreign exchange controls  
**Trade-off:** Users see separate balances per currency, but this is the correct behavior

### AD-003: Microservices Architecture
**Decision:** Decompose into 21 microservices  
**Rationale:** Independent scaling, team autonomy, fault isolation  
**Trade-off:** Operational complexity, eventual consistency challenges

### AD-004: Event-Driven Communication
**Decision:** Use Kafka for async inter-service communication  
**Rationale:** Decouples services, enables event sourcing, supports audit requirements  
**Trade-off:** Eventual consistency, debugging complexity

### AD-005: Staged Onboarding
**Decision:** Quick Store/Profile with progressive trust unlocking  
**Rationale:** Reduces onboarding friction while managing fraud risk  
**Trade-off:** More complex onboarding state machine

### AD-006: USSD as First-Class Channel
**Decision:** Build USSD support from day one, not as an afterthought  
**Rationale:** Significant Ethiopian user base relies on feature phones  
**Trade-off:** Additional integration complexity, but massive market reach

### AD-007: Offline-First PWA
**Decision:** Service worker + IndexedDB for offline capability  
**Rationale:** Many Ethiopian users have unreliable connectivity  
**Trade-off:** Sync complexity, but essential for market fit

### AD-008: PostgreSQL as Primary Database
**Decision:** Single PostgreSQL with schema-per-service  
**Rationale:** ACID compliance, JSONB support, mature ecosystem, Prisma compatibility  
**Trade-off:** Single database vs. database-per-service; mitigated by schema separation
