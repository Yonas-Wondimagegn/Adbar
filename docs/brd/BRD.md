# Adbar (አድባር) — Business Requirements Document

**Version:** 1.0.0  
**Date:** 2026-06-21  
**Status:** Draft — Ready for Stakeholder Review  

---

## 1. Business Overview

### 1.1 Company Description
Adbar (አድባር) is a hybrid digital marketplace platform that unifies product commerce and freelance services into a single ecosystem. The name draws from the traditional Ethiopian "Adbar" — the community gathering tree — symbolizing a shared meeting point for trade, collaboration, and community.

### 1.2 Business Model
Adbar operates as a **platform intermediary**, generating revenue through:
- **Transaction commissions** on product sales (5-15% sliding scale)
- **Service fees** on freelance contracts (10-20%)
- **Listing fees** for premium placements
- **Subscription tiers** for sellers (Basic, Pro, Enterprise)
- **Escrow fees** on milestone releases
- **Currency spread** on international payouts (transparent, disclosed)

### 1.3 Revenue Streams

| Stream | Model | Estimated % of Revenue |
|--------|-------|----------------------|
| Product Commission | % of sale | 40% |
| Freelance Service Fee | % of contract | 25% |
| Seller Subscriptions | Monthly/Annual | 15% |
| Premium Listings | Per-listing | 10% |
| Escrow Fees | Per-release | 5% |
| Value-Added Services | Various | 5% |

---

## 2. Market Analysis

### 2.1 Market Opportunity
- **Ethiopia E-commerce:** $1.2B+ projected by 2027, growing at 25%+ CAGR
- **Ethiopia Freelance:** Rapidly growing IT/services export sector
- **East Africa Digital Payments:** $50B+ mobile money market
- **Diaspora Commerce:** $4B+ annual remittance to Ethiopia, significant commerce potential

### 2.2 Competitive Landscape

| Competitor | Strength | Weakness | Adbar Differentiator |
|-----------|----------|----------|---------------------|
| Amazon | Scale, logistics | No local Ethiopia support | Local payments, USSD, Amharic |
| Upwork | Freelance depth | No product marketplace | Unified product + freelance |
| Etsy | Artisan focus | Limited to handmade | Full product + service range |
| Jumia | African presence | Struggling profitability | Better payments, offline support |
| Shopify | Seller tools | No marketplace | Built-in marketplace |

### 2.3 Unique Value Propositions
1. **First Ethiopian marketplace** with native ETB payment support (Chapa, SantimPay)
2. **USSD channel** for feature phone users — no competitor offers this
3. **Offline-first PWA** for low-connectivity areas
4. **Unified product + freelance** marketplace
5. **AU currency-safe wallet** — regulatory-first design
6. **Staged onboarding** — fast to list, strict to get paid

---

## 3. Stakeholder Analysis

| Stakeholder | Interest | Influence | Engagement Strategy |
|-------------|----------|-----------|-------------------|
| Buyers | Low prices, trust, variety | Medium | UX, reviews, buyer protection |
| Sellers | Sales, low fees, easy onboarding | High | Tools, analytics, staged onboarding |
| Freelancers | Jobs, fair pay, timely payment | High | Matching, escrow, portfolio tools |
| Clients | Quality talent, project management | High | Vetting, contracts, milestones |
| Payment Providers | Transaction volume | High | Integration partnerships |
| Regulators (NBE) | Compliance, AML | Critical | AU design, audit logs, KYC |
| Telecom Partners | USSD/SMS revenue | Medium | Revenue sharing |
| Investors | Growth, profitability | High | Metrics, roadmap, market size |

---

## 4. Business Requirements

### 4.1 Functional Requirements

#### BR-001: Multi-Vendor Product Marketplace
- **Description:** Support unlimited sellers with individual storefronts
- **Acceptance Criteria:**
  - Seller can create store in < 5 minutes (Quick Store)
  - Products appear in search within 5 minutes of listing
  - Buyer can purchase from multiple sellers in one cart
  - Seller receives order notification within 30 seconds

#### BR-002: Freelance Services Marketplace
- **Description:** Support job posting, proposals, contracts, and delivery
- **Acceptance Criteria:**
  - Client can post job in < 3 minutes
  - Freelancer can submit proposal in < 2 minutes
  - Contract auto-generated upon acceptance
  - Escrow funding within 5 minutes of provider selection

#### BR-003: Payment Processing
- **Description:** Support ETB and international currencies via adapter pattern
- **Acceptance Criteria:**
  - ETB payments via Chapa and SantimPay
  - International payments via Stripe and PayPal
  - Provider selection based on currency, not hardcoded
  - New provider addable without code changes to checkout

#### BR-004: Escrow System
- **Description:** Secure fund holding for freelance contracts
- **Acceptance Criteria:**
  - Funds locked upon client deposit
  - Release only upon client approval or auto-release after timeout
  - Partial/milestone releases supported
  - Dispute freezes funds automatically

#### BR-005: Wallet System (AU)
- **Description:** Currency-tagged internal ledger
- **Acceptance Criteria:**
  - Separate balances per currency (AU-ETB, AU-USD)
  - No conversion between currencies
  - Withdrawal only via currency-matched provider
  - Real-time balance updates

#### BR-006: USSD Channel
- **Description:** Feature phone access to core functions
- **Acceptance Criteria:**
  - Order status check via USSD
  - Wallet balance check via USSD
  - SMS confirmation triggered from USSD actions
  - Same backend APIs as web/mobile

#### BR-007: Offline-First PWA
- **Description:** Smartphone access with unreliable connectivity
- **Acceptance Criteria:**
  - Catalog browsing offline
  - Cart/wishlist actions queue and sync
  - Explicit sync state in UI
  - Seller order management offline

#### BR-008: Trust & Safety
- **Description:** Verification, fraud protection, dispute resolution
- **Acceptance Criteria:**
  - 3-level verification system
  - Fayda ID as first-class verification option
  - AU currency mismatch auto-blocked
  - Dispute resolution within 7 days

### 4.2 Non-Functional Requirements

| Requirement | Target |
|------------|--------|
| Platform Uptime | 99.9% |
| Transaction Processing | < 5 seconds |
| Search Latency | < 500ms |
| Page Load (3G) | < 2 seconds |
| Concurrent Users | 100,000 |
| Data Retention | 7 years (compliance) |
| Disaster Recovery | RPO < 1hr, RTO < 4hr |

---

## 5. Financial Projections

### 5.1 Revenue Projections (3-Year)

| Year | Users | GMV | Revenue | Take Rate |
|------|-------|-----|---------|-----------|
| Year 1 | 100K | $5M | $500K | 10% |
| Year 2 | 500K | $30M | $3.6M | 12% |
| Year 2.5 | 1M | $75M | $10.5M | 14% |
| Year 3 | 2M | $200M | $30M | 15% |

### 5.2 Cost Structure (Year 1)

| Category | Monthly | Annual |
|----------|---------|--------|
| Engineering Team (15) | $75,000 | $900,000 |
| Infrastructure (AWS) | $8,000 | $96,000 |
| Payment Processing Fees | Variable | ~$150,000 |
| USSD/SMS Gateway | $2,000 | $24,000 |
| Office & Operations | $5,000 | $60,000 |
| Marketing | $10,000 | $120,000 |
| Legal & Compliance | $3,000 | $36,000 |
| **Total** | **$103,000** | **$1,386,000** |

### 5.3 Break-Even Analysis
- **Monthly Break-Even:** ~$103,000 revenue
- **GMV Break-Even:** ~$1M/month at 10% take rate
- **Timeline:** Month 18-24

---

## 6. Go-To-Market Strategy

### 6.1 Phase 1: Launch (Months 1-6)
- Focus on Addis Ababa sellers and buyers
- Partner with 50+ local artisans and shops
- Chapa integration for ETB payments
- Basic USSD for order tracking
- Target: 10,000 users, 500 sellers

### 6.2 Phase 2: Expand (Months 7-12)
- Expand to major Ethiopian cities (Dire Dawa, Hawassa, Bahir Dar)
- SantimPay integration
- Freelance marketplace launch
- Offline-first PWA
- Target: 50,000 users, 2,000 sellers, 5,000 freelancers

### 6.3 Phase 3: Scale (Months 13-24)
- International expansion (diaspora market)
- Stripe/PayPal integration
- AI matching engine
- Mobile apps (Flutter)
- Target: 200,000 users

### 6.4 Phase 4: Dominate (Months 25-36)
- East African expansion
- Advanced analytics
- Enterprise features
- Target: 500,000+ users

---

## 7. Key Performance Indicators (KPIs)

### 7.1 Growth KPIs
- Monthly Active Users (MAU)
- New User Registration Rate
- Seller/Freelancer Activation Rate
- Geographic Expansion Rate

### 7.2 Engagement KPIs
- Average Session Duration
- Pages per Session
- Search-to-Purchase Conversion
- Repeat Purchase Rate

### 7.3 Financial KPIs
- Gross Merchandise Value (GMV)
- Revenue per User (ARPU)
- Take Rate
- Customer Acquisition Cost (CAC)
- Lifetime Value (LTV)
- LTV:CAC Ratio (target > 3:1)

### 7.4 Trust KPIs
- Dispute Rate (target < 2%)
- Average Dispute Resolution Time
- Verification Completion Rate
- Fraud Detection Rate

---

## 8. Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Payment provider API changes | Medium | High | Adapter pattern isolates changes |
| Regulatory changes (NBE) | Medium | Critical | AU design, compliance-first architecture |
| Low initial adoption | Medium | High | Staged onboarding, USSD channel |
| Fraud during pending verification | High | Medium | Transaction caps, progressive trust |
| Infrastructure costs exceed budget | Medium | Medium | Auto-scaling, cost monitoring |
| Competition from global players | Medium | Medium | Local focus, USSD, Amharic support |
| USSD gateway reliability | Medium | Low | SMS fallback, retry logic |
| Currency volatility (ETB) | High | Medium | AU per-currency isolation |

---

## 9. Legal & Compliance

### 9.1 Regulatory Requirements
- **National Bank of Ethiopia:** Adbar integrates licensed PSOs; does not require its own PSO license
- **Fayda Integration:** National digital ID for KYC
- **Data Protection:** Ethiopian data protection laws + GDPR for international users
- **Consumer Protection:** Return/refund policies, dispute resolution

### 9.2 Terms of Service Requirements
- Platform intermediary status clearly stated
- User-generated content policies
- Payment terms and escrow conditions
- Dispute resolution procedures
- Intellectual property policies

---

## 10. Success Criteria

### 10.1 MVP Success Criteria
- [ ] 1,000 registered users
- [ ] 100 active sellers with live stores
- [ ] 500 products listed
- [ ] Chapa payment integration working
- [ ] Basic order management flow complete
- [ ] USSD order status check working
- [ ] < 2% dispute rate

### 10.2 Year 1 Success Criteria
- [ ] 100,000 registered users
- [ ] 5,000 active sellers
- [ ] 10,000 active freelancers
- [ ] $5M GMV
- [ ] Both Chapa and SantimPay integrated
- [ ] Mobile apps in beta
- [ ] 99.9% uptime achieved
