import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/api_client.dart';

class FreelanceJob {
  final String id;
  final String title;
  final String description;
  final String budget;
  final String clientName;
  final String postedDate;
  final List<String> skills;
  final String status;

  const FreelanceJob({
    required this.id,
    required this.title,
    required this.description,
    required this.budget,
    required this.clientName,
    required this.postedDate,
    this.skills = const [],
    this.status = 'open',
  });

  factory FreelanceJob.fromJson(Map<String, dynamic> json) => FreelanceJob(
        id: json['id'] as String,
        title: json['title'] as String,
        description: json['description'] as String,
        budget: json['budget'] as String? ?? '',
        clientName: json['client_name'] as String? ?? '',
        postedDate: json['posted_date'] as String? ?? '',
        skills: (json['skills'] as List?)?.cast<String>() ?? [],
        status: json['status'] as String? ?? 'open',
      );
}

class FreelanceService {
  final ApiClient _api;
  FreelanceService(this._api);

  Future<List<FreelanceJob>> getJobs({String? search, int page = 1}) async {
    final res = await _api.get('/freelance/jobs', query: {
      if (search != null) 'search': search,
      'page': page,
    });
    return (res.data['items'] as List).map((e) => FreelanceJob.fromJson(e)).toList();
  }

  Future<FreelanceJob> getJob(String id) async {
    final res = await _api.get('/freelance/jobs/$id');
    return FreelanceJob.fromJson(res.data);
  }

  Future<void> submitProposal({required String jobId, required String bid, required String proposal}) async {
    await _api.post('/freelance/jobs/$jobId/proposals', data: {'bid': bid, 'proposal': proposal});
  }
}

final freelanceServiceProvider = Provider<FreelanceService>((ref) => FreelanceService(ref.watch(apiClientProvider)));

final jobsProvider = FutureProvider<List<FreelanceJob>>((ref) {
  return ref.watch(freelanceServiceProvider).getJobs();
});

final jobDetailProvider = FutureProvider.family<FreelanceJob, String>((ref, id) {
  return ref.watch(freelanceServiceProvider).getJob(id);
});
