import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/payment.dart';
import 'api_client.dart';

class PaymentService {
  final ApiClient _api;
  PaymentService(this._api);

  Future<List<PaymentProvider>> getProviders() async {
    final res = await _api.get('/payments/providers');
    return (res.data['providers'] as List).map((e) => PaymentProvider.fromJson(e)).toList();
  }

  Future<PaymentResult> processPayment({required String orderId, required String provider, required String currency}) async {
    final res = await _api.post('/payments/process', data: {
      'order_id': orderId,
      'provider': provider,
      'currency': currency,
    });
    return PaymentResult.fromJson(res.data);
  }

  Future<List<Transaction>> getTransactions() async {
    final res = await _api.get('/payments/transactions');
    return (res.data['items'] as List).map((e) => Transaction.fromJson(e)).toList();
  }
}

final paymentServiceProvider = Provider<PaymentService>((ref) => PaymentService(ref.watch(apiClientProvider)));

final paymentProvidersProvider = FutureProvider<List<PaymentProvider>>((ref) {
  return ref.watch(paymentServiceProvider).getProviders();
});
