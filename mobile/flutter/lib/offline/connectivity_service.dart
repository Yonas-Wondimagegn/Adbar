import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:connectivity_plus/connectivity_plus.dart';

class ConnectivityState {
  final bool isConnected;
  final String connectionType;

  const ConnectivityState({this.isConnected = true, this.connectionType = 'unknown'});
}

class ConnectivityService {
  final Connectivity _connectivity = Connectivity();
  StreamSubscription<ConnectivityResult>? _subscription;
  final _controller = StreamController<ConnectivityResult>.broadcast();

  Stream<ConnectivityResult> get stream => _controller.stream;

  Future<void> initialize() async {
    final result = await _connectivity.checkConnectivity();
    _controller.add(result);

    _subscription = _connectivity.onConnectivityChanged.listen((result) {
      _controller.add(result);
    });
  }

  Future<bool> get isConnected async {
    final result = await _connectivity.checkConnectivity();
    return result != ConnectivityResult.none;
  }

  Future<String> getConnectionType() async {
    final result = await _connectivity.checkConnectivity();
    switch (result) {
      case ConnectivityResult.wifi:
        return 'wifi';
      case ConnectivityResult.mobile:
        return 'mobile';
      case ConnectivityResult.ethernet:
        return 'ethernet';
      default:
        return 'none';
    }
  }

  void dispose() {
    _subscription?.cancel();
    _controller.close();
  }
}

final connectivityServiceProvider = Provider<ConnectivityService>((ref) {
  final service = ConnectivityService();
  service.initialize();
  ref.onDispose(() => service.dispose());
  return service;
});

final connectivityProvider = StreamProvider<ConnectivityState>((ref) {
  final service = ref.watch(connectivityServiceProvider);
  return service.stream.map((result) {
    return ConnectivityState(
      isConnected: result != ConnectivityResult.none,
      connectionType: result.name,
    );
  });
});
