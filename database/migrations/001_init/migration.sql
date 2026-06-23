-- database/migrations/001_init/migration.sql
-- Adbar (አድባር) — Initial PostgreSQL Migration
-- Version: 1.0.0
-- Date: 2026-06-21
-- Complete DDL for all tables, enums, indexes, and constraints

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE "Role" AS ENUM (
  'BUYER',
  'SELLER',
  'FREELANCER',
  'CLIENT',
  'MODERATOR',
  'COMPLIANCE_OFFICER',
  'ADMIN',
  'SUPER_ADMIN'
);

CREATE TYPE "KycLevel" AS ENUM (
  'LEVEL_1',
  'LEVEL_2',
  'LEVEL_3'
);

CREATE TYPE "VerificationStatus" AS ENUM (
  'PENDING',
  'VERIFIED',
  'REJECTED',
  'EXPIRED'
);

CREATE TYPE "StoreStatus" AS ENUM (
  'PENDING_VERIFICATION',
  'ACTIVE',
  'SUSPENDED',
  'CLOSED'
);

CREATE TYPE "ProductStatus" AS ENUM (
  'DRAFT',
  'ACTIVE',
  'INACTIVE',
  'OUT_OF_STOCK',
  'ARCHIVED'
);

CREATE TYPE "ProductType" AS ENUM (
  'PHYSICAL',
  'DIGITAL',
  'BUNDLE'
);

CREATE TYPE "OrderStatus" AS ENUM (
  'PENDING',
  'PAID',
  'PROCESSING',
  'PACKED',
  'SHIPPED',
  'DELIVERED',
  'RETURNED',
  'REFUNDED',
  'CANCELLED'
);

CREATE TYPE "TransactionStatus" AS ENUM (
  'PENDING',
  'SUCCESS',
  'FAILED',
  'REFUNDED',
  'EXPIRED'
);

CREATE TYPE "EscrowStatus" AS ENUM (
  'PENDING',
  'FUNDED',
  'RELEASED',
  'REFUNDED',
  'FROZEN',
  'DISPUTED'
);

CREATE TYPE "ContractStatus" AS ENUM (
  'DRAFT',
  'PENDING_SIGNATURE',
  'ACTIVE',
  'COMPLETED',
  'CANCELLED',
  'DISPUTED'
);

CREATE TYPE "JobStatus" AS ENUM (
  'DRAFT',
  'OPEN',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
  'CLOSED'
);

CREATE TYPE "JobType" AS ENUM (
  'FIXED_PRICE',
  'HOURLY',
  'MILESTONE_BASED',
  'RETAINER'
);

CREATE TYPE "ProposalStatus" AS ENUM (
  'PENDING',
  'ACCEPTED',
  'REJECTED',
  'WITHDRAWN'
);

CREATE TYPE "MilestoneStatus" AS ENUM (
  'PENDING',
  'IN_PROGRESS',
  'SUBMITTED',
  'APPROVED',
  'REJECTED',
  'PAID'
);

CREATE TYPE "DisputeStatus" AS ENUM (
  'OPEN',
  'UNDER_REVIEW',
  'MEDIATING',
  'RESOLVED',
  'ESCALATED',
  'CLOSED'
);

CREATE TYPE "DisputeResolution" AS ENUM (
  'REFUND_BUYER',
  'PAY_SELLER',
  'PARTIAL_REFUND',
  'NO_ACTION'
);

CREATE TYPE "MessageType" AS ENUM (
  'TEXT',
  'IMAGE',
  'FILE',
  'SYSTEM'
);

CREATE TYPE "NotificationType" AS ENUM (
  'EMAIL',
  'SMS',
  'PUSH',
  'IN_APP'
);

CREATE TYPE "WalletBalanceType" AS ENUM (
  'AVAILABLE',
  'PENDING',
  'FROZEN'
);

-- ============================================================
-- USER & AUTH
-- ============================================================

CREATE TABLE "users" (
  "id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "email"           VARCHAR(255) NOT NULL UNIQUE,
  "phone"           VARCHAR(20) UNIQUE,
  "passwordHash"    VARCHAR(255) NOT NULL,
  "firstName"       VARCHAR(100) NOT NULL,
  "lastName"        VARCHAR(100) NOT NULL,
  "avatarUrl"       TEXT,
  "bio"             TEXT,
  "dateOfBirth"     TIMESTAMPTZ,
  "gender"          VARCHAR(20),
  "country"         VARCHAR(100),
  "city"            VARCHAR(100),
  "address"         TEXT,
  "postalCode"      VARCHAR(20),
  "emailVerified"   BOOLEAN NOT NULL DEFAULT false,
  "phoneVerified"   BOOLEAN NOT NULL DEFAULT false,
  "kycLevel"        "KycLevel" NOT NULL DEFAULT 'LEVEL_1',
  "language"        VARCHAR(10) NOT NULL DEFAULT 'en',
  "currency"        VARCHAR(10) NOT NULL DEFAULT 'ETB',
  "dataSaverMode"   BOOLEAN NOT NULL DEFAULT false,
  "mfaEnabled"      BOOLEAN NOT NULL DEFAULT false,
  "mfaSecret"       VARCHAR(255),
  "lastLoginAt"     TIMESTAMPTZ,
  "failedLoginCount" INTEGER NOT NULL DEFAULT 0,
  "lockedUntil"     TIMESTAMPTZ,
  "createdAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "deletedAt"       TIMESTAMPTZ
);

CREATE INDEX "users_email_idx" ON "users" ("email");
CREATE INDEX "users_phone_idx" ON "users" ("phone");
CREATE INDEX "users_kycLevel_idx" ON "users" ("kycLevel");

CREATE TABLE "user_roles" (
  "id"        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId"    UUID NOT NULL,
  "role"      "Role" NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "user_roles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE,
  CONSTRAINT "user_roles_userId_role_unique" UNIQUE ("userId", "role")
);

CREATE TABLE "sessions" (
  "id"                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId"            UUID NOT NULL,
  "token"             VARCHAR(500) NOT NULL UNIQUE,
  "refreshToken"      VARCHAR(500) UNIQUE,
  "ipAddress"         INET,
  "userAgent"         TEXT,
  "deviceFingerprint" VARCHAR(255),
  "expiresAt"         TIMESTAMPTZ NOT NULL,
  "createdAt"         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE
);

CREATE INDEX "sessions_token_idx" ON "sessions" ("token");
CREATE INDEX "sessions_userId_idx" ON "sessions" ("userId");

-- ============================================================
-- IDENTITY VERIFICATION (KYC)
-- ============================================================

CREATE TABLE "identity_verifications" (
  "id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId"          UUID NOT NULL,
  "providerId"      VARCHAR(50) NOT NULL,
  "idType"          VARCHAR(50) NOT NULL,
  "idNumber"        VARCHAR(100),
  "idDocumentUrl"   TEXT,
  "selfieUrl"       TEXT,
  "status"          "VerificationStatus" NOT NULL DEFAULT 'PENDING',
  "verifiedAt"      TIMESTAMPTZ,
  "rejectionReason" TEXT,
  "rawResponse"     JSONB,
  "createdAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "identity_verifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE
);

CREATE INDEX "identity_verifications_userId_idx" ON "identity_verifications" ("userId");
CREATE INDEX "identity_verifications_status_idx" ON "identity_verifications" ("status");

-- ============================================================
-- STORE (SELLER)
-- ============================================================

CREATE TABLE "stores" (
  "id"                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId"            UUID NOT NULL UNIQUE,
  "name"              VARCHAR(255) NOT NULL,
  "slug"              VARCHAR(255) NOT NULL UNIQUE,
  "description"       TEXT,
  "logoUrl"           TEXT,
  "bannerUrl"         TEXT,
  "status"            "StoreStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION',
  "businessName"      VARCHAR(255),
  "businessRegNumber" VARCHAR(100),
  "taxId"             VARCHAR(100),
  "email"             VARCHAR(255),
  "phone"             VARCHAR(20),
  "website"           TEXT,
  "country"           VARCHAR(100),
  "city"              VARCHAR(100),
  "address"           TEXT,
  "autoConfirmOrders" BOOLEAN NOT NULL DEFAULT false,
  "returnPolicy"      TEXT,
  "totalSales"        INTEGER NOT NULL DEFAULT 0,
  "totalRevenue"      DECIMAL(19,4) NOT NULL DEFAULT 0,
  "averageRating"     DECIMAL(3,2) NOT NULL DEFAULT 0,
  "reviewCount"       INTEGER NOT NULL DEFAULT 0,
  "createdAt"         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "stores_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE
);

CREATE INDEX "stores_slug_idx" ON "stores" ("slug");
CREATE INDEX "stores_status_idx" ON "stores" ("status");

CREATE TABLE "followed_stores" (
  "id"        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId"    UUID NOT NULL,
  "storeId"   UUID NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "followed_stores_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE,
  CONSTRAINT "followed_stores_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores" ("id") ON DELETE CASCADE,
  CONSTRAINT "followed_stores_userId_storeId_unique" UNIQUE ("userId", "storeId")
);

-- ============================================================
-- PRODUCT CATALOG
-- ============================================================

CREATE TABLE "categories" (
  "id"          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "parentId"    UUID,
  "name"        VARCHAR(255) NOT NULL,
  "slug"        VARCHAR(255) NOT NULL UNIQUE,
  "description" TEXT,
  "imageUrl"    TEXT,
  "sortOrder"   INTEGER NOT NULL DEFAULT 0,
  "isActive"    BOOLEAN NOT NULL DEFAULT true,
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "categories_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "categories" ("id") ON DELETE SET NULL
);

CREATE INDEX "categories_slug_idx" ON "categories" ("slug");
CREATE INDEX "categories_parentId_idx" ON "categories" ("parentId");

CREATE TABLE "products" (
  "id"                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "storeId"           UUID NOT NULL,
  "categoryId"        UUID,
  "name"              VARCHAR(500) NOT NULL,
  "slug"              VARCHAR(500) NOT NULL UNIQUE,
  "description"       TEXT,
  "shortDescription"  VARCHAR(500),
  "type"              "ProductType" NOT NULL DEFAULT 'PHYSICAL',
  "status"            "ProductStatus" NOT NULL DEFAULT 'DRAFT',
  "price"             DECIMAL(19,4) NOT NULL,
  "compareAtPrice"    DECIMAL(19,4),
  "currency"          VARCHAR(10) NOT NULL DEFAULT 'ETB',
  "sku"               VARCHAR(100) UNIQUE,
  "barcode"           VARCHAR(100),
  "quantity"          INTEGER NOT NULL DEFAULT 0,
  "lowStockThreshold" INTEGER NOT NULL DEFAULT 5,
  "trackInventory"    BOOLEAN NOT NULL DEFAULT true,
  "weight"            DECIMAL(10,2),
  "length"            DECIMAL(10,2),
  "width"             DECIMAL(10,2),
  "height"            DECIMAL(10,2),
  "freeShipping"      BOOLEAN NOT NULL DEFAULT false,
  "downloadUrl"       TEXT,
  "downloadLimit"     INTEGER,
  "metaTitle"         VARCHAR(255),
  "metaDescription"   VARCHAR(500),
  "viewCount"         INTEGER NOT NULL DEFAULT 0,
  "salesCount"        INTEGER NOT NULL DEFAULT 0,
  "averageRating"     DECIMAL(3,2) NOT NULL DEFAULT 0,
  "reviewCount"       INTEGER NOT NULL DEFAULT 0,
  "createdAt"         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "products_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores" ("id") ON DELETE CASCADE,
  CONSTRAINT "products_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories" ("id") ON DELETE SET NULL
);

CREATE INDEX "products_storeId_idx" ON "products" ("storeId");
CREATE INDEX "products_categoryId_idx" ON "products" ("categoryId");
CREATE INDEX "products_status_idx" ON "products" ("status");
CREATE INDEX "products_slug_idx" ON "products" ("slug");
CREATE INDEX "products_price_idx" ON "products" ("price");

CREATE TABLE "product_variants" (
  "id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "productId"       UUID NOT NULL,
  "name"            VARCHAR(255) NOT NULL,
  "sku"             VARCHAR(100) UNIQUE,
  "price"           DECIMAL(19,4) NOT NULL,
  "compareAtPrice"  DECIMAL(19,4),
  "quantity"        INTEGER NOT NULL DEFAULT 0,
  "imageUrl"        TEXT,
  "sortOrder"       INTEGER NOT NULL DEFAULT 0,
  "createdAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "product_variants_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products" ("id") ON DELETE CASCADE
);

CREATE INDEX "product_variants_productId_idx" ON "product_variants" ("productId");

CREATE TABLE "product_variant_options" (
  "id"        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "variantId" UUID NOT NULL,
  "name"      VARCHAR(100) NOT NULL,
  "value"     VARCHAR(100) NOT NULL,
  CONSTRAINT "product_variant_options_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "product_variants" ("id") ON DELETE CASCADE
);

CREATE INDEX "product_variant_options_variantId_idx" ON "product_variant_options" ("variantId");

CREATE TABLE "product_images" (
  "id"        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "productId" UUID NOT NULL,
  "url"       TEXT NOT NULL,
  "altText"   VARCHAR(255),
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isPrimary" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "product_images_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products" ("id") ON DELETE CASCADE
);

CREATE INDEX "product_images_productId_idx" ON "product_images" ("productId");

CREATE TABLE "product_videos" (
  "id"            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "productId"     UUID NOT NULL,
  "url"           TEXT NOT NULL,
  "thumbnailUrl"  TEXT,
  "title"         VARCHAR(255),
  "sortOrder"     INTEGER NOT NULL DEFAULT 0,
  "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "product_videos_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products" ("id") ON DELETE CASCADE
);

CREATE INDEX "product_videos_productId_idx" ON "product_videos" ("productId");

CREATE TABLE "product_documents" (
  "id"        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "productId" UUID NOT NULL,
  "url"       TEXT NOT NULL,
  "name"      VARCHAR(255) NOT NULL,
  "fileType"  VARCHAR(50) NOT NULL,
  "fileSize"  INTEGER NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "product_documents_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products" ("id") ON DELETE CASCADE
);

CREATE INDEX "product_documents_productId_idx" ON "product_documents" ("productId");

CREATE TABLE "tags" (
  "id"   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" VARCHAR(100) NOT NULL UNIQUE,
  "slug" VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE "product_tags" (
  "productId" UUID NOT NULL,
  "tagId"     UUID NOT NULL,
  PRIMARY KEY ("productId", "tagId"),
  CONSTRAINT "product_tags_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products" ("id") ON DELETE CASCADE,
  CONSTRAINT "product_tags_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "tags" ("id") ON DELETE CASCADE
);

-- ============================================================
-- COUPONS & PROMOTIONS
-- ============================================================

CREATE TABLE "coupons" (
  "id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "storeId"         UUID,
  "productId"       UUID,
  "code"            VARCHAR(100) NOT NULL UNIQUE,
  "description"     TEXT,
  "discountType"    VARCHAR(20) NOT NULL,
  "discountValue"   DECIMAL(19,4) NOT NULL,
  "minOrderAmount"  DECIMAL(19,4),
  "maxDiscount"     DECIMAL(19,4),
  "usageLimit"      INTEGER,
  "usageCount"      INTEGER NOT NULL DEFAULT 0,
  "perUserLimit"    INTEGER NOT NULL DEFAULT 1,
  "startsAt"        TIMESTAMPTZ,
  "expiresAt"       TIMESTAMPTZ,
  "isActive"        BOOLEAN NOT NULL DEFAULT true,
  "createdAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "coupons_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores" ("id") ON DELETE SET NULL,
  CONSTRAINT "coupons_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products" ("id") ON DELETE SET NULL
);

CREATE INDEX "coupons_code_idx" ON "coupons" ("code");

-- ============================================================
-- ORDERS
-- ============================================================

CREATE TABLE "orders" (
  "id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "orderNumber"     VARCHAR(50) NOT NULL UNIQUE,
  "buyerId"         UUID NOT NULL,
  "sellerId"        UUID NOT NULL,
  "status"          "OrderStatus" NOT NULL DEFAULT 'PENDING',
  "subtotal"        DECIMAL(19,4) NOT NULL,
  "shippingCost"    DECIMAL(19,4) NOT NULL DEFAULT 0,
  "taxAmount"       DECIMAL(19,4) NOT NULL DEFAULT 0,
  "discountAmount"  DECIMAL(19,4) NOT NULL DEFAULT 0,
  "total"           DECIMAL(19,4) NOT NULL,
  "currency"        VARCHAR(10) NOT NULL DEFAULT 'ETB',
  "shippingAddress" JSONB,
  "shippingMethod"  VARCHAR(100),
  "trackingNumber"  VARCHAR(100),
  "shippedAt"       TIMESTAMPTZ,
  "deliveredAt"     TIMESTAMPTZ,
  "buyerNote"       TEXT,
  "sellerNote"      TEXT,
  "createdAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "orders_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "users" ("id"),
  CONSTRAINT "orders_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "users" ("id")
);

CREATE INDEX "orders_buyerId_idx" ON "orders" ("buyerId");
CREATE INDEX "orders_sellerId_idx" ON "orders" ("sellerId");
CREATE INDEX "orders_status_idx" ON "orders" ("status");
CREATE INDEX "orders_orderNumber_idx" ON "orders" ("orderNumber");

CREATE TABLE "order_items" (
  "id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "orderId"         UUID NOT NULL,
  "productId"       UUID,
  "variantId"       UUID,
  "productName"     VARCHAR(500) NOT NULL,
  "productSku"      VARCHAR(100),
  "variantName"     VARCHAR(255),
  "productImageUrl" TEXT,
  "quantity"        INTEGER NOT NULL,
  "unitPrice"       DECIMAL(19,4) NOT NULL,
  "totalPrice"      DECIMAL(19,4) NOT NULL,
  "createdAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders" ("id") ON DELETE CASCADE,
  CONSTRAINT "order_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products" ("id") ON DELETE SET NULL
);

CREATE INDEX "order_items_orderId_idx" ON "order_items" ("orderId");

-- ============================================================
-- PAYMENTS & TRANSACTIONS
-- ============================================================

CREATE TABLE "transactions" (
  "id"                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "orderId"           UUID,
  "contractId"        UUID,
  "userId"            UUID NOT NULL,
  "providerId"        VARCHAR(50) NOT NULL,
  "providerRef"       VARCHAR(255) NOT NULL,
  "amount"            DECIMAL(19,4) NOT NULL,
  "currency"          VARCHAR(10) NOT NULL,
  "fee"               DECIMAL(19,4) NOT NULL DEFAULT 0,
  "status"            "TransactionStatus" NOT NULL DEFAULT 'PENDING',
  "type"              VARCHAR(20) NOT NULL,
  "rawWebhookPayload" JSONB,
  "createdAt"         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "transactions_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders" ("id") ON DELETE SET NULL,
  CONSTRAINT "transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id")
);

CREATE INDEX "transactions_orderId_idx" ON "transactions" ("orderId");
CREATE INDEX "transactions_contractId_idx" ON "transactions" ("contractId");
CREATE INDEX "transactions_userId_idx" ON "transactions" ("userId");
CREATE INDEX "transactions_providerId_idx" ON "transactions" ("providerId");
CREATE INDEX "transactions_status_idx" ON "transactions" ("status");
CREATE INDEX "transactions_providerRef_idx" ON "transactions" ("providerRef");

CREATE TABLE "payment_provider_configs" (
  "id"                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "displayName"         VARCHAR(255) NOT NULL,
  "isActive"            BOOLEAN NOT NULL DEFAULT true,
  "supportedCurrencies" TEXT[] NOT NULL DEFAULT '{}',
  "secretsRef"          VARCHAR(255) NOT NULL,
  "webhookPath"         VARCHAR(255),
  "sortOrder"           INTEGER NOT NULL DEFAULT 0,
  "createdAt"           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- WALLET (Adbar Unit - AU)
-- ============================================================

CREATE TABLE "wallets" (
  "id"        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId"    UUID NOT NULL UNIQUE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "wallets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE
);

CREATE TABLE "wallet_balances" (
  "id"       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "walletId" UUID NOT NULL,
  "currency" VARCHAR(10) NOT NULL,
  "type"     "WalletBalanceType" NOT NULL DEFAULT 'AVAILABLE',
  "balance"  DECIMAL(19,4) NOT NULL DEFAULT 0,
  CONSTRAINT "wallet_balances_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "wallets" ("id") ON DELETE CASCADE,
  CONSTRAINT "wallet_balances_walletId_currency_type_unique" UNIQUE ("walletId", "currency", "type")
);

CREATE INDEX "wallet_balances_walletId_idx" ON "wallet_balances" ("walletId");

CREATE TABLE "wallet_transactions" (
  "id"            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "walletId"      UUID NOT NULL,
  "balanceId"     UUID NOT NULL,
  "type"          VARCHAR(10) NOT NULL,
  "amount"        DECIMAL(19,4) NOT NULL,
  "currency"      VARCHAR(10) NOT NULL,
  "balanceBefore" DECIMAL(19,4) NOT NULL,
  "balanceAfter"  DECIMAL(19,4) NOT NULL,
  "referenceType" VARCHAR(50),
  "referenceId"   UUID,
  "description"   TEXT,
  "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "wallet_transactions_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "wallets" ("id") ON DELETE CASCADE
);

CREATE INDEX "wallet_transactions_walletId_idx" ON "wallet_transactions" ("walletId");
CREATE INDEX "wallet_transactions_createdAt_idx" ON "wallet_transactions" ("createdAt");

CREATE TABLE "withdrawal_requests" (
  "id"                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId"            UUID NOT NULL,
  "walletId"          UUID NOT NULL,
  "balanceId"         UUID NOT NULL,
  "amount"            DECIMAL(19,4) NOT NULL,
  "currency"          VARCHAR(10) NOT NULL,
  "providerId"        VARCHAR(50) NOT NULL,
  "status"            VARCHAR(20) NOT NULL DEFAULT 'pending',
  "bankName"          VARCHAR(255),
  "bankAccountNumber" VARCHAR(50),
  "bankAccountName"   VARCHAR(255),
  "processedAt"       TIMESTAMPTZ,
  "failureReason"     TEXT,
  "createdAt"         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "withdrawal_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id")
);

CREATE INDEX "withdrawal_requests_userId_idx" ON "withdrawal_requests" ("userId");
CREATE INDEX "withdrawal_requests_status_idx" ON "withdrawal_requests" ("status");

-- ============================================================
-- ESCROW
-- ============================================================

CREATE TABLE "escrows" (
  "id"         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "contractId" UUID NOT NULL UNIQUE,
  "amount"     DECIMAL(19,4) NOT NULL,
  "currency"   VARCHAR(10) NOT NULL,
  "status"     "EscrowStatus" NOT NULL DEFAULT 'PENDING',
  "fundedAt"   TIMESTAMPTZ,
  "releasedAt" TIMESTAMPTZ,
  "refundedAt" TIMESTAMPTZ,
  "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX "escrows_contractId_idx" ON "escrows" ("contractId");
CREATE INDEX "escrows_status_idx" ON "escrows" ("status");

CREATE TABLE "escrow_milestones" (
  "id"             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "escrowId"       UUID NOT NULL,
  "milestoneIndex" INTEGER NOT NULL,
  "title"          VARCHAR(255) NOT NULL,
  "amount"         DECIMAL(19,4) NOT NULL,
  "status"         "MilestoneStatus" NOT NULL DEFAULT 'PENDING',
  "fundedAt"       TIMESTAMPTZ,
  "releasedAt"     TIMESTAMPTZ,
  "createdAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "escrow_milestones_escrowId_fkey" FOREIGN KEY ("escrowId") REFERENCES "escrows" ("id") ON DELETE CASCADE
);

CREATE INDEX "escrow_milestones_escrowId_idx" ON "escrow_milestones" ("escrowId");

-- ============================================================
-- FREELANCE MARKETPLACE
-- ============================================================

CREATE TABLE "freelancer_profiles" (
  "id"            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId"        UUID NOT NULL UNIQUE,
  "headline"      VARCHAR(255),
  "overview"      TEXT,
  "hourlyRate"    DECIMAL(19,4),
  "currency"      VARCHAR(10) NOT NULL DEFAULT 'ETB',
  "availability"  VARCHAR(20) NOT NULL DEFAULT 'full_time',
  "hoursPerWeek"  INTEGER,
  "completedJobs" INTEGER NOT NULL DEFAULT 0,
  "totalEarnings" DECIMAL(19,4) NOT NULL DEFAULT 0,
  "averageRating" DECIMAL(3,2) NOT NULL DEFAULT 0,
  "reviewCount"   INTEGER NOT NULL DEFAULT 0,
  "responseTime"  INTEGER,
  "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "freelancer_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE
);

CREATE TABLE "skills" (
  "id"       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "name"     VARCHAR(100) NOT NULL UNIQUE,
  "slug"     VARCHAR(100) NOT NULL UNIQUE,
  "category" VARCHAR(100)
);

CREATE TABLE "freelancer_skills" (
  "freelancerProfileId" UUID NOT NULL,
  "skillId"             UUID NOT NULL,
  "proficiency"         INTEGER,
  PRIMARY KEY ("freelancerProfileId", "skillId"),
  CONSTRAINT "freelancer_skills_freelancerProfileId_fkey" FOREIGN KEY ("freelancerProfileId") REFERENCES "freelancer_profiles" ("id") ON DELETE CASCADE,
  CONSTRAINT "freelancer_skills_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "skills" ("id") ON DELETE CASCADE
);

CREATE TABLE "freelancer_experiences" (
  "id"                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "freelancerProfileId" UUID NOT NULL,
  "title"               VARCHAR(255) NOT NULL,
  "company"             VARCHAR(255) NOT NULL,
  "location"            VARCHAR(255),
  "startDate"           TIMESTAMPTZ NOT NULL,
  "endDate"             TIMESTAMPTZ,
  "isCurrent"           BOOLEAN NOT NULL DEFAULT false,
  "description"         TEXT,
  "createdAt"           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "freelancer_experiences_freelancerProfileId_fkey" FOREIGN KEY ("freelancerProfileId") REFERENCES "freelancer_profiles" ("id") ON DELETE CASCADE
);

CREATE TABLE "freelancer_educations" (
  "id"                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "freelancerProfileId" UUID NOT NULL,
  "institution"         VARCHAR(255) NOT NULL,
  "degree"              VARCHAR(255) NOT NULL,
  "fieldOfStudy"        VARCHAR(255),
  "startDate"           TIMESTAMPTZ NOT NULL,
  "endDate"             TIMESTAMPTZ,
  "description"         TEXT,
  "createdAt"           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "freelancer_educations_freelancerProfileId_fkey" FOREIGN KEY ("freelancerProfileId") REFERENCES "freelancer_profiles" ("id") ON DELETE CASCADE
);

CREATE TABLE "freelancer_certifications" (
  "id"                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "freelancerProfileId" UUID NOT NULL,
  "name"                VARCHAR(255) NOT NULL,
  "issuingOrganization" VARCHAR(255) NOT NULL,
  "issueDate"           TIMESTAMPTZ NOT NULL,
  "expiryDate"          TIMESTAMPTZ,
  "credentialId"        VARCHAR(255),
  "credentialUrl"       TEXT,
  "createdAt"           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "freelancer_certifications_freelancerProfileId_fkey" FOREIGN KEY ("freelancerProfileId") REFERENCES "freelancer_profiles" ("id") ON DELETE CASCADE
);

CREATE TABLE "freelancer_languages" (
  "id"                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "freelancerProfileId" UUID NOT NULL,
  "language"            VARCHAR(50) NOT NULL,
  "proficiency"         VARCHAR(20) NOT NULL,
  "createdAt"           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY ("freelancerProfileId", "language"),
  CONSTRAINT "freelancer_languages_freelancerProfileId_fkey" FOREIGN KEY ("freelancerProfileId") REFERENCES "freelancer_profiles" ("id") ON DELETE CASCADE
);

CREATE TABLE "portfolio_items" (
  "id"                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "freelancerProfileId" UUID NOT NULL,
  "title"               VARCHAR(255) NOT NULL,
  "description"         TEXT,
  "imageUrl"            TEXT,
  "videoUrl"            TEXT,
  "documentUrl"         TEXT,
  "externalUrl"         TEXT,
  "sortOrder"           INTEGER NOT NULL DEFAULT 0,
  "createdAt"           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "portfolio_items_freelancerProfileId_fkey" FOREIGN KEY ("freelancerProfileId") REFERENCES "freelancer_profiles" ("id") ON DELETE CASCADE
);

-- ============================================================
-- JOBS & PROPOSALS
-- ============================================================

CREATE TABLE "jobs" (
  "id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "clientId"        UUID NOT NULL,
  "title"           VARCHAR(500) NOT NULL,
  "description"     TEXT NOT NULL,
  "type"            "JobType" NOT NULL DEFAULT 'FIXED_PRICE',
  "budgetMin"       DECIMAL(19,4),
  "budgetMax"       DECIMAL(19,4),
  "hourlyRate"      DECIMAL(19,4),
  "currency"        VARCHAR(10) NOT NULL DEFAULT 'ETB',
  "experienceLevel" VARCHAR(20),
  "duration"        VARCHAR(50),
  "status"          "JobStatus" NOT NULL DEFAULT 'DRAFT',
  "deadline"        TIMESTAMPTZ,
  "proposalCount"   INTEGER NOT NULL DEFAULT 0,
  "viewCount"       INTEGER NOT NULL DEFAULT 0,
  "publishedAt"     TIMESTAMPTZ,
  "createdAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "jobs_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "users" ("id")
);

CREATE INDEX "jobs_clientId_idx" ON "jobs" ("clientId");
CREATE INDEX "jobs_status_idx" ON "jobs" ("status");

CREATE TABLE "job_skills" (
  "jobId"   UUID NOT NULL,
  "skillId" UUID NOT NULL,
  PRIMARY KEY ("jobId", "skillId"),
  CONSTRAINT "job_skills_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs" ("id") ON DELETE CASCADE,
  CONSTRAINT "job_skills_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "skills" ("id") ON DELETE CASCADE
);

CREATE TABLE "job_attachments" (
  "id"        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "jobId"     UUID NOT NULL,
  "fileName"  VARCHAR(255) NOT NULL,
  "fileUrl"   TEXT NOT NULL,
  "fileType"  VARCHAR(50) NOT NULL,
  "fileSize"  INTEGER NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "job_attachments_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs" ("id") ON DELETE CASCADE
);

CREATE TABLE "proposals" (
  "id"                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "jobId"             UUID NOT NULL,
  "freelancerId"      UUID NOT NULL,
  "coverLetter"       TEXT NOT NULL,
  "proposedAmount"    DECIMAL(19,4) NOT NULL,
  "currency"          VARCHAR(10) NOT NULL DEFAULT 'ETB',
  "estimatedDays"     INTEGER,
  "milestoneBreakdown" JSONB,
  "status"            "ProposalStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt"         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "proposals_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs" ("id") ON DELETE CASCADE,
  CONSTRAINT "proposals_freelancerId_fkey" FOREIGN KEY ("freelancerId") REFERENCES "users" ("id")
);

CREATE INDEX "proposals_jobId_idx" ON "proposals" ("jobId");
CREATE INDEX "proposals_freelancerId_idx" ON "proposals" ("freelancerId");

CREATE TABLE "proposal_attachments" (
  "id"          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "proposalId"  UUID NOT NULL,
  "fileName"    VARCHAR(255) NOT NULL,
  "fileUrl"     TEXT NOT NULL,
  "fileType"    VARCHAR(50) NOT NULL,
  "fileSize"    INTEGER NOT NULL,
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "proposal_attachments_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "proposals" ("id") ON DELETE CASCADE
);

-- ============================================================
-- CONTRACTS & MILESTONES
-- ============================================================

CREATE TABLE "contracts" (
  "id"                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "jobId"               UUID NOT NULL UNIQUE,
  "freelancerId"        UUID NOT NULL,
  "clientId"            UUID NOT NULL,
  "proposalId"          UUID UNIQUE,
  "title"               VARCHAR(500) NOT NULL,
  "description"         TEXT,
  "totalAmount"         DECIMAL(19,4) NOT NULL,
  "currency"            VARCHAR(10) NOT NULL,
  "type"                "JobType" NOT NULL,
  "status"              "ContractStatus" NOT NULL DEFAULT 'DRAFT',
  "clientSignedAt"      TIMESTAMPTZ,
  "freelancerSignedAt"  TIMESTAMPTZ,
  "startDate"           TIMESTAMPTZ,
  "endDate"             TIMESTAMPTZ,
  "completedAt"         TIMESTAMPTZ,
  "createdAt"           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "contracts_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs" ("id"),
  CONSTRAINT "contracts_freelancerId_fkey" FOREIGN KEY ("freelancerId") REFERENCES "users" ("id"),
  CONSTRAINT "contracts_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "users" ("id")
);

CREATE INDEX "contracts_freelancerId_idx" ON "contracts" ("freelancerId");
CREATE INDEX "contracts_clientId_idx" ON "contracts" ("clientId");

CREATE TABLE "milestones" (
  "id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "contractId"      UUID NOT NULL,
  "title"           VARCHAR(255) NOT NULL,
  "description"     TEXT,
  "amount"          DECIMAL(19,4) NOT NULL,
  "dueDate"         TIMESTAMPTZ,
  "status"          "MilestoneStatus" NOT NULL DEFAULT 'PENDING',
  "deliverables"    JSONB,
  "submittedAt"     TIMESTAMPTZ,
  "approvedAt"      TIMESTAMPTZ,
  "rejectedAt"      TIMESTAMPTZ,
  "rejectionReason" TEXT,
  "createdAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "milestones_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts" ("id") ON DELETE CASCADE
);

CREATE INDEX "milestones_contractId_idx" ON "milestones" ("contractId");

-- ============================================================
-- MESSAGING
-- ============================================================

CREATE TABLE "conversations" (
  "id"        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "type"      VARCHAR(20) NOT NULL DEFAULT 'direct',
  "title"     VARCHAR(255),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE "conversation_participants" (
  "id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "conversationId"  UUID NOT NULL,
  "userId"          UUID NOT NULL,
  "role"            VARCHAR(20) NOT NULL DEFAULT 'member',
  "lastReadAt"      TIMESTAMPTZ,
  "joinedAt"        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "conversation_participants_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations" ("id") ON DELETE CASCADE,
  CONSTRAINT "conversation_participants_conversationId_userId_unique" UNIQUE ("conversationId", "userId")
);

CREATE TABLE "messages" (
  "id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "conversationId"  UUID NOT NULL,
  "senderId"        UUID NOT NULL,
  "type"            "MessageType" NOT NULL DEFAULT 'TEXT',
  "content"         TEXT,
  "fileUrl"         TEXT,
  "fileName"        VARCHAR(255),
  "fileType"        VARCHAR(50),
  "fileSize"        INTEGER,
  "isRead"          BOOLEAN NOT NULL DEFAULT false,
  "readAt"          TIMESTAMPTZ,
  "createdAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations" ("id") ON DELETE CASCADE,
  CONSTRAINT "messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users" ("id")
);

CREATE INDEX "messages_conversationId_idx" ON "messages" ("conversationId");
CREATE INDEX "messages_senderId_idx" ON "messages" ("senderId");

-- ============================================================
-- REVIEWS
-- ============================================================

CREATE TABLE "reviews" (
  "id"                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "reviewerId"          UUID NOT NULL,
  "targetId"            UUID NOT NULL,
  "targetType"          VARCHAR(20) NOT NULL,
  "rating"              INTEGER NOT NULL CHECK ("rating" >= 1 AND "rating" <= 5),
  "title"               VARCHAR(255),
  "comment"             TEXT,
  "isVerifiedPurchase"  BOOLEAN NOT NULL DEFAULT false,
  "isVisible"           BOOLEAN NOT NULL DEFAULT true,
  "moderatedAt"         TIMESTAMPTZ,
  "moderationNote"      TEXT,
  "response"            TEXT,
  "respondedAt"         TIMESTAMPTZ,
  "createdAt"           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "reviews_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "users" ("id")
);

CREATE INDEX "reviews_targetId_idx" ON "reviews" ("targetId");
CREATE INDEX "reviews_reviewerId_idx" ON "reviews" ("reviewerId");

-- ============================================================
-- DISPUTES
-- ============================================================

CREATE TABLE "disputes" (
  "id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "reporterId"      UUID NOT NULL,
  "orderId"         UUID UNIQUE,
  "contractId"      UUID UNIQUE,
  "type"            VARCHAR(20) NOT NULL,
  "reason"          VARCHAR(255) NOT NULL,
  "description"     TEXT NOT NULL,
  "evidenceUrls"    TEXT[] NOT NULL DEFAULT '{}',
  "status"          "DisputeStatus" NOT NULL DEFAULT 'OPEN',
  "resolution"      "DisputeResolution",
  "resolutionNote"  TEXT,
  "resolvedAt"      TIMESTAMPTZ,
  "resolvedBy"      UUID,
  "createdAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "disputes_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "users" ("id"),
  CONSTRAINT "disputes_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders" ("id") ON DELETE SET NULL,
  CONSTRAINT "disputes_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts" ("id") ON DELETE SET NULL
);

CREATE INDEX "disputes_reporterId_idx" ON "disputes" ("reporterId");
CREATE INDEX "disputes_status_idx" ON "disputes" ("status");

-- ============================================================
-- NOTIFICATIONS
-- ============================================================

CREATE TABLE "notifications" (
  "id"            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId"        UUID NOT NULL,
  "type"          "NotificationType" NOT NULL,
  "title"         VARCHAR(255) NOT NULL,
  "body"          TEXT NOT NULL,
  "data"          JSONB,
  "isRead"        BOOLEAN NOT NULL DEFAULT false,
  "readAt"        TIMESTAMPTZ,
  "sentViaEmail"  BOOLEAN NOT NULL DEFAULT false,
  "sentViaSms"    BOOLEAN NOT NULL DEFAULT false,
  "sentViaPush"   BOOLEAN NOT NULL DEFAULT false,
  "sentViaInApp"  BOOLEAN NOT NULL DEFAULT false,
  "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE
);

CREATE INDEX "notifications_userId_idx" ON "notifications" ("userId");
CREATE INDEX "notifications_isRead_idx" ON "notifications" ("isRead");

-- ============================================================
-- WISHLIST & RECENTLY VIEWED
-- ============================================================

CREATE TABLE "wishlist_items" (
  "id"        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId"    UUID NOT NULL,
  "productId" UUID NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "wishlist_items_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE,
  CONSTRAINT "wishlist_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products" ("id") ON DELETE CASCADE,
  CONSTRAINT "wishlist_items_userId_productId_unique" UNIQUE ("userId", "productId")
);

CREATE TABLE "recently_viewed" (
  "id"        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId"    UUID NOT NULL,
  "productId" UUID NOT NULL,
  "viewedAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "recently_viewed_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE,
  CONSTRAINT "recently_viewed_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products" ("id") ON DELETE CASCADE
);

CREATE INDEX "recently_viewed_userId_idx" ON "recently_viewed" ("userId");

-- ============================================================
-- SUPPORT TICKETS
-- ============================================================

CREATE TABLE "support_tickets" (
  "id"          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId"      UUID NOT NULL,
  "subject"     VARCHAR(500) NOT NULL,
  "description" TEXT NOT NULL,
  "category"    VARCHAR(100) NOT NULL,
  "priority"    VARCHAR(20) NOT NULL DEFAULT 'medium',
  "status"      VARCHAR(20) NOT NULL DEFAULT 'open',
  "assignedTo"  UUID,
  "resolution"  TEXT,
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "support_tickets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id")
);

CREATE INDEX "support_tickets_userId_idx" ON "support_tickets" ("userId");
CREATE INDEX "support_tickets_status_idx" ON "support_tickets" ("status");

CREATE TABLE "support_ticket_responses" (
  "id"          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "ticketId"    UUID NOT NULL,
  "responderId" UUID NOT NULL,
  "message"     TEXT NOT NULL,
  "isInternal"  BOOLEAN NOT NULL DEFAULT false,
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "support_ticket_responses_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "support_tickets" ("id") ON DELETE CASCADE
);

-- ============================================================
-- AUDIT LOG
-- ============================================================

CREATE TABLE "audit_logs" (
  "id"          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId"      UUID,
  "action"      VARCHAR(100) NOT NULL,
  "entityType"  VARCHAR(100) NOT NULL,
  "entityId"    UUID NOT NULL,
  "oldValue"    JSONB,
  "newValue"    JSONB,
  "ipAddress"   INET,
  "userAgent"   TEXT,
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX "audit_logs_userId_idx" ON "audit_logs" ("userId");
CREATE INDEX "audit_logs_entityType_entityId_idx" ON "audit_logs" ("entityType", "entityId");
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs" ("createdAt");

-- ============================================================
-- USSD SESSIONS
-- ============================================================

CREATE TABLE "ussd_sessions" (
  "id"          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "sessionId"   VARCHAR(255) NOT NULL UNIQUE,
  "phoneNumber" VARCHAR(20) NOT NULL,
  "userId"      UUID,
  "serviceCode" VARCHAR(50) NOT NULL,
  "text"        TEXT NOT NULL,
  "response"    TEXT,
  "status"      VARCHAR(20) NOT NULL DEFAULT 'active',
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX "ussd_sessions_phoneNumber_idx" ON "ussd_sessions" ("phoneNumber");
CREATE INDEX "ussd_sessions_sessionId_idx" ON "ussd_sessions" ("sessionId");

-- ============================================================
-- TRIGGER: Auto-update updatedAt timestamp
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  "updatedAt" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables with updatedAt
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN
    SELECT table_name FROM information_schema.columns
    WHERE column_name = 'updatedAt' AND table_schema = 'public'
  LOOP
    EXECUTE format('CREATE TRIGGER trigger_%s_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()', t, t);
  END LOOP;
END;
$$;

-- ============================================================
-- ENABLE ROW LEVEL SECURITY (optional, for future use)
-- ============================================================

-- ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE "stores" ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE "products" ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE "orders" ENABLE ROW LEVEL SECURITY;
