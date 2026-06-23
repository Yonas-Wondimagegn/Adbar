import 'package:flutter/material.dart';
import '../../app/theme.dart';

class AuBalanceCard extends StatelessWidget {
  final String? currency;
  final double? balance;
  final String? symbol;

  const AuBalanceCard({super.key, this.currency, this.balance, this.symbol});

  @override
  Widget build(BuildContext context) {
    final isSpecific = currency != null && balance != null;

    return Card(
      color: AppColors.primary.withOpacity(0.05),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: isSpecific
            ? Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('$currency Balance', style: const TextStyle(fontWeight: FontWeight.w500, color: Colors.grey)),
                      const SizedBox(height: 4),
                      Text('${symbol ?? ''}${balance!.toStringAsFixed(2)} AU', style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: AppColors.primary)),
                    ],
                  ),
                  const Icon(Icons.account_balance_wallet, size: 32, color: AppColors.primary),
                ],
              )
            : const Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Total AU Balance', style: TextStyle(fontWeight: FontWeight.w500, color: Colors.grey)),
                      SizedBox(height: 4),
                      Text('View per-currency balances', style: TextStyle(fontSize: 16, color: AppColors.primary)),
                    ],
                  ),
                  Icon(Icons.account_balance_wallet, size: 32, color: AppColors.primary),
                ],
              ),
      ),
    );
  }
}
