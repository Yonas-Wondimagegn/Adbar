# Adbar (አድባር) — Mobile Architecture & AI Recommendations

**Version:** 1.0.0  
**Date:** 2026-06-21  

---

## 1. Mobile Architecture (Flutter)

### 1.1 App Structure

```
mobile/flutter/
├── lib/
│   ├── main.dart
│   ├── app/
│   │   ├── app.dart
│   │   ├── routes.dart
│   │   └── theme.dart
│   ├── core/
│   │   ├── api/
│   │   │   ├── api_client.dart
│   │   │   ├── auth_api.dart
│   │   │   ├── product_api.dart
│   │   │   ├── order_api.dart
│   │   │   ├── payment_api.dart
│   │   │   └── wallet_api.dart
│   │   ├── constants/
│   │   ├── errors/
│   │   ├── utils/
│   │   └── extensions/
│   ├── data/
│   │   ├── models/
│   │   │   ├── user.dart
│   │   │   ├── product.dart
│   │   │   ├── order.dart
│   │   │   ├── wallet.dart
│   │   │   └── payment.dart
│   │   ├── repositories/
│   │   └── datasources/
│   ├── domain/
│   │   ├── entities/
│   │   ├── repositories/
│   │   └── usecases/
│   ├── presentation/
│   │   ├── screens/
│   │   │   ├── auth/
│   │   │   ├── home/
│   │   │   ├── product/
│   │   │   ├── order/
│   │   │   ├── payment/
│   │   │   ├── wallet/
│   │   │   ├── freelance/
│   │   │   └── profile/
│   │   ├── widgets/
│   │   └── providers/
│   └── offline/
│       ├── database.dart
│       ├── sync_manager.dart
│       ├── queue_manager.dart
│       └── connectivity_service.dart
├── android/
├── ios/
├── test/
└── pubspec.yaml
```

### 1.2 Offline-First Architecture

```dart
// lib/offline/sync_manager.dart

class SyncManager {
  final LocalDatabase _db;
  final ApiClient _api;
  final ConnectivityService _connectivity;
  final QueueManager _queue;

  Stream<SyncStatus> get syncStatus => _syncStatusController.stream;
  final _syncStatusController = StreamController<SyncStatus>.broadcast();

  /// Initialize offline database
  Future<void> initialize() async {
    await _db.initialize();
    _connectivity.onConnectivityChanged.listen(_handleConnectivityChange);
  }

  /// Handle connectivity changes
  void _handleConnectivityChange(ConnectivityResult result) {
    if (result != ConnectivityResult.none) {
      _syncPendingActions();
    }
  }

  /// Queue an action for when online
  Future<void> queueAction(QueuedAction action) async {
    await _db.insertQueuedAction(action);
    _syncStatusController.add(SyncStatus.pending(action.description));
    
    if (await _connectivity.isOnline) {
      _syncPendingActions();
    }
  }

  /// Sync all pending actions
  Future<void> _syncPendingActions() async {
    final pending = await _db.getQueuedActions();
    
    for (final action in pending) {
      try {
        _syncStatusController.add(SyncStatus.syncing(action.description));
        
        switch (action.type) {
          case QueuedActionType.addToCart:
            await _api.addToCart(action.payload);
            break;
          case QueuedActionType.updateCart:
            await _api.updateCart(action.payload);
            break;
          case QueuedActionType.addToWishlist:
            await _api.addToWishlist(action.payload);
            break;
          case QueuedActionType.updateOrderStatus:
            await _api.updateOrderStatus(action.payload);
            break;
          case QueuedActionType.sendMessage:
            await _api.sendMessage(action.payload);
            break;
        }
        
        await _db.markActionCompleted(action.id);
        _syncStatusController.add(SyncStatus.completed(action.description));
      } catch (e) {
        await _db.incrementRetryCount(action.id);
        _syncStatusController.add(SyncStatus.failed(action.description, e));
      }
    }
  }

  /// Cache product catalog for offline browsing
  Future<void> cacheProductCatalog(List<Product> products) async {
    await _db.cacheProducts(products);
  }

  /// Get cached products (works offline)
  Future<List<Product>> getCachedProducts({String? categoryId}) async {
    return _db.getCachedProducts(categoryId: categoryId);
  }
}

enum SyncStatusType { idle, pending, syncing, completed, failed }

class SyncStatus {
  final SyncStatusType type;
  final String? message;
  
  SyncStatus._(this.type, [this.message]);
  
  factory SyncStatus.pending(String action) => 
      SyncStatus._(SyncStatusType.pending, "Saved — will sync when online: $action");
  factory SyncStatus.syncing(String action) => 
      SyncStatus._(SyncStatusType.syncing, "Syncing: $action");
  factory SyncStatus.completed(String action) => 
      SyncStatus._(SyncStatusType.completed, "Synced: $action");
  factory SyncStatus.failed(String action, dynamic error) => 
      SyncStatus._(SyncStatusType.failed, "Failed: $action - $error");
}
```

### 1.3 Offline Database Schema

```dart
// lib/offline/database.dart

@Database(version: 1, entities: [
  CachedProduct,
  CachedCategory,
  QueuedAction,
  CachedOrder,
  CachedConversation,
])
abstract class LocalDatabase extends FloorLocalDatabase {
  ProductDao get productDao;
  QueuedActionDao get queuedActionDao;
  OrderDao get orderDao;
}

@Entity(tableName: 'cached_products')
class CachedProduct {
  @PrimaryKey()
  final String id;
  final String name;
  final String slug;
  final double price;
  final String currency;
  final String? imageUrl;
  final String? categoryId;
  final double? rating;
  final DateTime cachedAt;
  
  CachedProduct({
    required this.id,
    required this.name,
    required this.slug,
    required this.price,
    required this.currency,
    this.imageUrl,
    this.categoryId,
    this.rating,
    required this.cachedAt,
  });
}

@Entity(tableName: 'queued_actions')
class QueuedAction {
  @PrimaryKey(autoGenerate: true)
  final int? id;
  final String type;
  final String payload; // JSON
  final String description;
  final int retryCount;
  final DateTime createdAt;
  
  QueuedAction({
    this.id,
    required this.type,
    required this.payload,
    required this.description,
    this.retryCount = 0,
    required this.createdAt,
  });
}
```

### 1.4 Data-Saver Mode

```dart
// lib/presentation/widgets/adaptive_image.dart

class AdaptiveImage extends StatelessWidget {
  final String imageUrl;
  final double? width;
  final double? height;
  final BoxFit fit;

  const AdaptiveImage({
    required this.imageUrl,
    this.width,
    this.height,
    this.fit = BoxFit.cover,
  });

  @override
  Widget build(BuildContext context) {
    final dataSaver = context.watch<SettingsProvider>().dataSaverMode;
    
    // Append quality parameter based on data saver setting
    final optimizedUrl = dataSaver
        ? '$imageUrl?q=40&w=${(width ?? 200).toInt()}'
        : '$imageUrl?q=80&w=${(width ?? 400).toInt()}';

    return CachedNetworkImage(
      imageUrl: optimizedUrl,
      width: width,
      height: height,
      fit: fit,
      placeholder: (context, url) => ShimmerPlaceholder(
        width: width,
        height: height,
      ),
      errorWidget: (context, url, error) => Icon(Icons.image_not_supported),
    );
  }
}
```

### 1.5 Payment Screen (Mobile)

```dart
// lib/presentation/screens/payment/payment_screen.dart

class PaymentScreen extends ConsumerStatefulWidget {
  final String orderId;
  final double amount;
  final String currency;

  const PaymentScreen({
    required this.orderId,
    required this.amount,
    required this.currency,
  });

  @override
  ConsumerState<PaymentScreen> createState() => _PaymentScreenState();
}

class _PaymentScreenState extends ConsumerState<PaymentScreen> {
  String? selectedProviderId;

  @override
  Widget build(BuildContext context) {
    final providers = ref.watch(paymentProvidersProvider(widget.currency));
    final dataSaver = ref.watch(settingsProvider).dataSaverMode;

    return Scaffold(
      appBar: AppBar(title: Text('Payment')),
      body: Column(
        children: [
          // Order summary
          OrderSummaryCard(
            orderId: widget.orderId,
            amount: widget.amount,
            currency: widget.currency,
          ),
          
          // Provider selection
          Padding(
            padding: EdgeInsets.all(16),
            child: Text(
              'Select Payment Method',
              style: Theme.of(context).textTheme.titleMedium,
            ),
          ),
          
          providers.when(
            data: (providers) => ListView.builder(
              shrinkWrap: true,
              itemCount: providers.length,
              itemBuilder: (context, index) {
                final provider = providers[index];
                return ProviderCard(
                  provider: provider,
                  isSelected: selectedProviderId == provider.id,
                  onTap: () => setState(() => selectedProviderId = provider.id),
                );
              },
            ),
            loading: () => Center(child: CircularProgressIndicator()),
            error: (e, _) => ErrorWidget(e),
          ),
          
          Spacer(),
          
          // Pay button
          Padding(
            padding: EdgeInsets.all(16),
            child: SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: selectedProviderId != null
                    ? () => _initiatePayment(context)
                    : null,
                child: Text('Pay ${widget.currency} ${widget.amount}'),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _initiatePayment(BuildContext context) async {
    final result = await ref.read(paymentProvider).initiatePayment(
      orderId: widget.orderId,
      providerId: selectedProviderId!,
      amount: widget.amount,
      currency: widget.currency,
    );

    if (result.checkoutUrl != null) {
      // Open in-app browser for hosted checkout
      final completed = await Navigator.push<bool>(
        context,
        MaterialPageRoute(
          builder: (_) => PaymentWebView(
            url: result.checkoutUrl!,
            orderId: widget.orderId,
          ),
        ),
      );

      if (completed == true) {
        Navigator.pop(context, true);
      }
    }
  }
}
```

### 1.6 Wallet Screen (Mobile) — Per-Currency Cards

```dart
// lib/presentation/screens/wallet/wallet_screen.dart

class WalletScreen extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final wallet = ref.watch(walletProvider);

    return Scaffold(
      appBar: AppBar(title: Text('My Wallet')),
      body: wallet.when(
        data: (wallet) => Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: EdgeInsets.all(16),
              child: Row(
                children: [
                  Icon(Icons.account_balance_wallet, color: Colors.amber),
                  SizedBox(width: 8),
                  Text(
                    'Adbar Unit (AU) Balances',
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                ],
              ),
            ),
            
            // CRITICAL: Show separate cards per currency, never merged
            ...wallet.balances.map((balance) => AUBalanceCard(
              currency: balance.currency,
              auLabel: 'AU-${balance.currency}',
              available: balance.available,
              pending: balance.pending,
              frozen: balance.frozen,
              onWithdraw: () => _showWithdrawDialog(context, balance.currency),
            )),
            
            Padding(
              padding: EdgeInsets.all(16),
              child: Text(
                'Balances are kept separate by currency. No conversion between currencies.',
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: Colors.grey[600],
                ),
              ),
            ),
            
            // Transaction history
            Expanded(
              child: TransactionList(walletId: wallet.id),
            ),
          ],
        ),
        loading: () => Center(child: CircularProgressIndicator()),
        error: (e, _) => ErrorWidget(e),
      ),
    );
  }
}

class AUBalanceCard extends StatelessWidget {
  final String currency;
  final String auLabel;
  final double available;
  final double pending;
  final double frozen;
  final VoidCallback onWithdraw;

  const AUBalanceCard({
    required this.currency,
    required this.auLabel,
    required this.available,
    required this.pending,
    required this.frozen,
    required this.onWithdraw,
  });

  @override
  Widget build(BuildContext context) {
    final currencyColor = currency == 'ETB' ? Color(0xFF1B5E20) : Color(0xFF1565C0);
    final flag = currency == 'ETB' ? '🇪🇹' : '🌍';

    return Card(
      margin: EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Padding(
        padding: EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Text(flag, style: TextStyle(fontSize: 24)),
                SizedBox(width: 8),
                Text(
                  '$auLabel (Available)',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    color: currencyColor,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
            SizedBox(height: 8),
            Text(
              '$currency ${available.toStringAsFixed(2)}',
              style: Theme.of(context).textTheme.headlineSmall,
            ),
            if (pending > 0) ...[
              SizedBox(height: 4),
              Text(
                'Pending: $currency ${pending.toStringAsFixed(2)}',
                style: TextStyle(color: Colors.orange),
              ),
            ],
            SizedBox(height: 12),
            Row(
              children: [
                ElevatedButton(
                  onPressed: onWithdraw,
                  child: Text('Withdraw'),
                ),
                SizedBox(width: 8),
                OutlinedButton(
                  onPressed: () => _viewHistory(context),
                  child: Text('History'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
```

---

## 2. AI Recommendation Architecture

### 2.1 System Design

```
┌─────────────────────────────────────────────────────────────┐
│                    AI MATCHING ENGINE                         │
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │  Data        │  │  Feature     │  │  Model       │       │
│  │  Pipeline    │──>│  Engineering │──>│  Training    │       │
│  │              │  │              │  │              │       │
│  │ - User events│  │ - User feats │  │ - Collaborative│      │
│  │ - Product    │  │ - Product    │  │   filtering  │       │
│  │   views      │  │   feats      │  │ - Content-   │       │
│  │ - Purchases  │  │ - Context    │  │   based      │       │
│  │ - Reviews    │  │   feats      │  │ - Hybrid     │       │
│  └──────────────┘  └──────────────┘  └──────┬───────┘       │
│                                              │                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────┴───────┐       │
│  │  Real-time   │  │  Model       │  │  Serving     │       │
│  │  Features    │──>│  Registry    │──>│  Layer       │       │
│  │              │  │              │  │              │       │
│  │ - Redis      │  │ - MLflow     │  │ - REST API   │       │
│  │ - Kafka      │  │ - Model      │  │ - gRPC       │       │
│  │   streams    │  │   versioning │  │ - Cache      │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Recommendation Service

```typescript
// backend/services/ai-matching/src/ai-matching.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { Redis } from 'ioredis';
import { PrismaService } from '@adbar/common';

@Injectable()
export class AiMatchingService {
  private readonly logger = new Logger(AiMatchingService.name);
  private readonly redis: Redis;

  constructor(private readonly prisma: PrismaService) {
    this.redis = new Redis(process.env.REDIS_URL);
  }

  // ========================================
  // Freelancer Matching
  // ========================================

  async matchFreelancers(jobId: string, limit: number = 10) {
    const job = await this.prisma.job.findUnique({
      where: { id: jobId },
      include: { skills: { include: { skill: true } } },
    });

    if (!job) throw new Error('Job not found');

    // Build scoring query
    const freelancers = await this.prisma.$queryRaw`
      SELECT 
        fp."userId",
        u."firstName",
        u."lastName",
        fp."hourlyRate",
        fp."averageRating",
        fp."completedJobs",
        fp."responseTime",
        -- Skill match score (0-100)
        (
          SELECT COUNT(*) * 100.0 / ${job.skills.length}
          FROM "freelancer_skills" fs
          WHERE fs."freelancerProfileId" = fp.id
          AND fs."skillId" IN (${job.skills.map(s => s.skillId).join(',')})
        ) AS skill_score,
        -- Availability score
        CASE fp."availability"
          WHEN 'full_time' THEN 100
          WHEN 'part_time' THEN 60
          ELSE 20
        END AS availability_score
      FROM "freelancer_profiles" fp
      JOIN users u ON u.id = fp."userId"
      WHERE fp."availability" != 'not_available'
      ORDER BY 
        (skill_score * 0.4 + 
         fp."averageRating" * 20 * 0.2 + 
         LEAST(fp."completedJobs" / 100.0, 1) * 100 * 0.15 +
         availability_score * 0.15 +
         CASE WHEN fp."hourlyRate" <= ${job.budgetMax} THEN 100 ELSE 50 END * 0.1
        ) DESC
      LIMIT ${limit}
    `;

    return freelancers;
  }

  // ========================================
  // Product Recommendations
  // ========================================

  async getProductRecommendations(userId: string, limit: number = 10) {
    // Check cache first
    const cacheKey = `rec:product:${userId}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    // Get user's recent activity
    const [viewedProducts, purchasedCategories, wishlistProducts] = await Promise.all([
      this.prisma.recentlyViewed.findMany({
        where: { userId },
        orderBy: { viewedAt: 'desc' },
        take: 50,
        include: { product: { include: { category: true } } },
      }),
      this.prisma.orderItem.findMany({
        where: { order: { buyerId: userId } },
        include: { product: { include: { category: true } } },
        take: 100,
      }),
      this.prisma.wishlistItem.findMany({
        where: { userId },
        include: { product: true },
        take: 50,
      }),
    ]);

    // Extract category preferences
    const categoryScores = new Map<string, number>();
    
    viewedProducts.forEach(v => {
      if (v.product.categoryId) {
        categoryScores.set(
          v.product.categoryId,
          (categoryScores.get(v.product.categoryId) || 0) + 1,
        );
      }
    });

    purchasedCategories.forEach(p => {
      if (p.product.categoryId) {
        categoryScores.set(
          p.product.categoryId,
          (categoryScores.get(p.product.categoryId) || 0) + 3,
        );
      }
    });

    wishlistProducts.forEach(w => {
      if (w.product.categoryId) {
        categoryScores.set(
          w.product.categoryId,
          (categoryScores.get(w.product.categoryId) || 0) + 2,
        );
      }
    });

    // Get top categories
    const topCategories = Array.from(categoryScores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([catId]) => catId);

    // Get recommended products
    const excludeIds = [
      ...viewedProducts.map(v => v.productId),
      ...purchasedCategories.map(p => p.productId),
      ...wishlistProducts.map(w => w.productId),
    ];

    const recommendations = await this.prisma.product.findMany({
      where: {
        status: 'ACTIVE',
        categoryId: { in: topCategories },
        id: { notIn: excludeIds },
      },
      orderBy: [
        { averageRating: 'desc' },
        { salesCount: 'desc' },
      ],
      take: limit,
      include: {
        store: { select: { name: { name: true } } },
        images: { where: { isPrimary: true }, take: 1 },
      },
    });

    // Cache for 1 hour
    await this.redis.setex(cacheKey, 3600, JSON.stringify(recommendations));

    return recommendations;
  }

  // ========================================
  // Job Recommendations for Freelancers
  // ========================================

  async getJobRecommendations(freelancerId: string, limit: number = 10) {
    const profile = await this.prisma.freelancerProfile.findUnique({
      where: { userId: freelancerId },
      include: { skills: { include: { skill: true } } },
    });

    if (!profile) throw new Error('Freelancer profile not found');

    const skillIds = profile.skills.map(s => s.skillId);

    const jobs = await this.prisma.job.findMany({
      where: {
        status: 'OPEN',
        skills: { some: { skillId: { in: skillIds } } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit * 2,
      include: {
        skills: { include: { skill: true } },
        client: { select: { firstName: true, lastName: true } },
      },
    });

    // Score and rank jobs
    const scoredJobs = jobs.map(job => {
      const matchingSkills = job.skills.filter(s => skillIds.includes(s.skillId));
      const skillScore = (matchingSkills.length / job.skills.length) * 100;
      
      const budgetScore = profile.hourlyRate && job.budgetMax
        ? (profile.hourlyRate <= parseFloat(job.budgetMax.toString()) ? 100 : 50)
        : 75;

      const totalScore = skillScore * 0.6 + budgetScore * 0.4;

      return { ...job, matchScore: totalScore };
    });

    return scoredJobs
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, limit);
  }

  // ========================================
  // Seller Recommendations
  // ========================================

  async getSellerRecommendations(userId: string, limit: number = 5) {
    // Based on followed stores, purchased categories
    const followedCategories = await this.prisma.$queryRaw`
      SELECT DISTINCT p."categoryId"
      FROM "followed_stores" fs
      JOIN products p ON p."storeId" = fs."storeId"
      WHERE fs."userId" = ${userId}
    `;

    const categoryIds = (followedCategories as any[]).map(c => c.categoryId);

    const sellers = await this.prisma.store.findMany({
      where: {
        status: 'ACTIVE',
        products: { some: { categoryId: { in: categoryIds } } },
      },
      orderBy: { averageRating: 'desc' },
      take: limit,
      include: {
        user: { select: { firstName: true } },
        _count: { select: { products: true } },
      },
    });

    return sellers;
  }
}
```

### 2.3 Feature Store

```typescript
// backend/services/ai-matching/src/feature-store/feature-store.service.ts

@Injectable()
export class FeatureStoreService {
  constructor(private readonly redis: Redis) {}

  // Real-time features (updated on each event)
  async updateUserFeatures(userId: string, event: UserEvent) {
    const key = `features:user:${userId}`;
    
    switch (event.type) {
      case 'product_view':
        await this.redis.hincrby(key, 'total_views', 1);
        await this.redis.hset(key, 'last_viewed_at', Date.now().toString());
        await this.redis.lpush(`features:user:${userId}:recent_views`, event.productId);
        await this.redis.ltrim(`features:user:${userId}:recent_views`, 0, 99);
        break;
      
      case 'purchase':
        await this.redis.hincrby(key, 'total_purchases', 1);
        await this.redis.hincrbyfloat(key, 'total_spent', event.amount);
        await this.redis.hset(key, 'last_purchase_at', Date.now().toString());
        break;
      
      case 'search':
        await this.redis.lpush(`features:user:${userId}:recent_searches`, event.query);
        await this.redis.ltrim(`features:user:${userId}:recent_searches`, 0, 49);
        break;
    }
  }

  async getUserFeatures(userId: string): Promise<UserFeatures> {
    const key = `features:user:${userId}`;
    const data = await this.redis.hgetall(key);
    const recentViews = await this.redis.lrange(`features:user:${userId}:recent_views`, 0, 9);
    const recentSearches = await this.redis.lrange(`features:user:${userId}:recent_searches`, 0, 4);

    return {
      totalViews: parseInt(data.total_views || '0'),
      totalPurchases: parseInt(data.total_purchases || '0'),
      totalSpent: parseFloat(data.total_spent || '0'),
      lastViewedAt: data.last_viewed_at ? new Date(parseInt(data.last_viewed_at)) : null,
      lastPurchaseAt: data.last_purchase_at ? new Date(parseInt(data.last_purchase_at)) : null,
      recentViews,
      recentSearches,
    };
  }
}
```

### 2.4 ML Model Training Pipeline

```python
# backend/services/ai-matching/ml/training/train_recommendations.py

import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from surprise import SVD, Dataset, Reader
import mlflow

def train_collaborative_filtering():
    """Train collaborative filtering model for product recommendations"""
    
    # Load interaction data
    interactions = pd.read_sql("""
        SELECT "userId", "productId", 
               CASE 
                   WHEN oi.id IS NOT NULL THEN 5  -- purchased
                   WHEN w."id" IS NOT NULL THEN 3  -- wishlisted
                   ELSE 1  -- viewed
               END as rating
        FROM "recently_viewed" rv
        LEFT JOIN "wishlist_items" w ON w."userId" = rv."userId" AND w."productId" = rv."productId"
        LEFT JOIN "order_items" oi ON oi."productId" = rv."productId"
        JOIN "orders" o ON o.id = oi."orderId" AND o."buyerId" = rv."userId"
    """, database_url)
    
    # Train SVD model
    reader = Reader(rating_scale=(1, 5))
    data = Dataset.load_from_df(interactions[['userId', 'productId', 'rating']], reader)
    trainset = data.build_full_trainset()
    
    model = SVD(n_factors=100, n_epochs=20, lr_all=0.005, reg_all=0.02)
    model.fit(trainset)
    
    # Log to MLflow
    with mlflow.start_run(run_name="collaborative_filtering"):
        mlflow.log_params({"n_factors": 100, "n_epochs": 20})
        mlflow.log_metric("rmse", compute_rmse(model, trainset))
        mlflow.sklearn.log_model(model, "svd_model")
    
    return model

def train_content_based():
    """Train content-based model for product similarity"""
    
    products = pd.read_sql("""
        SELECT p.id, p.name, p.description, p."categoryId",
               string_agg(t.name, ' ') as tags
        FROM products p
        LEFT JOIN "product_tags" pt ON pt."productId" = p.id
        LEFT JOIN tags t ON t.id = pt."tagId"
        WHERE p.status = 'ACTIVE'
        GROUP BY p.id
    """, database_url)
    
    # Create TF-IDF vectors
    products['content'] = products['name'] + ' ' + products['description'].fillna('') + ' ' + products['tags'].fillna('')
    
    tfidf = TfidfVectorizer(stop_words='english', max_features=5000)
    tfidf_matrix = tfidf.fit_transform(products['content'])
    
    # Compute similarity
    similarity_matrix = cosine_similarity(tfidf_matrix)
    
    return similarity_matrix, products['id'].tolist()
```

---

## 3. Analytics Architecture

### 3.1 Data Pipeline

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ Application │────>│    Kafka    │────>│  Stream     │────>│ Data        │
│ Events      │     │   Topics    │     │  Processor  │     │ Warehouse   │
│             │     │             │     │ (Flink)     │     │ (Redshift)  │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
                                                                   │
                                                                   ▼
                                                            ┌─────────────┐
                                                            │  Analytics  │
                                                            │  Dashboard  │
                                                            │  (Grafana)  │
                                                            └─────────────┘
```

### 3.2 Key Metrics Tracked

| Category | Metric | Granularity |
|----------|--------|-------------|
| Revenue | GMV by currency | Daily/Weekly/Monthly |
| Revenue | Platform commission | Daily/Weekly/Monthly |
| Revenue | AU balance distribution | Daily snapshot |
| Users | MAU, DAU, new registrations | Daily |
| Users | Verification completion rate | Weekly |
| Orders | Volume, value, status distribution | Daily |
| Orders | Average order value by currency | Weekly |
| Freelancers | Active, completed contracts, earnings | Weekly |
| Freelancers | Average contract value | Monthly |
| Payments | Success rate by provider | Real-time |
| Payments | Transaction volume by provider | Daily |
| Payments | Average transaction latency | Real-time |
| USSD | Session volume, completion rate | Daily |
| SMS | Delivery rate by provider | Daily |
| Disputes | Rate, resolution time | Weekly |
| Fraud | Blocked transactions, alerts | Real-time |
