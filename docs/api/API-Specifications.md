# Adbar (አድባር) — API Specifications

**Version:** 1.0.0  
**Date:** 2026-06-21  

---

## 1. API Design Principles

- **RESTful** with OpenAPI 3.0 specification
- **Versioned:** `/api/v1/...`
- **Authentication:** JWT Bearer tokens
- **Pagination:** Cursor-based for lists, offset-based for admin
- **Rate Limiting:** Per-user, per-endpoint
- **Response Format:** Consistent JSON envelope

### Standard Response Format

```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "hasNext": true
  },
  "error": null
}
```

### Error Response Format

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input",
    "details": [
      { "field": "email", "message": "Invalid email format" }
    ]
  }
}
```

---

## 2. Authentication Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/v1/auth/register` | Register new user | Public |
| POST | `/api/v1/auth/login` | Login with email/password | Public |
| POST | `/api/v1/auth/login/phone` | Login with phone OTP | Public |
| POST | `/api/v1/auth/verify-email` | Verify email token | Public |
| POST | `/api/v1/auth/verify-phone` | Verify phone OTP | Public |
| POST | `/api/v1/auth/refresh` | Refresh JWT token | JWT |
| POST | `/api/v1/auth/logout` | Logout and invalidate token | JWT |
| POST | `/api/v1/auth/forgot-password` | Request password reset | Public |
| POST | `/api/v1/auth/reset-password` | Reset password with token | Public |
| POST | `/api/v1/auth/oauth/google` | Google OAuth login | Public |
| POST | `/api/v1/auth/oauth/apple` | Apple OAuth login | Public |
| POST | `/api/v1/auth/mfa/enable` | Enable MFA | JWT |
| POST | `/api/v1/auth/mfa/verify` | Verify MFA code | JWT |

---

## 3. User Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/v1/users/me` | Get current user profile | JWT |
| PUT | `/api/v1/users/me` | Update profile | JWT |
| PUT | `/api/v1/users/me/avatar` | Upload avatar | JWT |
| PUT | `/api/v1/users/me/password` | Change password | JWT |
| GET | `/api/v1/users/me/preferences` | Get preferences | JWT |
| PUT | `/api/v1/users/me/preferences` | Update preferences | JWT |
| GET | `/api/v1/users/:id/public` | Get public profile | JWT |

---

## 4. Store Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/v1/stores` | Create store (Quick Store) | SELLER |
| GET | `/api/v1/stores/my` | Get my store | SELLER |
| PUT | `/api/v1/stores/my` | Update store | SELLER |
| GET | `/api/v1/stores/:slug` | Get store by slug | Public |
| GET | `/api/v1/stores/:slug/products` | Get store products | Public |
| POST | `/api/v1/stores/:id/follow` | Follow a store | JWT |
| DELETE | `/api/v1/stores/:id/follow` | Unfollow a store | JWT |

---

## 5. Product Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/v1/products` | List products (search/filter) | Public |
| GET | `/api/v1/products/:slug` | Get product details | Public |
| POST | `/api/v1/products` | Create product | SELLER |
| PUT | `/api/v1/products/:id` | Update product | SELLER |
| DELETE | `/api/v1/products/:id` | Delete product | SELLER |
| POST | `/api/v1/products/:id/images` | Upload product images | SELLER |
| DELETE | `/api/v1/products/:id/images/:imageId` | Delete product image | SELLER |
| POST | `/api/v1/products/:id/variants` | Add product variant | SELLER |
| PUT | `/api/v1/products/:id/variants/:variantId` | Update variant | SELLER |
| GET | `/api/v1/categories` | List categories (tree) | Public |
| GET | `/api/v1/categories/:slug/products` | Get category products | Public |

---

## 6. Order Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/v1/orders` | Create order | BUYER |
| GET | `/api/v1/orders` | List my orders (buyer) | BUYER |
| GET | `/api/v1/orders/seller` | List seller orders | SELLER |
| GET | `/api/v1/orders/:id` | Get order details | JWT |
| PUT | `/api/v1/orders/:id/status` | Update order status | SELLER |
| POST | `/api/v1/orders/:id/cancel` | Cancel order | BUYER |
| POST | `/api/v1/orders/:id/confirm-delivery` | Confirm delivery | BUYER |

---

## 7. Payment Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/v1/payments/providers` | Get providers by currency | JWT |
| POST | `/api/v1/payments/initiate` | Initiate payment | JWT |
| POST | `/api/v1/payments/verify` | Verify payment status | JWT |
| POST | `/api/v1/payments/:provider/webhook` | Provider webhook | Public |
| POST | `/api/v1/payments/refund` | Request refund | ADMIN |

---

## 8. Wallet Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/v1/wallet` | Get my wallet (AU balances) | JWT |
| GET | `/api/v1/wallet/transactions` | Get transaction history | JWT |
| POST | `/api/v1/wallet/withdraw` | Request withdrawal | JWT |
| GET | `/api/v1/wallet/withdrawals` | Get withdrawal history | JWT |

---

## 9. Freelancer Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/v1/freelancers/profile` | Create freelancer profile | FREELANCER |
| GET | `/api/v1/freelancers/profile` | Get my profile | FREELANCER |
| PUT | `/api/v1/freelancers/profile` | Update profile | FREELANCER |
| GET | `/api/v1/freelancers` | Browse freelancers | Public |
| GET | `/api/v1/freelancers/:id` | Get freelancer public profile | Public |
| POST | `/api/v1/freelancers/profile/portfolio` | Add portfolio item | FREELANCER |
| DELETE | `/api/v1/freelancers/profile/portfolio/:id` | Remove portfolio item | FREELANCER |
| POST | `/api/v1/freelancers/profile/skills` | Add skill | FREELANCER |
| DELETE | `/api/v1/freelancers/profile/skills/:id` | Remove skill | FREELANCER |

---

## 10. Job Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/v1/jobs` | Post a job | CLIENT |
| GET | `/api/v1/jobs` | Browse jobs | Public |
| GET | `/api/v1/jobs/:id` | Get job details | Public |
| PUT | `/api/v1/jobs/:id` | Update job | CLIENT |
| DELETE | `/api/v1/jobs/:id` | Delete job | CLIENT |
| GET | `/api/v1/jobs/my` | My posted jobs | CLIENT |
| POST | `/api/v1/jobs/:id/proposals` | Submit proposal | FREELANCER |
| GET | `/api/v1/jobs/:id/proposals` | Get job proposals | CLIENT |

---

## 11. Contract Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/v1/contracts` | Create contract from proposal | CLIENT |
| GET | `/api/v1/contracts` | List my contracts | JWT |
| GET | `/api/v1/contracts/:id` | Get contract details | JWT |
| POST | `/api/v1/contracts/:id/sign` | Sign contract | JWT |
| POST | `/api/v1/contracts/:id/milestones` | Add milestone | CLIENT |
| POST | `/api/v1/contracts/:id/milestones/:mid/submit` | Submit milestone | FREELANCER |
| POST | `/api/v1/contracts/:id/milestones/:mid/approve` | Approve milestone | CLIENT |
| POST | `/api/v1/contracts/:id/milestones/:mid/reject` | Reject milestone | CLIENT |

---

## 12. Escrow Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/v1/escrow` | Create escrow | System |
| POST | `/api/v1/escrow/:id/fund` | Fund escrow | CLIENT |
| POST | `/api/v1/escrow/:id/release/:milestoneIndex` | Release milestone | CLIENT |
| POST | `/api/v1/escrow/:id/refund` | Refund escrow | ADMIN |
| GET | `/api/v1/escrow/:id` | Get escrow status | JWT |

---

## 13. Messaging Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/v1/conversations` | List conversations | JWT |
| POST | `/api/v1/conversations` | Create conversation | JWT |
| GET | `/api/v1/conversations/:id/messages` | Get messages | JWT |
| POST | `/api/v1/conversations/:id/messages` | Send message | JWT |
| PUT | `/api/v1/conversations/:id/read` | Mark as read | JWT |

---

## 14. Review Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/v1/reviews` | Create review | JWT |
| GET | `/api/v1/reviews/product/:id` | Get product reviews | Public |
| GET | `/api/v1/reviews/seller/:id` | Get seller reviews | Public |
| GET | `/api/v1/reviews/freelancer/:id` | Get freelancer reviews | Public |
| POST | `/api/v1/reviews/:id/respond` | Respond to review | SELLER/FREELANCER |
| PUT | `/api/v1/reviews/:id/moderate` | Moderate review | MODERATOR |

---

## 15. Dispute Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/v1/disputes` | Open dispute | JWT |
| GET | `/api/v1/disputes` | List my disputes | JWT |
| GET | `/api/v1/disputes/:id` | Get dispute details | JWT |
| POST | `/api/v1/disputes/:id/evidence` | Submit evidence | JWT |
| POST | `/api/v1/disputes/:id/resolve` | Resolve dispute | MODERATOR |
| POST | `/api/v1/disputes/:id/escalate` | Escalate dispute | MODERATOR |

---

## 16. Notification Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/v1/notifications` | Get notifications | JWT |
| PUT | `/api/v1/notifications/:id/read` | Mark as read | JWT |
| PUT | `/api/v1/notifications/read-all` | Mark all as read | JWT |
| GET | `/api/v1/notifications/unread-count` | Get unread count | JWT |
| PUT | `/api/v1/notifications/settings` | Update preferences | JWT |

---

## 17. KYC Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/v1/kyc/submit` | Submit verification | JWT |
| GET | `/api/v1/kyc/status` | Get verification status | JWT |
| POST | `/api/v1/kyc/fayda/verify` | Verify via Fayda | JWT |
| POST | `/api/v1/kyc/document/upload` | Upload ID document | JWT |
| GET | `/api/v1/kyc/verifications` | List verifications (admin) | ADMIN |
| PUT | `/api/v1/kyc/verifications/:id/review` | Review verification | COMPLIANCE |

---

## 18. USSD Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/v1/ussd/callback` | USSD gateway callback | API Key |
| GET | `/api/v1/ussd/sessions` | List USSD sessions | ADMIN |
| GET | `/api/v1/ussd/analytics` | USSD usage analytics | ADMIN |

---

## 19. Admin Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/v1/admin/users` | List all users | ADMIN |
| PUT | `/api/v1/admin/users/:id/roles` | Update user roles | ADMIN |
| PUT | `/api/v1/admin/users/:id/status` | Suspend/activate user | ADMIN |
| GET | `/api/v1/admin/orders` | List all orders | ADMIN |
| GET | `/api/v1/admin/transactions` | List all transactions | ADMIN |
| GET | `/api/v1/admin/wallets` | View wallet balances | ADMIN |
| GET | `/api/v1/admin/payments/providers` | List payment providers | ADMIN |
| PUT | `/api/v1/admin/payments/providers/:id` | Update provider config | ADMIN |
| GET | `/api/v1/admin/analytics/dashboard` | Analytics dashboard | ADMIN |
| GET | `/api/v1/admin/disputes` | List all disputes | ADMIN |
| GET | `/api/v1/admin/kyc/pending` | Pending KYC reviews | COMPLIANCE |
| GET | `/api/v1/admin/onboarding/pending` | Pending verifications | ADMIN |
| GET | `/api/v1/admin/support/tickets` | Support tickets | ADMIN |
| GET | `/api/v1/admin/analytics/revenue` | Revenue analytics | ADMIN |
| GET | `/api/v1/admin/analytics/providers` | Provider performance | ADMIN |
| GET | `/api/v1/admin/ussd/health` | USSD gateway health | ADMIN |
| GET | `/api/v1/admin/sms/analytics` | SMS delivery analytics | ADMIN |

---

## 20. GraphQL Schema (Supplementary)

```graphql
# docs/api/graphql/schema.graphql

type Query {
  # Users
  me: User!
  user(id: ID!): UserPublicProfile
  
  # Products
  products(
    filter: ProductFilter
    sort: ProductSort
    pagination: PaginationInput
  ): ProductConnection!
  product(slug: String!): Product!
  categories: [Category!]!
  
  # Orders
  myOrders(status: OrderStatus, pagination: PaginationInput): OrderConnection!
  order(id: ID!): Order!
  
  # Freelancers
  freelancers(
    filter: FreelancerFilter
    pagination: PaginationInput
  ): FreelancerConnection!
  freelancer(id: ID!): FreelancerProfile!
  
  # Jobs
  jobs(filter: JobFilter, pagination: PaginationInput): JobConnection!
  job(id: ID!): Job!
  
  # Wallet
  myWallet: Wallet!
  
  # Search
  search(query: String!, type: SearchType): SearchResult!
}

type Mutation {
  # Auth
  register(input: RegisterInput!): AuthPayload!
  login(input: LoginInput!): AuthPayload!
  
  # Products
  createProduct(input: CreateProductInput!): Product!
  updateProduct(id: ID!, input: UpdateProductInput!): Product!
  
  # Orders
  createOrder(input: CreateOrderInput!): Order!
  updateOrderStatus(id: ID!, status: OrderStatus!): Order!
  
  # Payments
  initiatePayment(input: InitiatePaymentInput!): PaymentResult!
  
  # Jobs
  createJob(input: CreateJobInput!): Job!
  submitProposal(jobId: ID!, input: SubmitProposalInput!): Proposal!
  
  # Contracts
  createContract(input: CreateContractInput!): Contract!
  signContract(id: ID!): Contract!
  approveMilestone(contractId: ID!, milestoneId: ID!): Milestone!
  
  # Reviews
  createReview(input: CreateReviewInput!): Review!
  
  # Disputes
  openDispute(input: OpenDisputeInput): Dispute!
}

type Subscription {
  orderUpdated(orderId: ID!): Order!
  messageReceived(conversationId: ID!): Message!
  notificationReceived: Notification!
  escrowUpdated(contractId: ID!): Escrow!
}
```
