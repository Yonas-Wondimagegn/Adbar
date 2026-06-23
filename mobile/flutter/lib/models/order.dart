class Order {
  final String id;
  final String status;
  final double total;
  final String date;
  final String deliveryAddress;
  final List<OrderItem> items;

  const Order({
    required this.id,
    required this.status,
    required this.total,
    required this.date,
    required this.deliveryAddress,
    this.items = const [],
  });

  factory Order.fromJson(Map<String, dynamic> json) => Order(
        id: json['id'] as String,
        status: json['status'] as String,
        total: (json['total'] as num).toDouble(),
        date: json['date'] as String,
        deliveryAddress: json['delivery_address'] as String? ?? '',
        items: (json['items'] as List?)?.map((e) => OrderItem.fromJson(e)).toList() ?? [],
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'status': status,
        'total': total,
        'date': date,
        'delivery_address': deliveryAddress,
        'items': items.map((e) => e.toJson()).toList(),
      };
}

class OrderItem {
  final String productId;
  final String productName;
  final int quantity;
  final double price;

  const OrderItem({required this.productId, required this.productName, required this.quantity, required this.price});

  factory OrderItem.fromJson(Map<String, dynamic> json) => OrderItem(
        productId: json['product_id'] as String,
        productName: json['product_name'] as String? ?? '',
        quantity: json['quantity'] as int,
        price: (json['price'] as num).toDouble(),
      );

  Map<String, dynamic> toJson() => {'product_id': productId, 'product_name': productName, 'quantity': quantity, 'price': price};
}
