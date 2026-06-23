import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/wallet.dart';
import 'api_client.dart';

class WalletService {
  final ApiClient _api;
  WalletService(this._api);

  Future<Wallet> getWallet() async {
    final res = await _api.get('/wallet');
    return Wallet.fromJson(res.data);
  }

  Future<List<BalanceEntry>> getBalances() async {
    final res = await _api.get('/wallet/balances');
    return (res.data['balances'] as List).map((e) => BalanceEntry.fromJson(e)).toList();
  }

  Future<List<Transaction>> getTransactions({int page = 1}) async {
    final res = await _api.get('/wallet/transactions', query: {'page': page});
    return (res.data['items'] as List).map((e) => Transaction.fromJson(e)).toList();
  }

  Future<void> deposit({required String currency, required String provider}) async {
    await _api.post('/wallet/deposit', data: {'currency': currency, 'provider': provider});
  }

  Future<void> withdraw({required String currency, required double amount, required String address}) async {
    await _api.post('/wallet/withdraw', data: {'currency': currency, 'amount': amount, 'address': address});
  }
}

final walletServiceProvider = Provider<WalletService>((ref) => WalletService(ref.watch(apiClientProvider)));

final walletProvider = FutureProvider<Wallet>((ref) {
  return ref.watch(walletServiceProvider).getWallet();
});
