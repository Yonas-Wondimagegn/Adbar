import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../app/theme.dart';
import '../../stores/cart_store.dart';
import '../../services/order_service.dart';

class CheckoutScreen extends ConsumerStatefulWidget {
  const CheckoutScreen({super.key});

  @override
  ConsumerState<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends ConsumerState<CheckoutScreen> {
  final _addressCtrl = TextEditingController();
  final _notesCtrl = TextEditingController();
  bool _loading = false;

  @override
  void dispose() {
    _addressCtrl.dispose();
    _notesCtrl.dispose();
    super.dispose();
  }

  Future<void> _placeOrder() async {
    if (_addressCtrl.text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please enter a delivery address')));
      return;
    }
    setState(() => _loading = true);
    try {
      final order = await ref.read(orderServiceProvider).createOrder(
            items: ref.read(cartStoreProvider).items,
            address: _addressCtrl.text,
            notes: _notesCtrl.text,
          );
      ref.read(cartStoreProvider.notifier).clear();
      if (mounted) {
        context.go('/payment/${order.id}');
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Order failed: $e'), backgroundColor: AppColors.error));
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final total = ref.watch(cartStoreProvider.notifier).total;

    return Scaffold(
      appBar: AppBar(title: const Text('Checkout')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Delivery Address', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 8),
            TextField(controller: _addressCtrl, decoration: const InputDecoration(hintText: 'Enter delivery address'), maxLines: 2),
            const SizedBox(height: 16),
            Text('Notes (optional)', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 8),
            TextField(controller: _notesCtrl, decoration: const InputDecoration(hintText: 'Delivery instructions'), maxLines: 2),
            const SizedBox(height: 24),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [const Text('Total', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)), Text('\$${total.toStringAsFixed(2)}', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.primary))],
                ),
              ),
            ),
            const SizedBox(height: 24),
            ElevatedButton(onPressed: _loading ? null : _placeOrder, child: _loading ? const CircularProgressIndicator() : const Text('Place Order')),
          ],
        ),
      ),
    );
  }
}
