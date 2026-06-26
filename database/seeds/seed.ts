// database/seeds/seed.ts
// Adbar (አድባር) — Seed Data
// Version: 2.0.0
// Date: 2026-06-22
//
// Run with: npx ts-node database/seeds/seed.ts
// Or: npx prisma db seed (if configured in package.json)
//
// Spec: 7 role users + 1 multi-role user, all with password 'password' (bcrypt cost 12)
// Uses correct Prisma schema field names and models.

import {
  PrismaClient,
  Role,
  KycLevel,
  StoreStatus,
  ProductStatus,
  ProductType,
  OrderStatus,
  TransactionStatus,
  EscrowStatus,
  ContractStatus,
  JobStatus,
  JobType,
  ProposalStatus,
  MilestoneStatus,
  MessageType,
  NotificationType,
  WalletBalanceType,
} from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const SALT_ROUNDS = 12;

// Deterministic UUIDs for seed data
const IDS = {
  // Users — 7 role users + 1 multi-role
  adminUser: 'a0000000-0000-4000-8000-000000000001',
  sellerUser: 'a0000000-0000-4000-8000-000000000002',
  buyerUser: 'a0000000-0000-4000-8000-000000000003',
  clientUser: 'a0000000-0000-4000-8000-000000000004',
  freelancerUser: 'a0000000-0000-4000-8000-000000000005',
  moderatorUser: 'a0000000-0000-4000-8000-000000000006',
  complianceUser: 'a0000000-0000-4000-8000-000000000007',
  multiRoleUser: 'a0000000-0000-4000-8000-000000000008',

  // Store
  store1: 'b0000000-0000-4000-8000-000000000001',

  // Categories
  catElectronics: 'c0000000-0000-4000-8000-000000000001',
  catClothing: 'c0000000-0000-4000-8000-000000000002',
  catFood: 'c0000000-0000-4000-8000-000000000003',
  catPhones: 'c0000000-0000-4000-8000-000000000004',
  catMensWear: 'c0000000-0000-4000-8000-000000000005',

  // Products
  product1: 'd0000000-0000-4000-8000-000000000001',
  product2: 'd0000000-0000-4000-8000-000000000002',
  product3: 'd0000000-0000-4000-8000-000000000003',
  product4: 'd0000000-0000-4000-8000-000000000004',
  product5: 'd0000000-0000-4000-8000-000000000005',
  product6: 'd0000000-0000-4000-8000-000000000006',

  // Jobs
  job1: 'g0000000-0000-4000-8000-000000000001',
  job2: 'g0000000-0000-4000-8000-000000000002',
  job3: 'g0000000-0000-4000-8000-000000000003',

  // Orders
  order1: 'h0000000-0000-4000-8000-000000000001',
  order2: 'h0000000-0000-4000-8000-000000000002',

  // Contract
  contract1: 'i0000000-0000-4000-8000-000000000001',

  // Escrow
  escrow1: 'j0000000-0000-4000-8000-000000000001',

  // Wallets
  walletAdmin: 'k0000000-0000-4000-8000-000000000001',
  walletSeller: 'k0000000-0000-4000-8000-000000000002',
  walletBuyer: 'k0000000-0000-4000-8000-000000000003',
  walletClient: 'k0000000-0000-4000-8000-000000000004',
  walletFreelancer: 'k0000000-0000-4000-8000-000000000005',
  walletModerator: 'k0000000-0000-4000-8000-000000000006',
  walletCompliance: 'k0000000-0000-4000-8000-000000000007',
  walletMulti: 'k0000000-0000-4000-8000-000000000008',

  // Freelancer Profile
  freelancerProfile1: 'm0000000-0000-4000-8000-000000000001',

  // Proposals
  proposal1: 'n0000000-0000-4000-8000-000000000001',
  proposal2: 'n0000000-0000-4000-8000-000000000002',

  // Payment Provider Configs
  ppChapa: 'q0000000-0000-4000-8000-000000000001',
  ppSantimPay: 'q0000000-0000-4000-8000-000000000002',
  ppStripe: 'q0000000-0000-4000-8000-000000000003',

  // Identity Verification
  idVerif1: 'r0000000-0000-4000-8000-000000000001',

  // Withdrawal Request
  withdrawal1: 's0000000-0000-4000-8000-000000000001',
};

async function main() {
  console.log('🌱 Starting seed...');

  const passwordHash = await bcrypt.hash('password', SALT_ROUNDS);

  // ============================================================
  // 1. USERS — 7 role users + 1 multi-role
  // ============================================================
  console.log('Creating users...');

  const users = [
    {
      id: IDS.adminUser,
      email: 'admin@adbar.test',
      phone: '+251900000001',
      passwordHash,
      firstName: 'Admin',
      lastName: 'User',
      country: 'Ethiopia',
      city: 'Addis Ababa',
      emailVerified: true,
      phoneVerified: true,
      mfaEnabled: true,
      kycLevel: KycLevel.LEVEL_3,
      language: 'en',
      currency: 'ETB',
    },
    {
      id: IDS.sellerUser,
      email: 'seller@adbar.test',
      phone: '+251900000002',
      passwordHash,
      firstName: 'Abebe',
      lastName: 'Kebede',
      country: 'Ethiopia',
      city: 'Addis Ababa',
      emailVerified: true,
      phoneVerified: true,
      mfaEnabled: false,
      kycLevel: KycLevel.LEVEL_2,
      language: 'am',
      currency: 'ETB',
    },
    {
      id: IDS.buyerUser,
      email: 'buyer@adbar.test',
      phone: '+251900000003',
      passwordHash,
      firstName: 'Dawit',
      lastName: 'Mengistu',
      country: 'Ethiopia',
      city: 'Addis Ababa',
      emailVerified: true,
      phoneVerified: true,
      mfaEnabled: false,
      kycLevel: KycLevel.LEVEL_1,
      language: 'en',
      currency: 'ETB',
    },
    {
      id: IDS.clientUser,
      email: 'client@adbar.test',
      phone: '+251900000004',
      passwordHash,
      firstName: 'Michael',
      lastName: 'Alemu',
      country: 'Ethiopia',
      city: 'Addis Ababa',
      emailVerified: true,
      phoneVerified: true,
      mfaEnabled: false,
      kycLevel: KycLevel.LEVEL_2,
      language: 'en',
      currency: 'ETB',
    },
    {
      id: IDS.freelancerUser,
      email: 'freelancer@adbar.test',
      phone: '+251900000005',
      passwordHash,
      firstName: 'Yonas',
      lastName: 'Tadesse',
      country: 'Ethiopia',
      city: 'Addis Ababa',
      emailVerified: true,
      phoneVerified: true,
      mfaEnabled: false,
      kycLevel: KycLevel.LEVEL_2,
      language: 'en',
      currency: 'ETB',
    },
    {
      id: IDS.moderatorUser,
      email: 'moderator@adbar.test',
      phone: '+251900000006',
      passwordHash,
      firstName: 'Liya',
      lastName: 'Worku',
      country: 'Ethiopia',
      city: 'Addis Ababa',
      emailVerified: true,
      phoneVerified: true,
      mfaEnabled: true,
      kycLevel: KycLevel.LEVEL_3,
      language: 'en',
      currency: 'ETB',
    },
    {
      id: IDS.complianceUser,
      email: 'compliance@adbar.test',
      phone: '+251900000007',
      passwordHash,
      firstName: 'Tigist',
      lastName: 'Haile',
      country: 'Ethiopia',
      city: 'Addis Ababa',
      emailVerified: true,
      phoneVerified: true,
      mfaEnabled: true,
      kycLevel: KycLevel.LEVEL_3,
      language: 'en',
      currency: 'ETB',
    },
    {
      id: IDS.multiRoleUser,
      email: 'multi@adbar.test',
      phone: '+251900000008',
      passwordHash,
      firstName: 'Selam',
      lastName: 'Bekele',
      country: 'Ethiopia',
      city: 'Bahir Dar',
      emailVerified: true,
      phoneVerified: false,
      mfaEnabled: false,
      kycLevel: KycLevel.LEVEL_1,
      language: 'en',
      currency: 'ETB',
    },
  ];

  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {},
      create: user,
    });
  }

  // ============================================================
  // 2. USER ROLES
  // ============================================================
  console.log('Creating user roles...');

  const roles = [
    { userId: IDS.adminUser, role: Role.ADMIN },
    { userId: IDS.sellerUser, role: Role.SELLER },
    { userId: IDS.buyerUser, role: Role.BUYER },
    { userId: IDS.clientUser, role: Role.CLIENT },
    { userId: IDS.freelancerUser, role: Role.FREELANCER },
    { userId: IDS.moderatorUser, role: Role.MODERATOR },
    { userId: IDS.complianceUser, role: Role.COMPLIANCE_OFFICER },
    // Multi-role user: BUYER + FREELANCER
    { userId: IDS.multiRoleUser, role: Role.BUYER },
    { userId: IDS.multiRoleUser, role: Role.FREELANCER },
  ];

  for (const r of roles) {
    await prisma.userRole.upsert({
      where: { userId_role: { userId: r.userId, role: r.role } },
      update: {},
      create: r,
    });
  }

  // ============================================================
  // 3. STORE (PENDING_VERIFICATION)
  // ============================================================
  console.log('Creating store...');

  await prisma.store.upsert({
    where: { id: IDS.store1 },
    update: {},
    create: {
      id: IDS.store1,
      userId: IDS.sellerUser,
      name: 'Abebe Electronics',
      slug: 'abebe-electronics',
      description:
        'Your trusted electronics store in Addis Ababa. We sell genuine phones, laptops, and accessories.',
      logoUrl: 'https://adbar.com/stores/abebe-electronics/logo.png',
      bannerUrl: 'https://adbar.com/stores/abebe-electronics/banner.png',
      status: StoreStatus.PENDING_VERIFICATION,
      businessName: 'Abebe Electronics PLC',
      businessRegNumber: 'BRN-2024-001234',
      taxId: 'TIN-001234567',
      email: 'info@abebeelectronics.com',
      phone: '+251900000002',
      website: 'https://abebeelectronics.com',
      country: 'Ethiopia',
      city: 'Addis Ababa',
      address: 'Bole Road, Near Edna Mall',
      autoConfirmOrders: false,
      returnPolicy: '7-day return policy for unopened items in original packaging.',
      totalSales: 0,
      totalRevenue: 0,
      averageRating: 0,
      reviewCount: 0,
    },
  });

  // ============================================================
  // 4. CATEGORIES (3 top-level + 2 subcategories)
  // ============================================================
  console.log('Creating categories...');

  const categories = [
    {
      id: IDS.catElectronics,
      name: 'Electronics',
      slug: 'electronics',
      description: 'Electronic devices and accessories',
      sortOrder: 1,
    },
    {
      id: IDS.catClothing,
      name: 'Clothing & Fashion',
      slug: 'clothing-fashion',
      description: 'Apparel for men, women, and children',
      sortOrder: 2,
    },
    {
      id: IDS.catFood,
      name: 'Food & Beverages',
      slug: 'food-beverages',
      description: 'Fresh food, drinks, and groceries',
      sortOrder: 3,
    },
    {
      id: IDS.catPhones,
      name: 'Phones & Tablets',
      slug: 'phones-tablets',
      description: 'Smartphones, tablets, and accessories',
      parentId: IDS.catElectronics,
      sortOrder: 1,
    },
    {
      id: IDS.catMensWear,
      name: "Men's Wear",
      slug: 'mens-wear',
      description: 'Clothing and accessories for men',
      parentId: IDS.catClothing,
      sortOrder: 1,
    },
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { id: cat.id },
      update: {},
      create: cat,
    });
  }

  // ============================================================
  // 5. PRODUCTS (2 per category = 6 total)
  // ============================================================
  console.log('Creating products...');

  const products = [
    // Electronics > Phones
    {
      id: IDS.product1,
      storeId: IDS.store1,
      categoryId: IDS.catPhones,
      name: 'Samsung Galaxy A54 5G',
      slug: 'samsung-galaxy-a54-5g',
      description:
        'Samsung Galaxy A54 5G with 128GB storage, 6GB RAM, 6.4" Super AMOLED display, and 5000mAh battery.',
      shortDescription: 'Samsung Galaxy A54 5G - 128GB, 6GB RAM',
      type: ProductType.PHYSICAL,
      status: ProductStatus.ACTIVE,
      price: 18500.0,
      compareAtPrice: 21000.0,
      currency: 'ETB',
      sku: 'SAM-A54-128-BLK',
      barcode: '8806094761234',
      quantity: 45,
      lowStockThreshold: 5,
      weight: 0.45,
      freeShipping: false,
      viewCount: 1250,
      salesCount: 89,
      averageRating: 4.6,
      reviewCount: 34,
    },
    {
      id: IDS.product2,
      storeId: IDS.store1,
      categoryId: IDS.catPhones,
      name: 'iPhone 15 Pro',
      slug: 'iphone-15-pro',
      description:
        'Apple iPhone 15 Pro with A17 Pro chip, 256GB storage, 6.1" Super Retina XDR display, titanium design.',
      shortDescription: 'Apple iPhone 15 Pro - 256GB, Titanium',
      type: ProductType.PHYSICAL,
      status: ProductStatus.ACTIVE,
      price: 65000.0,
      compareAtPrice: 70000.0,
      currency: 'ETB',
      sku: 'APL-IP15P-256-TIT',
      barcode: '1942531234567',
      quantity: 12,
      lowStockThreshold: 3,
      weight: 0.35,
      freeShipping: true,
      viewCount: 2100,
      salesCount: 23,
      averageRating: 4.8,
      reviewCount: 15,
    },
    // Clothing > Men's Wear
    {
      id: IDS.product3,
      storeId: IDS.store1,
      categoryId: IDS.catMensWear,
      name: 'Ethiopian Traditional Netela - Men',
      slug: 'ethiopian-traditional-netela-men',
      description:
        'Handwoven Ethiopian traditional Netela for men. 100% cotton, with colorful tibeb border.',
      shortDescription: 'Traditional Ethiopian Netela for Men - Cotton',
      type: ProductType.PHYSICAL,
      status: ProductStatus.ACTIVE,
      price: 1200.0,
      currency: 'ETB',
      sku: 'TNF-NET-MEN-001',
      quantity: 100,
      lowStockThreshold: 10,
      weight: 0.5,
      freeShipping: false,
      viewCount: 560,
      salesCount: 67,
      averageRating: 4.7,
      reviewCount: 28,
    },
    {
      id: IDS.product4,
      storeId: IDS.store1,
      categoryId: IDS.catMensWear,
      name: 'Ethiopian Gabi - Handwoven Cotton',
      slug: 'ethiopia-gabi-handwoven-cotton',
      description:
        'Traditional Ethiopian Gabi, handwoven from premium cotton. Four-layer traditional garment for men.',
      shortDescription: 'Traditional Ethiopian Gabi - Premium Cotton',
      type: ProductType.PHYSICAL,
      status: ProductStatus.ACTIVE,
      price: 2500.0,
      currency: 'ETB',
      sku: 'TNF-GABI-MEN-001',
      quantity: 60,
      lowStockThreshold: 8,
      weight: 1.2,
      freeShipping: false,
      viewCount: 320,
      salesCount: 41,
      averageRating: 4.5,
      reviewCount: 19,
    },
    // Food & Beverages
    {
      id: IDS.product5,
      storeId: IDS.store1,
      categoryId: IDS.catFood,
      name: 'Yirgacheffe Green Coffee Beans - 1kg',
      slug: 'yirgacheffe-green-coffee-beans-1kg',
      description:
        'Premium Yirgacheffe green coffee beans, sun-dried and hand-sorted. Floral and citrus notes.',
      shortDescription: 'Yirgacheffe Green Coffee Beans - 1kg Pack',
      type: ProductType.PHYSICAL,
      status: ProductStatus.ACTIVE,
      price: 850.0,
      currency: 'ETB',
      sku: 'FDB-YIRG-1KG',
      quantity: 200,
      lowStockThreshold: 20,
      weight: 1.0,
      freeShipping: false,
      viewCount: 890,
      salesCount: 156,
      averageRating: 4.8,
      reviewCount: 72,
    },
    {
      id: IDS.product6,
      storeId: IDS.store1,
      categoryId: IDS.catFood,
      name: 'Ethiopian Wild Honey - 500g',
      slug: 'ethiopian-wild-honey-500g',
      description:
        'Pure, raw wild honey from the forests of Bale Mountains. Unprocessed and unfiltered.',
      shortDescription: 'Ethiopian Wild Raw Honey - 500g Jar',
      type: ProductType.PHYSICAL,
      status: ProductStatus.ACTIVE,
      price: 650.0,
      currency: 'ETB',
      sku: 'FDB-HONEY-500G',
      quantity: 150,
      lowStockThreshold: 15,
      weight: 0.6,
      freeShipping: false,
      viewCount: 720,
      salesCount: 98,
      averageRating: 4.6,
      reviewCount: 45,
    },
  ];

  for (const product of products) {
    await prisma.product.upsert({
      where: { id: product.id },
      update: {},
      create: product,
    });
  }

  // ============================================================
  // 5b. PRODUCT IMAGES
  // ============================================================
  console.log('Creating product images...');

  const productImages = [
    { id: 'img0000001-0000-4000-8000-000000000001', productId: IDS.product1, url: 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=400', altText: 'Samsung Galaxy A54', isPrimary: true, sortOrder: 1 },
    { id: 'img0000002-0000-4000-8000-000000000002', productId: IDS.product2, url: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=400', altText: 'iPhone 15 Pro', isPrimary: true, sortOrder: 1 },
    { id: 'img0000003-0000-4000-8000-000000000003', productId: IDS.product3, url: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=400', altText: 'Ethiopian Netela', isPrimary: true, sortOrder: 1 },
    { id: 'img0000004-0000-4000-8000-000000000004', productId: IDS.product4, url: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=400', altText: 'Ethiopian Gabi', isPrimary: true, sortOrder: 1 },
    { id: 'img0000005-0000-4000-8000-000000000005', productId: IDS.product5, url: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=400', altText: 'Yirgacheffe Coffee Beans', isPrimary: true, sortOrder: 1 },
    { id: 'img0000006-0000-4000-8000-000000000006', productId: IDS.product6, url: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=400', altText: 'Ethiopian Wild Honey', isPrimary: true, sortOrder: 1 },
  ];

  for (const img of productImages) {
    await prisma.productImage.upsert({
      where: { id: img.id },
      update: {},
      create: img,
    });
  }

  // ============================================================
  // 6. ORDERS (one delivered, one shipped)
  // ============================================================
  console.log('Creating orders...');

  await prisma.order.upsert({
    where: { id: IDS.order1 },
    update: {},
    create: {
      id: IDS.order1,
      orderNumber: 'ORD-2026-00001',
      buyerId: IDS.buyerUser,
      sellerId: IDS.sellerUser,
      status: OrderStatus.DELIVERED,
      subtotal: 18500.0,
      shippingCost: 200.0,
      taxAmount: 0.0,
      discountAmount: 0.0,
      total: 18700.0,
      currency: 'ETB',
      shippingAddress: {
        fullName: 'Dawit Mengistu',
        phone: '+251900000003',
        address: 'Bole Sub City, Woreda 03, House No. 123',
        city: 'Addis Ababa',
        country: 'Ethiopia',
      },
      shippingMethod: 'Standard Delivery',
      trackingNumber: 'TRK-ETH-20260615001',
      shippedAt: new Date('2026-06-15T10:00:00Z'),
      deliveredAt: new Date('2026-06-17T14:30:00Z'),
      buyerNote: 'Please handle with care',
    },
  });

  await prisma.orderItem.upsert({
    where: { id: 'oi0000000-0000-4000-8000-000000000001' },
    update: {},
    create: {
      id: 'oi0000000-0000-4000-8000-000000000001',
      orderId: IDS.order1,
      productId: IDS.product1,
      productName: 'Samsung Galaxy A54 5G',
      productSku: 'SAM-A54-128-BLK',
      productImageUrl: 'https://adbar.com/products/samsung-a54-1.jpg',
      quantity: 1,
      unitPrice: 18500.0,
      totalPrice: 18500.0,
    },
  });

  await prisma.order.upsert({
    where: { id: IDS.order2 },
    update: {},
    create: {
      id: IDS.order2,
      orderNumber: 'ORD-2026-00002',
      buyerId: IDS.buyerUser,
      sellerId: IDS.sellerUser,
      status: OrderStatus.SHIPPED,
      subtotal: 850.0,
      shippingCost: 150.0,
      taxAmount: 0.0,
      discountAmount: 0.0,
      total: 1000.0,
      currency: 'ETB',
      shippingAddress: {
        fullName: 'Dawit Mengistu',
        phone: '+251900000003',
        address: 'Bole Sub City, Woreda 03, House No. 123',
        city: 'Addis Ababa',
        country: 'Ethiopia',
      },
      shippingMethod: 'Express Delivery',
      trackingNumber: 'TRK-ETH-20260618001',
      shippedAt: new Date('2026-06-18T09:00:00Z'),
    },
  });

  await prisma.orderItem.upsert({
    where: { id: 'oi0000000-0000-4000-8000-000000000002' },
    update: {},
    create: {
      id: 'oi0000000-0000-4000-8000-000000000002',
      orderId: IDS.order2,
      productId: IDS.product5,
      productName: 'Yirgacheffe Green Coffee Beans - 1kg',
      productSku: 'FDB-YIRG-1KG',
      productImageUrl: 'https://adbar.com/products/yirgacheffe-1.jpg',
      quantity: 1,
      unitPrice: 850.0,
      totalPrice: 850.0,
    },
  });

  // ============================================================
  // 7. TRANSACTIONS (Chapa ETB, Stripe USD)
  // ============================================================
  console.log('Creating transactions...');

  await prisma.transaction.upsert({
    where: { id: 'tx0000000-0000-4000-8000-000000000001' },
    update: {},
    create: {
      id: 'tx0000000-0000-4000-8000-000000000001',
      orderId: IDS.order1,
      userId: IDS.buyerUser,
      providerId: 'chapa',
      providerRef: 'tx_ref_20260614_abc123',
      amount: 18700.0,
      currency: 'ETB',
      fee: 561.0,
      status: TransactionStatus.SUCCESS,
      type: 'payment',
    },
  });

  await prisma.transaction.upsert({
    where: { id: 'tx0000000-0000-4000-8000-000000000002' },
    update: {},
    create: {
      id: 'tx0000000-0000-4000-8000-000000000002',
      orderId: IDS.order2,
      userId: IDS.buyerUser,
      providerId: 'stripe',
      providerRef: 'pi_3Rxample20260617',
      amount: 1000.0,
      currency: 'ETB',
      fee: 30.0,
      status: TransactionStatus.SUCCESS,
      type: 'payment',
    },
  });

  // ============================================================
  // 8. PAYMENT PROVIDER CONFIGS (3 configs)
  // ============================================================
  console.log('Creating payment provider configs...');

  await prisma.paymentProviderConfig.upsert({
    where: { id: IDS.ppChapa },
    update: {},
    create: {
      id: IDS.ppChapa,
      displayName: 'Chapa',
      isActive: true,
      supportedCurrencies: ['ETB'],
      secretsRef: 'secrets/chapa/api-key',
      webhookPath: '/api/webhooks/chapa',
      sortOrder: 1,
    },
  });

  await prisma.paymentProviderConfig.upsert({
    where: { id: IDS.ppSantimPay },
    update: {},
    create: {
      id: IDS.ppSantimPay,
      displayName: 'Santim Pay',
      isActive: true,
      supportedCurrencies: ['ETB'],
      secretsRef: 'secrets/santimpay/api-key',
      webhookPath: '/api/webhooks/santimpay',
      sortOrder: 2,
    },
  });

  await prisma.paymentProviderConfig.upsert({
    where: { id: IDS.ppStripe },
    update: {},
    create: {
      id: IDS.ppStripe,
      displayName: 'Stripe',
      isActive: true,
      supportedCurrencies: ['USD', 'EUR'],
      secretsRef: 'secrets/stripe/api-key',
      webhookPath: '/api/webhooks/stripe',
      sortOrder: 3,
    },
  });

  // ============================================================
  // 9. WALLETS & BALANCES (AU-ETB and AU-USD for seller & freelancer)
  // ============================================================
  console.log('Creating wallets and balances...');

  const wallets = [
    { id: IDS.walletAdmin, userId: IDS.adminUser },
    { id: IDS.walletSeller, userId: IDS.sellerUser },
    { id: IDS.walletBuyer, userId: IDS.buyerUser },
    { id: IDS.walletClient, userId: IDS.clientUser },
    { id: IDS.walletFreelancer, userId: IDS.freelancerUser },
    { id: IDS.walletModerator, userId: IDS.moderatorUser },
    { id: IDS.walletCompliance, userId: IDS.complianceUser },
    { id: IDS.walletMulti, userId: IDS.multiRoleUser },
  ];

  for (const w of wallets) {
    await prisma.wallet.upsert({
      where: { userId: w.userId },
      update: {},
      create: w,
    });
  }

  // Wallet balances — using AU (Adbar Unit) prefix convention
  // Seller: AU-ETB available + pending
  // Freelancer: AU-ETB + AU-USD available
  const balances = [
    // Seller wallet
    {
      walletId: IDS.walletSeller,
      currency: 'ETB',
      type: WalletBalanceType.AVAILABLE,
      balance: 125000.0,
    },
    {
      walletId: IDS.walletSeller,
      currency: 'ETB',
      type: WalletBalanceType.PENDING,
      balance: 15000.0,
    },
    // Freelancer wallet
    {
      walletId: IDS.walletFreelancer,
      currency: 'ETB',
      type: WalletBalanceType.AVAILABLE,
      balance: 85000.0,
    },
    {
      walletId: IDS.walletFreelancer,
      currency: 'USD',
      type: WalletBalanceType.AVAILABLE,
      balance: 500.0,
    },
    // Buyer wallet
    {
      walletId: IDS.walletBuyer,
      currency: 'ETB',
      type: WalletBalanceType.AVAILABLE,
      balance: 5000.0,
    },
    // Client wallet
    {
      walletId: IDS.walletClient,
      currency: 'ETB',
      type: WalletBalanceType.AVAILABLE,
      balance: 200000.0,
    },
    // Multi-role wallet
    {
      walletId: IDS.walletMulti,
      currency: 'ETB',
      type: WalletBalanceType.AVAILABLE,
      balance: 10000.0,
    },
  ];

  for (const b of balances) {
    await prisma.walletBalance.upsert({
      where: {
        walletId_currency_type: {
          walletId: b.walletId,
          currency: b.currency,
          type: b.type,
        },
      },
      update: { balance: b.balance },
      create: b,
    });
  }

  // ============================================================
  // 10. WALLET TRANSACTIONS
  // ============================================================
  console.log('Creating wallet transactions...');

  // Get the seller's ETB available balance record for reference
  const sellerEtbAvailable = await prisma.walletBalance.findUnique({
    where: {
      walletId_currency_type: {
        walletId: IDS.walletSeller,
        currency: 'ETB',
        type: WalletBalanceType.AVAILABLE,
      },
    },
  });

  if (sellerEtbAvailable) {
    await prisma.walletTransaction.upsert({
      where: { id: 'wt0000000-0000-4000-8000-000000000001' },
      update: {},
      create: {
        id: 'wt0000000-0000-4000-8000-000000000001',
        walletId: IDS.walletSeller,
        balanceId: sellerEtbAvailable.id,
        type: 'credit',
        amount: 18700.0,
        currency: 'ETB',
        balanceBefore: 106300.0,
        balanceAfter: 125000.0,
        referenceType: 'order',
        referenceId: IDS.order1,
        description: 'Payment received for ORD-2026-00001',
      },
    });
  }

  // ============================================================
  // 11. FREELANCER PROFILE
  // ============================================================
  console.log('Creating freelancer profile...');

  await prisma.freelancerProfile.upsert({
    where: { userId: IDS.freelancerUser },
    update: {},
    create: {
      id: IDS.freelancerProfile1,
      userId: IDS.freelancerUser,
      headline: 'Full-Stack Developer | React, Node.js, TypeScript',
      overview:
        'Experienced full-stack developer with 5+ years building scalable web applications. Specialized in React, Node.js, and cloud technologies.',
      hourlyRate: 1500.0,
      currency: 'ETB',
      availability: 'full_time',
      hoursPerWeek: 40,
      completedJobs: 23,
      totalEarnings: 85000.0,
      averageRating: 4.8,
      reviewCount: 18,
      responseTime: 30,
    },
  });

  // ============================================================
  // 12. JOBS (3 posted by client)
  // ============================================================
  console.log('Creating jobs...');

  await prisma.job.upsert({
    where: { id: IDS.job1 },
    update: {},
    create: {
      id: IDS.job1,
      clientId: IDS.clientUser,
      title: 'Build a Modern E-commerce Website',
      description:
        'We are looking for an experienced full-stack developer to build a modern e-commerce website for our retail business.\n\nRequirements:\n- React or Next.js frontend\n- Node.js backend\n- PostgreSQL database\n- Payment integration with Chapa\n- Responsive design\n- Admin dashboard for product management',
      type: JobType.FIXED_PRICE,
      budgetMin: 30000.0,
      budgetMax: 50000.0,
      currency: 'ETB',
      experienceLevel: 'intermediate',
      duration: '1_to_3_months',
      status: JobStatus.OPEN,
      deadline: new Date('2026-07-15'),
      proposalCount: 5,
      viewCount: 120,
      publishedAt: new Date('2026-06-01'),
    },
  });

  await prisma.job.upsert({
    where: { id: IDS.job2 },
    update: {},
    create: {
      id: IDS.job2,
      clientId: IDS.clientUser,
      title: 'Logo and Brand Identity Design',
      description:
        'Need a professional designer to create a complete brand identity for our new coffee export company. Deliverables include logo, color palette, typography, business cards, and brand guidelines document.',
      type: JobType.FIXED_PRICE,
      budgetMin: 8000.0,
      budgetMax: 15000.0,
      currency: 'ETB',
      experienceLevel: 'intermediate',
      duration: 'less_than_1_month',
      status: JobStatus.OPEN,
      deadline: new Date('2026-07-01'),
      proposalCount: 8,
      viewCount: 95,
      publishedAt: new Date('2026-06-05'),
    },
  });

  await prisma.job.upsert({
    where: { id: IDS.job3 },
    update: {},
    create: {
      id: IDS.job3,
      clientId: IDS.clientUser,
      title: 'Mobile App Developer for Delivery Service',
      description:
        'Looking for a mobile developer to build a cross-platform delivery tracking app using React Native. Features include real-time tracking, push notifications, and payment integration.',
      type: JobType.MILESTONE_BASED,
      budgetMin: 50000.0,
      budgetMax: 80000.0,
      currency: 'ETB',
      experienceLevel: 'expert',
      duration: '3_to_6_months',
      status: JobStatus.OPEN,
      deadline: new Date('2026-08-01'),
      proposalCount: 3,
      viewCount: 67,
      publishedAt: new Date('2026-06-10'),
    },
  });

  // ============================================================
  // 13. PROPOSALS (2 submitted)
  // ============================================================
  console.log('Creating proposals...');

  await prisma.proposal.upsert({
    where: { id: IDS.proposal1 },
    update: {},
    create: {
      id: IDS.proposal1,
      jobId: IDS.job1,
      freelancerId: IDS.freelancerUser,
      coverLetter:
        'Hello! I am a full-stack developer with 5+ years of experience building e-commerce platforms. I have worked with Chapa payment integration before and can deliver a high-quality solution within your budget and timeline.',
      proposedAmount: 42000.0,
      currency: 'ETB',
      estimatedDays: 45,
      milestoneBreakdown: [
        { title: 'UI/UX Design & Frontend', amount: 15000, days: 15 },
        { title: 'Backend API & Database', amount: 15000, days: 15 },
        { title: 'Payment Integration & Testing', amount: 8000, days: 10 },
        { title: 'Deployment & Documentation', amount: 4000, days: 5 },
      ],
      status: ProposalStatus.ACCEPTED,
    },
  });

  await prisma.proposal.upsert({
    where: { id: IDS.proposal2 },
    update: {},
    create: {
      id: IDS.proposal2,
      jobId: IDS.job2,
      freelancerId: IDS.multiRoleUser,
      coverLetter:
        'Hi! I am a designer and developer with experience in brand identity design. I have designed logos and complete brand systems for several Ethiopian businesses.',
      proposedAmount: 12000.0,
      currency: 'ETB',
      estimatedDays: 14,
      milestoneBreakdown: [
        { title: 'Research & Concept Development', amount: 3000, days: 4 },
        { title: 'Logo Design & Revisions', amount: 5000, days: 5 },
        { title: 'Brand Guidelines & Deliverables', amount: 4000, days: 5 },
      ],
      status: ProposalStatus.PENDING,
    },
  });

  // ============================================================
  // 14. CONTRACT & MILESTONES (funded escrow)
  // ============================================================
  console.log('Creating contract and milestones...');

  await prisma.contract.upsert({
    where: { id: IDS.contract1 },
    update: {},
    create: {
      id: IDS.contract1,
      jobId: IDS.job1,
      freelancerId: IDS.freelancerUser,
      clientId: IDS.clientUser,
      proposalId: IDS.proposal1,
      title: 'E-commerce Website Development Contract',
      description:
        'Full-stack development of e-commerce platform with payment integration.',
      totalAmount: 42000.0,
      currency: 'ETB',
      type: JobType.FIXED_PRICE,
      status: ContractStatus.ACTIVE,
      clientSignedAt: new Date('2026-06-10T08:00:00Z'),
      freelancerSignedAt: new Date('2026-06-10T09:30:00Z'),
      startDate: new Date('2026-06-11'),
      endDate: new Date('2026-07-26'),
    },
  });

  const milestoneDefs = [
    {
      id: 'ms0000000-0000-4000-8000-000000000001',
      contractId: IDS.contract1,
      title: 'UI/UX Design & Frontend Development',
      description:
        'Complete frontend with responsive design, product catalog, shopping cart, and checkout flow.',
      amount: 15000.0,
      dueDate: new Date('2026-06-26'),
      status: MilestoneStatus.IN_PROGRESS,
    },
    {
      id: 'ms0000000-0000-4000-8000-000000000002',
      contractId: IDS.contract1,
      title: 'Backend API & Database',
      description: 'RESTful API, database schema, authentication, and admin dashboard.',
      amount: 15000.0,
      dueDate: new Date('2026-07-11'),
      status: MilestoneStatus.PENDING,
    },
    {
      id: 'ms0000000-0000-4000-8000-000000000003',
      contractId: IDS.contract1,
      title: 'Payment Integration & Testing',
      description: 'Chapa payment integration, end-to-end testing, and bug fixes.',
      amount: 8000.0,
      dueDate: new Date('2026-07-21'),
      status: MilestoneStatus.PENDING,
    },
    {
      id: 'ms0000000-0000-4000-8000-000000000004',
      contractId: IDS.contract1,
      title: 'Deployment & Documentation',
      description:
        'Production deployment, performance optimization, and technical documentation.',
      amount: 4000.0,
      dueDate: new Date('2026-07-26'),
      status: MilestoneStatus.PENDING,
    },
  ];

  for (const m of milestoneDefs) {
    await prisma.milestone.upsert({
      where: { id: m.id },
      update: {},
      create: m,
    });
  }

  // ============================================================
  // 15. ESCROW (funded)
  // ============================================================
  console.log('Creating escrow...');

  await prisma.escrow.upsert({
    where: { id: IDS.escrow1 },
    update: {},
    create: {
      id: IDS.escrow1,
      contractId: IDS.contract1,
      amount: 42000.0,
      currency: 'ETB',
      status: EscrowStatus.FUNDED,
      fundedAt: new Date('2026-06-11T10:00:00Z'),
    },
  });

  // ============================================================
  // 16. IDENTITY VERIFICATION (Fayda, pending)
  // ============================================================
  console.log('Creating identity verifications...');

  await prisma.identityVerification.upsert({
    where: { id: IDS.idVerif1 },
    update: {},
    create: {
      id: IDS.idVerif1,
      userId: IDS.sellerUser,
      providerId: 'fayda',
      idType: 'fayda',
      idNumber: 'FYD-1234567890',
      status: 'PENDING' as any,
      verifiedAt: undefined,
    },
  });

  // ============================================================
  // 17. REVIEWS (3 reviews)
  // ============================================================
  console.log('Creating reviews...');

  await prisma.review.upsert({
    where: { id: 'rv0000000-0000-4000-8000-000000000001' },
    update: {},
    create: {
      id: 'rv0000000-0000-4000-8000-000000000001',
      reviewerId: IDS.buyerUser,
      targetId: IDS.product1,
      targetType: 'product',
      rating: 5,
      title: 'Excellent phone, great value!',
      comment:
        'The Samsung Galaxy A54 is amazing for the price. The camera quality is excellent and the battery lasts all day.',
      isVerifiedPurchase: true,
      isVisible: true,
    },
  });

  await prisma.review.upsert({
    where: { id: 'rv0000000-0000-4000-8000-000000000002' },
    update: {},
    create: {
      id: 'rv0000000-0000-4000-8000-000000000002',
      reviewerId: IDS.buyerUser,
      targetId: IDS.store1,
      targetType: 'store',
      rating: 5,
      title: 'Best electronics store in Addis!',
      comment:
        'Abebe Electronics has the best prices and genuine products. Customer service is excellent.',
      isVisible: true,
    },
  });

  await prisma.review.upsert({
    where: { id: 'rv0000000-0000-4000-8000-000000000003' },
    update: {},
    create: {
      id: 'rv0000000-0000-4000-8000-000000000003',
      reviewerId: IDS.clientUser,
      targetId: IDS.freelancerUser,
      targetType: 'freelancer',
      rating: 5,
      title: 'Outstanding developer!',
      comment:
        'Yonas delivered an excellent e-commerce platform. Clean code, on-time delivery, and great communication.',
      isVisible: true,
    },
  });

  // ============================================================
  // 18. WITHDRAWAL REQUEST (1)
  // ============================================================
  console.log('Creating withdrawal request...');

  // Get the seller's ETB available balance for the withdrawal
  const sellerBalanceForWithdrawal = await prisma.walletBalance.findUnique({
    where: {
      walletId_currency_type: {
        walletId: IDS.walletSeller,
        currency: 'ETB',
        type: WalletBalanceType.AVAILABLE,
      },
    },
  });

  if (sellerBalanceForWithdrawal) {
    await prisma.withdrawalRequest.upsert({
      where: { id: IDS.withdrawal1 },
      update: {},
      create: {
        id: IDS.withdrawal1,
        userId: IDS.sellerUser,
        walletId: IDS.walletSeller,
        balanceId: sellerBalanceForWithdrawal.id,
        amount: 50000.0,
        currency: 'ETB',
        providerId: 'chapa',
        status: 'pending',
        bankName: 'Commercial Bank of Ethiopia',
        bankAccountNumber: '1000123456789',
        bankAccountName: 'Abebe Kebede',
      },
    });
  }

  // ============================================================
  // 19. AUDIT LOGS
  // ============================================================
  console.log('Creating audit logs...');

  const auditLogs = [
    {
      userId: IDS.adminUser,
      action: 'USER_CREATED',
      entityType: 'User',
      entityId: IDS.sellerUser,
      newValue: { email: 'seller@adbar.test', role: 'SELLER' },
    },
    {
      userId: IDS.sellerUser,
      action: 'STORE_CREATED',
      entityType: 'Store',
      entityId: IDS.store1,
      newValue: { name: 'Abebe Electronics', slug: 'abebe-electronics' },
    },
    {
      userId: IDS.buyerUser,
      action: 'ORDER_PLACED',
      entityType: 'Order',
      entityId: IDS.order1,
      newValue: { orderNumber: 'ORD-2026-00001', total: 18700 },
    },
    {
      userId: IDS.clientUser,
      action: 'PROPOSAL_ACCEPTED',
      entityType: 'Proposal',
      entityId: IDS.proposal1,
      oldValue: { status: 'PENDING' },
      newValue: { status: 'ACCEPTED', amount: 42000 },
    },
    {
      userId: IDS.complianceUser,
      action: 'KYC_REVIEW_INITIATED',
      entityType: 'IdentityVerification',
      entityId: IDS.idVerif1,
      newValue: { status: 'PENDING', provider: 'fayda' },
    },
  ];

  for (const log of auditLogs) {
    await prisma.auditLog.upsert({
      where: { id: `al${log.entityId.slice(1, 8)}-${log.action.slice(0, 3).toLowerCase()}` },
      update: {},
      create: log,
    });
  }

  // ============================================================
  // SUMMARY
  // ============================================================
  console.log('');
  console.log('✅ Seed completed successfully!');
  console.log('');
  console.log('📊 Summary:');
  console.log(`   Users:              ${await prisma.user.count()}`);
  console.log(`   User Roles:         ${await prisma.userRole.count()}`);
  console.log(`   Stores:             ${await prisma.store.count()}`);
  console.log(`   Categories:         ${await prisma.category.count()}`);
  console.log(`   Products:           ${await prisma.product.count()}`);
  console.log(`   Orders:             ${await prisma.order.count()}`);
  console.log(`   Order Items:        ${await prisma.orderItem.count()}`);
  console.log(`   Transactions:       ${await prisma.transaction.count()}`);
  console.log(`   Wallets:            ${await prisma.wallet.count()}`);
  console.log(`   Wallet Balances:    ${await prisma.walletBalance.count()}`);
  console.log(`   Wallet Transactions:${await prisma.walletTransaction.count()}`);
  console.log(`   Freelancer Profiles:${await prisma.freelancerProfile.count()}`);
  console.log(`   Jobs:               ${await prisma.job.count()}`);
  console.log(`   Proposals:          ${await prisma.proposal.count()}`);
  console.log(`   Contracts:          ${await prisma.contract.count()}`);
  console.log(`   Milestones:         ${await prisma.milestone.count()}`);
  console.log(`   Escrows:            ${await prisma.escrow.count()}`);
  console.log(`   Identity Verifs:    ${await prisma.identityVerification.count()}`);
  console.log(`   Reviews:            ${await prisma.review.count()}`);
  console.log(`   Withdrawal Reqs:    ${await prisma.withdrawalRequest.count()}`);
  console.log(`   Audit Logs:         ${await prisma.auditLog.count()}`);
  console.log(`   Payment Providers:  ${await prisma.paymentProviderConfig.count()}`);
  console.log('');
  console.log('🔑 Test accounts (password: password):');
  console.log('   admin@adbar.test       (ADMIN)');
  console.log('   seller@adbar.test      (SELLER — store in PENDING_VERIFICATION)');
  console.log('   buyer@adbar.test       (BUYER)');
  console.log('   client@adbar.test      (CLIENT)');
  console.log('   freelancer@adbar.test  (FREELANCER — with profile)');
  console.log('   moderator@adbar.test   (MODERATOR)');
  console.log('   compliance@adbar.test  (COMPLIANCE_OFFICER)');
  console.log('   multi@adbar.test       (BUYER + FREELANCER)');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
