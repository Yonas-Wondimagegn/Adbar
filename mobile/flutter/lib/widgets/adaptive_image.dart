import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../stores/ui_store.dart';

class AdaptiveImage extends ConsumerWidget {
  final String imageUrl;
  final double? width;
  final double? height;
  final BoxFit fit;
  final BorderRadius? borderRadius;

  const AdaptiveImage({super.key, required this.imageUrl, this.width, this.height, this.fit = BoxFit.cover, this.borderRadius});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final dataSaver = ref.watch(uiStoreProvider).dataSaverEnabled;

    final image = CachedNetworkImage(
      imageUrl: dataSaver ? '${imageUrl}?quality=low' : imageUrl,
      width: width,
      height: height,
      fit: fit,
      placeholder: (_, __) => Container(
        color: Colors.grey[200],
        child: const Center(child: CircularProgressIndicator(strokeWidth: 2)),
      ),
      errorWidget: (_, __, ___) => Container(
        color: Colors.grey[200],
        child: const Center(child: Icon(Icons.broken_image, color: Colors.grey)),
      ),
    );

    if (borderRadius != null) {
      return ClipRRect(borderRadius: borderRadius!, child: image);
    }
    return image;
  }
}
