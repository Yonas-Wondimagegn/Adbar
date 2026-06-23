import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../app/theme.dart';
import '../../stores/cart_store.dart';

class CartScreen extends ConsumerWidget {
  const CartScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final cart = ref.watch(cartStoreProvider);
    final total = ref.watch(cartStoreProvider.notifier).total;

    return Scaffold(
      appBar: AppBar(title: const Text('Cart')),
      body: cart.items.isEmpty
          ? const Center(child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [Icon(Icons.shopping_cart_outlined, size: 64, color: Colors.grey), SizedBox(height: 16), Text('Your cart is empty')]))
          : ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: cart.items.length,
              itemBuilder: (context, i) {
                final item = cart.items[i];
                return Card(
                  margin: const EdgeInsets.only(bottom: 12),
                  child: ListTile(
                    leading: const Icon(Icons.shopping_bag),
                    title: Text('Product ${item.productId}'),
                    subtitle: Text('Qty: ${item.quantity}'),
                    trailing: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        IconButton(icon: const Icon(Icons.remove_circle_outline), onPressed: () => ref.read(cartStoreProvider.notifier).decrement(item.productId)),
                        Text('${item.quantity}', style: const TextStyle(fontWeight: FontWeight.bold)),
                        IconButton(icon: const Icon(Icons.add_circle_outline), onPressed: () => ref.read(cartStoreProvider.notifier).increment(item.productId)),
                        IconButton(icon: const Icon(Icons.delete, color: AppColors.error), onPressed: () => ref.read(cartStoreProvider.notifier).removeItem(item.productId)),
                      ],
                    ),
                  ),
                );
              },
            ),
      bottomNavigationBar: cart.items.isEmpty
          ? null
          : SafeArea(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [const Text('Total:', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)), Text('\$${total.toStringAsFixed(2)}', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.primary))]),
                    const SizedBox(height: 12),
                    ElevatedButton(onPressed: () => context.push('/checkout'), child: const Text('Proceed to Checkout')),
                  ],
                ),
              ),
            ),
    );
  }
}
