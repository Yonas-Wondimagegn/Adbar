import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/user.dart';
import '../services/auth_service.dart';

class AuthState {
  final User? user;
  final bool isLoading;
  final String? error;

  const AuthState({this.user, this.isLoading = false, this.error});

  bool get isAuthenticated => user != null;

  AuthState copyWith({User? user, bool? isLoading, String? error}) {
    return AuthState(user: user ?? this.user, isLoading: isLoading ?? this.isLoading, error: error);
  }
}

class AuthStore extends StateNotifier<AuthState> {
  final AuthService _authService;

  AuthStore(this._authService) : super(const AuthState());

  Future<void> login(String email, String password) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final user = await _authService.login(email, password);
      state = AuthState(user: user);
    } catch (e) {
      state = AuthState(error: e.toString());
    }
  }

  Future<void> register(String name, String email, String password) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final user = await _authService.register(name, email, password);
      state = AuthState(user: user);
    } catch (e) {
      state = AuthState(error: e.toString());
    }
  }

  Future<void> logout() async {
    try {
      await _authService.logout();
    } finally {
      state = const AuthState();
    }
  }

  void setUser(User user) {
    state = AuthState(user: user);
  }
}

final authStoreProvider = StateNotifierProvider<AuthStore, AuthState>((ref) {
  return AuthStore(ref.watch(authServiceProvider));
});
