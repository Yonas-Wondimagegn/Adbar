import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../screens/auth/login_screen.dart';
import '../screens/auth/register_screen.dart';
import '../screens/home/home_screen.dart';
import '../screens/product/product_list_screen.dart';
import '../screens/product/product_detail_screen.dart';
import '../screens/order/cart_screen.dart';
import '../screens/order/checkout_screen.dart';
import '../screens/order/order_list_screen.dart';
import '../screens/payment/payment_screen.dart';
import '../screens/wallet/wallet_screen.dart';
import '../screens/freelance/job_list_screen.dart';
import '../screens/freelance/job_detail_screen.dart';
import '../screens/profile/profile_screen.dart';
import '../stores/auth_store.dart';

final goRouterProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authStoreProvider);

  return GoRouter(
    initialLocation: '/login',
    redirect: (context, state) {
      final isLoggedIn = authState.isAuthenticated;
      final isAuthRoute = state.matchedLocation == '/login' ||
          state.matchedLocation == '/register';

      if (!isLoggedIn && !isAuthRoute) return '/login';
      if (isLoggedIn && isAuthRoute) return '/home';
      return null;
    },
    routes: [
      GoRoute(path: '/login', builder: (_, __) => const LoginScreen()),
      GoRoute(path: '/register', builder: (_, __) => const RegisterScreen()),
      GoRoute(path: '/home', builder: (_, __) => const HomeScreen()),
      GoRoute(path: '/products', builder: (_, __) => const ProductListScreen()),
      GoRoute(
        path: '/products/:id',
        builder: (context, state) => ProductDetailScreen(
          productId: state.pathParameters['id']!,
        ),
      ),
      GoRoute(path: '/cart', builder: (_, __) => const CartScreen()),
      GoRoute(path: '/checkout', builder: (_, __) => const CheckoutScreen()),
      GoRoute(path: '/orders', builder: (_, __) => const OrderListScreen()),
      GoRoute(
        path: '/payment/:orderId',
        builder: (context, state) => PaymentScreen(
          orderId: state.pathParameters['orderId']!,
        ),
      ),
      GoRoute(path: '/wallet', builder: (_, __) => const WalletScreen()),
      GoRoute(path: '/jobs', builder: (_, __) => const JobListScreen()),
      GoRoute(
        path: '/jobs/:id',
        builder: (context, state) => JobDetailScreen(
          jobId: state.pathParameters['id']!,
        ),
      ),
      GoRoute(path: '/profile', builder: (_, __) => const ProfileScreen()),
    ],
  );
});
