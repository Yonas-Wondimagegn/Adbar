import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../app/theme.dart';
import '../../stores/auth_store.dart';
import '../../widgets/au_balance_card.dart';

class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authStoreProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Adbar'),
        actions: [
          IconButton(icon: const Icon(Icons.account_balance_wallet), onPressed: () => context.push('/wallet')),
          IconButton(icon: const Icon(Icons.person), onPressed: () => context.push('/profile')),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Welcome, ${authState.user?.name ?? 'User'}', style: Theme.of(context).textTheme.headlineSmall),
            const SizedBox(height: 16),
            const AuBalanceCard(),
            const SizedBox(height: 24),
            Text('Quick Actions', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 12),
            GridView.count(
              crossAxisCount: 2,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              mainAxisSpacing: 12,
              crossAxisSpacing: 12,
              childAspectRatio: 1.5,
              children: [
                _ActionCard(icon: Icons.shopping_bag, label: 'Products', onTap: () => context.push('/products')),
                _ActionCard(icon: Icons.work, label: 'Freelance', onTap: () => context.push('/jobs')),
                _ActionCard(icon: Icons.receipt_long, label: 'Orders', onTap: () => context.push('/orders')),
                _ActionCard(icon: Icons.shopping_cart, label: 'Cart', onTap: () => context.push('/cart')),
              ],
            ),
          ],
        ),
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: 0,
        destinations: const [
          NavigationDestination(icon: Icon(Icons.home), label: 'Home'),
          NavigationDestination(icon: Icon(Icons.shopping_bag), label: 'Products'),
          NavigationDestination(icon: Icon(Icons.work), label: 'Jobs'),
          NavigationDestination(icon: Icon(Icons.receipt), label: 'Orders'),
          NavigationDestination(icon: Icon(Icons.person), label: 'Profile'),
        ],
        onDestinationSelected: (i) {
          const routes = ['/home', '/products', '/jobs', '/orders', '/profile'];
          context.go(routes[i]);
        },
      ),
    );
  }
}

class _ActionCard extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;

  const _ActionCard({required this.icon, required this.label, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [Icon(icon, size: 32, color: AppColors.primary), const SizedBox(height: 8), Text(label, style: const TextStyle(fontWeight: FontWeight.w500))],
        ),
      ),
    );
  }
}
