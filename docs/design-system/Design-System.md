# Adbar (አድባር) — UI/UX Design System

**Version:** 1.0.0  
**Date:** 2026-06-21  

---

## 1. Design Principles

1. **Accessible First:** WCAG 2.1 AA compliance minimum
2. **Mobile-First:** Design for small screens first, scale up
3. **Data-Aware:** Respect user's data with lazy loading and compression
4. **Bilingual:** Amharic and English support from day one
5. **Trust-Building:** Clear verification badges, transparent pricing
6. **Low-Bandwidth Optimized:** Fast on 2G/3G connections

---

## 2. Brand Identity

### 2.1 Brand Name
**Adbar (አድባር)** — The traditional Ethiopian community gathering tree

### 2.2 Logo Concept
- Stylized tree silhouette with interconnected roots
- Roots represent the marketplace connections
- Canopy represents the community gathering space
- Works as icon (tree canopy only) and full logo

### 2.3 Color Palette

```css
/* Primary Colors */
--adbar-primary: #1B5E20;        /* Deep Forest Green - trust, growth */
--adbar-primary-light: #4CAF50;  /* Vibrant Green */
--adbar-primary-dark: #0D3B12;   /* Dark Forest */

/* Secondary Colors */
--adbar-secondary: #FF8F00;      /* Warm Amber - energy, commerce */
--adbar-secondary-light: #FFB300;
--adbar-secondary-dark: #E65100;

/* Neutral Colors */
--adbar-neutral-50: #FAFAFA;
--adbar-neutral-100: #F5F5F5;
--adbar-neutral-200: #EEEEEE;
--adbar-neutral-300: #E0E0E0;
--adbar-neutral-400: #BDBDBD;
--adbar-neutral-500: #9E9E9E;
--adbar-neutral-600: #757575;
--adbar-neutral-700: #616161;
--adbar-neutral-800: #424242;
--adbar-neutral-900: #212121;

/* Semantic Colors */
--adbar-success: #2E7D32;
--adbar-warning: #F57F17;
--adbar-error: #C62828;
--adbar-info: #1565C0;

/* Currency Colors */
--adbar-etb: #1B5E20;           /* Green for ETB */
--adbar-usd: #1565C0;           /* Blue for USD */
--adbar-au-gold: #FFD700;       /* Gold for AU token */
```

### 2.4 Typography

```css
/* Headings - Modern, clean */
font-family: 'Inter', 'Noto Sans Ethiopic', sans-serif;

/* Scale */
--text-xs: 0.75rem;    /* 12px */
--text-sm: 0.875rem;   /* 14px */
--text-base: 1rem;     /* 16px */
--text-lg: 1.125rem;   /* 18px */
--text-xl: 1.25rem;    /* 20px */
--text-2xl: 1.5rem;    /* 24px */
--text-3xl: 1.875rem;  /* 30px */
--text-4xl: 2.25rem;   /* 36px */

/* Weights */
--font-normal: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;
```

### 2.5 Spacing System

```css
--space-1: 0.25rem;   /* 4px */
--space-2: 0.5rem;    /* 8px */
--space-3: 0.75rem;   /* 12px */
--space-4: 1rem;      /* 16px */
--space-5: 1.25rem;   /* 20px */
--space-6: 1.5rem;    /* 24px */
--space-8: 2rem;      /* 32px */
--space-10: 2.5rem;   /* 40px */
--space-12: 3rem;     /* 48px */
--space-16: 4rem;     /* 64px */
```

---

## 3. Component Library (ShadCN UI Based)

### 3.1 Core Components

```typescript
// Button variants
<Button variant="primary">Buy Now</Button>
<Button variant="secondary">Add to Cart</Button>
<Button variant="outline">View Details</Button>
<Button variant="ghost">Cancel</Button>
<Button variant="danger">Delete</Button>
<Button variant="success">Confirm</Button>

// Currency-aware price display
<Price amount={5000} currency="ETB" />
// Output: "ETB 5,000" or "ኢት. ብር 5,000"

// AU Balance card
<AUBalanceCard currency="ETB" balance={5000} type="available" />
// Shows: "AU-ETB: 5,000" with gold AU icon

// Verification badge
<VerificationBadge level={2} type="seller" />
// Shows: "✓ Verified Seller" with green check

// Provider selection card
<ProviderCard
  id="chapa"
  name="Chapa"
  logo="/chapa.svg"
  currencies={["ETB"]}
  onClick={handleSelect}
/>

// Sync status indicator
<SyncStatus status="pending" message="Saved — will sync when online" />

// Data saver toggle
<DataSaverToggle enabled={true} onChange={toggleDataSaver} />
```

### 3.2 Layout Components

```typescript
// Main layout
<AdbarLayout>
  <Header>
    <Logo />
    <SearchBar />
    <Navigation />
    <UserMenu />
    <CartIcon />
    <LanguageToggle />  {/* EN | አማ */}
    <DataSaverToggle />
  </Header>
  <Main>{children}</Main>
  <Footer />
</AdbarLayout>

// Store layout
<StoreLayout>
  <StoreHeader store={store} />
  <StoreTabs>
    <Tab label="Products" />
    <Tab label="About" />
    <Tab label="Reviews" />
  </StoreTabs>
  <StoreContent>{children}</StoreContent>
</StoreLayout>

// Admin layout
<AdminLayout>
  <AdminSidebar>
    <AdminNav>
      <NavItem icon="users" label="Users" />
      <NavItem icon="orders" label="Orders" />
      <NavItem icon="products" label="Products" />
      <NavItem icon="payments" label="Payments" />
      <NavItem icon="wallet" label="Wallets (AU)" />
      <NavItem icon="kyc" label="KYC" />
      <NavItem icon="ussd" label="USSD Health" />
      <NavItem icon="analytics" label="Analytics" />
    </AdminNav>
  </AdminSidebar>
  <AdminMain>{children}</AdminMain>
</AdminLayout>
```

---

## 4. Key User Flows

### 4.1 ETB Payment Flow (Section 13.2)

```
┌─────────────────────────────────────────────────────────────┐
│                    CHECKOUT PAGE                              │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  Select Currency:                                        │ │
│  │  ┌─────────────┐  ┌─────────────────────┐               │ │
│  │  │ 🇪🇹 ETB     │  │ 🌍 International    │               │ │
│  │  │ (selected)  │  │ (USD/EUR/GBP)       │               │ │
│  │  └─────────────┘  └─────────────────────┘               │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  Select Payment Method (ETB):                            │ │
│  │                                                          │ │
│  │  ┌─────────────────┐  ┌─────────────────┐               │ │
│  │  │  [Chapa Logo]   │  │ [SantimPay Logo]│               │ │
│  │  │  Chapa          │  │  SantimPay      │               │ │
│  │  │  Cards, Bank,   │  │  Bank, Mobile   │               │ │
│  │  │  Mobile Money   │  │  Money          │               │ │
│  │  │                 │  │                 │               │ │
│  │  │  (selectable)   │  │  (selectable)   │               │ │
│  │  └─────────────────┘  └─────────────────┘               │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  Order Summary:                                          │ │
│  │  Subtotal:        ETB 4,500                              │ │
│  │  Shipping:        ETB 200                                │ │
│  │  ─────────────────────────                               │ │
│  │  Total:           ETB 4,700                              │ │
│  │                                                          │ │
│  │  [Pay ETB 4,700 via Chapa]                              │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 AU Wallet View (Section 13.9)

```
┌─────────────────────────────────────────────────────────────┐
│                    MY WALLET                                 │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  💰 Adbar Unit (AU) Balances                            │ │
│  │                                                          │ │
│  │  ┌───────────────────────────────────────────────────┐  │ │
│  │  │  🇪🇹 AU-ETB (Available)                           │  │ │
│  │  │  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │  │ │
│  │  │  ETB 12,500.00                                    │  │ │
│  │  │  [Withdraw] [View History]                        │  │ │
│  │  └───────────────────────────────────────────────────┘  │ │
│  │                                                          │ │
│  │  ┌───────────────────────────────────────────────────┐  │ │
│  │  │  🌍 AU-USD (Available)                            │  │ │
│  │  │  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │  │ │
│  │  │  USD 200.00                                       │  │ │
│  │  │  [Withdraw] [View History]                        │  │ │
│  │  └───────────────────────────────────────────────────┘  │ │
│  │                                                          │ │
│  │  ⚠️ Balances are kept separate by currency.             │ │
│  │     No conversion between currencies.                    │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  Recent Transactions                                     │ │
│  │  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │ │
│  │  +ETB 5,000  Order #1234 payment      Chapa    Today    │ │
│  │  -ETB 200    Withdrawal to bank       Chapa    Jun 20   │ │
│  │  +USD 50     Contract payment         Stripe   Jun 19   │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### 4.3 Quick Store Onboarding (Section 15.1)

```
┌─────────────────────────────────────────────────────────────┐
│                 CREATE YOUR STORE                            │
│                 ───────────────                              │
│                 Step 1 of 3: Basic Info                      │
│                                                               │
│  Store Name *                                                 │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  My Ethiopian Crafts Store                              │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
│  Phone Number * (+251)                                       │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  +251 912 345 678                                       │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  📱 We'll send a verification code to this number       │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
│  [Continue →]                                                 │
│                                                               │
│  ─── Why Adbar? ───                                          │
│  ✓ Free to start                                             │
│  ✓ Get paid in ETB via Chapa/SantimPay                      │
│  ✓ Reach customers across Ethiopia                           │
│  ✓ Protected by Adbar escrow                                │
└─────────────────────────────────────────────────────────────┘

Step 2: Identity Verification (Fayda)
┌─────────────────────────────────────────────────────────────┐
│  Step 2 of 3: Verify Your Identity                           │
│                                                               │
│  Fayda National ID *                                         │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  XXXXX-XXXXX-XXXXX                                      │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
│  Upload ID Photo                                             │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  📷 [Take Photo] or [Upload File]                       │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  ℹ️ Verification happens in the background.             │ │
│  │     Your store can go live immediately as               │ │
│  │     "Pending Verification" — but payouts will be        │ │
│  │     held until verification completes.                  │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
│  [Continue →]                                                 │
└─────────────────────────────────────────────────────────────┘

Step 3: First Product
┌─────────────────────────────────────────────────────────────┐
│  Step 3 of 3: List Your First Product                        │
│                                                               │
│  Product Name *                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  Handwoven Ethiopian Basket                             │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
│  Price (ETB) *                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  1,500                                                  │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
│  Product Photo *                                             │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  📷 [Add Photo]                                         │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
│  [Launch My Store →]                                         │
│                                                               │
│  🎉 Your store will be live as "New Seller — Verification   │
│     Pending" while we verify your Fayda ID.                  │
└─────────────────────────────────────────────────────────────┘
```

### 4.4 USSD Menu Flow (Section 14.1)

```
*801# → Adbar (አድባር)

Welcome to Adbar!
1. Check Balance
2. Order Status
3. Escrow Status
4. Request Withdrawal
5. Change Language

[User presses 1]

Your Balances:
AU-ETB: 12,500
AU-USD: 200

Reply:
1. Back to main
0. Exit

[User presses 2]

Enter Order Number:
[User enters: ORD123456]

Order #ORD123456
Status: Shipped
ETA: 2 days
Track: adbar.com/t/abc

SMS sent with details.
1. Back to main
0. Exit
```

---

## 5. Wireframes

### 5.1 Homepage

```
┌─────────────────────────────────────────────────────────────┐
│ 🌳 Adbar (አድባር)    [Search...]    EN|አᛗ  👤  🛒(3)     │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                                                          │ │
│  │           Welcome to Adbar (አድባር)                      │ │
│  │        Ethiopia's Marketplace & Freelance Hub            │ │
│  │                                                          │ │
│  │     [Shop Products]  [Find Freelancers]  [Sell Now]     │ │
│  │                                                          │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
│  Shop by Category                                             │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐    │
│  │ 🏠   │ │ 👗   │ │ 📱   │ │ 🎨   │ │ 💻   │ │ 🏥   │    │
│  │Home  │ │Fashion│ │Elect.│ │Art   │ │Tech  │ │Health│    │
│  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘    │
│                                                               │
│  Featured Products                                            │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │ [img]    │ │ [img]    │ │ [img]    │ │ [img]    │       │
│  │ Product  │ │ Product  │ │ Product  │ │ Product  │       │
│  │ ETB 1500 │ │ ETB 800  │ │ ETB 2500 │ │ ETB 500  │       │
│  │ ⭐ 4.5   │ │ ⭐ 4.2   │ │ ⭐ 4.8   │ │ ⭐ 4.0   │       │
│  │ ✓ Verif. │ │ New      │ │ ✓ Verif. │ │ New      │       │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
│                                                               │
│  Top Freelancers                                              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │ 👤       │ │ 👤       │ │ 👤       │ │ 👤       │       │
│  │ Name     │ │ Name     │ │ Name     │ │ Name     │       │
│  │ Web Dev  │ │ Designer │ │ Writer   │ │ Marketer │       │
│  │ ETB 500/h│ │ ETB 800/h│ │ ETB 300/h│ │ ETB 400/h│       │
│  │ ⭐ 4.9   │ │ ⭐ 4.7   │ │ ⭐ 4.8   │ │ ⭐ 4.6   │       │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
│                                                               │
├─────────────────────────────────────────────────────────────┤
│  About Adbar | Sell | Freelance | Help | Terms | Privacy     │
│  © 2026 Adbar (አድባር). All rights reserved.                 │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 Admin Dashboard

```
┌─────────────────────────────────────────────────────────────┐
│ 🌳 Adbar Admin                              👤 Super Admin  │
├──────────┬──────────────────────────────────────────────────┤
│          │                                                   │
│ 📊 Dash  │  Dashboard Overview                               │
│ 👤 Users │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐   │
│ 🛒 Orders│  │ 10,234 │ │ 5,678  │ │ ETB 2M │ │ 89%    │   │
│ 📦 Prod  │  │ Users  │ │ Orders │ │ GMV    │ │ Success│   │
│ 💰 Pay   │  └────────┘ └────────┘ └────────┘ └────────┘   │
│ 🏦 Wallet│                                                   │
│ 🔍 KYC   │  Revenue by Currency                              │
│ ⚖️ Disp  │  ┌────────────────────────────────────────────┐  │
│ 📱 USSD  │  │  ████████████████  ETB: ETB 1,800,000     │  │
│ 📈 Anal  │  │  ████              USD: $3,200             │  │
│ 🎫 Tick  │  └────────────────────────────────────────────┘  │
│ ⚙️ Sett  │                                                   │
│          │  Payment Provider Performance                     │
│          │  ┌────────────────────────────────────────────┐  │
│          │  │ Chapa      ████████████████ 98.5% success  │  │
│          │  │ SantimPay  ███████████████░ 97.2% success  │  │
│          │  │ Stripe     ████████████████ 99.1% success  │  │
│          │  └────────────────────────────────────────────┘  │
│          │                                                   │
│          │  Pending Actions                                   │
│          │  ┌────────────────────────────────────────────┐  │
│          │  │ 🔴 23 KYC reviews pending                  │  │
│          │  │ 🟡 12 disputes awaiting resolution         │  │
│          │  │ 🟡 45 stores pending verification           │  │
│          │  │ 🟢 USSD gateway: Online                     │  │
│          │  │ 🟢 SMS delivery: 99.2%                      │  │
│          │  └────────────────────────────────────────────┘  │
└──────────┴──────────────────────────────────────────────────┘
```

---

## 6. Responsive Breakpoints

```css
/* Mobile First */
--breakpoint-sm: 640px;   /* Small tablets */
--breakpoint-md: 768px;   /* Tablets */
--breakpoint-lg: 1024px;  /* Laptops */
--breakpoint-xl: 1280px;  /* Desktops */
--breakpoint-2xl: 1536px; /* Large screens */
```

### Device Support Priority
1. **Mobile (320px-767px):** Primary target — most Ethiopian users
2. **Tablet (768px-1023px):** Secondary
3. **Desktop (1024px+):** Admin dashboard, seller tools

---

## 7. Accessibility Requirements

- **Color contrast:** Minimum 4.5:1 for text, 3:1 for large text
- **Touch targets:** Minimum 44x44px on mobile
- **Keyboard navigation:** All interactive elements focusable
- **Screen reader:** ARIA labels on all components
- **Reduced motion:** Respect `prefers-reduced-motion`
- **Font scaling:** Support up to 200% zoom
- **Language:** RTL support for Amharic (when needed)
