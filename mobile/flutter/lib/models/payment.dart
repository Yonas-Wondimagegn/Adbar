class PaymentProvider {
  final String id;
  final String name;
  final String description;
  final String iconUrl;
  final List<String> supportedCurrencies;

  const PaymentProvider({
    required this.id,
    required this.name,
    this.description = '',
    this.iconUrl = '',
    this.supportedCurrencies = const [],
  });

  factory PaymentProvider.fromJson(Map<String, dynamic> json) => PaymentProvider(
        id: json['id'] as String,
        name: json['name'] as String,
        description: json['description'] as String? ?? '',
        iconUrl: json['icon_url'] as String? ?? '',
        supportedCurrencies: (json['supported_currencies'] as List?)?.cast<String>() ?? [],
      );
}

class PaymentResult {
  final String transactionId;
  final String status;
  final String? redirectUrl;

  const PaymentResult({required this.transactionId, required this.status, this.redirectUrl});

  factory PaymentResult.fromJson(Map<String, dynamic> json) => PaymentResult(
        transactionId: json['transaction_id'] as String,
        status: json['status'] as String,
        redirectUrl: json['redirect_url'] as String?,
      );
}

class Transaction {
  final String id;
  final String type;
  final double amount;
  final String currency;
  final String description;
  final String date;
  final String status;

  const Transaction({
    required this.id,
    required this.type,
    required this.amount,
    this.currency = '',
    this.description = '',
    required this.date,
    this.status = 'completed',
  });

  factory Transaction.fromJson(Map<String, dynamic> json) => Transaction(
        id: json['id'] as String,
        type: json['type'] as String,
        amount: (json['amount'] as num).toDouble(),
        currency: json['currency'] as String? ?? '',
        description: json['description'] as String? ?? '',
        date: json['date'] as String,
        status: json['status'] as String? ?? 'completed',
      );
}
