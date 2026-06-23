class Product {
  final String id;
  final String name;
  final String description;
  final double price;
  final String imageUrl;
  final String sellerName;
  final String category;
  final double rating;
  final int reviewCount;
  final bool inStock;

  const Product({
    required this.id,
    required this.name,
    required this.description,
    required this.price,
    required this.imageUrl,
    required this.sellerName,
    required this.category,
    this.rating = 0,
    this.reviewCount = 0,
    this.inStock = true,
  });

  factory Product.fromJson(Map<String, dynamic> json) => Product(
        id: json['id'] as String,
        name: json['name'] as String,
        description: json['description'] as String? ?? '',
        price: (json['price'] as num).toDouble(),
        imageUrl: json['image_url'] as String? ?? '',
        sellerName: json['seller_name'] as String? ?? '',
        category: json['category'] as String? ?? '',
        rating: (json['rating'] as num?)?.toDouble() ?? 0,
        reviewCount: json['review_count'] as int? ?? 0,
        inStock: json['in_stock'] as bool? ?? true,
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'description': description,
        'price': price,
        'image_url': imageUrl,
        'seller_name': sellerName,
        'category': category,
        'rating': rating,
        'review_count': reviewCount,
        'in_stock': inStock,
      };
}
