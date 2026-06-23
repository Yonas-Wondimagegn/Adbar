import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../app/theme.dart';

class JobListScreen extends ConsumerWidget {
  const JobListScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final jobsAsync = ref.watch(jobsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Freelance Jobs'),
        actions: [
          IconButton(icon: const Icon(Icons.search), onPressed: () {}),
          IconButton(icon: const Icon(Icons.filter_list), onPressed: () {}),
        ],
      ),
      body: jobsAsync.when(
        data: (jobs) => ListView.builder(
          padding: const EdgeInsets.all(16),
          itemCount: jobs.length,
          itemBuilder: (context, i) {
            final j = jobs[i];
            return Card(
              margin: const EdgeInsets.only(bottom: 12),
              child: InkWell(
                onTap: () => context.push('/jobs/${j.id}'),
                borderRadius: BorderRadius.circular(12),
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Expanded(child: Text(j.title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16))),
                          Chip(label: Text('${j.budget} AU', style: const TextStyle(fontSize: 11)), backgroundColor: AppColors.primary.withOpacity(0.1)),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Text(j.description, maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(color: Colors.grey)),
                      const SizedBox(height: 12),
                      Row(
                        children: [Icon(Icons.person, size: 16, color: Colors.grey[600]), const SizedBox(width: 4), Text(j.clientName, style: TextStyle(color: Colors.grey[600], fontSize: 12)), const Spacer(), Text(j.postedDate, style: TextStyle(color: Colors.grey, fontSize: 12))],
                      ),
                    ],
                  ),
                ),
              ),
            );
          },
        ),
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('Error: $e')),
      ),
    );
  }
}
