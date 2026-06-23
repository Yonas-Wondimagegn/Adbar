import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/product.dart';
import 'api_client.dart';

class ProductService {
  final ApiClient _api;
  ProductService(this._api);

  Future<List<Product>> getProducts({String? category, String? search, int page = 1}) async {
    final res = await _api.get('/products', query: {
      if (category != null) 'category': category,
      if (search != null) 'search': search,
      'page': page,
    });
    return (res.data['items'] as List).map((e) => Product.fromJson(e)).toList();
  }

  Future<Product> getProduct(String id) async {
    final res = await _api.get('/products/$id');
    return Product.fromJson(res.data);
  }

  Future<List<String>> getCategories() async {
    final res = await _api.get('/products/categories');
    return List<String>.from(res.data['categories']);
  }
}

final productServiceProvider = Provider<ProductService>((ref) => ProductService(ref.watch(apiClientProvider)));

// Riverpod async providers
final productsProvider = FutureProvider<List<Product>>((ref) {
  return ref.watch(productServiceProvider).getProducts();
});

final productDetailProvider = FutureProvider.family<Product, String>((ref, id) {
  return ref.watch(productServiceProvider).getProduct(id);
});
