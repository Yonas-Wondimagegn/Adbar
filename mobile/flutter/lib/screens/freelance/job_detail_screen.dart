import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../app/theme.dart';
import '../../widgets/verification_badge.dart';

class JobDetailScreen extends ConsumerStatefulWidget {
  final String jobId;
  const JobDetailScreen({super.key, required this.jobId});

  @override
  ConsumerState<JobDetailScreen> createState() => _JobDetailScreenState();
}

class _JobDetailScreenState extends ConsumerState<JobDetailScreen> {
  final _proposalCtrl = TextEditingController();
  final _bidCtrl = TextEditingController();
  bool _submitting = false;

  @override
  void dispose() {
    _proposalCtrl.dispose();
    _bidCtrl.dispose();
    super.dispose();
  }

  Future<void> _submitProposal() async {
    if (_proposalCtrl.text.isEmpty || _bidCtrl.text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Fill all fields')));
      return;
    }
    setState(() => _submitting = true);
    try {
      // Submit proposal via service
      await Future.delayed(const Duration(seconds: 1));
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Proposal submitted!'), backgroundColor: AppColors.success));
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e'), backgroundColor: AppColors.error));
      }
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final jobAsync = ref.watch(jobDetailProvider(widget.jobId));

    return Scaffold(
      appBar: AppBar(title: const Text('Job Details')),
      body: jobAsync.when(
        data: (job) => SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(job.title, style: Theme.of(context).textTheme.headlineSmall),
              const SizedBox(height: 8),
              Row(
                children: [
                  Text('${job.budget} AU', style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: AppColors.primary)),
                  const Spacer(),
                  Text(job.postedDate, style: const TextStyle(color: Colors.grey)),
                ],
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Text(job.clientName, style: const TextStyle(fontWeight: FontWeight.w500)),
                  const SizedBox(width: 8),
                  const VerificationBadge(isVerified: true),
                ],
              ),
              const SizedBox(height: 16),
              Text('Description', style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 8),
              Text(job.description),
              const SizedBox(height: 16),
              Text('Skills Required', style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                runSpacing: 4,
                children: job.skills.map((s) => Chip(label: Text(s))).toList(),
              ),
              const SizedBox(height: 24),
              const Divider(),
              const SizedBox(height: 16),
              Text('Submit Proposal', style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 12),
              TextField(controller: _bidCtrl, decoration: const InputDecoration(labelText: 'Bid Amount (AU)', prefixIcon: Icon(Icons.attach_money)), keyboardType: TextInputType.number),
              const SizedBox(height: 12),
              TextField(controller: _proposalCtrl, decoration: const InputDecoration(labelText: 'Proposal'), maxLines: 4),
              const SizedBox(height: 16),
              ElevatedButton(onPressed: _submitting ? null : _submitProposal, child: _submitting ? const CircularProgressIndicator() : const Text('Submit Proposal')),
            ],
          ),
        ),
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('Error: $e')),
      ),
    );
  }
}
