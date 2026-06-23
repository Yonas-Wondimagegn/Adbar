import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

final dioProvider = Provider<Dio>((ref) {
  final dio = Dio(BaseOptions(
    baseUrl: 'https://api.adbar.com/v1',
    connectTimeout: const Duration(seconds: 15),
    receiveTimeout: const Duration(seconds: 15),
    headers: {'Content-Type': 'application/json'},
  ));

  dio.interceptors.add(InterceptorsWrapper(
    onRequest: (options, handler) {
      // Attach auth token from secure storage
      final token = ''; // TODO: read from secure storage
      if (token.isNotEmpty) {
        options.headers['Authorization'] = 'Bearer $token';
      }
      handler.next(options);
    },
    onError: (error, handler) {
      if (error.response?.statusCode == 401) {
        // TODO: trigger token refresh or logout
      }
      handler.next(error);
    },
  ));

  dio.interceptors.add(LogInterceptor(requestBody: true, responseBody: true));
  return dio;
});

class ApiClient {
  final Dio _dio;
  ApiClient(this._dio);

  Future<Response> get(String path, {Map<String, dynamic>? query}) => _dio.get(path, queryParameters: query);
  Future<Response> post(String path, {dynamic data}) => _dio.post(path, data: data);
  Future<Response> put(String path, {dynamic data}) => _dio.put(path, data: data);
  Future<Response> delete(String path) => _dio.delete(path);
}

final apiClientProvider = Provider<ApiClient>((ref) => ApiClient(ref.watch(dioProvider)));
