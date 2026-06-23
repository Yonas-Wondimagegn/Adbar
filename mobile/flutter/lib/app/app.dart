import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'app/routes.dart';
import 'app/theme.dart';
import 'stores/ui_store.dart';
import 'widgets/sync_status_banner.dart';

class AdbarApp extends ConsumerWidget {
  const AdbarApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(goRouterProvider);
    final uiState = ref.watch(uiStoreProvider);

    return MaterialApp.router(
      title: 'Adbar',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      darkTheme: AppTheme.darkTheme,
      themeMode: uiState.themeMode,
      builder: (context, child) {
        return Column(
          children: [
            const SyncStatusBanner(),
            Expanded(child: child ?? const SizedBox.shrink()),
          ],
        );
      },
      routerConfig: router,
    );
  }
}
