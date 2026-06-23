import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/user.dart';
import 'api_client.dart';

class AuthService {
  final ApiClient _api;
  AuthService(this._api);

  Future<User> login(String email, String password) async {
    final res = await _api.post('/auth/login', data: {'email': email, 'password': password});
    return User.fromJson(res.data['user']);
  }

  Future<User> register(String name, String email, String password) async {
    final res = await _api.post('/auth/register', data: {'name': name, 'email': email, 'password': password});
    return User.fromJson(res.data['user']);
  }

  Future<void> logout() async {
    await _api.post('/auth/logout');
  }

  Future<User> getProfile() async {
    final res = await _api.get('/auth/me');
    return User.fromJson(res.data);
  }

  Future<User> updateProfile(Map<String, dynamic> data) async {
    final res = await _api.put('/auth/me', data: data);
    return User.fromJson(res.data);
  }
}

final authServiceProvider = Provider<AuthService>((ref) => AuthService(ref.watch(apiClientProvider)));
