class Wallet {
  final String userId;
  final List<BalanceEntry> balances;
  final List<Transaction> transactions;

  const Wallet({required this.userId, this.balances = const [], this.transactions = const []});

  factory Wallet.fromJson(Map<String, dynamic> json) => Wallet(
        userId: json['user_id'] as String,
        balances: (json['balances'] as List?)?.map((e) => BalanceEntry.fromJson(e)).toList() ?? [],
        transactions: (json['transactions'] as List?)?.map((e) => Transaction.fromJson(e)).toList() ?? [],
      );
}

class BalanceEntry {
  final String currency;
  final double balance;
  final String symbol;

  const BalanceEntry({required this.currency, required this.balance, this.symbol = ''});

  factory BalanceEntry.fromJson(Map<String, dynamic> json) => BalanceEntry(
        currency: json['currency'] as String,
        balance: (json['balance'] as num).toDouble(),
        symbol: json['symbol'] as String? ?? '',
      );
}

class WalletTransaction {
  final String id;
  final String type;
  final double amount;
  final String currency;
  final String description;
  final String date;

  const WalletTransaction({required this.id, required this.type, required this.amount, required this.currency, required this.description, required this.date});

  factory WalletTransaction.fromJson(Map<String, dynamic> json) => WalletTransaction(
        id: json['id'] as String,
        type: json['type'] as String,
        amount: (json['amount'] as num).toDouble(),
        currency: json['currency'] as String? ?? '',
        description: json['description'] as String? ?? '',
        date: json['date'] as String,
      );
}
