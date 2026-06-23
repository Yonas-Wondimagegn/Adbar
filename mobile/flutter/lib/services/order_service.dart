import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/order.dart';
import '../stores/cart_store.dart';
import 'api_client.dart';

class OrderService {
  final ApiClient _api;
  OrderService(this._api);

  Future<List<Order>> getOrders() async {
    final res = await _api.get('/orders');
    return (res.data['items'] as List).map((e) => Order.fromJson(e)).toList();
  }

  Future<Order> getOrder(String id) async {
    final res = await _api.get('/orders/$id');
    return Order.fromJson(res.data);
  }

  Future<Order> createOrder({required List<CartItem> items, required String address, String notes = ''}) async {
    final res = await _api.post('/orders', data: {
      'items': items.map((i) => {'product_id': i.productId, 'quantity': i.quantity}).toList(),
      'delivery_address': address,
      'notes': notes,
    });
    return Order.fromJson(res.data);
  }

  Future<void> cancelOrder(String id) async {
    await _api.post('/orders/$id/cancel');
  }
}

final orderServiceProvider = Provider<OrderService>((ref) => OrderService(ref.watch(apiClientProvider)));

final ordersProvider = FutureProvider<List<Order>>((ref) {
  return ref.watch(orderServiceProvider).getOrders();
});
