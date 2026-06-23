import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../app/theme.dart';
import '../../offline/connectivity_service.dart';

class SyncStatusBanner extends ConsumerWidget {
  const SyncStatusBanner({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final connectivity = ref.watch(connectivityProvider);
    final syncStatus = ref.watch(syncStatusProvider);

    if (connectivity.isConnected && !syncStatus.hasPending) {
      return const SizedBox.shrink();
    }

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      color: connectivity.isConnected ? AppColors.warning.withOpacity(0.1) : AppColors.error.withOpacity(0.1),
      child: Row(
        children: [
          Icon(connectivity.isConnected ? Icons.sync : Icons.cloud_off, size: 16, color: connectivity.isConnected ? AppColors.warning : AppColors.error),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              connectivity.isConnected ? 'Syncing ${syncStatus.pendingCount} items...' : 'Offline — changes will sync when connected',
              style: TextStyle(fontSize: 12, color: connectivity.isConnected ? AppColors.warning : AppColors.error),
            ),
          ),
        ],
      ),
    );
  }
}
