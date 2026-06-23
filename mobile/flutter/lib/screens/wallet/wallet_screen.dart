import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../app/theme.dart';
import '../../services/wallet_service.dart';
import '../../widgets/au_balance_card.dart';

class WalletScreen extends ConsumerWidget {
  const WalletScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final walletAsync = ref.watch(walletProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Wallet'),
        actions: [
          IconButton(icon: const Icon(Icons.history), onPressed: () {}),
        ],
      ),
      body: walletAsync.when(
        data: (wallet) => SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('AU Balances', style: Theme.of(context).textTheme.titleLarge),
              const SizedBox(height: 4),
              Text('Balances are shown per currency and never merged', style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Colors.grey)),
              const SizedBox(height: 16),
              ...wallet.balances.map((b) => Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: AuBalanceCard(currency: b.currency, balance: b.balance, symbol: b.symbol),
                  )),
              const SizedBox(height: 24),
              Row(
                children: [
                  Expanded(child: ElevatedButton.icon(onPressed: () {}, icon: const Icon(Icons.add), label: const Text('Deposit'))),
                  const SizedBox(width: 12),
                  Expanded(child: OutlinedButton.icon(onPressed: () {}, icon: const Icon(Icons.arrow_upward), label: const Text('Withdraw'))),
                ],
              ),
              const SizedBox(height: 24),
              Text('Recent Transactions', style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 12),
              ...wallet.transactions.take(10).map((t) => Card(
                    margin: const EdgeInsets.only(bottom: 8),
                    child: ListTile(
                      leading: Icon(t.type == 'credit' ? Icons.arrow_downward : Icons.arrow_upward, color: t.type == 'credit' ? AppColors.success : AppColors.error),
                      title: Text(t.description),
                      subtitle: Text(t.date),
                      trailing: Text('${t.type == 'credit' ? '+' : '-'}${t.amount}', style: TextStyle(fontWeight: FontWeight.bold, color: t.type == 'credit' ? AppColors.success : AppColors.error)),
                    ),
                  )),
            ],
          ),
        ),
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('Error: $e')),
      ),
    );
  }
}
