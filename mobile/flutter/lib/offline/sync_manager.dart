import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import '../offline/database.dart';
import '../services/api_client.dart';

class SyncManager {
  final ApiClient _api;
  Timer? _syncTimer;
  bool _syncing = false;

  SyncManager(this._api);

  void startPeriodicSync({Duration interval = const Duration(minutes: 5)}) {
    _syncTimer?.cancel();
    _syncTimer = Timer.periodic(interval, (_) => syncPending());
  }

  void stopPeriodicSync() {
    _syncTimer?.cancel();
  }

  Future<void> syncPending() async {
    if (_syncing) return;
    _syncing = true;

    try {
      final queue = LocalDatabase.offlineQueue;
      final keys = queue.keys.toList();

      for (final key in keys) {
        try {
          final entry = Map<String, dynamic>.from(queue.get(key));
          final method = entry['method'] as String;
          final path = entry['path'] as String;
          final data = entry['data'];

          // Execute queued request
          switch (method.toUpperCase()) {
            case 'POST':
              await _api.post(path, data: data);
              break;
            case 'PUT':
              await _api.put(path, data: data);
              break;
            case 'DELETE':
              await _api.delete(path);
              break;
          }

          // Remove from queue on success
          await queue.delete(key);
        } catch (e) {
          // Leave in queue for next sync attempt
        }
      }
    } finally {
      _syncing = false;
    }
  }

  Future<void> enqueue({required String method, required String path, Map<String, dynamic>? data}) async {
    final queue = LocalDatabase.offlineQueue;
    final key = DateTime.now().millisecondsSinceEpoch.toString();
    await queue.put(key, {'method': method, 'path': path, 'data': data, 'timestamp': DateTime.now().toIso8601String()});
  }

  int get pendingCount => LocalDatabase.offlineQueue.length;
  bool get hasPending => LocalDatabase.offlineQueue.isNotEmpty;
  bool get isSyncing => _syncing;
}

final syncManagerProvider = Provider<SyncManager>((ref) {
  final manager = SyncManager(ref.watch(apiClientProvider));
  ref.onDispose(() => manager.stopPeriodicSync());
  return manager;
});

final syncStatusProvider = Provider<SyncManager>((ref) => ref.watch(syncManagerProvider));
