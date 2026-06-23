class User {
  final String id;
  final String name;
  final String email;
  final String? avatarUrl;
  final bool isVerified;
  final DateTime createdAt;

  const User({
    required this.id,
    required this.name,
    required this.email,
    this.avatarUrl,
    this.isVerified = false,
    required this.createdAt,
  });

  factory User.fromJson(Map<String, dynamic> json) => User(
        id: json['id'] as String,
        name: json['name'] as String,
        email: json['email'] as String,
        avatarUrl: json['avatar_url'] as String?,
        isVerified: json['is_verified'] as bool? ?? false,
        createdAt: DateTime.parse(json['created_at'] as String),
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'email': email,
        'avatar_url': avatarUrl,
        'is_verified': isVerified,
        'created_at': createdAt.toIso8601String(),
      };
}
