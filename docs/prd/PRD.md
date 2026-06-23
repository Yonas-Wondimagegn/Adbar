# Adbar (አድባር) — Product Requirements Document

**Version:** 1.0.0  
**Date:** 2026-06-21  
**Status:** Draft — Ready for Engineering Review  
**Author:** Adbar Architecture Team  

---

## 1. Executive Summary

Adbar (አድባር) is a hybrid marketplace platform combining the capabilities of Amazon Marketplace, Upwork, Fiverr, Etsy, and Shopify into a unified ecosystem. Named after the traditional Ethiopian community gathering tree, Adbar serves as a digital meeting point where buyers, sellers, freelancers, and clients converge.

The platform acts **strictly as an intermediary** — it does not own inventory, employ freelancers, deliver products, or perform services. It facilitates discovery, communication, contracts, payments, escrow, trust, and dispute resolution.

---

## 2. Product Vision

**Vision Statement:**  
To become East Africa's most trusted digital marketplace — connecting buyers with sellers and clients with freelancers through a resilient, low-connectivity-aware platform that works as reliably on a feature phone in rural Ethiopia as it does on a smartphone in Addis Ababa.

**Mission Statement:**  
Empower Ethiopian and global entrepreneurs, artisans, and professionals to participate in digital commerce regardless of their device, connectivity, or payment infrastructure.

---

## 3. Target Market

### Primary Markets
- **Ethiopia:** 120M+ population, rapidly growing mobile penetration, emerging digital payments ecosystem
- **East African Diaspora:** Remittance-linked commerce, cross-border services

### Secondary Markets
- **Global:** International buyers/sellers, cross-border freelance services, Ethiopian artisan goods export

---

## 4. User Types and Personas

### 4.1 Product Buyers
- Browse, search, purchase products
- Track orders, leave reviews, create wishlists
- Access via web, PWA, USSD, mobile app

### 4.2 Product Sellers
- Create stores, list products, manage orders/shipping
- View analytics, receive payouts
- Tiered onboarding: Quick Store → Verified → Expert

### 4.3 Clients / Employers
- Post jobs, hire freelancers, create contracts
- Fund escrow, approve milestones
- Access via web and mobile

### 4.4 Freelancers / Service Providers
- Create profiles, showcase portfolios, apply for jobs
- Deliver work, receive payments via escrow
- Tiered onboarding: Quick Profile → Verified → Expert

### 4.5 Moderators
- Review reports, handle disputes, moderate content
- Specialized admin dashboard access

### 4.6 Compliance Officers
- Manage KYC/AML, review verification requests
- Access to compliance dashboard

### 4.7 Platform Administrators
- Full platform management, user/transaction/dispute management
- Super-admin dashboard access

---

## 5. Feature Requirements

### 5.1 Product Marketplace Module

| ID | Feature | Priority | Description |
|----|---------|----------|-------------|
| PM-001 | Multi-vendor Architecture | P0 | Core multi-tenant vendor system |
| PM-002 | Vendor Storefronts | P0 | Customizable seller pages |
| PM-003 | Product Categories | P0 | Unlimited hierarchy |
| PM-004 | Product Variants | P0 | Size, color, material, etc. |
| PM-005 | SKU Support | P0 | Unique product identifiers |
| PM-006 | Inventory Tracking | P0 | Real-time stock management |
| PM-007 | Product Bundles | P1 | Multi-product packages |
| PM-008 | Digital Products | P1 | Downloadable goods |
| PM-009 | Coupons & Promotions | P1 | Discount codes, percentage/fixed |
| PM-010 | Flash Sales | P1 | Time-limited offers |
| PM-011 | Wishlists | P0 | Save for later |
| PM-012 | Recently Viewed | P1 | Browsing history |
| PM-013 | Seller Follow | P1 | Subscribe to seller updates |
| PM-014 | Product Comparison | P2 | Side-by-side comparison |
| PM-015 | Product Recommendations | P1 | AI-powered suggestions |

### 5.2 Search Module

| ID | Feature | Priority | Description |
|----|---------|----------|-------------|
| SE-001 | Semantic Search | P0 | NLP-powered search |
| SE-002 | Elasticsearch | P0 | Full-text search engine |
| SE-003 | AI-Powered Search | P1 | Intelligent query understanding |
| SE-004 | Auto-complete | P0 | Query suggestions |
| SE-005 | Category Filters | P0 | Hierarchical filtering |
| SE-006 | Price Filters | P0 | Range-based filtering |
| SE-007 | Rating Filters | P0 | Minimum rating filter |
| SE-008 | Location Filters | P1 | Geographic filtering |
| SE-009 | Availability Filters | P0 | In-stock filter |

### 5.3 Order Management

| Status | Description |
|--------|-------------|
| Pending | Order placed, awaiting payment |
| Paid | Payment confirmed |
| Processing | Seller preparing order |
| Packed | Order packaged |
| Shipped | In transit |
| Delivered | Received by buyer |
| Returned | Return initiated |
| Refunded | Refund processed |
| Cancelled | Order cancelled |

### 5.4 Freelance Marketplace Module

| ID | Feature | Priority | Description |
|----|---------|----------|-------------|
| FL-001 | Freelancer Profiles | P0 | Bio, skills, experience, certs |
| FL-002 | Portfolio System | P0 | Images, videos, PDFs, links |
| FL-003 | Job Posting | P0 | Budget, deadline, skills, attachments |
| FL-004 | Proposal System | P0 | Cover letter, estimate, timeline |
| FL-005 | Contracts | P0 | Auto-generated, e-signatures |
| FL-006 | Project Management | P0 | Milestones, tasks, deliverables |
| FL-007 | Time Tracking | P1 | Hourly work logging |
| FL-008 | Job Types | P0 | Fixed, hourly, milestone, retainer |

### 5.5 Communication Module

| ID | Feature | Priority | Description |
|----|---------|----------|-------------|
| CM-001 | Real-time Messaging | P0 | 1:1 and group chat |
| CM-002 | Voice Calls | P1 | WebRTC-based |
| CM-003 | Video Calls | P1 | WebRTC-based |
| CM-004 | Screen Sharing | P2 | During calls |
| CM-005 | File Uploads | P0 | In-chat file sharing |

---

## 6. Payment Architecture Requirements

### 6.1 Core Principles
- Payment Provider Adapter pattern (Strategy pattern)
- Currency-based provider selection
- Provider-agnostic transaction ledger
- Admin-configurable provider management

### 6.2 Supported Providers

**ETB (Ethiopian Birr):**
- Chapa (NBE-licensed PSO, license NPS/PSO/005/2022)
- SantimPay (NBE-licensed PSO, license NPS/PSO/006/2022)
- Extensible for ArifPay, TeleBirr-direct, etc.

**International:**
- Stripe, PayPal, Apple Pay, Google Pay, Bank Transfer

### 6.3 Adbar Unit (AU) Wallet
- Currency-tagged internal ledger (AU-ETB, AU-USD, etc.)
- Currencies are never fungible
- No conversion endpoints exist — by design
- Per-currency balances displayed separately

---

## 7. Low-Connectivity & Resilience

### 7.1 USSD Channel
- Menu-driven interface for feature phones
- Shared backend APIs (no parallel data store)
- Actions: check order status, wallet balance, escrow status, SMS confirmations, withdrawal requests

### 7.2 Offline-First PWA
- Service worker + IndexedDB cache-and-sync
- Offline catalog browsing, cart/wishlist queuing
- Seller order management with sync
- Explicit sync state UI

### 7.3 SMS Notifications
- Parallel delivery with push/email (not fallback)
- Ethiopian SMS gateway for +251 numbers
- Amharic and English templates

### 7.4 Data-Saver Mode
- Multi-tier image compression
- Lazy loading
- User-controlled data saver toggle

---

## 8. Onboarding (Staged Model)

### 8.1 Quick Store (Sellers)
- Phone verification + Fayda ID submission (async)
- Store goes live as "Pending Verification"
- Can list and receive orders; cannot receive payouts
- Order value cap until verification clears

### 8.2 Quick Profile (Freelancers)
- Phone + email verification
- Full KYC required before escrow funding
- Same progressive trust unlocking

---

## 9. Trust & Safety

### 9.1 Verification Levels
- **Level 1:** Email + Phone verification
- **Level 2:** Government ID (Fayda as first-class option)
- **Level 3:** Business verification

### 9.2 Badges
Verified Seller, Verified Freelancer, Expert Verified, Top Rated, Trusted Vendor

### 9.3 Fraud Protection
- Risk scoring, device fingerprinting, abuse prevention
- AU currency mismatch = critical auto-blocked fraud signal

---

## 10. Non-Functional Requirements

### 10.1 Performance
- Page load < 2 seconds (3G)
- API response < 200ms (p95)
- Search results < 500ms

### 10.2 Scalability
- 10M users
- 1M DAU
- 100K concurrent users
- Millions of products/listings

### 10.3 Availability
- 99.9% uptime SLA
- Graceful degradation for low-connectivity features

### 10.4 Security
- PCI DSS, GDPR, CCPA compliance
- OWASP Top 10 protections
- Encryption at rest and in transit
- Immutable audit logging

---

## 11. Technical Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js, TypeScript, TailwindCSS, ShadCN UI |
| State | Zustand, React Query |
| Backend | NestJS, TypeScript |
| Database | PostgreSQL, Prisma ORM |
| Cache | Redis |
| Search | Elasticsearch |
| Real-time | Socket.IO, WebSockets |
| Payments | Adapter pattern (Chapa, SantimPay, Stripe, PayPal) |
| Mobile | Flutter |
| Identity | Adapter pattern (Fayda, Passport, international) |
| Storage | AWS S3 |
| Infrastructure | Docker, Kubernetes, AWS |
| Auth | JWT, OAuth, Google/Apple Login, MFA |
| CI/CD | GitHub Actions / GitLab CI |
| Monitoring | Prometheus, Grafana, ELK Stack |

---

## 12. Success Metrics

| Metric | Target (Year 1) |
|--------|-----------------|
| Registered Users | 100,000 |
| Active Sellers | 5,000 |
| Active Freelancers | 10,000 |
| GMV | $5M |
| Transactions/month | 50,000 |
| Dispute Rate | < 2% |
| NPS | > 50 |
| Platform Uptime | 99.9% |

---

## 13. Compliance Notes

- Adbar integrates licensed PSOs (Chapa, SantimPay) — it is NOT a PSO itself
- AU currency-tagging is the core AML control preventing cross-currency conversion
- All payment webhook events and AU balance mutations are immutably audit-logged
