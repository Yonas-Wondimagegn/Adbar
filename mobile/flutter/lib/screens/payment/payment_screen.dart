import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../app/theme.dart';
import '../../services/payment_service.dart';
import '../../widgets/provider_card.dart';

class PaymentScreen extends ConsumerStatefulWidget {
  final String orderId;
  const PaymentScreen({super.key, required this.orderId});

  @override
  ConsumerState<PaymentScreen> createState() => _PaymentScreenState();
}

class _PaymentScreenState extends ConsumerState<PaymentScreen> {
  String? _selectedProvider;
  String _selectedCurrency = 'USD';
  bool _loading = false;

  static const _currencies = ['USD', 'EUR', 'GBP', 'JPY', 'CAD'];

  Future<void> _pay() async {
    if (_selectedProvider == null) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Select a payment provider')));
      return;
    }
    setState(() => _loading = true);
    try {
      await ref.read(paymentServiceProvider).processPayment(
            orderId: widget.orderId,
            provider: _selectedProvider!,
            currency: _selectedCurrency,
          );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Payment successful!'), backgroundColor: AppColors.success));
        context.go('/orders');
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Payment failed: $e'), backgroundColor: AppColors.error));
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final providersAsync = ref.watch(paymentProvidersProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Payment')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Select Currency', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              children: _currencies.map((c) => ChoiceChip(label: Text(c), selected: _selectedCurrency == c, onSelected: (_) => setState(() => _selectedCurrency = c))).toList(),
            ),
            const SizedBox(height: 24),
            Text('Payment Provider', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 12),
            providersAsync.when(
              data: (providers) => Column(
                children: providers.map((p) => ProviderCard(provider: p, isSelected: _selectedProvider == p.id, onTap: () => setState(() => _selectedProvider = p.id))).toList(),
              ),
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (e, _) => Text('Error: $e'),
            ),
            const SizedBox(height: 24),
            ElevatedButton(onPressed: _loading ? null : _pay, child: _loading ? const CircularProgressIndicator() : const Text('Pay Now')),
          ],
        ),
      ),
    );
  }
}
