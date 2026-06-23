# Adbar (አድባር) — Database Design & Prisma Schema

**Version:** 1.0.0  
**Date:** 2026-06-21  

---

## 1. Entity Relationship Diagram (Conceptual)

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│    User      │────<│   Store      │────<│   Product    │
│             │     │             │     │             │
│ id          │     │ id          │     │ id          │
│ email       │     │ userId      │     │ storeId     │
│ phone       │     │ name        │     │ categoryId  │
│ password    │     │ slug        │     │ name        │
│ roles[]     │     │ status      │     │ price       │
│ kycLevel    │     │ verified    │     │ currency    │
└──────┬──────┘     └─────────────┘     └──────┬──────┘
       │                                         │
       │         ┌─────────────┐                │
       │         │  Category    │<───────────────┘
       │         │             │
       │         │ id          │
       │         │ parentId    │
       │         │ name        │
       │         │ slug        │
       │         └─────────────┘
       │
       │         ┌─────────────┐     ┌─────────────┐
       ├────────<│   Order      │────<│  OrderItem   │
       │         │             │     │             │
       │         │ id          │     │ id          │
       │         │ buyerId     │     │ orderId     │
       │         │ sellerId    │     │ productId   │
       │         │ status      │     │ quantity    │
       │         │ total       │     │ price       │
       │         │ currency    │     └─────────────┘
       │         └──────┬──────┘
       │                │
       │         ┌──────┴──────┐
       │         │  Transaction │
       │         │             │
       │         │ id          │
       │         │ orderId     │
       │         │ providerId  │
       │         │ amount      │
       │         │ currency    │
       │         │ status      │
       │         └─────────────┘
       │
       │         ┌─────────────┐     ┌─────────────┐
       ├────────<│   Wallet     │────<│ WalletBalance│
       │         │             │     │             │
       │         │ id          │     │ id          │
       │         │ userId      │     │ walletId    │
       │         └─────────────┘     │ currency    │
       │                             │ balance     │
       │                             │ type        │
       │                             └─────────────┘
       │
       │         ┌─────────────┐     ┌─────────────┐
       ├────────<│   Job        │────<│  Proposal    │
       │         │             │     │             │
       │         │ id          │     │ id          │
       │         │ clientId    │     │ jobId       │
       │         │ title       │     │ freelancerId│
       │         │ budget      │     │ coverLetter │
       │         │ type        │     │ amount      │
       │         └──────┬──────┘     └─────────────┘
       │                │
       │         ┌──────┴──────┐     ┌─────────────┐
       │         │  Contract    │────<│  Milestone   │
       │         │             │     │             │
       │         │ id          │     │ id          │
       │         │ jobId       │     │ contractId  │
       │         │ freelancerId│     │ title       │
       │         │ clientId    │     │ amount      │
       │         │ status      │     │ status      │
       │         └──────┬──────┘     └─────────────┘
       │                │
       │         ┌──────┴──────┐
       │         │   Escrow     │
       │         │             │
       │         │ id          │
       │         │ contractId  │
       │         │ amount      │
       │         │ currency    │
       │         │ status      │
       │         └─────────────┘
       │
       │         ┌─────────────┐
       ├────────<│   Review     │
       │         │             │
       │         │ id          │
       │         │ reviewerId  │
       │         │ targetId    │
       │         │ rating      │
       │         │ comment     │
       │         └─────────────┘
       │
       │         ┌─────────────┐
       ├────────<│   Dispute    │
       │         │             │
       │         │ id          │
       │         │ reporterId  │
       │         │ orderId     │
       │         │ contractId  │
       │         │ status      │
       │         │ resolution  │
       │         └─────────────┘
       │
       │         ┌─────────────┐
       └────────<│   Message    │
                 │             │
                 │ id          │
                 │ senderId    │
                 │ receiverId  │
                 │ content     │
                 │ type        │
                 └─────────────┘
```

---

## 2. Complete Prisma Schema

```prisma
// database/prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============================================================
// ENUMS
// ============================================================

enum Role {
  BUYER
  SELLER
  FREELANCER
  CLIENT
  MODERATOR
  COMPLIANCE_OFFICER
  ADMIN
  SUPER_ADMIN
}

enum KycLevel {
  LEVEL_1
  LEVEL_2
  LEVEL_3
}

enum VerificationStatus {
  PENDING
  VERIFIED
  REJECTED
  EXPIRED
}

enum StoreStatus {
  PENDING_VERIFICATION
  ACTIVE
  SUSPENDED
  CLOSED
}

enum ProductStatus {
  DRAFT
  ACTIVE
  INACTIVE
  OUT_OF_STOCK
  ARCHIVED
}

enum ProductType {
  PHYSICAL
  DIGITAL
  BUNDLE
}

enum OrderStatus {
  PENDING
  PAID
  PROCESSING
  PACKED
  SHIPPED
  DELIVERED
  RETURNED
  REFUNDED
  CANCELLED
}

enum TransactionStatus {
  PENDING
  SUCCESS
  FAILED
  REFUNDED
  EXPIRED
}

enum EscrowStatus {
  PENDING
  FUNDED
  RELEASED
  REFUNDED
  FROZEN
  DISPUTED
}

enum ContractStatus {
  DRAFT
  PENDING_SIGNATURE
  ACTIVE
  COMPLETED
  CANCELLED
  DISPUTED
}

enum JobStatus {
  DRAFT
  OPEN
  IN_PROGRESS
  COMPLETED
  CANCELLED
  CLOSED
}

enum JobType {
  FIXED_PRICE
  HOURLY
  MILESTONE_BASED
  RETAINER
}

enum ProposalStatus {
  PENDING
  ACCEPTED
  REJECTED
  WITHDRAWN
}

enum MilestoneStatus {
  PENDING
  IN_PROGRESS
  SUBMITTED
  APPROVED
  REJECTED
  PAID
}

enum DisputeStatus {
  OPEN
  UNDER_REVIEW
  MEDIATING
  RESOLVED
  ESCALATED
  CLOSED
}

enum DisputeResolution {
  REFUND_BUYER
  PAY_SELLER
  PARTIAL_REFUND
  NO_ACTION
}

enum MessageType {
  TEXT
  IMAGE
  FILE
  SYSTEM
}

enum NotificationType {
  EMAIL
  SMS
  PUSH
  IN_APP
}

enum WalletBalanceType {
  AVAILABLE
  PENDING
  FROZEN
}

// ============================================================
// USER & AUTH
// ============================================================

model User {
  id                String    @id @default(uuid())
  email             String    @unique
  phone             String?   @unique
  passwordHash      String
  firstName         String
  lastName          String
  avatarUrl         String?
  bio               String?
  dateOfBirth       DateTime?
  gender            String?
  
  // Location
  country           String?
  city              String?
  address           String?
  postalCode        String?
  
  // Verification
  emailVerified     Boolean   @default(false)
  phoneVerified     Boolean   @default(false)
  kycLevel          KycLevel  @default(LEVEL_1)
  
  // Preferences
  language          String    @default("en")
  currency          String    @default("ETB")
  dataSaverMode     Boolean   @default(false)
  
  // Security
  mfaEnabled        Boolean   @default(false)
  mfaSecret         String?
  lastLoginAt       DateTime?
  failedLoginCount  Int       @default(0)
  lockedUntil       DateTime?
  
  // Timestamps
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
  deletedAt         DateTime?

  // Relations
  roles             UserRole[]
  sessions          Session[]
  identityVerifications IdentityVerification[]
  
  // Store (if seller)
  store             Store?
  
  // Freelancer profile
  freelancerProfile FreelancerProfile?
  
  // Orders
  buyerOrders       Order[]           @relation("BuyerOrders")
  sellerOrders      Order[]           @relation("SellerOrders")
  
  // Wallet
  wallet            Wallet?
  
  // Jobs (as client)
  postedJobs        Job[]             @relation("ClientJobs")
  
  // Proposals (as freelancer)
  proposals         Proposal[]
  
  // Contracts
  clientContracts   Contract[]        @relation("ClientContracts")
  freelancerContracts Contract[]      @relation("FreelancerContracts")
  
  // Messages
  sentMessages      Message[]         @relation("SentMessages")
  receivedMessages  Message[]         @relation("ReceivedMessages")
  
  // Reviews
  writtenReviews    Review[]          @relation("ReviewerReviews")
  receivedReviews   Review[]          @relation("TargetReviews")
  
  // Disputes
  reportedDisputes  Dispute[]         @relation("ReporterDisputes")
  
  // Notifications
  notifications     Notification[]
  
  // Wishlist
  wishlistItems     WishlistItem[]
  
  // Recently viewed
  recentlyViewed    RecentlyViewed[]
  
  // Followed stores
  followedStores    FollowedStore[]
  
  // Support tickets
  supportTickets    SupportTicket[]
  
  @@index([email])
  @@index([phone])
  @@index([kycLevel])
  @@map("users")
}

model UserRole {
  id        String   @id @default(uuid())
  userId    String
  role      Role
  createdAt DateTime @default(now())
  
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@unique([userId, role])
  @@map("user_roles")
}

model Session {
  id           String   @id @default(uuid())
  userId       String
  token        String   @unique
  refreshToken String?  @unique
  ipAddress    String?
  userAgent    String?
  deviceFingerprint String?
  expiresAt    DateTime
  createdAt    DateTime @default(now())
  
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@index([token])
  @@index([userId])
  @@map("sessions")
}

// ============================================================
// IDENTITY VERIFICATION (KYC)
// ============================================================

model IdentityVerification {
  id              String             @id @default(uuid())
  userId          String
  providerId      String             // "fayda" | "passport" | "international_id"
  idType          String             // "fayda" | "passport" | "drivers_license" | "national_id"
  idNumber        String?
  idDocumentUrl   String?
  selfieUrl       String?
  status          VerificationStatus @default(PENDING)
  verifiedAt      DateTime?
  rejectionReason String?
  rawResponse     Json?              // Provider response for audit
  createdAt       DateTime           @default(now())
  updatedAt       DateTime           @updatedAt
  
  user            User               @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@index([userId])
  @@index([status])
  @@map("identity_verifications")
}

// ============================================================
// STORE (SELLER)
// ============================================================

model Store {
  id                String       @id @default(uuid())
  userId            String       @unique
  name              String
  slug              String       @unique
  description       String?
  logoUrl           String?
  bannerUrl         String?
  status            StoreStatus  @default(PENDING_VERIFICATION)
  
  // Business info
  businessName      String?
  businessRegNumber String?
  taxId             String?
  
  // Contact
  email             String?
  phone             String?
  website           String?
  
  // Location
  country           String?
  city              String?
  address           String?
  
  // Settings
  autoConfirmOrders Boolean      @default(false)
  returnPolicy      String?
  
  // Metrics
  totalSales        Int          @default(0)
  totalRevenue      Decimal      @default(0) @db.Decimal(19, 4)
  averageRating     Decimal      @default(0) @db.Decimal(3, 2)
  reviewCount       Int          @default(0)
  
  // Timestamps
  createdAt         DateTime     @default(now())
  updatedAt         DateTime     @updatedAt
  
  user              User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  products          Product[]
  coupons           Coupon[]
  followers         FollowedStore[]
  
  @@index([slug])
  @@index([status])
  @@map("stores")
}

model FollowedStore {
  id        String   @id @default(uuid())
  userId    String
  storeId   String
  createdAt DateTime @default(now())
  
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  store     Store    @relation(fields: [storeId], references: [id], onDelete: Cascade)
  
  @@unique([userId, storeId])
  @@map("followed_stores")
}

// ============================================================
// PRODUCT CATALOG
// ============================================================

model Category {
  id          String    @id @default(uuid())
  parentId    String?
  name        String
  slug        String    @unique
  description String?
  imageUrl    String?
  sortOrder   Int       @default(0)
  isActive    Boolean   @default(true)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  
  parent      Category? @relation("CategoryHierarchy", fields: [parentId], references: [id])
  children    Category[] @relation("CategoryHierarchy")
  products    Product[]
  
  @@index([slug])
  @@index([parentId])
  @@map("categories")
}

model Product {
  id              String        @id @default(uuid())
  storeId         String
  categoryId      String?
  name            String
  slug            String        @unique
  description     String?
  shortDescription String?
  type            ProductType   @default(PHYSICAL)
  status          ProductStatus @default(DRAFT)
  
  // Pricing
  price           Decimal       @db.Decimal(19, 4)
  compareAtPrice  Decimal?      @db.Decimal(19, 4)
  currency        String        @default("ETB")
  
  // Inventory
  sku             String?       @unique
  barcode         String?
  quantity        Int           @default(0)
  lowStockThreshold Int         @default(5)
  trackInventory  Boolean       @default(true)
  
  // Shipping
  weight          Decimal?      @db.Decimal(10, 2)
  length          Decimal?      @db.Decimal(10, 2)
  width           Decimal?      @db.Decimal(10, 2)
  height          Decimal?      @db.Decimal(10, 2)
  freeShipping    Boolean       @default(false)
  
  // Digital product
  downloadUrl     String?
  downloadLimit   Int?
  
  // SEO
  metaTitle       String?
  metaDescription String?
  
  // Metrics
  viewCount       Int           @default(0)
  salesCount      Int           @default(0)
  averageRating   Decimal       @default(0) @db.Decimal(3, 2)
  reviewCount     Int           @default(0)
  
  // Timestamps
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
  
  store           Store         @relation(fields: [storeId], references: [id], onDelete: Cascade)
  category        Category?     @relation(fields: [categoryId], references: [id])
  variants        ProductVariant[]
  images          ProductImage[]
  videos          ProductVideo[]
  documents       ProductDocument[]
  tags            ProductTag[]
  orderItems      OrderItem[]
  wishlistItems   WishlistItem[]
  recentlyViewed  RecentlyViewed[]
  coupons         Coupon[]
  
  @@index([storeId])
  @@index([categoryId])
  @@index([status])
  @@index([slug])
  @@index([price])
  @@map("products")
}

model ProductVariant {
  id              String    @id @default(uuid())
  productId       String
  name            String    // e.g., "Red / Large"
  sku             String?   @unique
  price           Decimal   @db.Decimal(19, 4)
  compareAtPrice  Decimal?  @db.Decimal(19, 4)
  quantity        Int       @default(0)
  imageUrl        String?
  sortOrder       Int       @default(0)
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  product         Product   @relation(fields: [productId], references: [id], onDelete: Cascade)
  options         ProductVariantOption[]
  
  @@index([productId])
  @@map("product_variants")
}

model ProductVariantOption {
  id              String          @id @default(uuid())
  variantId       String
  name            String          // e.g., "Color", "Size"
  value           String          // e.g., "Red", "Large"
  
  variant         ProductVariant  @relation(fields: [variantId], references: [id], onDelete: Cascade)
  
  @@index([variantId])
  @@map("product_variant_options")
}

model ProductImage {
  id        String   @id @default(uuid())
  productId String
  url       String
  altText   String?
  sortOrder Int      @default(0)
  isPrimary Boolean  @default(false)
  createdAt DateTime @default(now())
  
  product   Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  
  @@index([productId])
  @@map("product_images")
}

model ProductVideo {
  id        String   @id @default(uuid())
  productId String
  url       String
  thumbnailUrl String?
  title     String?
  sortOrder Int      @default(0)
  createdAt DateTime @default(now())
  
  product   Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  
  @@index([productId])
  @@map("product_videos")
}

model ProductDocument {
  id        String   @id @default(uuid())
  productId String
  url       String
  name      String
  fileType  String
  fileSize  Int
  createdAt DateTime @default(now())
  
  product   Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  
  @@index([productId])
  @@map("product_documents")
}

model Tag {
  id      String       @id @default(uuid())
  name    String       @unique
  slug    String       @unique
  products ProductTag[]
  
  @@map("tags")
}

model ProductTag {
  productId String
  tagId     String
  
  product   Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  tag       Tag      @relation(fields: [tagId], references: [id], onDelete: Cascade)
  
  @@id([productId, tagId])
  @@map("product_tags")
}

// ============================================================
// COUPONS & PROMOTIONS
// ============================================================

model Coupon {
  id              String    @id @default(uuid())
  storeId         String?
  productId       String?
  code            String    @unique
  description     String?
  
  // Discount
  discountType    String    // "percentage" | "fixed"
  discountValue   Decimal   @db.Decimal(19, 4)
  minOrderAmount  Decimal?  @db.Decimal(19, 4)
  maxDiscount     Decimal?  @db.Decimal(19, 4)
  
  // Limits
  usageLimit      Int?
  usageCount      Int       @default(0)
  perUserLimit    Int       @default(1)
  
  // Validity
  startsAt        DateTime?
  expiresAt       DateTime?
  isActive        Boolean   @default(true)
  
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  store           Store?    @relation(fields: [storeId], references: [id])
  product         Product?  @relation(fields: [productId], references: [id])
  
  @@index([code])
  @@map("coupons")
}

// ============================================================
// ORDERS
// ============================================================

model Order {
  id                String      @id @default(uuid())
  orderNumber       String      @unique
  buyerId           String
  sellerId          String
  
  // Status
  status            OrderStatus @default(PENDING)
  
  // Pricing
  subtotal          Decimal     @db.Decimal(19, 4)
  shippingCost      Decimal     @default(0) @db.Decimal(19, 4)
  taxAmount         Decimal     @default(0) @db.Decimal(19, 4)
  discountAmount    Decimal     @default(0) @db.Decimal(19, 4)
  total             Decimal     @db.Decimal(19, 4)
  currency          String      @default("ETB")
  
  // Shipping
  shippingAddress   Json?
  shippingMethod    String?
  trackingNumber    String?
  shippedAt         DateTime?
  deliveredAt       DateTime?
  
  // Notes
  buyerNote         String?
  sellerNote        String?
  
  // Timestamps
  createdAt         DateTime    @default(now())
  updatedAt         DateTime    @updatedAt
  
  buyer             User        @relation("BuyerOrders", fields: [buyerId], references: [id])
  seller            User        @relation("SellerOrders", fields: [sellerId], references: [id])
  items             OrderItem[]
  transactions      Transaction[]
  dispute           Dispute?
  
  @@index([buyerId])
  @@index([sellerId])
  @@index([status])
  @@index([orderNumber])
  @@map("orders")
}

model OrderItem {
  id              String   @id @default(uuid())
  orderId         String
  productId       String?
  variantId       String?
  
  productName     String
  productSku     String?
  variantName     String?
  productImageUrl String?
  
  quantity        Int
  unitPrice       Decimal  @db.Decimal(19, 4)
  totalPrice      Decimal  @db.Decimal(19, 4)
  
  createdAt       DateTime @default(now())
  
  order           Order    @relation(fields: [orderId], references: [id], onDelete: Cascade)
  product         Product? @relation(fields: [productId], references: [id])
  
  @@index([orderId])
  @@map("order_items")
}

// ============================================================
// PAYMENTS & TRANSACTIONS
// ============================================================

model Transaction {
  id                String            @id @default(uuid())
  orderId           String?
  contractId        String?
  userId            String
  
  // Provider info
  providerId        String            // "chapa" | "santimpay" | "stripe" | "paypal"
  providerRef       String            // tx_ref / checkout id from provider
  
  // Amount
  amount            Decimal           @db.Decimal(19, 4)
  currency          String            // "ETB" | "USD" | ...
  fee               Decimal           @default(0) @db.Decimal(19, 4)
  
  // Status
  status            TransactionStatus @default(PENDING)
  
  // Type
  type              String            // "payment" | "refund" | "payout" | "deposit"
  
  // Audit
  rawWebhookPayload Json?             // Full webhook payload for dispute evidence
  
  // Timestamps
  createdAt         DateTime          @default(now())
  updatedAt         DateTime          @updatedAt
  
  order             Order?            @relation(fields: [orderId], references: [id])
  
  @@index([orderId])
  @@index([contractId])
  @@index([userId])
  @@index([providerId])
  @@index([status])
  @@index([providerRef])
  @@map("transactions")
}

model PaymentProviderConfig {
  id                String    @id @default(uuid())
  displayName       String
  isActive          Boolean   @default(true)
  supportedCurrencies String[]  // ["ETB"] or ["USD", "EUR"]
  secretsRef        String    // Pointer to secrets manager
  webhookPath       String?
  sortOrder         Int       @default(0)
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
  
  @@map("payment_provider_configs")
}

// ============================================================
// WALLET (Adbar Unit - AU)
// ============================================================

model Wallet {
  id        String   @id @default(uuid())
  userId    String   @unique
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  balances  WalletBalance[]
  
  @@map("wallets")
}

model WalletBalance {
  id        String            @id @default(uuid())
  walletId  String
  currency  String            // "ETB" | "USD" | ...
  type      WalletBalanceType @default(AVAILABLE)
  balance   Decimal           @default(0) @db.Decimal(19, 4)
  
  wallet    Wallet            @relation(fields: [walletId], references: [id], onDelete: Cascade)
  
  @@unique([walletId, currency, type])
  @@index([walletId])
  @@map("wallet_balances")
}

model WalletTransaction {
  id              String   @id @default(uuid())
  walletId        String
  balanceId       String
  
  type            String   // "credit" | "debit"
  amount          Decimal  @db.Decimal(19, 4)
  currency        String
  balanceBefore   Decimal  @db.Decimal(19, 4)
  balanceAfter    Decimal  @db.Decimal(19, 4)
  
  referenceType   String?  // "order" | "escrow" | "withdrawal" | "deposit"
  referenceId     String?
  
  description     String?
  
  createdAt       DateTime @default(now())
  
  @@index([walletId])
  @@index([createdAt])
  @@map("wallet_transactions")
}

model WithdrawalRequest {
  id              String   @id @default(uuid())
  userId          String
  walletId        String
  balanceId       String
  
  amount          Decimal  @db.Decimal(19, 4)
  currency        String
  providerId      String  // Must match currency-supported provider
  
  status          String   @default("pending") // "pending" | "processing" | "completed" | "failed" | "cancelled"
  
  bankName        String?
  bankAccountNumber String?
  bankAccountName String?
  
  processedAt     DateTime?
  failureReason   String?
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  @@index([userId])
  @@index([status])
  @@map("withdrawal_requests")
}

// ============================================================
// ESCROW
// ============================================================

model Escrow {
  id              String        @id @default(uuid())
  contractId      String        @unique
  
  amount          Decimal       @db.Decimal(19, 4)
  currency        String
  status          EscrowStatus  @default(PENDING)
  
  fundedAt        DateTime?
  releasedAt      DateTime?
  refundedAt      DateTime?
  
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
  
  milestones      EscrowMilestone[]
  
  @@index([contractId])
  @@index([status])
  @@map("escrows")
}

model EscrowMilestone {
  id              String          @id @default(uuid())
  escrowId        String
  milestoneIndex  Int
  title           String
  amount          Decimal         @db.Decimal(19, 4)
  status          MilestoneStatus @default(PENDING)
  
  fundedAt        DateTime?
  releasedAt      DateTime?
  
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt
  
  escrow          Escrow          @relation(fields: [escrowId], references: [id], onDelete: Cascade)
  
  @@index([escrowId])
  @@map("escrow_milestones")
}

// ============================================================
// FREELANCE MARKETPLACE
// ============================================================

model FreelancerProfile {
  id              String   @id @default(uuid())
  userId          String   @unique
  
  // Professional info
  headline        String?
  overview        String?
  hourlyRate      Decimal? @db.Decimal(19, 4)
  currency        String   @default("ETB")
  
  // Availability
  availability    String   @default("full_time") // "full_time" | "part_time" | "not_available"
  hoursPerWeek    Int?
  
  // Metrics
  completedJobs   Int      @default(0)
  totalEarnings   Decimal  @default(0) @db.Decimal(19, 4)
  averageRating   Decimal  @default(0) @db.Decimal(3, 2)
  reviewCount     Int      @default(0)
  responseTime    Int?     // Average response time in minutes
  
  // Timestamps
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  skills          FreelancerSkill[]
  experiences     FreelancerExperience[]
  educations      FreelancerEducation[]
  certifications  FreelancerCertification[]
  languages       FreelancerLanguage[]
  portfolioItems  PortfolioItem[]
  
  @@map("freelancer_profiles")
}

model Skill {
  id          String              @id @default(uuid())
  name        String              @unique
  slug        String              @unique
  category    String?
  freelancers FreelancerSkill[]
  jobs        JobSkill[]
  
  @@map("skills")
}

model FreelancerSkill {
  freelancerProfileId String
  skillId             String
  proficiency         Int?     // 1-5
  
  freelancerProfile   FreelancerProfile @relation(fields: [freelancerProfileId], references: [id], onDelete: Cascade)
  skill               Skill            @relation(fields: [skillId], references: [id], onDelete: Cascade)
  
  @@id([freelancerProfileId, skillId])
  @@map("freelancer_skills")
}

model FreelancerExperience {
  id                  String   @id @default(uuid())
  freelancerProfileId String
  title               String
  company             String
  location            String?
  startDate           DateTime
  endDate             DateTime?
  isCurrent           Boolean  @default(false)
  description         String?
  createdAt           DateTime @default(now())
  
  freelancerProfile   FreelancerProfile @relation(fields: [freelancerProfileId], references: [id], onDelete: Cascade)
  
  @@map("freelancer_experiences")
}

model FreelancerEducation {
  id                  String   @id @default(uuid())
  freelancerProfileId String
  institution         String
  degree              String
  fieldOfStudy        String?
  startDate           DateTime
  endDate             DateTime?
  description         String?
  createdAt           DateTime @default(now())
  
  freelancerProfile   FreelancerProfile @relation(fields: [freelancerProfileId], references: [id], onDelete: Cascade)
  
  @@map("freelancer_educations")
}

model FreelancerCertification {
  id                  String   @id @default(uuid())
  freelancerProfileId String
  name                String
  issuingOrganization String
  issueDate           DateTime
  expiryDate          DateTime?
  credentialId        String?
  credentialUrl       String?
  createdAt           DateTime @default(now())
  
  freelancerProfile   FreelancerProfile @relation(fields: [freelancerProfileId], references: [id], onDelete: Cascade)
  
  @@map("freelancer_certifications")
}

model FreelancerLanguage {
  id                  String   @id @default(uuid())
  freelancerProfileId String
  language            String
  proficiency         String   // "basic" | "conversational" | "fluent" | "native"
  createdAt           DateTime @default(now())
  
  freelancerProfile   FreelancerProfile @relation(fields: [freelancerProfileId], references: [id], onDelete: Cascade)
  
  @@id([freelancerProfileId, language])
  @@map("freelancer_languages")
}

model PortfolioItem {
  id                  String   @id @default(uuid())
  freelancerProfileId String
  title               String
  description         String?
  imageUrl            String?
  videoUrl            String?
  documentUrl         String?
  externalUrl         String?
  sortOrder           Int      @default(0)
  createdAt           DateTime @default(now())
  
  freelancerProfile   FreelancerProfile @relation(fields: [freelancerProfileId], references: [id], onDelete: Cascade)
  
  @@map("portfolio_items")
}

// ============================================================
// JOBS & PROPOSALS
// ============================================================

model Job {
  id              String      @id @default(uuid())
  clientId        String
  
  title           String
  description     String
  type            JobType     @default(FIXED_PRICE)
  
  // Budget
  budgetMin       Decimal?    @db.Decimal(19, 4)
  budgetMax       Decimal?    @db.Decimal(19, 4)
  hourlyRate      Decimal?    @db.Decimal(19, 4)
  currency        String      @default("ETB")
  
  // Requirements
  experienceLevel String?     // "entry" | "intermediate" | "expert"
  duration        String?     // "less_than_1_month" | "1_to_3_months" | etc.
  
  // Status
  status          JobStatus   @default(DRAFT)
  
  // Deadline
  deadline        DateTime?
  
  // Metrics
  proposalCount   Int         @default(0)
  viewCount       Int         @default(0)
  
  // Timestamps
  publishedAt     DateTime?
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt
  
  client          User        @relation("ClientJobs", fields: [clientId], references: [id])
  skills          JobSkill[]
  attachments     JobAttachment[]
  proposals       Proposal[]
  contract        Contract?
  
  @@index([clientId])
  @@index([status])
  @@map("jobs")
}

model JobSkill {
  jobId     String
  skillId   String
  
  job       Job    @relation(fields: [jobId], references: [id], onDelete: Cascade)
  skill     Skill  @relation(fields: [skillId], references: [id], onDelete: Cascade)
  
  @@id([jobId, skillId])
  @@map("job_skills")
}

model JobAttachment {
  id        String   @id @default(uuid())
  jobId     String
  fileName  String
  fileUrl   String
  fileType  String
  fileSize  Int
  createdAt DateTime @default(now())
  
  job       Job      @relation(fields: [jobId], references: [id], onDelete: Cascade)
  
  @@map("job_attachments")
}

model Proposal {
  id              String          @id @default(uuid())
  jobId           String
  freelancerId    String
  
  coverLetter     String
  proposedAmount  Decimal         @db.Decimal(19, 4)
  currency        String          @default("ETB")
  estimatedDays   Int?
  
  // Milestone breakdown
  milestoneBreakdown Json?        // [{ title, amount, days }]
  
  status          ProposalStatus  @default(PENDING)
  
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt
  
  job             Job             @relation(fields: [jobId], references: [id], onDelete: Cascade)
  freelancer      User            @relation(fields: [freelancerId], references: [id])
  attachments     ProposalAttachment[]
  
  @@index([jobId])
  @@index([freelancerId])
  @@map("proposals")
}

model ProposalAttachment {
  id          String   @id @default(uuid())
  proposalId  String
  fileName    String
  fileUrl     String
  fileType    String
  fileSize    Int
  createdAt   DateTime @default(now())
  
  proposal    Proposal @relation(fields: [proposalId], references: [id], onDelete: Cascade)
  
  @@map("proposal_attachments")
}

// ============================================================
// CONTRACTS & MILESTONES
// ============================================================

model Contract {
  id              String          @id @default(uuid())
  jobId           String          @unique
  freelancerId    String
  clientId        String
  proposalId      String?         @unique
  
  title           String
  description     String?
  
  // Terms
  totalAmount     Decimal         @db.Decimal(19, 4)
  currency        String
  type            JobType
  
  // Status
  status          ContractStatus  @default(DRAFT)
  
  // Signatures
  clientSignedAt  DateTime?
  freelancerSignedAt DateTime?
  
  // Dates
  startDate       DateTime?
  endDate         DateTime?
  completedAt     DateTime?
  
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt
  
  job             Job             @relation(fields: [jobId], references: [id])
  freelancer      User            @relation("FreelancerContracts", fields: [freelancerId], references: [id])
  client          User            @relation("ClientContracts", fields: [clientId], references: [id])
  milestones      Milestone[]
  escrow          Escrow?
  dispute         Dispute?
  
  @@index([freelancerId])
  @@index([clientId])
  @@map("contracts")
}

model Milestone {
  id              String          @id @default(uuid())
  contractId      String
  
  title           String
  description     String?
  amount          Decimal         @db.Decimal(19, 4)
  dueDate         DateTime?
  
  status          MilestoneStatus @default(PENDING)
  
  // Deliverables
  deliverables    Json?           // [{ title, description, fileUrl }]
  
  // Approval
  submittedAt     DateTime?
  approvedAt      DateTime?
  rejectedAt      DateTime?
  rejectionReason String?
  
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt
  
  contract        Contract        @relation(fields: [contractId], references: [id], onDelete: Cascade)
  
  @@index([contractId])
  @@map("milestones")
}

// ============================================================
// MESSAGING
// ============================================================

model Conversation {
  id              String   @id @default(uuid())
  type            String   @default("direct") // "direct" | "group"
  title           String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  participants    ConversationParticipant[]
  messages        Message[]
  
  @@map("conversations")
}

model ConversationParticipant {
  id              String   @id @default(uuid())
  conversationId  String
  userId          String
  role            String   @default("member") // "admin" | "member"
  lastReadAt      DateTime?
  joinedAt        DateTime @default(now())
  
  conversation    Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  
  @@unique([conversationId, userId])
  @@map("conversation_participants")
}

model Message {
  id              String      @id @default(uuid())
  conversationId  String
  senderId        String
  
  type            MessageType @default(TEXT)
  content         String?
  
  // File attachments
  fileUrl         String?
  fileName        String?
  fileType        String?
  fileSize        Int?
  
  // Status
  isRead          Boolean     @default(false)
  readAt          DateTime?
  
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt
  
  conversation    Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  sender          User         @relation("SentMessages", fields: [senderId], references: [id])
  
  @@index([conversationId])
  @@index([senderId])
  @@map("messages")
}

// ============================================================
// REVIEWS
// ============================================================

model Review {
  id              String   @id @default(uuid())
  reviewerId      String
  targetId        String   // Can be userId, productId, or storeId
  
  // Review target type
  targetType      String   // "product" | "seller" | "freelancer" | "client" | "store"
  
  rating          Int      // 1-5
  title           String?
  comment         String?
  
  // For product reviews
  isVerifiedPurchase Boolean @default(false)
  
  // Moderation
  isVisible       Boolean  @default(true)
  moderatedAt     DateTime?
  moderationNote  String?
  
  // Response
  response        String?
  respondedAt     DateTime?
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  reviewer        User     @relation("ReviewerReviews", fields: [reviewerId], references: [id])
  
  @@index([targetId])
  @@index([reviewerId])
  @@map("reviews")
}

// ============================================================
// DISPUTES
// ============================================================

model Dispute {
  id              String             @id @default(uuid())
  reporterId      String
  
  // Target
  orderId         String?            @unique
  contractId      String?            @unique
  
  type            String             // "product" | "service"
  reason          String
  description     String
  evidenceUrls    String[]
  
  status          DisputeStatus      @default(OPEN)
  resolution      DisputeResolution?
  resolutionNote  String?
  resolvedAt      DateTime?
  resolvedBy      String?            // Moderator/Admin userId
  
  createdAt       DateTime           @default(now())
  updatedAt       DateTime           @updatedAt
  
  reporter        User               @relation("ReporterDisputes", fields: [reporterId], references: [id])
  order           Order?             @relation(fields: [orderId], references: [id])
  contract        Contract?          @relation(fields: [contractId], references: [id])
  
  @@index([reporterId])
  @@index([status])
  @@map("disputes")
}

// ============================================================
// NOTIFICATIONS
// ============================================================

model Notification {
  id              String           @id @default(uuid())
  userId          String
  
  type            NotificationType
  title           String
  body            String
  data            Json?            // Additional payload
  
  // Status
  isRead          Boolean          @default(false)
  readAt          DateTime?
  
  // Channels sent
  sentViaEmail    Boolean          @default(false)
  sentViaSms      Boolean          @default(false)
  sentViaPush     Boolean          @default(false)
  sentViaInApp    Boolean          @default(false)
  
  createdAt       DateTime         @default(now())
  
  user            User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@index([userId])
  @@index([isRead])
  @@map("notifications")
}

// ============================================================
// WISHLIST & RECENTLY VIEWED
// ============================================================

model WishlistItem {
  id        String   @id @default(uuid())
  userId    String
  productId String
  createdAt DateTime @default(now())
  
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  product   Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  
  @@unique([userId, productId])
  @@map("wishlist_items")
}

model RecentlyViewed {
  id        String   @id @default(uuid())
  userId    String
  productId String
  viewedAt  DateTime @default(now())
  
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  product   Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  
  @@index([userId])
  @@map("recently_viewed")
}

// ============================================================
// SUPPORT TICKETS
// ============================================================

model SupportTicket {
  id              String   @id @default(uuid())
  userId          String
  subject         String
  description     String
  category        String
  priority        String   @default("medium") // "low" | "medium" | "high" | "urgent"
  status          String   @default("open")   // "open" | "in_progress" | "resolved" | "closed"
  assignedTo      String?
  resolution      String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  user            User     @relation(fields: [userId], references: [id])
  responses       SupportTicketResponse[]
  
  @@index([userId])
  @@index([status])
  @@map("support_tickets")
}

model SupportTicketResponse {
  id              String       @id @default(uuid())
  ticketId        String
  responderId     String
  message         String
  isInternal      Boolean      @default(false)
  createdAt       DateTime     @default(now())
  
  ticket          SupportTicket @relation(fields: [ticketId], references: [id], onDelete: Cascade)
  
  @@map("support_ticket_responses")
}

// ============================================================
// AUDIT LOG
// ============================================================

model AuditLog {
  id              String   @id @default(uuid())
  userId          String?
  action          String
  entityType      String
  entityId        String
  oldValue        Json?
  newValue        Json?
  ipAddress       String?
  userAgent       String?
  createdAt       DateTime @default(now())
  
  @@index([userId])
  @@index([entityType, entityId])
  @@index([createdAt])
  @@map("audit_logs")
}

// ============================================================
// USSD SESSIONS
// ============================================================

model UssdSession {
  id              String   @id @default(uuid())
  sessionId       String   @unique  // Telecom-provided session ID
  phoneNumber     String
  userId          String?
  serviceCode     String
  text            String           // Full USSD input string
  response        String?
  status          String   @default("active") // "active" | "completed" | "expired"
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  @@index([phoneNumber])
  @@index([sessionId])
  @@map("ussd_sessions")
}
```

---

## 3. Database Indexes Summary

| Table | Index Type | Columns | Purpose |
|-------|-----------|---------|---------|
| users | B-tree | email | Login lookup |
| users | B-tree | phone | Phone login |
| users | B-tree | kycLevel | Verification queries |
| products | B-tree | storeId | Store catalog |
| products | B-tree | categoryId | Category browsing |
| products | B-tree | status | Active products |
| products | B-tree | price | Price range queries |
| orders | B-tree | buyerId | Buyer order history |
| orders | B-tree | sellerId | Seller order management |
| orders | B-tree | status | Order status filtering |
| transactions | B-tree | userId | User transaction history |
| transactions | B-tree | providerId | Provider analytics |
| wallet_balances | Unique | walletId+currency+type | Balance lookup |
| messages | B-tree | conversationId | Chat history |
| reviews | B-tree | targetId | Target reviews |
| notifications | B-tree | userId+isRead | Unread notifications |
| audit_logs | B-tree | createdAt | Audit trail queries |

---

## 4. Partitioning Strategy

| Table | Partition Key | Strategy | Reason |
|-------|--------------|----------|--------|
| orders | created_at | Monthly | Time-series data, archival |
| transactions | created_at | Monthly | Time-series data, compliance |
| messages | created_at | Monthly | High volume, archival |
| notifications | created_at | Monthly | High volume, TTL |
| audit_logs | created_at | Monthly | Compliance, archival |
| wallet_transactions | created_at | Monthly | Financial records |
| ussd_sessions | created_at | Weekly | High volume, short TTL |
