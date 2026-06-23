import 'package:flutter_riverpod/flutter_riverpod.dart';

class CartItem {
  final String productId;
  final int quantity;

  const CartItem({required this.productId, this.quantity = 1});

  CartItem copyWith({String? productId, int? quantity}) {
    return CartItem(productId: productId ?? this.productId, quantity: quantity ?? this.quantity);
  }
}

class CartState {
  final List<CartItem> items;

  const CartState({this.items = const []});

  CartState copyWith({List<CartItem>? items}) {
    return CartState(items: items ?? this.items);
  }
}

class CartStore extends StateNotifier<CartState> {
  CartStore() : super(const CartState());

  void addItem(String productId) {
    final existing = state.items.indexWhere((i) => i.productId == productId);
    if (existing >= 0) {
      final updated = List<CartItem>.from(state.items);
      updated[existing] = updated[existing].copyWith(quantity: updated[existing].quantity + 1);
      state = state.copyWith(items: updated);
    } else {
      state = state.copyWith(items: [...state.items, CartItem(productId: productId)]);
    }
  }

  void removeItem(String productId) {
    state = state.copyWith(items: state.items.where((i) => i.productId != productId).toList());
  }

  void increment(String productId) {
    final idx = state.items.indexWhere((i) => i.productId == productId);
    if (idx >= 0) {
      final updated = List<CartItem>.from(state.items);
      updated[idx] = updated[idx].copyWith(quantity: updated[idx].quantity + 1);
      state = state.copyWith(items: updated);
    }
  }

  void decrement(String productId) {
    final idx = state.items.indexWhere((i) => i.productId == productId);
    if (idx >= 0) {
      final item = state.items[idx];
      if (item.quantity <= 1) {
        removeItem(productId);
      } else {
        final updated = List<CartItem>.from(state.items);
        updated[idx] = item.copyWith(quantity: item.quantity - 1);
        state = state.copyWith(items: updated);
      }
    }
  }

  void clear() {
    state = const CartState();
  }

  double get total {
    // In real app, would look up product prices
    return state.items.length * 29.99;
  }
}

final cartStoreProvider = StateNotifierProvider<CartStore, CartState>((ref) {
  return CartStore();
});
