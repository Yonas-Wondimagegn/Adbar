import 'package:flutter/material.dart';
import '../../app/theme.dart';
import '../../models/payment.dart';

class ProviderCard extends StatelessWidget {
  final PaymentProvider provider;
  final bool isSelected;
  final VoidCallback onTap;

  const ProviderCard({super.key, required this.provider, required this.isSelected, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: isSelected ? AppColors.primary : AppColors.cardBorder, width: isSelected ? 2 : 0.5),
      ),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              CircleAvatar(backgroundColor: AppColors.primary.withOpacity(0.1), child: Icon(Icons.payment, color: AppColors.primary)),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(provider.name, style: const TextStyle(fontWeight: FontWeight.w600)),
                    if (provider.description.isNotEmpty) Text(provider.description, style: const TextStyle(color: Colors.grey, fontSize: 12)),
                  ],
                ),
              ),
              if (isSelected) const Icon(Icons.check_circle, color: AppColors.primary) else const Icon(Icons.circle_outlined, color: Colors.grey),
            ],
          ),
        ),
      ),
    );
  }
}
