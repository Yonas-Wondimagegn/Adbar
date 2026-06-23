import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../app/theme.dart';
import '../../stores/auth_store.dart';
import '../../stores/ui_store.dart';

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authStoreProvider);
    final user = authState.user;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Profile'),
        actions: [
          IconButton(icon: const Icon(Icons.settings), onPressed: () {}),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            CircleAvatar(radius: 48, backgroundColor: AppColors.primary.withOpacity(0.1), child: Text(user?.name.substring(0, 1).toUpperCase() ?? 'U', style: const TextStyle(fontSize: 32, color: AppColors.primary, fontWeight: FontWeight.bold))),
            const SizedBox(height: 12),
            Text(user?.name ?? 'User', style: Theme.of(context).textTheme.headlineSmall),
            Text(user?.email ?? '', style: const TextStyle(color: Colors.grey)),
            const SizedBox(height: 24),
            Card(
              child: Column(
                children: [
                  _ProfileTile(icon: Icons.person, title: 'Edit Profile', onTap: () {}),
                  const Divider(height: 1),
                  _ProfileTile(icon: Icons.account_balance_wallet, title: 'Wallet', onTap: () => context.push('/wallet')),
                  const Divider(height: 1),
                  _ProfileTile(icon: Icons.receipt_long, title: 'Order History', onTap: () => context.push('/orders')),
                  const Divider(height: 1),
                  _ProfileTile(icon: Icons.notifications, title: 'Notifications', onTap: () {}),
                  const Divider(height: 1),
                  Consumer(
                    builder: (context, ref, _) {
                      final uiState = ref.watch(uiStoreProvider);
                      return SwitchListTile(
                        secondary: const Icon(Icons.dark_mode),
                        title: const Text('Dark Mode'),
                        value: uiState.themeMode == ThemeMode.dark,
                        onChanged: (_) => ref.read(uiStoreProvider.notifier).toggleTheme(),
                      );
                    },
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: () {
                  ref.read(authStoreProvider.notifier).logout();
                  context.go('/login');
                },
                icon: const Icon(Icons.logout, color: AppColors.error),
                label: const Text('Logout', style: TextStyle(color: AppColors.error)),
                style: OutlinedButton.styleFrom(side: const BorderSide(color: AppColors.error)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ProfileTile extends StatelessWidget {
  final IconData icon;
  final String title;
  final VoidCallback onTap;

  const _ProfileTile({required this.icon, required this.title, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return ListTile(leading: Icon(icon, color: AppColors.primary), title: Text(title), trailing: const Icon(Icons.chevron_right), onTap: onTap);
  }
}
