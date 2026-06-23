import 'package:flutter/material.dart';
import '../../app/theme.dart';

class VerificationBadge extends StatelessWidget {
  final bool isVerified;
  final double size;

  const VerificationBadge({super.key, required this.isVerified, this.size = 16});

  @override
  Widget build(BuildContext context) {
    if (!isVerified) return const SizedBox.shrink();
    return Icon(Icons.verified, color: AppColors.primary, size: size);
  }
}
